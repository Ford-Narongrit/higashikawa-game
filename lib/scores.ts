import "server-only";
import { supabaseAdmin } from "./supabase/server";
import type { TeamScore } from "./types";

export async function teamScores(): Promise<TeamScore[]> {
  const { data, error } = await supabaseAdmin().from("team_scores").select("team_id, score").order("team_id");
  if (error) throw error;
  return data;
}
