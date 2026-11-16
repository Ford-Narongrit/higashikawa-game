import "server-only";
import { supabaseAdmin } from "./supabase/server";

export const BUCKET = "photos";

/** Storage paths are always built on the server from the player id — never taken from the client. */
export function photoPaths(playerId: string, uploadId: string) {
  return { path: `${playerId}/${uploadId}.jpg`, thumb_path: `${playerId}/${uploadId}_t.jpg` };
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Batch-sign private object paths. Returns path → URL (missing paths are omitted). */
export async function signPaths(paths: string[], expiresIn: number): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data } = await supabaseAdmin().storage.from(BUCKET).createSignedUrls(paths, expiresIn);
  const out: Record<string, string> = {};
  for (const d of data ?? []) if (d.signedUrl && d.path) out[d.path] = d.signedUrl;
  return out;
}

export async function photoSettings() {
  const { data, error } = await supabaseAdmin()
    .from("settings")
    .select("photo_points, max_photos_per_player, photo_team_cap")
    .single();
  if (error) throw error;
  return data;
}
