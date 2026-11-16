/**
 * Seeds fake players + photos straight into Supabase (no browser needed) to try the 3D tree,
 * the photo review queue and the leaderboard with many photos.
 *
 *   npm run seed-photos                      → 60 approved photos (gives photo points like a real approve)
 *   npm run seed-photos -- --count 450       → 450 photos (225 players × 2)
 *   npm run seed-photos -- --status pending  → leave them in the review queue
 *   npm run seed-photos -- --status mixed    → 70% approved, 20% pending, 10% rejected
 *   npm run seed-photos -- --dir ~/Pictures/party   → use your own .jpg files instead of generated ones
 *   npm run seed-photos -- --clean           → delete every SEED- player with their photos and points
 *
 * ⚠ .env.local points at the same Supabase project as Vercel, so seeded data shows up there too.
 *   Run --clean (or the admin RESET) before the real event.
 */
import { randomBytes, randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import jpeg from "jpeg-js";
import { deleteTestPlayers } from "./test-data";

const arg = (name: string, fallback?: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const PREFIX = "SEED-";
const COUNT = Number(arg("count", "60"));
const STATUS = arg("status", "approved") as "approved" | "pending" | "mixed";
const DIR = arg("dir")?.replace(/^~(?=\/|$)/, homedir());

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

// ---- generated images ---------------------------------------------------------
// 3×5 pixel digits, scaled up, so each fake photo shows its number.
const DIGITS = ["111101101101111", "010110010010111", "111001111100111", "111001111001111", "101101111001001",
  "111100111001111", "111100111101111", "111001001001001", "111101111101111", "111101111001111"];

function hsl(h: number, s: number, l: number): [number, number, number] {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return [f(0), f(8), f(4)];
}

function makeJpeg(n: number, size: number): Buffer {
  const data = Buffer.alloc(size * size * 4);
  const hue = (n * 47) % 360;
  const label = String(n);
  const cell = Math.floor(size / 22);
  const textW = label.length * 4 * cell - cell;
  const ox = Math.floor((size - textW) / 2);
  const oy = Math.floor((size - 5 * cell) / 2);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const t = (x + y) / (2 * size);
      let [r, g, b] = hsl((hue + t * 70) % 360, 0.65, 0.35 + t * 0.25);
      // soft "bokeh" circles
      for (let c = 0; c < 3; c++) {
        const cx = ((n * 97 + c * 211) % 100) / 100 * size;
        const cy = ((n * 53 + c * 137) % 100) / 100 * size;
        if ((x - cx) ** 2 + (y - cy) ** 2 < (size * 0.12) ** 2) [r, g, b] = [r + 40, g + 40, b + 40];
      }
      // the number
      const gx = Math.floor((x - ox) / cell);
      const gy = Math.floor((y - oy) / cell);
      if (gy >= 0 && gy < 5 && gx >= 0 && gx < label.length * 4 && gx % 4 < 3) {
        const d = DIGITS[Number(label[Math.floor(gx / 4)])];
        if (d[gy * 3 + (gx % 4)] === "1") [r, g, b] = [255, 255, 255];
      }
      const i = (y * size + x) * 4;
      data[i] = Math.min(255, r);
      data[i + 1] = Math.min(255, g);
      data[i + 2] = Math.min(255, b);
      data[i + 3] = 255;
    }
  }
  return jpeg.encode({ data, width: size, height: size }, 80).data;
}

// ---- main ---------------------------------------------------------------------
async function pool<T>(items: T[], limit: number, fn: (item: T, i: number) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        await fn(items[i], i);
      }
    }),
  );
}

function statusFor(i: number): "approved" | "pending" | "rejected" {
  if (STATUS !== "mixed") return STATUS;
  const r = (i * 37) % 10;
  return r < 7 ? "approved" : r < 9 ? "pending" : "rejected";
}

async function main() {
  if (process.argv.includes("--clean")) {
    const n = await deleteTestPlayers(db, PREFIX);
    return console.log(`Removed ${n} SEED- players with their photos and photo points.`);
  }
  if (!Number.isInteger(COUNT) || COUNT < 1 || COUNT > 1000) throw new Error("--count must be 1–1000");
  if (!["approved", "pending", "mixed"].includes(STATUS)) throw new Error("--status approved|pending|mixed");

  const files = DIR
    ? readdirSync(DIR)
        .filter((f) => /\.jpe?g$/i.test(f))
        .map((f) => join(DIR, f))
    : [];
  if (DIR && !files.length) throw new Error(`No .jpg files in ${DIR}`);

  // Number seeds after any that already exist so repeated runs keep adding.
  const { count: existing } = await db.from("players").select("id", { count: "exact", head: true }).like("name", `${PREFIX}%`);
  const start = existing ?? 0;
  const playerCount = Math.ceil(COUNT / 2);
  const { data: players, error } = await db
    .from("players")
    .insert(
      Array.from({ length: playerCount }, (_, k) => ({
        name: `${PREFIX}${start + k + 1}`,
        room: "ABCDEF"[(start + k) % 6],
        team_id: ((start + k) % 4) + 1,
        pin_hash: "seed", // can't log in as a seed player
        token_hash: randomBytes(32).toString("hex"),
      })),
    )
    .select("id, team_id");
  if (error) throw error;

  console.log(`Uploading ${COUNT} photos for ${playerCount} SEED- players…`);
  const bucket = db.storage.from("photos");
  let done = 0;
  const photoIds: { id: string; status: ReturnType<typeof statusFor> }[] = [];

  await pool(Array.from({ length: COUNT }, (_, i) => i), 8, async (i) => {
    const player = players[Math.floor(i / 2)];
    const n = start * 2 + i + 1;
    const full = files.length ? readFileSync(files[i % files.length]) : makeJpeg(n, 800);
    const thumb = files.length ? full : makeJpeg(n, 400);
    const id = randomUUID();
    const path = `${player.id}/${id}.jpg`;
    const thumb_path = `${player.id}/${id}_t.jpg`;
    for (const [p, body] of [
      [path, full],
      [thumb_path, thumb],
    ] as const) {
      const { error: e } = await bucket.upload(p, body, { contentType: "image/jpeg", upsert: true });
      if (e) throw e;
    }
    const { data: row, error: e } = await db
      .from("photos")
      .insert({ player_id: player.id, team_id: player.team_id, path, thumb_path })
      .select("id")
      .single();
    if (e) throw e;
    photoIds.push({ id: row.id, status: statusFor(i) });
    if (++done % 25 === 0 || done === COUNT) console.log(`  ${done}/${COUNT}`);
  });

  // Review through the same DB functions /admin uses (approve awards photo points).
  const approved = photoIds.filter((p) => p.status === "approved");
  const rejected = photoIds.filter((p) => p.status === "rejected");
  await pool(approved, 8, async (p) => void (await db.rpc("approve_photo", { p_photo_id: p.id })));
  await pool(rejected, 8, async (p) => void (await db.rpc("reject_photo", { p_photo_id: p.id })));

  console.log(
    `Done: ${approved.length} approved, ${photoIds.length - approved.length - rejected.length} pending, ${rejected.length} rejected.`,
  );
  console.log("Remove later with: npm run seed-photos -- --clean");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
