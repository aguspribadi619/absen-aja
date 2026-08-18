// Owner session — single shared key pair so every screen reads/writes the
// same way (see src/utils/storage: mismatched keys silently look logged-out).
import { storage } from "@/src/utils/storage";

const SESSION_KEY = "absen_owner_business_id";
const REMEMBER_KEY = "absen_owner_remember";

// `remember` controls whether Splash auto-skips into the dashboard on the
// NEXT cold start — the business id itself is always stored so screens
// within the current app run (Karyawan, Dashboard) always have it.
export async function setOwnerSession(businessId: string, remember: boolean): Promise<void> {
  await storage.secureSet(SESSION_KEY, businessId);
  await storage.secureSet(REMEMBER_KEY, remember);
}

export async function getActiveBusinessId(): Promise<string | null> {
  return storage.secureGet(SESSION_KEY, null);
}

export async function shouldAutoLogin(): Promise<boolean> {
  const remember = await storage.secureGet(REMEMBER_KEY, false);
  if (!remember) return false;
  const id = await storage.secureGet(SESSION_KEY, null);
  return !!id;
}
