"use client";
import { motion } from "framer-motion";
import { copy } from "@/lib/copy";
import { TEAMS } from "@/lib/teams";
import type { TeamScore } from "@/lib/types";

export function ScoreList({ scores, myTeamId }: { scores: TeamScore[]; myTeamId: number }) {
  const ranked = TEAMS.map((t) => ({ team: t, score: scores.find((s) => s.team_id === t.id)?.score ?? 0 })).sort(
    (a, b) => b.score - a.score,
  );
  return (
    <section className="rounded-3xl bg-black/35 p-4 backdrop-blur">
      <h2 className="mb-3 text-center text-lg font-bold text-white">{copy.revealed.scores}</h2>
      <ol className="flex flex-col gap-2">
        {ranked.map(({ team, score }, i) => (
          <motion.li
            key={team.id}
            layout
            className={`flex items-center gap-3 rounded-2xl px-4 py-2 text-xl font-black ${
              team.id === myTeamId ? "bg-white text-black" : "bg-black/40 text-white"
            }`}
          >
            <span className="w-6 text-base opacity-60">{i + 1}</span>
            <span className="text-3xl" style={{ color: team.color }}>
              {team.symbol}
            </span>
            <span className="flex-1">{team.name_ja}</span>
            <span className="tabular-nums">{score}</span>
          </motion.li>
        ))}
      </ol>
    </section>
  );
}
