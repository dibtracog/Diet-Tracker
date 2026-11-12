/**
 * "Send a test notification" from Settings. The app sends the signed-in
 * user's own session token; the test goes to that user's devices only.
 */

import { adminClient, isPushSub, missingConfig, sendPush, type PushSub } from "@/lib/pushServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const missing = missingConfig();
  if (missing.length) {
    return Response.json({ error: `The server is missing: ${missing.join(", ")}. See SETUP.md, step 5.` }, { status: 503 });
  }
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "Not signed in." }, { status: 401 });

  const db = adminClient();
  const { data: auth, error: authError } = await db.auth.getUser(token);
  if (authError || !auth.user) return Response.json({ error: "Not signed in." }, { status: 401 });

  const { data, error } = await db.from("records").select("id, data").eq("user_id", auth.user.id).eq("kind", "push");
  if (error) {
    const hint = /records_kind_check|violates check/i.test(error.message) ? " Run supabase/schema.sql again." : "";
    return Response.json({ error: error.message + hint }, { status: 500 });
  }
  const subs = (data ?? []).filter((r) => isPushSub(r.data)) as { id: string; data: PushSub }[];
  if (!subs.length) return Response.json({ error: "No device has notifications turned on yet." }, { status: 404 });

  let sent = 0;
  for (const s of subs) {
    const result = await sendPush(s.data, {
      title: "Reminders are working",
      body: "This is what a reminder will look like.",
      url: "/settings",
      tag: "test",
    });
    if (result === "sent") sent++;
    if (result === "gone") await db.from("records").delete().eq("user_id", auth.user.id).eq("id", s.id);
  }
  if (!sent) return Response.json({ error: "The notification couldn't be delivered. Try turning notifications off and on again." }, { status: 502 });
  return Response.json({ ok: true, sent });
}
