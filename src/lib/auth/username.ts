/** Synthetic email domain for username-based Supabase Auth */
export const AUTH_EMAIL_DOMAIN = "users.brandwork.local";

export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, "");
}

export function isValidUsername(username: string): boolean {
  return /^[a-z0-9._-]{3,32}$/.test(username);
}

export function usernameToEmail(username: string): string {
  return `${normalizeUsername(username)}@${AUTH_EMAIL_DOMAIN}`;
}
