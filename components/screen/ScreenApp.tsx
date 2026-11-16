"use client";
import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import QRCode from "qrcode";
import { copy } from "@/lib/copy";
import { TEAMS } from "@/lib/teams";
import { enableSound } from "@/lib/sound";
import type { GameState, ScreenPlayer, Team, TeamScore } from "@/lib/types";
import { useLiveRefresh } from "@/lib/useLiveRefresh";
import { Leaderboard } from "./Leaderboard";

// three.js only runs in the browser; also keeps it out of the bundle until the tree is shown.
const TreeView = dynamic(() => import("./tree/TreeView").then((m) => m.TreeView), { ssr: false });

type ScreenData = { state: GameState; scores: TeamScore[]; players: ScreenPlayer[] };

export function ScreenApp() {
  const [data, setData] = useState<ScreenData | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/screen", { cache: "no-store" });
      if (res.status === 401) location.href = "/admin/login?next=/screen";
      if (res.ok) setData(await res.json());
    } catch {
      // keep last frame on screen
    }
  }, []);
  // Joins aren't pushed via realtime (players table is private), so poll briskly.
  useLiveRefresh(refresh, { connectedMs: 3_000, fallbackMs: 3_000 });

  return (
    <div
      className={`fixed inset-0 overflow-hidden bg-[#07070c] text-white select-none ${
        data?.state.screen_view === "tree" ? "cursor-none" : ""
      }`}
      onDoubleClick={() =>
        document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()
      }
    >
      {data && (
        <AnimatePresence mode="wait">
          <motion.div
            key={data.state.screen_view}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {data.state.screen_view === "join" && <JoinView players={data.players} />}
            {data.state.screen_view === "teams" && (
              <TeamsView players={data.players} revealed={data.state.teams_revealed} />
            )}
            {data.state.screen_view === "leaderboard" && <Leaderboard />}
            {data.state.screen_view === "tree" && <TreeView />}
          </motion.div>
        </AnimatePresence>
      )}
      {/* The tree is the group-photo backdrop: no UI and no cursor on top of it. */}
      {data?.state.screen_view !== "tree" && <SoundToggle />}
    </div>
  );
}

/** Browsers block audio until a click, so sound starts OFF and Ford clicks once to enable. */
function SoundToggle() {
  const [on, setOn] = useState(false);
  return (
    <button
      onClick={() => {
        enableSound(!on);
        setOn(!on);
      }}
      onDoubleClick={(e) => e.stopPropagation()}
      className={`absolute bottom-[1.5vh] right-[1vw] z-50 rounded-full bg-white/10 px-[1vw] py-[0.6vh] text-[1.4vw] transition ${
        on ? "opacity-20 hover:opacity-100" : "opacity-90"
      }`}
    >
      {on ? "🔊" : `🔇 ${copy.screen.soundOff}`}
    </button>
  );
}

