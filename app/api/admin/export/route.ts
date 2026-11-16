import { requireAdmin } from "@/lib/auth";
import { teamScores } from "@/lib/scores";
import { TEAMS } from "@/lib/teams";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** GET → plain-text score summary for the whiteboard fallback. */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const [scores, events] = await Promise.all([
    teamScores(),
    supabaseAdmin().from("score_events").select("team_id, points, kind").eq("voided", false),
  ]);

  const byKind = (teamId: number, kind: string) =>
    (events.data ?? []).filter((e) => e.team_id === teamId && e.kind === kind).reduce((s, e) => s + e.points, 0);

  const ranked = [...scores].sort((a, b) => b.score - a.score);
  const time = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
  const lines = [`HIGASHIKAWA GAME スコア (${time})`, ""];
  ranked.forEach((s) => {
    const t = TEAMS.find((t) => t.id === s.team_id)!;
    const rank = ranked.filter((o) => o.score > s.score).length + 1;
    lines.push(
      `${rank}. ${t.symbol} ${t.name_ja}: ${s.score}  (ゲーム ${byKind(t.id, "admin")} / プレゼント ${byKind(t.id, "box")} / しゃしん ${byKind(t.id, "photo")})`,
    );
  });
  return new Response(lines.join("\n") + "\n", {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
