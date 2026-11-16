import { playerFromRequest } from "@/lib/auth";
import { BUCKET, photoPaths, photoSettings, signPaths, UUID_RE } from "@/lib/photos";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** GET (Bearer) → { max, photos: [{ id, status, thumb_url }] } for the player's own photos. */
export async function GET(request: Request) {
  const player = await playerFromRequest(request);
  if (!player) return Response.json({ error: "unauthorized" }, { status: 401 });
  const [settings, { data }] = await Promise.all([
    photoSettings(),
    supabaseAdmin()
      .from("photos")
      .select("id, status, thumb_path, created_at")
      .eq("player_id", player.id)
      .order("created_at"),
  ]);
  const urls = await signPaths((data ?? []).map((p) => p.thumb_path), 60 * 60);
  return Response.json(
    {
      max: settings.max_photos_per_player,
      photos: (data ?? []).map((p) => ({ id: p.id, status: p.status, thumb_url: urls[p.thumb_path] ?? null })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** POST { id } (Bearer) → registers an uploaded photo for review once both files are in storage. */
export async function POST(request: Request) {
  const player = await playerFromRequest(request);
  if (!player) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (typeof body.id !== "string" || !UUID_RE.test(body.id)) {
    return Response.json({ error: "id" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { path, thumb_path } = photoPaths(player.id, body.id);
  const { data: files } = await db.storage.from(BUCKET).list(player.id, { search: body.id });
  const names = new Set((files ?? []).map((f) => `${player.id}/${f.name}`));
  if (!names.has(path) || !names.has(thumb_path)) {
    return Response.json({ error: "not_uploaded" }, { status: 409 });
  }

  const { data, error } = await db.rpc("submit_photo", {
    p_player_id: player.id,
    p_path: path,
    p_thumb_path: thumb_path,
  });
  if (error) {
    if (error.message.includes("photo_limit")) return Response.json({ error: "photo_limit" }, { status: 429 });
    if (error.message.includes("no_team")) return Response.json({ error: "no_team" }, { status: 409 });
    if (error.code === "23505") return Response.json({ ok: true }); // retried after success
    console.error("submit_photo", error);
    return Response.json({ error: "server" }, { status: 500 });
  }
  return Response.json({ id: data.id, status: data.status });
}