function JoinView({ players }: { players: ScreenPlayer[] }) {
  const [svg, setSvg] = useState("");
  const url = process.env.NEXT_PUBLIC_SITE_URL || (typeof location !== "undefined" ? location.origin : "");

  useEffect(() => {
    QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" }).then(setSvg);
  }, [url]);

  const recent = players.slice(-8).reverse();

  return (
    <div className="grid h-full grid-cols-[1fr_1fr] items-center gap-[4vw] px-[5vw]">
      <div className="flex flex-col items-center gap-[2vh]">
        <p className="text-[3vw] font-black">{copy.screen.scanTitle}</p>
        <div
          className="aspect-square w-[min(38vw,70vh)] rounded-[2vw] bg-white p-[1.5vw] [&>svg]:h-full [&>svg]:w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <p className="font-mono text-[1.6vw] text-zinc-400">{url.replace(/^https?:\/\//, "")}</p>
      </div>

      <div className="flex h-full flex-col justify-center gap-[3vh]">
        <p className="text-[2.5vw] tracking-[0.3em] text-zinc-500">♠ ♥ ♦ ♣</p>
        <div className="flex items-baseline gap-[1vw]">
          <motion.span
            key={players.length}
            initial={{ scale: 1.25, color: "#facc15" }}
            animate={{ scale: 1, color: "#ffffff" }}
            className="text-[11vw] font-black leading-none tabular-nums"
          >
            {players.length}
          </motion.span>
          <span className="text-[3vw] font-bold text-zinc-400">
            {copy.screen.joinedLabel}
          </span>
        </div>
        <ul className="flex flex-col gap-[1vh] overflow-hidden">
          <AnimatePresence initial={false}>
            {recent.map((p, i) => (
              <motion.li
                key={p.id}
                layout
                initial={{ opacity: 0, x: 80 }}
                animate={{ opacity: 1 - i * 0.11, x: 0 }}
                exit={{ opacity: 0 }}
                className="truncate text-[2.2vw] font-bold"
              >
                {p.name} <span className="text-zinc-500">({p.room})</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </div>
    </div>
  );
}

function TeamsView({ players, revealed }: { players: ScreenPlayer[]; revealed: boolean }) {
  const byTeam = new Map<number, ScreenPlayer[]>(TEAMS.map((t) => [t.id, []]));
  for (const p of players) if (p.team_id) byTeam.get(p.team_id)?.push(p);
  const largest = Math.max(1, ...[...byTeam.values()].map((l) => l.length));
  // Two name columns per team; shrink text so the biggest team fits the 16:9 frame.
  const fontVh = Math.min(3, 62 / Math.ceil(largest / 2));

  return (
    <div className="flex h-full flex-col gap-[2vh] p-[2vw]">
      {!revealed && (
        <p className="text-center text-[2.4vw] font-bold text-zinc-400">{copy.screen.teamsWaiting}</p>
      )}
      <div className="grid flex-1 grid-cols-4 gap-[1.5vw]">
        {TEAMS.map((team, i) => (
          <TeamColumn
            key={team.id}
            team={team}
            members={byTeam.get(team.id) ?? []}
            revealed={revealed}
            delay={i * 0.6}
            fontVh={fontVh}
          />
        ))}
      </div>
    </div>
  );
}

function TeamColumn({
  team,
  members,
  revealed,
  delay,
  fontVh,
}: {
  team: Team;
  members: ScreenPlayer[];
  revealed: boolean;
  delay: number;
  fontVh: number;
}) {
  return (
    <div className="flex min-h-0 flex-col gap-[1.5vh] [perspective:1500px]">
      <motion.div
        initial={false}
        animate={{ rotateY: revealed ? 0 : 180 }}
        transition={{ duration: 1, delay: revealed ? delay : 0, ease: "easeOut" }}
        className="relative h-[14vh] shrink-0 [transform-style:preserve-3d]"
      >
        <div
          className="absolute inset-0 flex items-center justify-center gap-[1vw] rounded-[1vw] [backface-visibility:hidden]"
          style={{ background: team.color }}
        >
          <span className="text-[5vw] leading-none">{team.symbol}</span>
          <span className="text-[2.4vw] font-black">{team.name_ja}</span>
          <span className="text-[2vw] font-bold opacity-80">{members.length}</span>
        </div>
        <div className="absolute inset-0 flex items-center justify-center rounded-[1vw] border-[0.4vw] border-white bg-zinc-900 text-[5vw] [backface-visibility:hidden] [transform:rotateY(180deg)]">
          {team.symbol}
        </div>
      </motion.div>

      {revealed && (
        <motion.ul
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: delay + 0.8, duration: 0.6 }}
          className="min-h-0 flex-1 columns-2 gap-[0.8vw] overflow-hidden rounded-[1vw] p-[0.8vw]"
          style={{ background: `${team.color}22`, fontSize: `${fontVh}vh` }}
        >
          {members.map((p) => (
            <li key={p.id} className="truncate font-bold leading-[1.35]">
              {p.name}
            </li>
          ))}
        </motion.ul>
      )}
    </div>
  );
}
