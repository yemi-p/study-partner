// The only file that talks to the AI provider. Swap this file to move to Groq/OpenRouter later.
const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
// Free models get busy. On a 503 we wait briefly, retry, then fall back to the next free Flash model.
const FALLBACKS = (process.env.GEMINI_FALLBACKS || "gemini-flash-latest,gemini-flash-lite-latest,gemini-3.6-flash,gemini-3.1-flash-lite").split(",").map((x) => x.trim()).filter(Boolean);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function callModel({ system, messages, json = false, images = [] }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("NO_KEY");
  const contents = messages.map((m, i) => {
    const parts = [{ text: m.content }];
    if (i === messages.length - 1) {
      for (const img of images) parts.push({ inline_data: { mime_type: img.type, data: img.data } });
    }
    return { role: m.role === "assistant" ? "model" : "user", parts };
  });
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents,
    generationConfig: { temperature: json ? 0.4 : 0.7, ...(json ? { responseMimeType: "application/json" } : {}) },
  };
  const attempts = [MODEL, ...FALLBACKS];
  const started = Date.now();
  let r;
  for (let i = 0; i < attempts.length; i++) {
    const left = 52000 - (Date.now() - started);
    if (left < 4000) break;
    try {
      r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${attempts[i]}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(Math.min(left, 20000)),
      });
    } catch {
      r = { status: 503, ok: false, text: async () => "timeout" };
      continue;
    }
    if (r.status !== 503 && r.status !== 404 && r.status !== 429) break;
    await sleep(250);
  }
  if (!r) throw new Error("BUSY");
  if (r.status === 429) throw new Error("RATE_LIMIT");
  if (r.status === 503) throw new Error("BUSY");
  if (!r.ok) throw new Error("MODEL_ERROR " + r.status + " " + (await r.text()).slice(0, 300));
  const data = await r.json();
  const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
  if (!json) return text;
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error("BAD_JSON");
  }
}
