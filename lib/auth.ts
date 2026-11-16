import "server-only";
import { createHash, randomBytes, randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { supabaseAdmin } from "./supabase/server";
import { ADMIN_COOKIE, isAdminCookie } from "./admin-session";

export const PLAYER_COLUMNS = "id, name, room, team_id";

export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Tokens are 256-bit random, so a fast hash is enough. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generatePin(): string {
  return randomInt(0, 10000).toString().padStart(4, "0");
}

export function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 8);
}

export function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

/** Resolves the player from `Authorization: Bearer <token>`, or null. */
export async function playerFromRequest(request: Request) {
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return null;
  const { data } = await supabaseAdmin()
    .from("players")
    .select(`${PLAYER_COLUMNS}, last_seen_at`)
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  return data;
}

/** Defence in depth: proxy.ts already guards /api/admin/**, but routes re-check. */
export async function requireAdmin(): Promise<Response | null> {
  const jar = await cookies();
  if (await isAdminCookie(jar.get(ADMIN_COOKIE)?.value)) return null;
  return Response.json({ error: "unauthorized" }, { status: 401 });
}

export function normalizeName(name: unknown): string {
  return typeof name === "string" ? name.normalize("NFKC").replace(/\s+/g, " ").trim() : "";
}
