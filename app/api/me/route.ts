import { playerFromRequest } from "@/lib/auth";
import { gameState, playerCount } from "@/lib/players";
import { teamScores } from "@/lib/scores";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { MeResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

/** GET (Bearer token) → the player's own row, game state and head count. 401 if token unknown. */
export async function GET(request: Request) {
  const player = await playerFromRequest(request);
  if (!player) return Response.json({ error: "unauthorized" }, { status: 401 });

  // Throttled heartbeat: at most one write per player per minute.
  if (Date.now() - Date.parse(player.last_seen_at) > 60_000) {
    await supabaseAdmin()
      .from("players")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", player.id);
  }

  const [state, count, scores] = await Promise.all([gameState(), playerCount(), teamScores()]);
  const body: MeResponse = {
    player: { id: player.id, name: player.name, room: player.room, team_id: player.team_id },
    state,
    playerCount: count,
    scores,
  };
  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
}
