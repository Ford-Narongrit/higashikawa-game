import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Setup check: confirms env vars, that the migration ran, and that RLS
 * blocks the anon key from reading private tables. Reveals no data.
 */
export async function GET() {
  const checks: Record<string, boolean> = {
    env_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    env_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    env_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    env_admin_password: !!process.env.ADMIN_PASSWORD,
    env_site_url: !!process.env.NEXT_PUBLIC_SITE_URL,
  };

  try {
    const admin = supabaseAdmin();
    const { data: teams } = await admin.from("teams").select("id");
    checks.migration_teams = teams?.length === 4;
    const { data: state } = await admin.from("game_state").select("id").single();
    checks.migration_game_state = !!state;
    const { data: bucket } = await admin.storage.getBucket("photos");
    checks.bucket_private = bucket?.public === false;

    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    );
    const { data: anonTeams } = await anon.from("teams").select("id");
    checks.anon_can_read_teams = anonTeams?.length === 4;
    const { data: anonPlayers, error: anonPlayersErr } = await anon.from("players").select("id").limit(1);
    checks.anon_blocked_from_players = !!anonPlayersErr || (anonPlayers?.length ?? 0) === 0;
    const { error: anonWriteErr } = await anon.from("game_state").update({ box_open: true }).eq("id", true).select();
    checks.anon_cannot_write = !!anonWriteErr;
  } catch {
    checks.supabase_reachable = false;
  }

  const ok = Object.values(checks).every(Boolean);
  return NextResponse.json({ ok, checks }, { status: ok ? 200 : 500 });
}
