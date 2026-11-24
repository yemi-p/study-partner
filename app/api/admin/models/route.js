// Diagnostic: which models this key can see, and a one-word test call to each Flash model.
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(req) {
  const u = new URL(req.url);
  if (!process.env.APP_CODE || u.searchParams.get("code") !== process.env.APP_CODE) return new Response("no", { status: 401 });
  const key = process.env.GEMINI_API_KEY;
  const h = { "x-goog-api-key": key, "Content-Type": "application/json" };
  const list = await (await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", { headers: h })).json();
  const names = (list.models || []).map((m) => m.name.replace("models/", "")).filter((n) => /flash|gemma/.test(n));
  const test = {};
  if (u.searchParams.get("test")) {
    for (const n of names.filter((n) => /flash/.test(n) && !/image|tts|audio|live|embed/.test(n)).slice(0, 8)) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${n}:generateContent`, { method: "POST", headers: h, body: JSON.stringify({ contents: [{ parts: [{ text: "Say ok" }] }] }) });
      test[n] = r.status;
    }
  }
  return Response.json({ names, test, error: list.error?.message });
}
