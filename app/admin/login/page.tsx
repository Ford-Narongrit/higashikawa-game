"use client";
import { useState, type FormEvent } from "react";
import { adminCopy as t } from "@/lib/copy";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return setError(true);
    const next = new URLSearchParams(location.search).get("next");
    location.href = next?.startsWith("/") && !next.startsWith("//") ? next : "/admin";
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-4">
        <h1 className="text-2xl font-bold">{t.loginTitle}</h1>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t.password}
          className="rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-3 text-lg"
        />
        {error && <p className="text-red-400">{t.wrongPassword}</p>}
        <button disabled={busy} className="rounded-lg bg-white py-3 text-lg font-bold text-black disabled:opacity-50">
          {t.login}
        </button>
      </form>
    </main>
  );
}
