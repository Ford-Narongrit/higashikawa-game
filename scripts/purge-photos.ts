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
import { listAllPhotoPaths, removePhotoFiles } from "../lib/storage-purge";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

async function main() {
  const paths = await listAllPhotoPaths(db);
  const { count } = await db.from("photos").select("id", { count: "exact", head: true });
  console.log(`Found ${paths.length} files in storage and ${count ?? 0} rows in photos.`);
  if (!paths.length && !count) return console.log("Nothing to delete.");

  if (!process.argv.includes("--yes")) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question("Type DELETE to permanently remove all photos: ");
    rl.close();
    if (answer.trim() !== "DELETE") return console.log("Cancelled.");
  }

  await removePhotoFiles(db, paths);
  const { error } = await db.from("photos").delete().not("id", "is", null);
  if (error) throw error;

  const left = await listAllPhotoPaths(db);
  console.log(`Done. Files left in storage: ${left.length}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
