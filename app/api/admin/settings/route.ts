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

/** PATCH { prize_table? } — other settings are added in Phase 4. */
export async function PATCH(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await request.json().catch(() => ({}));
  if (!isPrizeTable(body.prize_table)) return Response.json({ error: "prize_table" }, { status: 400 });
  const { data, error } = await supabaseAdmin()
    .from("settings")
    .update({ prize_table: body.prize_table })
    .eq("id", true)
    .select(COLUMNS)
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
