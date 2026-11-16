"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { copy } from "@/lib/copy";
import { teamById } from "@/lib/teams";
import { clearToken, loadToken, postJson, saveToken } from "@/lib/token";
import type { MeResponse, Room } from "@/lib/types";
import { useLiveRefresh } from "@/lib/useLiveRefresh";
import { BoxPanel } from "./BoxPanel";
import { PhotoPanel } from "./PhotoPanel";
import { ScoreList } from "./ScoreList";
import { BigButton, ErrorText, Field, inputClass, RoomPicker, Screen } from "./ui";

type View = "boot" | "join" | "conflict" | "rejoin" | "pin" | "home";

export function PlayerApp({ initialBoxCode }: { initialBoxCode?: string } = {}) {
  const [view, setView] = useState<View>("boot");
  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [name, setName] = useState("");
  const [room, setRoom] = useState<Room | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [shownPin, setShownPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = loadToken();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount
    setToken(saved);
    setView(saved ? "home" : "join");
  }, []);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/me", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      if (res.status === 401) {
        clearToken();
        setToken(null);
        setMe(null);
        setView("join");
        return;
      }
      if (res.ok) setMe(await res.json());
    } catch {
      // Offline: keep showing the last known state; polling will retry.
    }
  }, [token]);

  const waitingForTeam = !me?.player.team_id;
  useLiveRefresh(refresh, {
    enabled: !!token && (view === "home" || view === "pin"),
    connectedMs: waitingForTeam ? 5_000 : 10_000,
  });

  function signIn(newToken: string) {
    saveToken(newToken);
    setToken(newToken);
    setError(null);
  }

  function validate(): boolean {
    if (!name.trim()) return setError(copy.errors.nameRequired), false;
    if (!room) return setError(copy.errors.roomRequired), false;
    return true;
  }

  async function join(force: boolean) {
    if (!validate()) return;
    setBusy(true);
    const { status, data } = await postJson<{ token?: string; pin?: string }>("/api/join", { name, room, force });
    setBusy(false);
    if (status === 409) return setView("conflict");
    if (status === 200 && data.token && data.pin) {
      signIn(data.token);
      setShownPin(data.pin);
      return setView("pin");
    }
    setError(status === 0 ? copy.errors.network : copy.errors.unknown);
  }

  async function rejoin(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    if (!/^\d{4}$/.test(pinInput)) return setError(copy.errors.pinFormat);
    setBusy(true);
    const { status, data } = await postJson<{ token?: string }>("/api/rejoin", { name, room, pin: pinInput });
    setBusy(false);
    if (status === 200 && data.token) {
      signIn(data.token);
      setPinInput("");
      return setView("home");
    }
    setError(
      { 0: copy.errors.network, 404: copy.errors.notFound, 401: copy.errors.pinWrong, 429: copy.errors.locked }[
        status
      ] ?? copy.errors.unknown,
    );
  }

  function go(next: View) {
    setError(null);
    setView(next);
  }

  if (view === "boot" || (view === "home" && !me)) {
    return (
      <Screen>
        <div className="flex flex-1 items-center justify-center text-4xl">♠ ♥ ♦ ♣</div>
      </Screen>
    );
  }

  if (view === "join") {
    return (
      <Screen>
        <header className="pt-4 text-center">
          <p className="text-4xl">♠ ♥ ♦ ♣</p>
          <h1 className="mt-2 text-2xl font-black tracking-wide">{copy.appName}</h1>
          <p className="mt-1 text-xl">{copy.join.title}</p>
        </header>
        <form
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            join(false);
          }}
        >
          <Field label={copy.join.nameLabel}>
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={copy.join.namePlaceholder}
              maxLength={40}
              autoComplete="off"
            />
          </Field>
          <Field label={copy.join.roomLabel}>
            <RoomPicker value={room} onChange={setRoom} />
          </Field>
          <ErrorText text={error} />
          <BigButton type="submit" disabled={busy}>
            {copy.join.submit}
          </BigButton>
        </form>
        <div className="mt-auto flex flex-col gap-2 border-t border-zinc-800 pt-5">
          <p className="text-center text-zinc-400">{copy.join.rejoinHint}</p>
          <BigButton variant="secondary" onClick={() => go("rejoin")}>
            {copy.join.rejoinButton}
          </BigButton>
        </div>
      </Screen>
    );
  }

  if (view === "conflict") {
    return (
      <Screen>
        <div className="flex flex-1 flex-col justify-center gap-6 text-center">
          <h1 className="text-2xl font-bold">{copy.conflict.title}</h1>
          <p className="text-3xl font-black">
            {name}（{room}）
          </p>
          <p className="text-xl">{copy.conflict.question}</p>
          <ErrorText text={error} />
          <BigButton onClick={() => go("rejoin")}>{copy.conflict.itsMe}</BigButton>
          <BigButton variant="secondary" disabled={busy} onClick={() => join(true)}>
            {copy.conflict.notMe}
          </BigButton>
        </div>
      </Screen>
    );
  }

  if (view === "rejoin") {
    return (
      <Screen>
        <h1 className="pt-4 text-center text-3xl font-black">{copy.rejoin.title}</h1>
        <form className="flex flex-col gap-5" onSubmit={rejoin}>
          <Field label={copy.join.nameLabel}>
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              autoComplete="off"
            />
          </Field>
          <Field label={copy.join.roomLabel}>
            <RoomPicker value={room} onChange={setRoom} />
          </Field>
          <Field label={copy.rejoin.pinLabel}>
            <input
              className={`${inputClass} text-center font-mono text-4xl tracking-[0.5em]`}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="••••"
            />
          </Field>
          <ErrorText text={error} />
          <BigButton type="submit" disabled={busy}>
            {copy.rejoin.submit}
          </BigButton>
        </form>
        <BigButton variant="ghost" onClick={() => go("join")}>
          {copy.rejoin.back}
        </BigButton>
      </Screen>
    );
  }

  if (view === "pin") {
    return (
      <Screen>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <p className="text-2xl font-bold">{copy.pin.title}</p>
          <p className="rounded-3xl bg-white px-8 py-6 font-mono text-7xl font-black tracking-[0.2em] text-black">
            {shownPin}
          </p>
          <p className="text-xl font-bold">
            {name}（{room}）
          </p>
          <p className="rounded-xl bg-yellow-400 px-4 py-3 text-xl font-black text-black">📸 {copy.pin.screenshot}</p>
          <p className="text-lg text-zinc-300">{copy.pin.why}</p>
        </div>
        <BigButton onClick={() => go("home")}>{copy.pin.ok}</BigButton>
      </Screen>
    );
  }

  // view === "home"
  const team = teamById(me!.player.team_id);
  if (!team) {
    return (
      <Screen>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <motion.p
            className="text-5xl"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2.4, repeat: Infinity }}
          >
            ♠ ♥ ♦ ♣
          </motion.p>
          <h1 className="text-5xl font-black">{copy.waiting.title}</h1>
          <p className="text-xl text-zinc-300">{copy.waiting.sub}</p>
          <p className="text-3xl font-bold">{copy.waiting.count(me!.playerCount)}</p>
          {initialBoxCode && <p className="rounded-xl bg-zinc-800 px-4 py-3">🎁 {copy.box.afterReveal}</p>}
          <p className="text-lg text-zinc-400">
            {copy.revealed.hello(me!.player.name)}（{me!.player.room}）
          </p>
        </div>
      </Screen>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col transition-colors duration-700" style={{ background: team.color }}>
      <Screen>
        <p className="text-center text-xl font-bold text-white drop-shadow">{copy.revealed.yourTeam}</p>
        <div className="[perspective:1200px]">
          <motion.div
            key={team.id}
            initial={{ rotateY: 180, scale: 0.8 }}
            animate={{ rotateY: 0, scale: 1 }}
            transition={{ duration: 1.1, ease: "easeOut" }}
            className="relative mx-auto aspect-[5/7] w-64 [transform-style:preserve-3d]"
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl bg-white shadow-2xl [backface-visibility:hidden]">
              <span className="text-[9rem] leading-none" style={{ color: team.color }}>
                {team.symbol}
              </span>
              <span className="mt-2 text-3xl font-black text-black">{team.name_ja}</span>
            </div>
            <div className="absolute inset-0 flex items-center justify-center rounded-3xl border-8 border-white bg-zinc-900 text-6xl text-white [backface-visibility:hidden] [transform:rotateY(180deg)]">
              ?
            </div>
          </motion.div>
        </div>
        <p className="text-center text-2xl font-bold text-white drop-shadow">
          {copy.revealed.hello(me!.player.name)}
        </p>
        <BoxPanel token={token!} open={me!.state.box_open} team={team} initialCode={initialBoxCode} />
        <PhotoPanel token={token!} open={me!.state.photo_open} />
        <ScoreList scores={me!.scores} myTeamId={team.id} />
      </Screen>
    </div>
  );
}
