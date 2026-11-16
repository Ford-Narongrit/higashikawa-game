"use client";
import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "./supabase/client";

type Options = {
  /** Poll interval while realtime is connected (safety net). */
  connectedMs?: number;
  /** Poll interval while realtime is down — CLAUDE.md fallback plan: 5s. */
  fallbackMs?: number;
  /** Tables whose realtime changes should trigger a refresh. */
  tables?: string[];
  enabled?: boolean;
};

/**
 * Calls `refresh` on: mount, realtime change on `tables`, tab becoming visible,
 * network coming back, and on an interval (faster when realtime is down).
 */
export function useLiveRefresh(refresh: () => void, opts: Options = {}) {
  const { connectedMs = 15_000, fallbackMs = 5_000, tables = ["game_state"], enabled = true } = opts;
  const [connected, setConnected] = useState(false);
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  });

  const tablesKey = tables.join(",");
  useEffect(() => {
    if (!enabled) return;
    const supabase = supabaseBrowser();
    let channel = supabase.channel(`live-${tablesKey}-${Math.random().toString(36).slice(2)}`);
    for (const table of tablesKey.split(",")) {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, () =>
        refreshRef.current(),
      );
    }
    channel.subscribe((status) => {
      const ok = status === "SUBSCRIBED";
      setConnected(ok);
      // Catch up on anything missed while disconnected.
      if (ok) refreshRef.current();
    });

    const onVisible = () => {
      if (document.visibilityState === "visible") refreshRef.current();
    };
    const onOnline = () => refreshRef.current();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    window.addEventListener("pageshow", onOnline);
    refreshRef.current();

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("pageshow", onOnline);
      supabase.removeChannel(channel);
    };
  }, [tablesKey, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") refreshRef.current();
    }, connected ? connectedMs : fallbackMs);
    return () => clearInterval(id);
  }, [connected, connectedMs, fallbackMs, enabled]);

  return { connected };
}
