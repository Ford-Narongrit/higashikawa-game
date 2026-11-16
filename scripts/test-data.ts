import type { SupabaseClient } from "@supabase/supabase-js";
import { removePhotoFiles } from "../lib/storage-purge";

/** Deletes players whose name starts with `prefix`, with their photo files/rows, score events and box codes. */
export async function deleteTestPlayers(db: SupabaseClient, prefix: string): Promise<number> {
  const { data: players } = await db.from("players").select("id").like("name", `${prefix}%`).limit(5000);
  const ids = (players ?? []).map((p) => p.id);
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const paths: string[] = [];
    // list each player's folder so files that were uploaded but never registered go too
    for (const id of chunk) {
      const { data: files } = await db.storage.from("photos").list(id, { limit: 100 });
      paths.push(...(files ?? []).map((f) => `${id}/${f.name}`));
    }
    if (paths.length) await removePhotoFiles(db, paths);
    await db.from("score_events").delete().in("player_id", chunk);
    await db.from("box_codes").delete().in("redeemed_by", chunk);
    await db.from("players").delete().in("id", chunk); // photos rows cascade
  }
  return ids.length;
}
