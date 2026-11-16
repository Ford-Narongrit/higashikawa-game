import { requireAdmin } from "@/lib/auth";
import { signPaths, UUID_RE } from "@/lib/photos";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** GET ?ids=a,b,c → { [photoId]: signedThumbUrl } for approved photos (stage screen only). */
export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const ids = (new URL(request.url).searchParams.get("ids") ?? "").split(",").filter((id) => UUID_RE.test(id)).slice(0, 200);
  if (!ids.length) return Response.json({});
  const { data } = await supabaseAdmin().from("photos").select("id, thumb_path").in("id", ids).eq("status", "approved");
  const urls = await signPaths((data ?? []).map((p) => p.thumb_path), 60 * 60);
  return Response.json(Object.fromEntries((data ?? []).map((p) => [p.id, urls[p.thumb_path]])));
}
