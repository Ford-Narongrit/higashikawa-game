// Shared by proxy.ts and API routes, so it uses Web Crypto only (no Node APIs).

export const ADMIN_COOKIE = "hg_admin";

/** Cookie value = HMAC(ADMIN_PASSWORD, fixed label). Changing the password logs everyone out. */
export async function adminSessionValue(): Promise<string> {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("Missing ADMIN_PASSWORD");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("hg-admin-session-v1"));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function isAdminCookie(value: string | undefined): Promise<boolean> {
  if (!value) return false;
  const expected = await adminSessionValue();
  if (value.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < value.length; i++) diff |= value.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
