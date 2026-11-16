import { randomUUID } from "node:crypto";
import { playerFromRequest } from "@/lib/auth";
import { BUCKET, photoPaths, photoSettings } from "@/lib/photos";
import { gameState } from "@/lib/players";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * POST (Bearer) → { id, full: { path, token }, thumb: { path, token } }
 * Signed upload URLs for the full image and its thumbnail. Errors: 403 closed, 409 no_team, 429 photo_limit.
 * The quota is checked again atomically in submit_photo() once the upload finishes.
 */
export async function POST(request: Request) {
  const player = await playerFromRequest(request);
  if (!player) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!player.team_id) return Response.json({ error: "no_team" }, { status: 409 });
  const [state, settings] = await Promise.all([gameState(), photoSettings()]);
  if (!state.photo_open) return Response.json({ error: "closed" }, { status: 403 });

  const db = supabaseAdmin();
  const { count } = await db
    .from("photos")
    .select("id", { count: "exact", head: true })
    .eq("player_id", player.id)
    .neq("status", "rejected");
  if ((count ?? 0) >= settings.max_photos_per_player) {
    return Response.json({ error: "photo_limit" }, { status: 429 });
  }

  const id = randomUUID();
  const { path, thumb_path } = photoPaths(player.id, id);
  const bucket = db.storage.from(BUCKET);
  const [full, thumb] = await Promise.all([bucket.createSignedUploadUrl(path), bucket.createSignedUploadUrl(thumb_path)]);
  if (full.error || thumb.error) {
    console.error("createSignedUploadUrl", full.error ?? thumb.error);
    return Response.json({ error: "server" }, { status: 500 });
  }
  return Response.json({
    id,
    full: { path, token: full.data.token },
    thumb: { path: thumb_path, token: thumb.data.token },
  });
}
