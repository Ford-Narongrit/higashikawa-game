import { playerFromRequest } from "@/lib/auth";
import { normalizeCode } from "@/lib/boxes";
import { gameState } from "@/lib/players";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * POST { code } (Bearer token) → 200 { points }
 * Errors: 401 unauthorized, 403 closed, 409 no_team, 404 invalid, 410 used.
 * The points are rolled inside redeem_box_code(), never sent by the client.
 */
export async function POST(request: Request) {
  const player = await playerFromRequest(request);
  if (!player) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!player.team_id) return Response.json({ error: "no_team" }, { status: 409 });

  const state = await gameState();
  if (!state.box_open) return Response.json({ error: "closed" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const code = normalizeCode(body.code);
  if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) return Response.json({ error: "invalid" }, { status: 404 });

  const db = supabaseAdmin();
  const { data, error } = await db.rpc("redeem_box_code", { p_code: code, p_player_id: player.id });
  if (error) {
    if (error.message.includes("player_has_no_team")) return Response.json({ error: "no_team" }, { status: 409 });
    console.error("redeem_box_code", error);
    return Response.json({ error: "server" }, { status: 500 });
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (row) return Response.json({ points: row.points });

  // Nothing redeemed: tell "already used" apart from "doesn't exist".
  const { data: existing } = await db.from("box_codes").select("id").eq("code", code).maybeSingle();
  return existing
    ? Response.json({ error: "used" }, { status: 410 })
    : Response.json({ error: "invalid" }, { status: 404 });
}
