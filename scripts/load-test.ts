/**
 * Load test for event day. Creates fake players named "LT-…", runs the scenarios below against
 * a deployed URL (or localhost), prints latency stats, then deletes everything it created.
 *
 *   npm run load-test                                   → against NEXT_PUBLIC_SITE_URL
 *   npm run load-test -- --url http://localhost:3000
 *   npm run load-test -- --players 200 --photos 100 --poll 30
 *   npm run load-test -- --keep                         → skip cleanup (to look at /screen)
 *   npm run load-test -- --clean                        → only delete leftover LT- data
 *
 * Scenarios:
 *   1. N players join at the same moment
 *   2. everyone "reopens the tab" (GET /api/me with saved token), 50 rejoin with PIN on a new device
 *   3. M players upload a photo at the same moment (signed upload URLs, 2 files each)
 *   4. 20 players redeem the SAME box code at once → exactly 1 must succeed
 *   5. all players poll /api/me every 5s for P seconds (steady state during the event)
 *
 * It temporarily switches photo_open/box_open on and restores them afterwards. Players without a
 * team get one through the admin API (it never presses "reveal").
 */
import { createClient } from "@supabase/supabase-js";
import { removePhotoFiles } from "../lib/storage-purge";

const arg = (name: string, fallback?: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const flag = (name: string) => process.argv.includes(`--${name}`);

const BASE = (arg("url") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const PLAYERS = Number(arg("players", "200"));
const PHOTOS = Math.min(Number(arg("photos", "100")), PLAYERS);
const POLL_SECONDS = Number(arg("poll", "30"));
const PREFIX = "LT-";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const db = createClient(SB_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

// ---- helpers ----------------------------------------------------------------
type Sample = { ms: number; status: number };
const results: { name: string; samples: Sample[] }[] = [];

async function timed(fn: () => Promise<Response>): Promise<Sample & { res?: Response }> {
  const t = performance.now();
  try {
    const res = await fn();
    return { ms: performance.now() - t, status: res.status, res };
  } catch {
    return { ms: performance.now() - t, status: 0 };
  }
}

function record(name: string, samples: Sample[]) {
  results.push({ name, samples });
  const ms = samples.map((s) => s.ms).sort((a, b) => a - b);
  const pct = (p: number) => Math.round(ms[Math.min(ms.length - 1, Math.floor(ms.length * p))] ?? 0);
  const byStatus = samples.reduce<Record<number, number>>((m, s) => ((m[s.status] = (m[s.status] ?? 0) + 1), m), {});
  console.log(
    `  ${name.padEnd(34)} n=${String(samples.length).padStart(4)}  p50=${String(pct(0.5)).padStart(5)}ms  p95=${String(pct(0.95)).padStart(5)}ms  max=${String(pct(1)).padStart(5)}ms  ${JSON.stringify(byStatus)}`,
  );
}

async function pool<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}

const json = (body: unknown) => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

let cookie = "";
const admin = (path: string, method = "GET", body?: unknown) =>
  fetch(`${BASE}${path}`, {
    method,
    headers: { cookie, ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });

// A ~250KB "photo" (JPEG header + random bytes): realistic upload size, storage doesn't decode it.
function fakeJpeg(bytes: number) {
  const buf = Buffer.alloc(bytes);
  for (let i = 0; i < bytes; i += 4) buf.writeUInt32LE((Math.random() * 2 ** 32) >>> 0, i);
  buf[0] = 0xff;
  buf[1] = 0xd8;
  return buf;
}

// ---- cleanup ----------------------------------------------------------------
async function cleanup() {
  const { data: players } = await db.from("players").select("id").like("name", `${PREFIX}%`).limit(5000);
  const ids = (players ?? []).map((p) => p.id);
  if (!ids.length) return console.log("  nothing to clean");
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const { data: photos } = await db.from("photos").select("path, thumb_path").in("player_id", chunk);
    const paths = (photos ?? []).flatMap((p) => [p.path, p.thumb_path]);
    // also catch files whose upload finished but were never registered
    for (const id of chunk) {
      const { data: files } = await db.storage.from("photos").list(id, { limit: 100 });
      paths.push(...(files ?? []).map((f) => `${id}/${f.name}`));
    }
    if (paths.length) await removePhotoFiles(db, [...new Set(paths)]);
    await db.from("score_events").delete().in("player_id", chunk);
    await db.from("box_codes").delete().in("redeemed_by", chunk);
    await db.from("players").delete().in("id", chunk);
  }
  console.log(`  removed ${ids.length} LT- players with their photos, scores and box codes`);
}

// ---- main -------------------------------------------------------------------
async function main() {
  console.log(`Target: ${BASE}`);
  if (flag("clean")) return cleanup();

  const login = await fetch(`${BASE}/api/admin/login`, json({ password: process.env.ADMIN_PASSWORD }));
  if (!login.ok) throw new Error(`admin login failed (${login.status}) — is ADMIN_PASSWORD the same as on ${BASE}?`);
  cookie = login.headers.get("set-cookie")!.split(";")[0];
  const original = await (await admin("/api/admin/state")).json();

  try {
    // 1. join burst
    console.log(`\n1) ${PLAYERS} players join at once`);
    const joins = await Promise.all(
      Array.from({ length: PLAYERS }, (_, i) =>
        timed(() =>
          fetch(`${BASE}/api/join`, json({ name: `${PREFIX}${i}`, room: "ABCDEF"[i % 6], force: true })),
        ),
      ),
    );
    record("POST /api/join", joins);
    const players = await Promise.all(
      joins.map(async (j, i) => ({ i, ...((await j.res?.json().catch(() => ({}))) as { token?: string; pin?: string }) })),
    );
    const ok = players.filter((p) => p.token);
    if (ok.length < PLAYERS) console.log(`  ⚠ only ${ok.length}/${PLAYERS} joined`);

    // 2. reopen tab + rejoin on a new device
    console.log("\n2) everyone reopens the tab, 50 rejoin with PIN");
    record(
      "GET /api/me (saved token)",
      await Promise.all(ok.map((p) => timed(() => fetch(`${BASE}/api/me`, { headers: { authorization: `Bearer ${p.token}` } })))),
    );
    const movers = ok.slice(0, 50);
    const rejoins = await Promise.all(
      movers.map((p) =>
        timed(() => fetch(`${BASE}/api/rejoin`, json({ name: `${PREFIX}${p.i}`, room: "ABCDEF"[p.i % 6], pin: p.pin }))),
      ),
    );
    record("POST /api/rejoin (PIN)", rejoins);
    await Promise.all(
      rejoins.map(async (r, k) => {
        const t = ((await r.res?.json().catch(() => ({}))) as { token?: string }).token;
        if (t) movers[k].token = t;
      }),
    );

    // give everyone a team (without pressing reveal) so photo/box scenarios can run
    const { data: rows } = await db.from("players").select("id, name, team_id").like("name", `${PREFIX}%`);
    const teamless = (rows ?? []).filter((r) => !r.team_id);
    await pool(teamless, 20, (r, i) => admin(`/api/admin/players/${r.id}`, "PATCH", { team_id: (i % 4) + 1 }));

    // 3. photo burst
    console.log(`\n3) ${PHOTOS} players upload a photo at once`);
    await admin("/api/admin/state", "PATCH", { photo_open: true, box_open: true });
    const full = fakeJpeg(250_000);
    const thumb = fakeJpeg(30_000);
    const urlSamples: Sample[] = [];
    const putSamples: Sample[] = [];
    const doneSamples: Sample[] = [];
    await Promise.all(
      ok.slice(0, PHOTOS).map(async (p) => {
        const auth = { authorization: `Bearer ${p.token}` };
        const u = await timed(() => fetch(`${BASE}/api/photos/upload-url`, { method: "POST", headers: auth }));
        urlSamples.push(u);
        if (u.status !== 200) return;
        const target = await u.res!.json();
        for (const [f, body] of [
          [target.full, full],
          [target.thumb, thumb],
        ] as const) {
          putSamples.push(
            await timed(() =>
              fetch(`${SB_URL}/storage/v1/object/upload/sign/photos/${f.path}?token=${f.token}`, {
                method: "PUT",
                headers: { "content-type": "image/jpeg", "x-upsert": "true" },
                body,
              }),
            ),
          );
        }
        doneSamples.push(
          await timed(() =>
            fetch(`${BASE}/api/photos`, { ...json({ id: target.id }), headers: { ...auth, "content-type": "application/json" } }),
          ),
        );
      }),
    );
    record("POST /api/photos/upload-url", urlSamples);
    record("PUT storage (signed upload)", putSamples);
    record("POST /api/photos (submit)", doneSamples);

    // 4. same box code × 20
    console.log("\n4) 20 players redeem the same box code at once");
    const gen = await (await admin("/api/admin/boxes", "POST", { count: 1 })).json();
    const { data: codeRow } = await db.from("box_codes").select("id, code").gte("created_at", gen.since).limit(1).single();
    const redeems = await Promise.all(
      ok.slice(0, 20).map((p) =>
        timed(() =>
          fetch(`${BASE}/api/box/redeem`, {
            ...json({ code: codeRow!.code }),
            headers: { authorization: `Bearer ${p.token}`, "content-type": "application/json" },
          }),
        ),
      ),
    );
    record("POST /api/box/redeem (same code)", redeems);
    const wins = redeems.filter((r) => r.status === 200).length;
    console.log(`  ${wins === 1 ? "✅" : "❌"} successes: ${wins} (must be exactly 1)`);
    // the code was redeemed by an LT- player, so cleanup removes it; delete it now if nobody won
    if (wins === 0) await db.from("box_codes").delete().eq("id", codeRow!.id);

    // 5. steady polling
    if (POLL_SECONDS > 0) {
      console.log(`\n5) ${ok.length} players poll /api/me every 5s for ${POLL_SECONDS}s`);
      const polls: Sample[] = [];
      const end = Date.now() + POLL_SECONDS * 1000;
      await Promise.all(
        ok.map(async (p, k) => {
          await new Promise((r) => setTimeout(r, (k / ok.length) * 5000)); // spread like real phones
          while (Date.now() < end) {
            polls.push(await timed(() => fetch(`${BASE}/api/me`, { headers: { authorization: `Bearer ${p.token}` } })));
            await new Promise((r) => setTimeout(r, 5000));
          }
        }),
      );
      record("GET /api/me (polling)", polls);
    }
  } finally {
    await admin("/api/admin/state", "PATCH", { photo_open: original.photo_open, box_open: original.box_open });
    if (flag("keep")) {
      console.log("\n--keep: test data left in place. Remove later with: npm run load-test -- --clean");
    } else {
      console.log("\nCleanup");
      await cleanup();
    }
  }

  const failures = results.flatMap((r) => r.samples).filter((s) => s.status === 0 || s.status >= 500).length;
  console.log(`\n${failures === 0 ? "✅ no network errors or 5xx" : `❌ ${failures} requests failed (status 0 or 5xx)`}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
