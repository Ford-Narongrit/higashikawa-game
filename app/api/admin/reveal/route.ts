import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";

/** Idempotent: returns { revealed: false } if teams were already revealed. */
export async function POST() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { data, error } = await supabaseAdmin().rpc("reveal_teams");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ revealed: data === true });
}
