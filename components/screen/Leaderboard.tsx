"use client";
import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { copy } from "@/lib/copy";
import { playSound } from "@/lib/sound";
import { supabaseBrowser } from "@/lib/supabase/client";
import { TEAMS, teamById } from "@/lib/teams";
import type { ScoreEvent, ScoreKind } from "@/lib/types";
import { useLiveRefresh } from "@/lib/useLiveRefresh";

/** One animation on screen; several same-kind events for one team may be merged. */
type QueueItem = {
  key: number;
  kind: ScoreKind;
  team_id: number;
  points: number;
  count: number;
  label: string | null;
  player_name: string | null;
  photo_id: string | null;
};

const DURATION: Record<ScoreKind, number> = { box: 3600, photo: 2200, admin: 3800 };
/** Above this many waiting items, merge same team+kind box/photo events and speed up. */
const BUSY_QUEUE = 3;

function toItem(e: ScoreEvent): QueueItem {
  return {
    key: e.id,
    kind: e.kind,
    team_id: e.team_id,
    points: e.points,
    count: 1,
    label: e.label,
    player_name: e.player_name,
    photo_id: e.photo_id,
  };
}

function takeNext(queue: QueueItem[]): QueueItem | undefined {
  const head = queue.shift();
  if (!head || head.kind === "admin" || queue.length < BUSY_QUEUE) return head;
  const merged = { ...head };
  for (let i = queue.length - 1; i >= 0; i--) {
    const q = queue[i];
    if (q.kind === head.kind && q.team_id === head.team_id) {
      merged.points += q.points;
      merged.count += q.count;
      queue.splice(i, 1);
    }
  }
  return merged;
}

const EMPTY: Record<number, number> = Object.fromEntries(TEAMS.map((t) => [t.id, 0]));

function totalsUpTo(events: ScoreEvent[], maxId: number): Record<number, number> {
  const totals = { ...EMPTY };
  for (const e of events) if (!e.voided && e.id <= maxId) totals[e.team_id] = (totals[e.team_id] ?? 0) + e.points;
  return totals;
}

/**
 * Totals and the animation queue both come from one read of score_events, so a bar can never
 * count an event twice. Events up to `lastId` are "settled"; newer ones are queued and added to
 * the bar as their animation plays. When the queue is idle the bars snap to the settled totals
 * (this is also how voids show up).
 */
export function Leaderboard() {
  const [displayed, setDisplayed] = useState<Record<number, number>>(EMPTY);
  const [current, setCurrent] = useState<QueueItem | null>(null);
  const queue = useRef<QueueItem[]>([]);
  const busy = useRef(false);
  const lastId = useRef<number | null>(null);
  const settled = useRef<Record<number, number>>(EMPTY);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  // Signed thumbnail URLs for queued photo events, fetched as soon as they're queued.
  const loadThumbs = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    try {
      const res = await fetch(`/api/screen/thumbs?ids=${ids.join(",")}`, { cache: "no-store" });
      if (res.ok) {
        const map = await res.json();
        setThumbs((t) => ({ ...t, ...map }));
      }
    } catch {}
  }, []);

  const pump = useCallback(() => {
    const step = () => {
      if (busy.current) return;
      const item = takeNext(queue.current);
      if (!item) {
        setDisplayed(settled.current);
        return;
      }
      busy.current = true;
      const speed = queue.current.length > BUSY_QUEUE ? 0.6 : 1;
      const dur = DURATION[item.kind] * speed;
      setCurrent(item);
      playSound(item.points < 0 ? "minus" : item.kind);
      setTimeout(() => {
        setDisplayed((d) => ({ ...d, [item.team_id]: (d[item.team_id] ?? 0) + item.points }));
      }, dur * (item.kind === "box" ? 0.45 : 0.3));
      setTimeout(() => {
        setCurrent(null);
        busy.current = false;
        setTimeout(step, 250);
      }, dur);
    };
    step();
  }, []);

  // Single-flight so overlapping realtime/poll triggers can't queue an event twice.
  const fetching = useRef(false);
  const again = useRef(false);
  const sync = useCallback(async () => {
    if (fetching.current) {
      again.current = true;
      return;
    }
    fetching.current = true;
    try {
      const { data } = await supabaseBrowser()
        .from("score_events")
        .select("id, team_id, points, kind, label, player_name, photo_id, voided, created_at")
        .order("id")
        .limit(10_000)
        .returns<ScoreEvent[]>();
      if (!data) return;
      const maxId = data.length ? data[data.length - 1].id : 0;

      if (lastId.current === null) {
        lastId.current = maxId; // first load: show current totals without replaying history
      } else if (maxId > lastId.current) {
        const prev = lastId.current;
        const fresh = data.filter((e) => e.id > prev && !e.voided);
        loadThumbs(fresh.flatMap((e) => (e.photo_id ? [e.photo_id] : [])));
        queue.current.push(...fresh.map(toItem));
        lastId.current = maxId;
      }
      settled.current = totalsUpTo(data, lastId.current);
      if (busy.current || queue.current.length) pump();
      else setDisplayed(settled.current);
    } finally {
      fetching.current = false;
      if (again.current) {
        again.current = false;
        sync();
      }
    }
  }, [pump, loadThumbs]);

  useLiveRefresh(sync, { tables: ["score_events"], connectedMs: 10_000, fallbackMs: 5_000 });

  const values = TEAMS.map((t) => displayed[t.id] ?? 0);
  const max = Math.max(100, ...values);
  const ranks = values.map((v) => values.filter((o) => o > v).length + 1);

  return (
    <div className="relative flex h-full flex-col px-[4vw] pb-[4vh] pt-[3vh]">
      <h1 className="text-center text-[3vw] font-black tracking-widest">{copy.screen.leaderboard}</h1>
      <div className="grid flex-1 grid-cols-4 items-end gap-[3vw]">
        {TEAMS.map((team, i) => {
          const value = values[i];
          const active = current?.team_id === team.id;
          return (
            <div key={team.id} className="flex h-full flex-col items-center justify-end">
              <motion.span
                key={value}
                initial={{ scale: active ? 1.4 : 1 }}
                animate={{ scale: 1 }}
                className="mb-[1vh] text-[4.5vw] font-black tabular-nums"
              >
                {value}
              </motion.span>
              <motion.div
                className="w-full rounded-t-[1vw]"
                style={{ background: team.color, boxShadow: active ? `0 0 4vw ${team.color}` : "none" }}
                animate={{ height: `${Math.max(2, (Math.max(0, value) / max) * 58)}vh` }}
                transition={{ type: "spring", stiffness: 60, damping: 14 }}
              />
              <div className="mt-[1.5vh] flex items-center gap-[0.8vw]">
                <span className="text-[4vw] leading-none" style={{ color: team.color }}>
                  {team.symbol}
                </span>
                <span className="text-[2vw] font-black">{team.name_ja}</span>
                <span className="rounded-full bg-white/15 px-[0.8vw] text-[1.6vw] font-bold">{ranks[i]}位</span>
              </div>
            </div>
          );
        })}
      </div>

      <AnimatePresence>{current && <EventOverlay key={current.key} item={current} thumb={current.photo_id ? thumbs[current.photo_id] : undefined} />}</AnimatePresence>
    </div>
  );
}

