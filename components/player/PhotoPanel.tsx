"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { copy } from "@/lib/copy";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ErrorText } from "./ui";

type ServerPhoto = { id: string; status: "pending" | "approved" | "rejected"; thumb_url: string | null };
type Local = { key: number; preview: string; full: Blob; thumb: Blob; state: "uploading" | "failed" };

const STATUS_STYLE = {
  pending: "bg-zinc-700 text-white",
  approved: "bg-green-500 text-white",
  rejected: "bg-red-600 text-white",
} as const;

async function shrink(file: File) {
  const common = { fileType: "image/jpeg", useWebWorker: true, preserveExif: false };
  const [full, thumb] = await Promise.all([
    imageCompression(file, { ...common, maxWidthOrHeight: 1600, initialQuality: 0.8, maxSizeMB: 1.5 }),
    imageCompression(file, { ...common, maxWidthOrHeight: 400, initialQuality: 0.75, maxSizeMB: 0.15 }),
  ]);
  return { full, thumb };
}

export function PhotoPanel({ token, open }: { token: string; open: boolean }) {
  const [photos, setPhotos] = useState<ServerPhoto[]>([]);
  const [max, setMax] = useState(2);
  const [locals, setLocals] = useState<Local[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextKey = useRef(0);
  const auth = { Authorization: `Bearer ${token}` };

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/photos", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setPhotos(data.photos);
      setMax(data.max);
    } catch {}
  }, [token]);

  const hasPending = photos.some((p) => p.status === "pending");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount; state is set after the await
    load();
    if (!hasPending) return;
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, [load, hasPending]);

  const used = photos.filter((p) => p.status !== "rejected").length + locals.length;
  const left = Math.max(0, max - used);

  async function upload(item: Local) {
    setLocals((ls) => ls.map((l) => (l.key === item.key ? { ...l, state: "uploading" } : l)));
    setError(null);
    try {
      const res = await fetch("/api/photos/upload-url", { method: "POST", headers: auth });
      if (!res.ok) {
        const { error: code } = await res.json().catch(() => ({}));
        throw new Error(code ?? "server");
      }
      const target = await res.json();
      const bucket = supabaseBrowser().storage.from("photos");
      const opts = { contentType: "image/jpeg", upsert: true };
      const [a, b] = await Promise.all([
        bucket.uploadToSignedUrl(target.full.path, target.full.token, item.full, opts),
        bucket.uploadToSignedUrl(target.thumb.path, target.thumb.token, item.thumb, opts),
      ]);
      if (a.error || b.error) throw new Error("upload");
      const done = await fetch("/api/photos", {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ id: target.id }),
      });
      if (!done.ok) {
        const { error: code } = await done.json().catch(() => ({}));
        throw new Error(code ?? "server");
      }
      URL.revokeObjectURL(item.preview);
      setLocals((ls) => ls.filter((l) => l.key !== item.key));
      await load();
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      if (code === "photo_limit" || code === "closed") {
        // Not retryable: drop the local copy and explain.
        URL.revokeObjectURL(item.preview);
        setLocals((ls) => ls.filter((l) => l.key !== item.key));
        setError(code === "closed" ? copy.photo.closed : copy.photo.limit(max));
        load();
      } else {
        setLocals((ls) => ls.map((l) => (l.key === item.key ? { ...l, state: "failed" } : l)));
        setError(copy.photo.failed);
      }
    }
  }

  async function onPick(file: File | undefined) {
    if (!file) return;
    if (inputRef.current) inputRef.current.value = "";
    if (left <= 0) return setError(copy.photo.limit(max));
    setError(null);
    let shrunk;
    try {
      shrunk = await shrink(file);
    } catch {
      return setError(copy.photo.badFile);
    }
    const item: Local = {
      key: ++nextKey.current,
      preview: URL.createObjectURL(shrunk.thumb),
      full: shrunk.full,
      thumb: shrunk.thumb,
      state: "uploading",
    };
    setLocals((ls) => [...ls, item]);
    upload(item);
  }

  return (
    <section className="rounded-3xl bg-black/35 p-4 backdrop-blur">
      <h2 className="mb-3 text-center text-lg font-bold text-white">📸 {copy.photo.title}</h2>

      {(photos.length > 0 || locals.length > 0) && (
        <div className="mb-3 grid grid-cols-3 gap-2">
          {photos.map((p) => (
            <figure key={p.id} className="relative aspect-square overflow-hidden rounded-xl bg-black/40">
              {p.thumb_url && (
                // eslint-disable-next-line @next/next/no-img-element -- signed private URL, no optimisation wanted
                <img src={p.thumb_url} alt="" className={`h-full w-full object-cover ${p.status === "rejected" ? "opacity-40" : ""}`} />
              )}
              <figcaption className={`absolute inset-x-0 bottom-0 py-0.5 text-center text-xs font-bold ${STATUS_STYLE[p.status]}`}>
                {copy.photo.status[p.status]}
              </figcaption>
            </figure>
          ))}
          {locals.map((l) => (
            <figure key={l.key} className="relative aspect-square overflow-hidden rounded-xl bg-black/40">
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
              <img src={l.preview} alt="" className="h-full w-full object-cover opacity-60" />
              {l.state === "uploading" ? (
                <figcaption className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
                  {copy.photo.uploading}
                </figcaption>
              ) : (
                <button
                  onClick={() => upload(l)}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-sm font-bold text-white"
                >
                  <span className="text-2xl">↻</span>
                  {copy.photo.retry}
                </button>
              )}
            </figure>
          ))}
        </div>
      )}

      <ErrorText text={error} />

      {open ? (
        left > 0 ? (
          <label className="mt-2 flex min-h-14 w-full cursor-pointer items-center justify-center rounded-2xl bg-white px-5 py-3 text-xl font-bold text-black active:bg-zinc-300">
            {copy.photo.pick(left)}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onPick(e.target.files?.[0])}
            />
          </label>
        ) : (
          <p className="text-center text-white/80">{copy.photo.limit(max)}</p>
        )
      ) : (
        <p className="text-center text-white/80">{copy.photo.closed}</p>
      )}
    </section>
  );
}
