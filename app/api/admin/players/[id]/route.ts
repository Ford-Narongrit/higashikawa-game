import { generatePin, hashPin, requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH { team_id } moves a player; PATCH { reset_pin: true } returns a fresh PIN. */
export async function PATCH(request: Request, { params }: Ctx) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const db = supabaseAdmin();

  if (body.reset_pin === true) {
    const pin = generatePin();
    const { error } = await db
      .from("players")
      .update({ pin_hash: await hashPin(pin), pin_failed_attempts: 0, pin_locked_until: null })
      .eq("id", id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ pin });
  }

  if ([1, 2, 3, 4].includes(body.team_id)) {
    const { error } = await db.from("players").update({ team_id: body.team_id }).eq("id", id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  }

  return Response.json({ error: "nothing to update" }, { status: 400 });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;
  const { error } = await supabaseAdmin().from("players").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
