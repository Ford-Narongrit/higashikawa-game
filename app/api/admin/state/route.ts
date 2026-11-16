import { requireAdmin } from "@/lib/auth";
import { gameState } from "@/lib/players";
import { supabaseAdmin } from "@/lib/supabase/server";
import { SCREEN_VIEWS, type ScreenView } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  return Response.json(await gameState());
}

/** PATCH { screen_view?, box_open?, photo_open? }. teams_revealed is only set via /reveal. */
export async function PATCH(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await request.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  if (SCREEN_VIEWS.includes(body.screen_view as ScreenView)) patch.screen_view = body.screen_view;
  if (typeof body.box_open === "boolean") patch.box_open = body.box_open;
  if (typeof body.photo_open === "boolean") patch.photo_open = body.photo_open;
  if (!Object.keys(patch).length) return Response.json({ error: "nothing to update" }, { status: 400 });

  const { data, error } = await supabaseAdmin()
    .from("game_state")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", true)
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
