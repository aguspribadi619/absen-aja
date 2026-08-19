// App session (Owner or Karyawan) — single shared key set so every screen
// reads/writes the same way (see src/utils/storage: mismatched keys
// silently look logged-out).
//
// Mirrors backend/CONVENTIONS.md: the backend never trusts a business_id
// (or employee_id) coming from the client. Every authenticated request
// must carry the session token from here as `Authorization: Bearer <token>`
// (see authHeaders()) — the backend resolves business_id/employee_id from
// that token itself, and picks get_current_business_id (owner-only) or
// get_current_employee (karyawan-only) depending on which one logged in.
import { storage } from "@/src/utils/storage";

export type SessionRole = "owner" | "karyawan";

const TOKEN_KEY = "absen_session_token";
const ROLE_KEY = "absen_session_role";
const BUSINESS_KEY = "absen_session_business_id";
const EMPLOYEE_KEY = "absen_session_employee_id";
const REMEMBER_KEY = "absen_session_remember";

// `remember` controls whether Splash auto-skips into the right dashboard on
// the NEXT cold start — the token/business id are always stored so screens
// within the current app run always have them.
export async function setOwnerSession(token: string, businessId: string, remember: boolean): Promise<void> {
  await storage.secureSet(TOKEN_KEY, token);
  await storage.secureSet(ROLE_KEY, "owner");
  await storage.secureSet(BUSINESS_KEY, businessId);
  await storage.secureRemove(EMPLOYEE_KEY);
  await storage.secureSet(REMEMBER_KEY, remember);
}

export async function setKaryawanSession(token: string, businessId: string, employeeId: string, remember: boolean): Promise<void> {
  await storage.secureSet(TOKEN_KEY, token);
  await storage.secureSet(ROLE_KEY, "karyawan");
  await storage.secureSet(BUSINESS_KEY, businessId);
  await storage.secureSet(EMPLOYEE_KEY, employeeId);
  await storage.secureSet(REMEMBER_KEY, remember);
}

export async function clearSession(): Promise<void> {
  await storage.secureRemove(TOKEN_KEY);
  await storage.secureRemove(ROLE_KEY);
  await storage.secureRemove(BUSINESS_KEY);
  await storage.secureRemove(EMPLOYEE_KEY);
  await storage.secureRemove(REMEMBER_KEY);
}

export async function getRole(): Promise<SessionRole | null> {
  return storage.secureGet(ROLE_KEY, null);
}

export async function getActiveBusinessId(): Promise<string | null> {
  return storage.secureGet(BUSINESS_KEY, null);
}

export async function getActiveEmployeeId(): Promise<string | null> {
  return storage.secureGet(EMPLOYEE_KEY, null);
}

export async function getSessionToken(): Promise<string | null> {
  return storage.secureGet(TOKEN_KEY, null);
}

// Spread into fetch() headers for any endpoint gated by get_current_business_id
// or get_current_employee.
export async function authHeaders(): Promise<Record<string, string>> {
  const token = await getSessionToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Returns which dashboard Splash should auto-skip into, or null to show
// the normal Splash buttons.
export async function shouldAutoLogin(): Promise<SessionRole | null> {
  const remember = await storage.secureGet(REMEMBER_KEY, false);
  if (!remember) return null;
  const token = await getSessionToken();
  if (!token) return null;
  return getRole();
}
