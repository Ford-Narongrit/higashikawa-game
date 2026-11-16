"use client";

const KEY = "hg_token";

// localStorage can throw (private mode, LINE in-app browser quirks) — never let that break the page.
export function loadToken(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function saveToken(token: string) {
  try {
    localStorage.setItem(KEY, token);
  } catch {}
}

export function clearToken() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

/** POST JSON and return { status, data }; status 0 means a network error. */
export async function postJson<T = Record<string, unknown>>(url: string, body: unknown) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as T;
    return { status: res.status, data };
  } catch {
    return { status: 0, data: {} as T };
  }
}
