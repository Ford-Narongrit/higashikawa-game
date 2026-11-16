"use client";
import { useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { copy } from "@/lib/copy";
import type { Team } from "@/lib/types";
import { BigButton, ErrorText, inputClass } from "./ui";

const ERRORS: Record<number, string> = {
  0: copy.errors.network,
  403: copy.box.closed,
  404: copy.box.invalid,
  409: copy.box.noTeam,
  410: copy.box.used,
};

export function BoxPanel({
  token,
  open,
  team,
  initialCode,
}: {
  token: string;
  open: boolean;
  team: Team;
  initialCode?: string;
}) {
  const [code, setCode] = useState(initialCode ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [won, setWon] = useState<number | null>(null);

  async function redeem(e: FormEvent) {
    e.preventDefault();
    if (code.length !== 6) return setError(copy.box.sixChars);
    setBusy(true);
    setError(null);
    let status = 0;
    let points: number | undefined;
    try {
      const res = await fetch("/api/box/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code }),
      });
      status = res.status;
      points = (await res.json().catch(() => ({}))).points;
    } catch {}
    setBusy(false);
    if (status === 200 && typeof points === "number") {
      setWon(points);
      setCode("");
      // Drop /box/CODE from the address bar so a reload doesn't retry a used code.
      if (location.pathname.startsWith("/box/")) history.replaceState(null, "", "/");
      return;
    }
    setError(ERRORS[status] ?? copy.errors.unknown);
  }

  return (
    <section className="rounded-3xl bg-black/35 p-4 backdrop-blur">
      <h2 className="mb-3 text-center text-lg font-bold text-white">🎁 {copy.box.title}</h2>
      {open ? (
        <form onSubmit={redeem} className="flex flex-col gap-3">
          <input
            value={code}
            onChange={(e) => {
              setError(null);
              setCode(
                e.target.value
                  .normalize("NFKC")
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, "")
                  .slice(0, 6),
              );
            }}
            placeholder="ABC234"
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className={`${inputClass} text-center font-mono text-3xl tracking-[0.3em]`}
          />
          <ErrorText text={error} />
          <BigButton type="submit" disabled={busy || code.length !== 6}>
            {copy.box.open}
          </BigButton>
          <p className="text-center text-sm text-white/80">{copy.box.scanHint}</p>
        </form>
      ) : (
        <p className="text-center text-white/80">{copy.box.notYet}</p>
      )}

      <AnimatePresence>
        {won !== null && <BoxReveal points={won} team={team} onClose={() => setWon(null)} />}
      </AnimatePresence>
    </section>
  );
}

function BoxReveal({ points, team, onClose }: { points: number; team: Team; onClose: () => void }) {
  const negative = points < 0;
  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-black/85 p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="text-[8rem] leading-none"
        animate={{
          rotate: [0, -15, 15, -15, 15, -10, 10, 0, 0],
          scale: [1, 1, 1, 1, 1, 1, 1, 1.5, 0],
        }}
        transition={{ duration: 1.6, times: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.85, 1] }}
      >
        🎁
      </motion.div>
      <motion.div
        className="absolute flex flex-col items-center gap-2"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1, x: negative ? [0, -12, 12, -12, 12, 0] : 0 }}
        transition={{ delay: 1.5, type: "spring", stiffness: 220, damping: 12 }}
      >
        <span className="text-3xl font-black text-white">{negative ? copy.box.unlucky : copy.box.congrats}</span>
        <span
          className="rounded-3xl px-8 py-4 text-7xl font-black text-white shadow-2xl"
          style={{ background: negative ? "#111" : team.color }}
        >
          {points >= 0 ? `+${points}` : points}
        </span>
        <span className="text-xl font-bold text-white">
          {team.symbol} {team.name_ja}
        </span>
        <span className="mt-6 text-white/70">{copy.box.tapToClose}</span>
      </motion.div>
    </motion.div>
  );
}
