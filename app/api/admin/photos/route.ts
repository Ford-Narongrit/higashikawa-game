import { requireAdmin } from "@/lib/auth";
import { signPaths } from "@/lib/photos";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const STATUSES = ["pending", "approved", "rejected"];

/** GET ?status=pending → { counts, photos } with signed thumb + full URLs (10 min) for review. */
export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const status = new URL(request.url).searchParams.get("status") ?? "pending";
  if (!STATUSES.includes(status)) return Response.json({ error: "status" }, { status: 400 });

  const db = supabaseAdmin();
  const [list, ...counts] = await Promise.all([
    db
      .from("photos")
      .select("id, status, path, thumb_path, team_id, created_at, player:players(name, room)")
      .eq("status", status)
      .order("created_at", { ascending: status === "pending" })
      .limit(status === "pending" ? 60 : 200),
    ...STATUSES.map((s) => db.from("photos").select("id", { count: "exact", head: true }).eq("status", s)),
  ]);
  if (list.error) return Response.json({ error: list.error.message }, { status: 500 });

  const rows = list.data ?? [];
  const urls = await signPaths(rows.flatMap((p) => [p.thumb_path, p.path]), 10 * 60);
  return Response.json({
    counts: Object.fromEntries(STATUSES.map((s, i) => [s, counts[i].count ?? 0])),
    photos: rows.map(({ path, thumb_path, ...p }) => ({ ...p, thumb_url: urls[thumb_path], full_url: urls[path] })),
  });
}
