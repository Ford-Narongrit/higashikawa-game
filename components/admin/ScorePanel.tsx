"use client";
import { useCallback, useState, type FormEvent } from "react";
import { useAdminCopy } from "@/lib/admin-lang";
import { TEAMS, teamById } from "@/lib/teams";
import type { ScoreEvent, TeamScore } from "@/lib/types";
import { useLiveRefresh } from "@/lib/useLiveRefresh";
import { api, btn, card } from "./api";

const GAMES = ["ゲーム1", "ゲーム2"];
const RANK_POINTS = [300, 200, 100, 0];

export function ScorePanel({ onError }: { onError: (e: string) => void }) {
  const t = useAdminCopy();
  const [scores, setScores] = useState<TeamScore[]>([]);
  const [events, setEvents] = useState<ScoreEvent[]>([]);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [points, setPoints] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [exported, setExported] = useState<string | null>(null);

  const load = useCallback(() => {
    api<{ scores: TeamScore[]; events: ScoreEvent[] }>("/api/admin/score")
      .then((d) => {
        setScores(d.scores);
        setEvents(d.events);
      })
      .catch(() => {});
  }, []);
  useLiveRefresh(load, { tables: ["score_events"], connectedMs: 10_000 });

  async function add(e: FormEvent) {
    e.preventDefault();
    const n = Number(points);
    if (!teamId || points.trim() === "" || !Number.isInteger(n)) return onError(t.scoreInvalid);
    setBusy(true);
    try {
      await api("/api/admin/score", "POST", { team_id: teamId, points: n, label });
      setPoints("");
      setLabel("");
      setTeamId(null);
      load();
    } catch (err) {
      onError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function toggleVoid(ev: ScoreEvent) {
    if (!ev.voided && !confirm(t.voidConfirm(ev.label ?? ev.kind, ev.points))) return;
    try {
      await api(`/api/admin/score/${ev.id}`, "PATCH", { voided: !ev.voided });
      load();
    } catch (err) {
      onError(String(err));
    }
  }

  async function exportText() {
    const res = await fetch("/api/admin/export", { cache: "no-store" });
    const text = await res.text();
    setExported(text);
    navigator.clipboard?.writeText(text).catch(() => {});
  }

  return (
    <section className={card}>
      <div className="mb-3 flex items-center gap-3">
        <h2 className="font-bold">{t.scores}</h2>
        <div className="flex gap-2">
          {TEAMS.map((tm) => (
            <span key={tm.id} className="rounded-lg px-3 py-1 font-black" style={{ background: tm.color }}>
              {tm.symbol} {scores.find((s) => s.team_id === tm.id)?.score ?? 0}
            </span>
          ))}
        </div>
        <button onClick={exportText} className={`${btn} ml-auto bg-zinc-700`}>
          {t.exportScores}
        </button>
      </div>

      {exported && (
        <div className="mb-3">
          <p className="mb-1 text-sm text-green-400">{t.exportCopied}</p>
          <textarea
            readOnly
            value={exported}
            rows={6}
            className="w-full rounded-lg bg-zinc-950 p-2 font-mono text-sm"
            onFocus={(e) => e.target.select()}
          />
        </div>
      )}

      <div className="mb-4 grid gap-3 md:grid-cols-2">
        {GAMES.map((game) => (
          <div key={game} className="rounded-lg border border-zinc-800 p-2">
            <p className="mb-2 text-sm font-bold text-zinc-400">{game}</p>
            <div className="grid grid-cols-4 gap-1">
              {TEAMS.map((tm) =>
                RANK_POINTS.map((p, rank) => (
                  <button
                    key={`${tm.id}-${p}`}
                    type="button"
                    onClick={() => {
                      setTeamId(tm.id);
                      setPoints(String(p));
                      setLabel(`${game} ${rank + 1}位`);
                    }}
                    className={`${btn} px-1 py-1 text-sm`}
                    style={{ background: `${tm.color}55` }}
                  >
                    {tm.symbol} {rank + 1}位 +{p}
                  </button>
                )),
              )}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={add} className="mb-4 flex flex-wrap items-center gap-2 rounded-lg bg-zinc-950 p-3">
        {TEAMS.map((tm) => (
          <button
            key={tm.id}
            type="button"
            onClick={() => setTeamId(tm.id)}
            className={`${btn} text-2xl ${teamId === tm.id ? "ring-4 ring-white" : "opacity-60"}`}
            style={{ background: tm.color }}
          >
            {tm.symbol}
          </button>
        ))}
        <input
          value={points}
          onChange={(e) => setPoints(e.target.value.replace(/[^\d-]/g, ""))}
          placeholder={t.points}
          inputMode="numeric"
          className="w-24 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-lg"
        />
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={t.label}
          maxLength={60}
          className="min-w-40 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-lg"
        />
        <button disabled={busy} className={`${btn} bg-green-600 px-6 py-2 text-lg`}>
          {t.addScore}
        </button>
      </form>

      <div className="max-h-[50vh] overflow-y-auto">
        <table className="w-full text-left text-sm">
          <tbody>
            {events.map((ev) => {
              const tm = teamById(ev.team_id);
              return (
                <tr key={ev.id} className={`border-t border-zinc-800 ${ev.voided ? "text-zinc-600 line-through" : ""}`}>
                  <td className="py-1 pr-2 text-zinc-500">
                    {new Date(ev.created_at).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="pr-2 text-lg" style={{ color: tm?.color }}>
                    {tm?.symbol}
                  </td>
                  <td className="pr-2">{t.kinds[ev.kind]}</td>
                  <td className="pr-2">{ev.label}</td>
                  <td className="pr-2">{ev.player_name}</td>
                  <td className="pr-2 text-right font-bold tabular-nums">
                    {ev.points >= 0 ? `+${ev.points}` : ev.points}
                  </td>
                  <td className="text-right">
                    <button onClick={() => toggleVoid(ev)} className={`${btn} py-0.5 text-xs no-underline ${ev.voided ? "text-green-400" : "text-red-400"}`}>
                      {ev.voided ? t.restore : t.void}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
