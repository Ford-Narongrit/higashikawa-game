import { generatePin, generateToken, hashPin, hashToken, normalizeName } from "@/lib/auth";
import { findByNameRoom, isRoom } from "@/lib/players";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * POST { name, room, force? }
 * → 200 { token, pin }      new player created (PIN shown once)
 * → 409 { conflict: true }  same name+room exists and force is not set
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const name = normalizeName(body.name);
  const room = body.room;
  if (!name || name.length > 40) return Response.json({ error: "name" }, { status: 400 });
  if (!isRoom(room)) return Response.json({ error: "room" }, { status: 400 });

  if (!body.force) {
    const { data: existing } = await findByNameRoom<{ id: string }>(name, room, "id").limit(1);
    if (existing?.length) return Response.json({ conflict: true }, { status: 409 });
  }

  const pin = generatePin();
  const token = generateToken();
  const { error } = await supabaseAdmin().rpc("create_player", {
    p_name: name,
    p_room: room,
    p_pin_hash: await hashPin(pin),
    p_token_hash: hashToken(token),
  });
  if (error) {
    console.error("create_player", error);
    return Response.json({ error: "server" }, { status: 500 });
  }
  return Response.json({ token, pin });
}
