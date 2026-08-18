// Owner session — single shared key set so every screen reads/writes the
// same way (see src/utils/storage: mismatched keys silently look logged-out).
//
// Mirrors backend/CONVENTIONS.md: the backend never trusts a business_id
// coming from the client. Every authenticated request must carry the
// session token from here as `Authorization: Bearer <token>` (see
// authHeaders()) — the backend resolves business_id from that token itself.
import { storage } from "@/src/utils/storage";

const TOKEN_KEY = "absen_owner_token";
const BUSINESS_KEY = "absen_owner_business_id";
const REMEMBER_KEY = "absen_owner_remember";

// `remember` controls whether Splash auto-skips into the dashboard on the
// NEXT cold start — the token/business id are always stored so screens
// within the current app run (Karyawan, Dashboard) always have them.
export async function setOwnerSession(token: string, businessId: string, remember: boolean): Promise<void> {
  await storage.secureSet(TOKEN_KEY, token);
  await storage.secureSet(BUSINESS_KEY, businessId);
  await storage.secureSet(REMEMBER_KEY, remember);
}

export async function clearOwnerSession(): Promise<void> {
  await storage.secureRemove(TOKEN_KEY);
  await storage.secureRemove(BUSINESS_KEY);
  await storage.secureRemove(REMEMBER_KEY);
}

export async function getActiveBusinessId(): Promise<string | null> {
  return storage.secureGet(BUSINESS_KEY, null);
}

export async function getSessionToken(): Promise<string | null> {
  return storage.secureGet(TOKEN_KEY, null);
}

// Spread into fetch() headers for any endpoint gated by get_current_business_id.
export async function authHeaders(): Promise<Record<string, string>> {
  const token = await getSessionToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function shouldAutoLogin(): Promise<boolean> {
  const remember = await storage.secureGet(REMEMBER_KEY, false);
  if (!remember) return false;
  const token = await getSessionToken();
  return !!token;
}
