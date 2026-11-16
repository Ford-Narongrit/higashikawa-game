"use client";
import { useEffect, useRef, useState } from "react";
import type * as THREE from "three";
import { demoTexture, loadPhotoTexture } from "./textures";
import { TreeScene, type TreeItem } from "./TreeScene";

type ServerPhoto = { id: string; url: string };

/**
 * Stage "tree" view. Polls approved photos every 20s and keeps one texture per photo id:
 * new approvals pop onto the tree, rejected-after-approval ones are removed and disposed.
 * `demo` renders N fake photos instead (performance test). `showFps` adds a small counter.
 */
export function TreeView({ demo, showFps = false }: { demo?: number; showFps?: boolean }) {
  const [items, setItems] = useState<TreeItem[]>([]);
  const [fps, setFps] = useState<number | null>(null);
  const textures = useRef(new Map<string, THREE.Texture>());
  const loading = useRef(new Set<string>());
  const order = useRef<string[]>([]);

  useEffect(() => {
    const cache = textures.current;
    const publish = () =>
      setItems(order.current.flatMap((id) => (cache.has(id) ? [{ id, texture: cache.get(id)! }] : [])));

    if (demo) {
      order.current = Array.from({ length: demo }, (_, i) => `demo-${i}`);
      order.current.forEach((id, i) => cache.set(id, demoTexture(i)));
      publish();
      return () => {
        cache.forEach((t) => t.dispose());
        cache.clear();
      };
    }

    let stopped = false;
    async function sync() {
      let list: ServerPhoto[];
      try {
        const res = await fetch("/api/screen/photos", { cache: "no-store" });
        if (!res.ok) return;
        list = await res.json();
      } catch {
        return;
      }
      if (stopped) return;
      order.current = list.map((p) => p.id);
      const keep = new Set(order.current);
      for (const [id, tex] of cache) {
        if (!keep.has(id)) {
          tex.dispose();
          cache.delete(id);
        }
      }
      publish();
      for (const p of list) {
        if (cache.has(p.id) || loading.current.has(p.id)) continue;
        loading.current.add(p.id);
        loadPhotoTexture(p.url)
          .then((tex) => {
            if (stopped) return tex.dispose();
            cache.set(p.id, tex);
            publish();
          })
          .catch(() => {}) // retried on the next sync with a fresh signed URL
          .finally(() => loading.current.delete(p.id));
      }
    }

    sync();
    const id = setInterval(sync, 20_000);
    return () => {
      stopped = true;
      clearInterval(id);
      cache.forEach((t) => t.dispose());
      cache.clear();
    };
  }, [demo]);

  return (
    <div className="absolute inset-0">
      <TreeScene items={items} onFps={showFps ? setFps : undefined} />
      {showFps && (
        <div className="absolute left-3 top-3 rounded bg-black/60 px-3 py-1 font-mono text-sm text-white">
          {fps ?? "…"} fps · {items.length} photos
        </div>
      )}
    </div>
  );
}
