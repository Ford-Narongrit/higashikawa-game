"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Browser client (anon/publishable key). Read-only by RLS: teams, game_state, score_events, team_scores. */
export function supabaseBrowser(): SupabaseClient {
  if (client) return client;
  client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return client;
}
