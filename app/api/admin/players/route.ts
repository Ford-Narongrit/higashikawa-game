import { generatePin, generateToken, hashPin, hashToken, normalizeName, requireAdmin } from "@/lib/auth";
import { isRoom } from "@/lib/players";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** GET ?q=name → up to 300 players, newest first. */
export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const q = normalizeName(new URL(request.url).searchParams.get("q")).replace(/[\\%_]/g, (c) => `\\${c}`);
  let query = supabaseAdmin()
    .from("players")
    .select("id, name, room, team_id, created_at, last_seen_at")
    .order("created_at", { ascending: false })
    .limit(300);
  if (q) query = query.ilike("name", `%${q}%`);
  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

/** POST { name, room } → add a player for someone without a phone; returns their PIN once. */
export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await request.json().catch(() => ({}));
  const name = normalizeName(body.name);
  if (!name || name.length > 40 || !isRoom(body.room)) {
    return Response.json({ error: "name/room" }, { status: 400 });
  }
  const pin = generatePin();
  const { data, error } = await supabaseAdmin().rpc("create_player", {
    p_name: name,
    p_room: body.room,
    p_pin_hash: await hashPin(pin),
    p_token_hash: hashToken(generateToken()),
  });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  // Never send pin_hash / token_hash to the browser.
  const { id, room, team_id, created_at, last_seen_at } = data;
  return Response.json({ player: { id, name: data.name, room, team_id, created_at, last_seen_at }, pin });
}
