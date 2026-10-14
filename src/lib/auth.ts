/**
 * Admin password removed by product choice.
 * Guest APIs must never be treated as admin (no recipe leakage).
 * Admin write routes call requireAdmin() which is intentionally open.
 */

export async function createAdminSession() {
  // no-op
}

export async function clearAdminSession() {
  // no-op
}

/** Always false — public responses stay recipe-free. */
export async function isAdminAuthenticated() {
  return false;
}

export function verifyAdminPassword(_password: string) {
  return true;
}

/** Open admin writes; do not link /admin from guest nav. */
export async function requireAdmin() {
  // no-op
}
