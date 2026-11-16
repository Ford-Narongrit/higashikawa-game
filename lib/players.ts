import "server-only";
import { supabaseAdmin } from "./supabase/server";
import { ROOMS, type Room } from "./types";

export function isRoom(value: unknown): value is Room {
  return typeof value === "string" && (ROOMS as string[]).includes(value);
}

/** Escapes LIKE wildcards so `ilike` acts as a case-insensitive equality check. */
function likeExact(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export function findByNameRoom<T>(name: string, room: Room, columns: string) {
  return supabaseAdmin()
    .from("players")
    .select(columns)
    .ilike("name", likeExact(name))
    .eq("room", room)
    .returns<T[]>();
}

export async function playerCount(): Promise<number> {
  const { count } = await supabaseAdmin().from("players").select("id", { count: "exact", head: true });
  return count ?? 0;
}

export async function gameState() {
  const { data, error } = await supabaseAdmin()
    .from("game_state")
    .select("teams_revealed, box_open, photo_open, screen_view, updated_at")
    .single();
  if (error) throw error;
  return data;
}
