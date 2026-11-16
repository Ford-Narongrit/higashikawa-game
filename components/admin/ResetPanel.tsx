"use client";
import { useState } from "react";
import { adminCopy as t } from "@/lib/copy";
import { api, btn, card } from "./api";

export function ResetPanel({ onError }: { onError: (e: string) => void }) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);

  async function reset() {
    setBusy(true);
    try {
      await api("/api/admin/reset", "POST", { confirm: typed });
      location.reload();
    } catch (e) {
      onError(String(e));
      setBusy(false);
    }
  }

  return (
    <section className={`${card} border-red-900`}>
      <h2 className="mb-1 font-bold text-red-400">{t.resetTitle}</h2>
      <p className="mb-3 text-sm text-zinc-400">{t.resetHelp}</p>
      <div className="flex flex-wrap gap-2">
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="RESET"
          className="w-40 rounded-lg border border-red-900 bg-zinc-950 px-3 py-2 font-mono"
        />
        <button onClick={reset} disabled={typed !== "RESET" || busy} className={`${btn} bg-red-700`}>
          {t.resetButton}
        </button>
      </div>
    </section>
  );
}
