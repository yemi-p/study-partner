import { saveProgress, loadProgress } from "../../../lib/store";
export const runtime = "nodejs";

function ok(req) {
  const code = process.env.APP_CODE;
  return !code || req.headers.get("x-app-code") === code;
}

// The student's app saves a snapshot of progress (no lesson chats) and can restore it on a new phone.
export async function POST(req) {
  if (!ok(req)) return Response.json({ error: "CODE" }, { status: 401 });
  const body = await req.text();
  if (body.length > 400000) return Response.json({ error: "TOO_BIG" }, { status: 413 });
  let s;
  try { s = JSON.parse(body); } catch { return Response.json({ error: "BAD" }, { status: 400 }); }
  await saveProgress({ ...s, savedAt: new Date().toISOString() });
  return Response.json({ ok: true });
}

export async function GET(req) {
  if (!ok(req)) return Response.json({ error: "CODE" }, { status: 401 });
  return Response.json({ progress: await loadProgress() });
}
