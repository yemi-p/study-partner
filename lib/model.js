// The only file that talks to the AI provider. Swap this file to move to Groq/OpenRouter later.
const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

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
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify(body),
  });
  if (r.status === 429) throw new Error("RATE_LIMIT");
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
