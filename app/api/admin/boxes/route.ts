import { requireAdmin } from "@/lib/auth";
import { generateCode } from "@/lib/boxes";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** GET [?since=ISO] → codes (newest first) with who redeemed them. */
export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const since = new URL(request.url).searchParams.get("since");
  let query = supabaseAdmin()
    .from("box_codes")
    .select("id, code, points, redeemed_at, created_at, player:players(name, team_id)")
    .order("created_at", { ascending: false })
    .order("code")
    .limit(2000);
  if (since) query = query.gte("created_at", since);
  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

/** POST { count } → create `count` new unique codes. Returns { created, since } for the print page. */
export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await request.json().catch(() => ({}));
  const count = body.count;
  if (!Number.isInteger(count) || count < 1 || count > 500) {
    return Response.json({ error: "count must be 1–500" }, { status: 400 });
  }

  const db = supabaseAdmin();
  let since: string | null = null;
  let created = 0;
  for (let attempt = 0; attempt < 5 && created < count; attempt++) {
    const codes = new Set<string>();
    while (codes.size < count - created) codes.add(generateCode());
    // ignoreDuplicates: a rare collision with an existing code is skipped and retried next loop.
    const { data, error } = await db
      .from("box_codes")
      .upsert(
        [...codes].map((code) => ({ code })),
        { onConflict: "code", ignoreDuplicates: true },
      )
      .select("created_at");
    if (error) return Response.json({ error: error.message }, { status: 500 });
    created += data.length;
    for (const row of data) if (!since || row.created_at < since) since = row.created_at;
  }
  return Response.json({ created, since });
}
