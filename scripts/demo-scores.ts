/**
 * Sends fake score events so you can watch the /screen leaderboard animations.
 *   npm run demo:scores          → a mixed burst (admin, box, photo, a minus)
 *   npm run demo:scores -- flood → 25 photo/box events at once (tests merging)
 *   npm run demo:scores -- clean → delete every DEMO event
 * Events are labelled "DEMO" so they never mix with real ones.
 */
import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});
const mode = process.argv[2] ?? "mixed";
const names = ["Anna", "Bao", "Chen", "Dewi", "Emre", "Farah", "Giang", "Hiro"];
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const team = () => 1 + Math.floor(Math.random() * 4);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Ev = { team_id: number; points: number; kind: string; label: string; player_name?: string };

async function send(ev: Ev) {
  const { error } = await db.from("score_events").insert({ ...ev, label: `DEMO ${ev.label}` });
  if (error) throw error;
}

async function main() {
  if (mode === "clean") {
    const { error, count } = await db.from("score_events").delete({ count: "exact" }).like("label", "DEMO%");
    if (error) throw error;
    console.log(`deleted ${count} demo events`);
    return;
  }
  if (mode === "flood") {
    const evs: Ev[] = Array.from({ length: 25 }, () => {
      const box = Math.random() < 0.4;
      return box
        ? { team_id: team(), points: pick([10, 20, 50, 100]), kind: "box", label: "プレゼント", player_name: pick(names) }
        : { team_id: team(), points: 5, kind: "photo", label: "しゃしん", player_name: pick(names) };
    });
    const { error } = await db.from("score_events").insert(evs.map((e) => ({ ...e, label: `DEMO ${e.label}` })));
    if (error) throw error;
    console.log("sent 25 events at once");
    return;
  }
  const script: Ev[] = [
    { team_id: 2, points: 300, kind: "admin", label: "ゲーム1 1位" },
    { team_id: 1, points: 50, kind: "box", label: "プレゼント", player_name: pick(names) },
    { team_id: 3, points: 5, kind: "photo", label: "しゃしん", player_name: pick(names) },
    { team_id: 4, points: -30, kind: "box", label: "プレゼント", player_name: pick(names) },
    { team_id: 4, points: 200, kind: "admin", label: "ゲーム1 2位" },
  ];
  for (const ev of script) {
    await send(ev);
    console.log("sent", ev.kind, ev.team_id, ev.points);
    await sleep(800);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
