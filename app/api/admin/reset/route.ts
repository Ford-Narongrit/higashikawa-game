import { requireAdmin } from "@/lib/auth";
import { removePhotoFiles } from "@/lib/storage-purge";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * POST { confirm: "RESET" } → wipes players, scores, box codes, photos (rows + files) and resets
 * game_state. Keeps teams and settings (prize table, photo rules).
 */
export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await request.json().catch(() => ({}));
  if (body.confirm !== "RESET") return Response.json({ error: "type RESET to confirm" }, { status: 400 });

  const db = supabaseAdmin();
  let files = 0;
  try {
    files = await removePhotoFiles(db);
  } catch (e) {
    return Response.json({ error: `storage: ${String(e)}` }, { status: 500 });
  }
  const { error } = await db.rpc("reset_game");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, files });
}
