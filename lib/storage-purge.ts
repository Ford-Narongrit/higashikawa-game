import type { SupabaseClient } from "@supabase/supabase-js";

// No "server-only" import so scripts/ (run with tsx) can use it too. Needs a service-role client.

const BUCKET = "photos";

/** Files live at <player_id>/<uuid>.jpg, so list each top-level folder. */
export async function listAllPhotoPaths(db: SupabaseClient): Promise<string[]> {
  const paths: string[] = [];
  const { data: folders, error } = await db.storage.from(BUCKET).list("", { limit: 10_000 });
  if (error) throw error;
  for (const folder of folders ?? []) {
    if (folder.id) {
      paths.push(folder.name); // a file at the root
      continue;
    }
    for (let offset = 0; ; offset += 1000) {
      const { data: files, error: e } = await db.storage.from(BUCKET).list(folder.name, { limit: 1000, offset });
      if (e) throw e;
      paths.push(...(files ?? []).map((f) => `${folder.name}/${f.name}`));
      if (!files || files.length < 1000) break;
    }
  }
  return paths;
}

/** Deletes the given paths (default: every file in the bucket). Returns how many were removed. */
export async function removePhotoFiles(db: SupabaseClient, paths?: string[]): Promise<number> {
  const all = paths ?? (await listAllPhotoPaths(db));
  for (let i = 0; i < all.length; i += 100) {
    const { error } = await db.storage.from(BUCKET).remove(all.slice(i, i + 100));
    if (error) throw error;
  }
  return all.length;
}
