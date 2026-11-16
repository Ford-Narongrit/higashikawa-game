import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";

/** PATCH { voided: boolean } → void or restore one score event. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  if (typeof body.voided !== "boolean") return Response.json({ error: "voided" }, { status: 400 });
  const { error } = await supabaseAdmin().from("score_events").update({ voided: body.voided }).eq("id", Number(id));
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
