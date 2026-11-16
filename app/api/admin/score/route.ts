import { requireAdmin } from "@/lib/auth";
import { teamScores } from "@/lib/scores";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const EVENT_COLUMNS = "id, team_id, points, kind, label, player_name, photo_id, voided, created_at";

/** GET → { scores, events } with the latest 500 events (all kinds, including voided). */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const [scores, { data, error }] = await Promise.all([
    teamScores(),
    supabaseAdmin().from("score_events").select(EVENT_COLUMNS).order("id", { ascending: false }).limit(500),
  ]);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ scores, events: data });
}

/** POST { team_id, points, label } → manual (admin) score event. */
export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await request.json().catch(() => ({}));
  const label = typeof body.label === "string" ? body.label.trim().slice(0, 60) : "";
  if (![1, 2, 3, 4].includes(body.team_id)) return Response.json({ error: "team_id" }, { status: 400 });
  if (!Number.isInteger(body.points) || Math.abs(body.points) > 10_000) {
    return Response.json({ error: "points" }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin()
    .from("score_events")
    .insert({ team_id: body.team_id, points: body.points, kind: "admin", label: label || null })
    .select(EVENT_COLUMNS)
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
