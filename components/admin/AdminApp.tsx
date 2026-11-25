"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { setAdminLang, useAdminCopy, useAdminLang } from "@/lib/admin-lang";
import { ADMIN_LANGS } from "@/lib/copy";
import { TEAMS, teamById } from "@/lib/teams";
import { ROOMS, SCREEN_VIEWS, type AdminPlayer, type GameState, type Room } from "@/lib/types";
import { useLiveRefresh } from "@/lib/useLiveRefresh";
import { api, btn, card } from "./api";
import { BoxAdmin } from "./BoxAdmin";
import { PhotoReview } from "./PhotoReview";
import { ResetPanel } from "./ResetPanel";
import { ScorePanel } from "./ScorePanel";


export function AdminApp() {
  const t = useAdminCopy();
  const [state, setState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadState = useCallback(() => {
    api<GameState>("/api/admin/state").then(setState).catch(() => {});
  }, []);
  const { connected } = useLiveRefresh(loadState);

  async function patchState(patch: Partial<GameState>) {
    try {
      setState(await api<GameState>("/api/admin/state", "PATCH", patch));
    } catch (e) {
      setError(String(e));
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    location.href = "/admin/login";
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-black">HIGASHIKAWA GAME · Admin</h1>
        <div className="flex items-center gap-3 text-sm">
          <LangSwitch />
          <span className={connected ? "text-green-400" : "text-yellow-400"}>
            ● {connected ? "realtime" : "polling"}
          </span>
          <a href="/screen" target="_blank" className="underline">
            /screen ↗
          </a>
          <button onClick={logout} className="text-zinc-400 underline">
            {t.logout}
          </button>
        </div>
      </header>

      {error && (
        <p className="rounded-lg bg-red-950 p-3 text-red-200" onClick={() => setError(null)}>
          {error}
        </p>
      )}

      {state && (
        <>
          <section className={card}>
            <h2 className="mb-3 font-bold">{t.screenView}</h2>
            <div className="grid grid-cols-4 gap-2">
              {SCREEN_VIEWS.map((v) => (
                <button
                  key={v}
                  onClick={() => patchState({ screen_view: v })}
                  className={`${btn} py-4 ${state.screen_view === v ? "bg-white text-black" : "bg-zinc-800"}`}
                >
                  {t.views[v]}
                </button>
              ))}
            </div>
          </section>

          <section className={`${card} grid gap-4 sm:grid-cols-3`}>
            <RevealControl revealed={state.teams_revealed} onDone={loadState} onError={setError} />
            <Toggle label={t.boxOpen} on={state.box_open} onChange={(v) => patchState({ box_open: v })} />
            <Toggle label={t.photoOpen} on={state.photo_open} onChange={(v) => patchState({ photo_open: v })} />
          </section>
        </>
      )}

      <ScorePanel onError={setError} />
      <PhotoReview onError={setError} />
      <BoxAdmin onError={setError} />
      <PlayersPanel onError={setError} />
      <ResetPanel onError={setError} />
    </main>
  );
}

function RevealControl({
  revealed,
  onDone,
  onError,
}: {
  revealed: boolean;
  onDone: () => void;
  onError: (e: string) => void;
}) {
  const t = useAdminCopy();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  if (revealed) {
    return <div className="flex items-center justify-center rounded-lg bg-green-900 p-4 font-bold">✓ {t.revealDone}</div>;
  }

  async function reveal() {
    setBusy(true);
    try {
      await api("/api/admin/reveal", "POST");
      onDone();
    } catch (e) {
      onError(String(e));
    } finally {
      setBusy(false);
      setStep(0);
    }
  }

  if (step === 0) {
    return (
      <button onClick={() => setStep(1)} className={`${btn} bg-purple-600 py-4 text-lg`}>
        🃏 {t.reveal}
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-2 rounded-lg border-2 border-red-500 p-3">
      <p className="font-bold">{step === 1 ? t.revealConfirm1 : t.revealConfirm2}</p>
      <div className="flex gap-2">
        <button
          disabled={busy}
          onClick={() => (step === 1 ? setStep(2) : reveal())}
          className={`${btn} flex-1 ${step === 1 ? "bg-orange-600" : "bg-red-600"}`}
        >
          {t.reveal} {step}/2
        </button>
        <button onClick={() => setStep(0)} className={`${btn} bg-zinc-700`}>
          {t.cancel}
        </button>
      </div>
    </div>
  );
}

export function LangSwitch() {
  const lang = useAdminLang();
  return (
    <div className="flex overflow-hidden rounded-lg border border-zinc-700">
      {ADMIN_LANGS.map((l) => (
        <button
          key={l.key}
          onClick={() => setAdminLang(l.key)}
          className={`px-2 py-1 ${lang === l.key ? "bg-white font-bold text-black" : "text-zinc-400 hover:bg-zinc-800"}`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`${btn} flex items-center justify-between py-4 text-lg ${on ? "bg-green-700" : "bg-zinc-800"}`}
    >
      <span>{label}</span>
      <span>{on ? "ON" : "OFF"}</span>
    </button>
  );
}

function PlayersPanel({ onError }: { onError: (e: string) => void }) {
  const t = useAdminCopy();
  const [q, setQ] = useState("");
  const [players, setPlayers] = useState<AdminPlayer[]>([]);
  const [pins, setPins] = useState<Record<string, string>>({});
  const [newName, setNewName] = useState("");
  const [newRoom, setNewRoom] = useState<Room>("A");

  const load = useCallback(
    (query: string) =>
      api<AdminPlayer[]>(`/api/admin/players?q=${encodeURIComponent(query)}`)
        .then(setPlayers)
        .catch(() => {}),
    [],
  );

  useEffect(() => {
    const id = setTimeout(() => load(q), 250);
    const poll = setInterval(() => load(q), 10_000);
    return () => {
      clearTimeout(id);
      clearInterval(poll);
    };
  }, [q, load]);

  async function run(action: () => Promise<unknown>) {
    try {
      await action();
      await load(q);
    } catch (e) {
      onError(String(e));
    }
  }

  const resetPin = (p: AdminPlayer) =>
    run(async () => {
      const { pin } = await api<{ pin: string }>(`/api/admin/players/${p.id}`, "PATCH", { reset_pin: true });
      setPins((s) => ({ ...s, [p.id]: pin }));
    });

  const move = (p: AdminPlayer, team_id: number) =>
    run(() => api(`/api/admin/players/${p.id}`, "PATCH", { team_id }));

  const remove = (p: AdminPlayer) => {
    if (confirm(t.deleteConfirm(p.name))) run(() => api(`/api/admin/players/${p.id}`, "DELETE"));
  };

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    run(async () => {
      const { player, pin } = await api<{ player: AdminPlayer; pin: string }>("/api/admin/players", "POST", {
        name: newName,
        room: newRoom,
      });
      setPins((s) => ({ ...s, [player.id]: pin }));
      setNewName("");
      setQ(player.name);
    });
  };

  return (
    <section className={card}>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="font-bold">{t.players}</h2>
        <span className="text-sm text-zinc-400">{t.total(players.length)}</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.search}
          className="ml-auto w-64 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
        />
      </div>

      <form onSubmit={add} className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-zinc-400">{t.addPlayer}</span>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
        />
        <select
          value={newRoom}
          onChange={(e) => setNewRoom(e.target.value as Room)}
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2"
        >
          {ROOMS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <button className={`${btn} bg-zinc-700`}>{t.add}</button>
      </form>

      <div className="max-h-[60vh] overflow-y-auto">
        <table className="w-full text-left text-sm">
          <tbody>
            {players.map((p) => {
              const team = teamById(p.team_id);
              return (
                <tr key={p.id} className="border-t border-zinc-800">
                  <td className="py-2 pr-2 font-bold">{p.name}</td>
                  <td className="pr-2">{p.room}</td>
                  <td className="pr-2">
                    <select
                      value={p.team_id ?? ""}
                      onChange={(e) => move(p, Number(e.target.value))}
                      className="rounded border border-zinc-700 bg-zinc-950 px-1 py-1"
                      style={{ color: team?.color }}
                      title={t.moveTeam}
                    >
                      {!p.team_id && <option value="">{t.noTeam}</option>}
                      {TEAMS.map((tm) => (
                        <option key={tm.id} value={tm.id}>
                          {tm.symbol} {tm.name_ja}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="pr-2">
                    {pins[p.id] ? (
                      <span className="rounded bg-yellow-400 px-2 py-1 font-mono text-lg font-black text-black">
                        {t.newPin}: {pins[p.id]}
                      </span>
                    ) : (
                      <button onClick={() => resetPin(p)} className={`${btn} bg-zinc-800 py-1`}>
                        {t.resetPin}
                      </button>
                    )}
                  </td>
                  <td className="text-right">
                    <button onClick={() => remove(p)} className={`${btn} py-1 text-red-400`}>
                      {t.delete}
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
