"use client";
import { useCallback, useEffect, useState } from "react";
import { adminCopy as t } from "@/lib/copy";
import { teamById } from "@/lib/teams";
import { api, btn, card } from "./api";

type Prize = { points: number; weight: number };
type BoxRow = {
  id: string;
  code: string;
  points: number | null;
  redeemed_at: string | null;
  created_at: string;
  player: { name: string; team_id: number | null } | null;
};

export function BoxAdmin({ onError }: { onError: (e: string) => void }) {
  const [boxes, setBoxes] = useState<BoxRow[]>([]);
  const [count, setCount] = useState("40");
  const [busy, setBusy] = useState(false);
  const [lastBatch, setLastBatch] = useState<{ since: string; created: number } | null>(null);
  const [showList, setShowList] = useState(false);

  const load = useCallback(() => api<BoxRow[]>("/api/admin/boxes").then(setBoxes).catch(() => {}), []);
  useEffect(() => {
    load();
    const id = setInterval(load, 10_000);
    return () => clearInterval(id);
  }, [load]);

  async function generate() {
    const n = Number(count);
    if (!Number.isInteger(n) || n < 1 || n > 500) return onError(t.boxCountInvalid);
    setBusy(true);
    try {
      const res = await api<{ created: number; since: string }>("/api/admin/boxes", "POST", { count: n });
      setLastBatch(res);
      load();
    } catch (e) {
      onError(String(e));
    } finally {
      setBusy(false);
    }
  }

  const used = boxes.filter((b) => b.redeemed_at);

  return (
    <section className={card}>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="font-bold">{t.boxes}</h2>
        <span className="text-sm text-zinc-400">{t.boxStats(boxes.length, used.length)}</span>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={count}
          onChange={(e) => setCount(e.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
          className="w-24 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-lg"
        />
        <button onClick={generate} disabled={busy} className={`${btn} bg-green-700`}>
          {t.generateCodes}
        </button>
        {lastBatch && (
          <a
            href={`/admin/boxes/print?since=${encodeURIComponent(lastBatch.since)}`}
            target="_blank"
            className={`${btn} bg-yellow-500 text-black`}
          >
            🖨 {t.printBatch(lastBatch.created)}
          </a>
        )}
        <a href="/admin/boxes/print?unused=1" target="_blank" className={`${btn} bg-zinc-700`}>
          🖨 {t.printUnused}
        </a>
        <button onClick={() => setShowList(!showList)} className={`${btn} ml-auto bg-zinc-800`}>
          {showList ? t.hideList : t.showList}
        </button>
      </div>

      <PrizeTableEditor onError={onError} />

      {showList && (
        <div className="mt-4 max-h-[50vh] overflow-y-auto">
          <table className="w-full text-left font-mono text-sm">
            <tbody>
              {boxes.map((b) => {
                const tm = teamById(b.player?.team_id);
                return (
                  <tr key={b.id} className={`border-t border-zinc-800 ${b.redeemed_at ? "" : "text-zinc-500"}`}>
                    <td className="py-1 pr-3 text-base font-bold">{b.code}</td>
                    <td className="pr-3">{b.redeemed_at ? "✓" : "—"}</td>
                    <td className="pr-3 font-sans">
                      {b.player && (
                        <>
                          <span style={{ color: tm?.color }}>{tm?.symbol}</span> {b.player.name}
                        </>
                      )}
                    </td>
                    <td className="pr-3 text-right">{b.points !== null && (b.points >= 0 ? `+${b.points}` : b.points)}</td>
                    <td className="text-right text-zinc-500">
                      {b.redeemed_at &&
                        new Date(b.redeemed_at).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function PrizeTableEditor({ onError }: { onError: (e: string) => void }) {
  const [rows, setRows] = useState<Prize[] | null>(null);
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    api<{ prize_table: Prize[] }>("/api/admin/settings")
      .then((s) => setRows(s.prize_table))
      .catch(() => {});
  }, []);

  if (!rows) return null;
  const total = rows.reduce((s, r) => s + (r.weight > 0 ? r.weight : 0), 0);
  const expected = total ? rows.reduce((s, r) => s + r.points * r.weight, 0) / total : 0;

  function update(i: number, patch: Partial<Prize>) {
    setRows(rows!.map((r, j) => (j === i ? { ...r, ...patch } : r)));
    setSaved(false);
  }

  async function save() {
    try {
      const s = await api<{ prize_table: Prize[] }>("/api/admin/settings", "PATCH", { prize_table: rows });
      setRows(s.prize_table);
      setSaved(true);
    } catch (e) {
      onError(`${t.prizeInvalid} (${e})`);
    }
  }

  return (
    <div className="rounded-lg border border-zinc-800 p-3">
      <p className="mb-2 text-sm font-bold text-zinc-400">{t.prizeTable}</p>
      <div className="flex flex-wrap gap-2">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-1 rounded-lg bg-zinc-950 p-2 text-sm">
            <input
              value={r.points}
              onChange={(e) => update(i, { points: parseInt(e.target.value.replace(/[^\d-]/g, "") || "0", 10) || 0 })}
              className="w-16 rounded bg-zinc-800 px-2 py-1 text-right"
            />
            <span className="text-zinc-500">pt</span>
            <input
              value={r.weight}
              onChange={(e) => update(i, { weight: Number(e.target.value.replace(/[^\d.]/g, "")) || 0 })}
              className="w-14 rounded bg-zinc-800 px-2 py-1 text-right"
            />
            <span className="w-12 text-zinc-400">{total ? Math.round((r.weight / total) * 1000) / 10 : 0}%</span>
            <button onClick={() => (setRows(rows.filter((_, j) => j !== i)), setSaved(false))} className="text-red-400">
              ×
            </button>
          </div>
        ))}
        <button
          onClick={() => (setRows([...rows, { points: 10, weight: 1 }]), setSaved(false))}
          className={`${btn} bg-zinc-800 text-sm`}
        >
          +
        </button>
      </div>
      <div className="mt-2 flex items-center gap-3 text-sm">
        <span className="text-zinc-400">{t.expectedPoints(Math.round(expected * 10) / 10)}</span>
        <button onClick={save} disabled={saved} className={`${btn} ml-auto bg-green-700 text-sm`}>
          {saved ? t.saved : t.save}
        </button>
      </div>
    </div>
  );
}
