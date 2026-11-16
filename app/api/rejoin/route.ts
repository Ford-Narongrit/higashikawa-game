import { generateToken, hashToken, normalizeName, verifyPin } from "@/lib/auth";
import { findByNameRoom, isRoom } from "@/lib/players";
import { supabaseAdmin } from "@/lib/supabase/server";

const MAX_ATTEMPTS = 5;
const LOCK_MS = 60_000;

type Candidate = {
  id: string;
  pin_hash: string;
  pin_failed_attempts: number;
  pin_locked_until: string | null;
};

/**
 * POST { name, room, pin } → 200 { token } on success.
 * Errors: 404 not_found, 401 wrong_pin, 429 locked.
 * Issuing a new token signs out any other device using the old one.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const name = normalizeName(body.name);
  const room = body.room;
  const pin = typeof body.pin === "string" ? body.pin.trim() : "";
  if (!name || !isRoom(room)) return Response.json({ error: "not_found" }, { status: 404 });
  if (!/^\d{4}$/.test(pin)) return Response.json({ error: "wrong_pin" }, { status: 401 });

  const { data: candidates, error } = await findByNameRoom<Candidate>(
    name,
    room,
    "id, pin_hash, pin_failed_attempts, pin_locked_until",
  );
  if (error) {
    console.error("rejoin lookup", error);
    return Response.json({ error: "server" }, { status: 500 });
  }
  if (!candidates.length) return Response.json({ error: "not_found" }, { status: 404 });

  const now = Date.now();
  const open = candidates.filter((c) => !c.pin_locked_until || Date.parse(c.pin_locked_until) <= now);
  if (!open.length) return Response.json({ error: "locked" }, { status: 429 });

  const db = supabaseAdmin();
  for (const c of open) {
    if (await verifyPin(pin, c.pin_hash)) {
      const token = generateToken();
      await db
        .from("players")
        .update({
          token_hash: hashToken(token),
          pin_failed_attempts: 0,
          pin_locked_until: null,
          last_seen_at: new Date().toISOString(),
        })
        .eq("id", c.id);
      return Response.json({ token });
    }
  }

  await Promise.all(
    open.map((c) => {
      const attempts = c.pin_failed_attempts + 1;
      const locked = attempts >= MAX_ATTEMPTS;
      return db
        .from("players")
        .update({
          pin_failed_attempts: locked ? 0 : attempts,
          pin_locked_until: locked ? new Date(now + LOCK_MS).toISOString() : null,
        })
        .eq("id", c.id);
    }),
  );
  return Response.json({ error: "wrong_pin" }, { status: 401 });
}
