import { requireAdmin } from "@/lib/auth";
import { gameState } from "@/lib/players";
import { teamScores } from "@/lib/scores";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Stage screen data (admin cookie): game state + every player's name/team for the join ticker and team lists. */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const [state, scores, players] = await Promise.all([
    gameState(),
    teamScores(),
    supabaseAdmin()
      .from("players")
      .select("id, name, room, team_id, created_at")
      .order("created_at", { ascending: true })
      .limit(1000),
  ]);
  return Response.json(
    { state, scores, players: players.data ?? [] },
    { headers: { "Cache-Control": "no-store" } },
  );
}
