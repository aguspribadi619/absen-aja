// Native storage (Metro auto-picks index.web.ts on web — do NOT add Platform.OS checks).
//
// Import the ready-made singleton BY NAME and call methods on it — never a default
// import, never the methods bare:
//   import { storage } from "@/src/utils/storage";
//   await storage.getItem(key, fallback);      // the `fallback` arg is REQUIRED
//
// Namespaces: general KV -> getItem/setItem/removeItem (AsyncStorage);
//             tokens/secrets -> secureGet/secureSet/secureRemove (Keychain).
// Values are auto JSON-serialized (string|number|boolean|null) in this implementation — never JSON.stringify/parse yourself.
// Helpers NEVER throw: a miss returns `fallback`, a failed write returns `false` (failures are SILENT).
//
// Use async/await for all storage operations.
//
// AUTH TOKENS: use ONE namespace (secure*) + ONE shared key constant, and read/write it the SAME
// way on both sides — the login/AuthContext (write) and the API client/interceptor (read). A
// mismatched method or key silently returns the fallback, surfacing as a logged-out state or 401/403
// with no error in the logs.

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

import { AssertNoExtras, StorageBase, StorageItemValue } from "./storage-base";

// Prefix for the AsyncStorage backup copy secure* keeps -- see secureGet/secureSet.
const SECURE_BACKUP_PREFIX = "__secure_backup__:";

export class Storage extends StorageBase {
  // General KV — backed by AsyncStorage.
  // `fallback` is required and returned on any miss/parse error — a missing key looks identical to a stored `null`.
  async getItem<Fallback extends StorageItemValue>(
    key: string,
    fallback: Fallback,
  ): Promise<Fallback | null> {
    try {
      const raw = await AsyncStorage.getItem(key);
      return this.retrieve(raw, fallback);
    } catch (e) {
      this.warn("getItem", key, e);
      return fallback;
    }
  }

  async setItem<Value extends StorageItemValue>(
    key: string,
    value: Value,
  ): Promise<boolean> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      this.warn("setItem", key, e);
      return false;
    }
  }

  async removeItem(key: string): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (e) {
      this.warn("removeItem", key, e);
      return false;
    }
  }

  // Sensitive values — Keychain (iOS) / EncryptedSharedPreferences (Android).
  // Use these (not getItem) for auth tokens; whatever writes with secureSet must read with secureGet under the same key.
  //
  // Android's EncryptedSharedPreferences backend can silently fail to decrypt on
  // read even after a successful write (Keystore corruption) -- observed on a real
  // device as "ingat saya" never persisting a session. We keep a plaintext
  // AsyncStorage backup written alongside every secureSet so secureGet still has
  // something to fall back to when SecureStore comes back empty/throws.
  async secureGet<Fallback extends StorageItemValue>(
    key: string,
    fallback: Fallback,
  ): Promise<Fallback | null> {
    try {
      const raw = await SecureStore.getItemAsync(key);
      if (raw !== null) return this.retrieve(raw, fallback);
    } catch (e) {
      this.warn("secureGet", key, e);
    }
    try {
      const raw = await AsyncStorage.getItem(SECURE_BACKUP_PREFIX + key);
      return this.retrieve(raw, fallback);
    } catch (e) {
      this.warn("secureGet(backup)", key, e);
      return fallback;
    }
  }

  async secureSet<Value extends StorageItemValue>(
    key: string,
    value: Value,
  ): Promise<boolean> {
    const json = JSON.stringify(value);
    let ok = true;
    try {
      await SecureStore.setItemAsync(key, json);
    } catch (e) {
      this.warn("secureSet", key, e);
      ok = false;
    }
    try {
      await AsyncStorage.setItem(SECURE_BACKUP_PREFIX + key, json);
    } catch (e) {
      this.warn("secureSet(backup)", key, e);
    }
    return ok;
  }

  async secureRemove(key: string): Promise<boolean> {
    let ok = true;
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      this.warn("secureRemove", key, e);
      ok = false;
    }
    try {
      await AsyncStorage.removeItem(SECURE_BACKUP_PREFIX + key);
    } catch (e) {
      this.warn("secureRemove(backup)", key, e);
    }
    return ok;
  }
}

// The shared singleton — import THIS (`import { storage } from "@/src/utils/storage"`). Do not `new Storage()`.
export const storage = new Storage();

// Compile-time guard: any new method must be declared in storage-base.ts first.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- intentional compile-time-only assertion
type _NoExtras = AssertNoExtras<Exclude<keyof Storage, keyof StorageBase>>;
