import { requireAdmin } from "@/lib/auth";
import { signPaths } from "@/lib/photos";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** GET → approved photos (oldest first) with 2-hour signed thumbnail URLs, for the 3D tree. */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { data, error } = await supabaseAdmin()
    .from("photos")
    .select("id, thumb_path, team_id")
    .eq("status", "approved")
    .order("created_at")
    .limit(1000);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const urls = await signPaths(data.map((p) => p.thumb_path), 2 * 60 * 60);
  return Response.json(
    data.flatMap((p) => (urls[p.thumb_path] ? [{ id: p.id, url: urls[p.thumb_path], team_id: p.team_id }] : [])),
    { headers: { "Cache-Control": "no-store" } },
  );
}
