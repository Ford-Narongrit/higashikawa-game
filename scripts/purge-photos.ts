/**
 * Deletes EVERY photo: all files in the private `photos` bucket and all rows in `photos`.
 * Score events from photos are kept (photo_id becomes null), so team totals don't change.
 *
 *   npm run purge-photos            → asks you to type DELETE
 *   npm run purge-photos -- --yes   → no prompt (for scripts)
 *
 * Run within 30 days after the event (or as the school requires).
 */
import { createInterface } from "node:readline/promises";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "photos";
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

/** Files live at <player_id>/<uuid>.jpg, so list each top-level folder. */
async function listAllPaths(): Promise<string[]> {
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

async function main() {
  const paths = await listAllPaths();
  const { count } = await db.from("photos").select("id", { count: "exact", head: true });
  console.log(`Found ${paths.length} files in storage and ${count ?? 0} rows in photos.`);
  if (!paths.length && !count) return console.log("Nothing to delete.");

  if (!process.argv.includes("--yes")) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question('Type DELETE to permanently remove all photos: ');
    rl.close();
    if (answer.trim() !== "DELETE") return console.log("Cancelled.");
  }

  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await db.storage.from(BUCKET).remove(paths.slice(i, i + 100));
    if (error) throw error;
  }
  const { error } = await db.from("photos").delete().not("id", "is", null);
  if (error) throw error;

  const left = await listAllPaths();
  console.log(`Done. Files left in storage: ${left.length}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
