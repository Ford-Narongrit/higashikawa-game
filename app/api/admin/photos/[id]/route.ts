import { requireAdmin } from "@/lib/auth";
import { UUID_RE } from "@/lib/photos";
import { supabaseAdmin } from "@/lib/supabase/server";

/** POST { action: "approve" | "reject" }. Approve awards points via approve_photo() (respects the team cap). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;
  if (!UUID_RE.test(id)) return Response.json({ error: "id" }, { status: 400 });
  const body = await request.json().catch(() => ({}));

  const db = supabaseAdmin();
  if (body.action === "approve") {
    const { data, error } = await db.rpc("approve_photo", { p_photo_id: id });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: data !== null, points: data });
  }
  if (body.action === "reject") {
    const { data, error } = await db.rpc("reject_photo", { p_photo_id: id });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: data === true });
  }
  return Response.json({ error: "action" }, { status: 400 });
}
