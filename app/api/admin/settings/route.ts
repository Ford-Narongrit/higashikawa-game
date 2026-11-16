import { requireAdmin } from "@/lib/auth";
import { isPrizeTable } from "@/lib/boxes";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const COLUMNS = "prize_table, photo_points, max_photos_per_player, photo_team_cap";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { data, error } = await supabaseAdmin().from("settings").select(COLUMNS).single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

const intIn = (v: unknown, min: number, max: number) => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;

/** PATCH any of { prize_table, photo_points, max_photos_per_player, photo_team_cap (null = no cap) }. */
export async function PATCH(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await request.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  if ("prize_table" in body) {
    if (!isPrizeTable(body.prize_table)) return Response.json({ error: "prize_table" }, { status: 400 });
    patch.prize_table = body.prize_table;
  }
  if ("photo_points" in body) {
    if (!intIn(body.photo_points, 0, 1000)) return Response.json({ error: "photo_points" }, { status: 400 });
    patch.photo_points = body.photo_points;
  }
  if ("max_photos_per_player" in body) {
    if (!intIn(body.max_photos_per_player, 0, 20)) return Response.json({ error: "max_photos_per_player" }, { status: 400 });
    patch.max_photos_per_player = body.max_photos_per_player;
  }
  if ("photo_team_cap" in body) {
    if (body.photo_team_cap !== null && !intIn(body.photo_team_cap, 0, 100_000)) {
      return Response.json({ error: "photo_team_cap" }, { status: 400 });
    }
    patch.photo_team_cap = body.photo_team_cap;
  }
  if (!Object.keys(patch).length) return Response.json({ error: "nothing to update" }, { status: 400 });

  const { data, error } = await supabaseAdmin()
    .from("settings")
    .update(patch)
    .eq("id", true)
    .select(COLUMNS)
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
