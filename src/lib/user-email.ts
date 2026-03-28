/** Normalize email for storage and lookups (OTP already lowercases `recipient`). */
export function normalizeUserEmail(email: string): string {
  return email.trim().toLowerCase();
}
