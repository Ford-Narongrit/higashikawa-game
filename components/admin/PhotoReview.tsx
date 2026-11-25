"use client";
import { useCallback, useEffect, useState } from "react";
import { useAdminCopy } from "@/lib/admin-lang";
import { teamById } from "@/lib/teams";
import { api, btn, card } from "./api";

type Status = "pending" | "approved" | "rejected";
type Photo = {
  id: string;
  status: Status;
  team_id: number;
  created_at: string;
  thumb_url: string;
  full_url: string;
  player: { name: string; room: string } | null;
};
type Settings = { photo_points: number; max_photos_per_player: number; photo_team_cap: number | null };

export function PhotoReview({ onError }: { onError: (e: string) => void }) {
  const t = useAdminCopy();
  const [tab, setTab] = useState<Status>("pending");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [counts, setCounts] = useState<Record<Status, number>>({ pending: 0, approved: 0, rejected: 0 });
  const [selected, setSelected] = useState(0);
  const [zoom, setZoom] = useState<string | null>(null);

  const load = useCallback(
    () =>
      api<{ counts: Record<Status, number>; photos: Photo[] }>(`/api/admin/photos?status=${tab}`)
        .then((d) => {
          setCounts(d.counts);
          setPhotos(d.photos);
        })
        .catch(() => {}),
    [tab],
  );

  useEffect(() => {
    load();
    const id = setInterval(load, tab === "pending" ? 5_000 : 15_000);
    return () => clearInterval(id);
  }, [load, tab]);

  const act = useCallback(
    async (photo: Photo, action: "approve" | "reject") => {
      if (action === "reject" && photo.status === "approved" && !confirm(t.rejectApproved)) return;
      // Optimistic: drop it from the grid straight away so the next photo is ready.
      setPhotos((ps) => ps.filter((p) => p.id !== photo.id));
      try {
        await api(`/api/admin/photos/${photo.id}`, "POST", { action });
      } catch (e) {
        onError(String(e));
      }
      load();
    },
    [load, onError, t],
  );

  const clamped = Math.min(selected, Math.max(0, photos.length - 1));

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement;
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") return;
      if (zoom) {
        if (e.key === "Escape" || e.key === " ") {
          e.preventDefault();
          setZoom(null);
        }
        return;
      }
      const photo = photos[clamped];
      if (e.key === "ArrowRight") setSelected(Math.min(clamped + 1, photos.length - 1));
      else if (e.key === "ArrowLeft") setSelected(Math.max(clamped - 1, 0));
      else if (!photo || tab === "rejected") return;
      else if ((e.key === "a" || e.key === "Enter") && tab === "pending") act(photo, "approve");
      else if (e.key === "x" || e.key === "Backspace") act(photo, "reject");
      else if (e.key === " ") setZoom(photo.full_url);
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [photos, clamped, tab, zoom, act]);

  return (
    <section className={card}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="mr-2 font-bold">{t.photos}</h2>
        {(["pending", "approved", "rejected"] as Status[]).map((s) => (
          <button
            key={s}
            onClick={() => {
              setTab(s);
              setSelected(0);
            }}
            className={`${btn} py-1 ${tab === s ? "bg-white text-black" : "bg-zinc-800"}`}
          >
            {t.photoTabs[s]} ({counts[s]})
          </button>
        ))}
        <span className="ml-auto text-xs text-zinc-500">{t.photoKeys}</span>
      </div>

      <PhotoSettings onError={onError} />

      {photos.length === 0 ? (
        <p className="py-8 text-center text-zinc-500">{t.noPhotos}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {photos.map((p, i) => {
            const tm = teamById(p.team_id);
            return (
              <figure
                key={p.id}
                onClick={() => setSelected(i)}
                className={`overflow-hidden rounded-lg bg-zinc-950 ${i === clamped ? "ring-4 ring-yellow-400" : ""}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- signed private URL */}
                <img
                  src={p.thumb_url}
                  alt=""
                  onDoubleClick={() => setZoom(p.full_url)}
                  className="aspect-square w-full cursor-zoom-in object-cover"
                />
                <figcaption className="flex items-center gap-2 p-2 text-sm">
                  <span style={{ color: tm?.color }}>{tm?.symbol}</span>
                  <span className="flex-1 truncate">
                    {p.player?.name} ({p.player?.room})
                  </span>
                  {tab === "pending" && (
                    <button onClick={() => act(p, "approve")} className={`${btn} bg-green-600 px-4 py-1 text-lg`}>
                      ✓
                    </button>
                  )}
                  {tab !== "rejected" && (
                    <button onClick={() => act(p, "reject")} className={`${btn} bg-red-600 px-4 py-1 text-lg`}>
                      ✗
                    </button>
                  )}
                </figcaption>
              </figure>
            );
          })}
        </div>
      )}

      {zoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6" onClick={() => setZoom(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element -- signed private URL */}
          <img src={zoom} alt="" className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </section>
  );
}

function PhotoSettings({ onError }: { onError: (e: string) => void }) {
  const t = useAdminCopy();
  const [s, setS] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    api<Settings>("/api/admin/settings").then(setS).catch(() => {});
  }, []);
  if (!s) return null;

  const num = (v: string) => parseInt(v.replace(/\D/g, "") || "0", 10);
  const set = (patch: Partial<Settings>) => {
    setS({ ...s, ...patch });
    setSaved(false);
  };

  async function save() {
    try {
      setS(await api<Settings>("/api/admin/settings", "PATCH", s));
      setSaved(true);
    } catch (e) {
      onError(String(e));
    }
  }

  const field = "w-16 rounded bg-zinc-800 px-2 py-1 text-right";
  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-zinc-800 p-2 text-sm">
      <label className="flex items-center gap-1">
        {t.photoPoints}
        <input value={s.photo_points} onChange={(e) => set({ photo_points: num(e.target.value) })} className={field} />
      </label>
      <label className="flex items-center gap-1">
        {t.maxPhotos}
        <input
          value={s.max_photos_per_player}
          onChange={(e) => set({ max_photos_per_player: num(e.target.value) })}
          className={field}
        />
      </label>
      <label className="flex items-center gap-1">
        {t.photoCap}
        <input
          value={s.photo_team_cap ?? ""}
          placeholder="∞"
          onChange={(e) => set({ photo_team_cap: e.target.value.trim() === "" ? null : num(e.target.value) })}
          className={field}
        />
      </label>
      <button onClick={save} disabled={saved} className={`${btn} ml-auto bg-green-700 py-1`}>
        {saved ? t.saved : t.save}
      </button>
    </div>
  );
}
