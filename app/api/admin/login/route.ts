import { timingSafeEqual } from "node:crypto";
import { ADMIN_COOKIE, adminSessionValue } from "@/lib/admin-session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const given = Buffer.from(typeof body.password === "string" ? body.password : "");
  const expected = Buffer.from(process.env.ADMIN_PASSWORD ?? "");
  if (!expected.length || given.length !== expected.length || !timingSafeEqual(given, expected)) {
    await new Promise((r) => setTimeout(r, 500)); // slow down guessing
    return Response.json({ error: "wrong_password" }, { status: 401 });
  }

  const res = Response.json({ ok: true });
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.headers.append(
    "Set-Cookie",
    `${ADMIN_COOKIE}=${await adminSessionValue()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 14}${secure}`,
  );
  return res;
}