function pointsText(points: number) {
  return points >= 0 ? `+${points}` : `${points}`;
}

function EventOverlay({ item, thumb }: { item: QueueItem; thumb?: string }) {
  const team = teamById(item.team_id)!;
  const teamIndex = TEAMS.findIndex((t) => t.id === team.id);
  const negative = item.points < 0;
  const kindName = copy.screen.kind[item.kind];
  const headline =
    item.kind === "admin" ? item.label || kindName : item.count > 1 ? `${kindName} ×${item.count}` : kindName;

  return (
    <motion.div
      className="pointer-events-none absolute inset-0 flex flex-col items-center justify-start pt-[12vh]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {item.kind === "box" && item.count === 1 && (
        <motion.div
          className="text-[14vw] leading-none"
          initial={{ scale: 0.6, rotate: 0 }}
          animate={{
            scale: [0.6, 1, 1, 1, 1, 1.6, 0],
            rotate: [0, -12, 12, -12, 12, 0, 0],
            opacity: [1, 1, 1, 1, 1, 1, 0],
          }}
          transition={{ duration: 1.5, times: [0, 0.15, 0.3, 0.45, 0.6, 0.85, 1] }}
        >
          🎁
        </motion.div>
      )}

      {item.kind === "photo" && (
        <motion.div
          className="absolute w-[14vw] text-center text-[8vw]"
          initial={{ left: "43vw", top: "28vh", scale: 1.4, opacity: 1 }}
          animate={{ left: `${4 + teamIndex * 23.75 + 10.4 - 7}vw`, top: "70vh", scale: 0.3, opacity: 0 }}
          transition={{ duration: 1.1, ease: "easeIn", delay: 0.5 }}
        >
          {thumb && item.count === 1 ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed private URL
            <img
              src={thumb}
              alt=""
              className="aspect-square w-full rounded-[1vw] border-[0.4vw] border-white object-cover shadow-2xl"
            />
          ) : (
            "📸"
          )}
        </motion.div>
      )}

      <motion.div
        className="flex flex-col items-center gap-[1vh] rounded-[2vw] px-[4vw] py-[3vh] shadow-2xl"
        style={{ background: `${team.color}ee` }}
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1, x: negative ? [0, -20, 20, -20, 20, 0] : 0 }}
        transition={{ delay: item.kind === "box" && item.count === 1 ? 1.3 : 0, type: "spring", stiffness: 200 }}
      >
        <span className="text-[3.5vw] font-black">
          {team.symbol} {team.name_ja}
        </span>
        <span className="text-[4vw] font-black">{headline}</span>
        <span className={`text-[9vw] font-black leading-none ${negative ? "text-black" : ""}`}>
          {pointsText(item.points)}
        </span>
        {item.player_name && item.count === 1 && (
          <span className="text-[2.6vw] font-bold opacity-90">{item.player_name}</span>
        )}
      </motion.div>
    </motion.div>
  );
}
