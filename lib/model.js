// The only file that talks to the AI provider (Groq, free tier).
// Each Groq model has its own free quota, so on a limit or outage we fall through to the next one.
const MODELS = (process.env.GROQ_MODELS || "openai/gpt-oss-120b,llama-3.3-70b-versatile,openai/gpt-oss-20b")
  .split(",").map((x) => x.trim()).filter(Boolean);
const URL_ = "https://api.groq.com/openai/v1/chat/completions";

export async function callModel({ system, messages, json = false, maxTokens = 1200 }) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("NO_KEY");
  const started = Date.now();
  let lastStatus = 0;
  for (const model of MODELS) {
    const left = 55000 - (Date.now() - started);
    if (left < 5000) break;
    const body = {
      model,
      messages: [{ role: "system", content: system }, ...messages.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }))],
      temperature: json ? 0.4 : 0.6,
      max_completion_tokens: maxTokens,
      ...(json ? { response_format: { type: "json_object" } } : {}),
      ...(model.startsWith("openai/gpt-oss") ? { reasoning_effort: "low", include_reasoning: false } : {}),
    };
    let r;
    try {
      r = await fetch(URL_, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(Math.min(left, 30000)),
      });
    } catch {
      lastStatus = 504;
      continue;
    }
    lastStatus = r.status;
    if (!r.ok) {
      console.error("model", model, r.status, (await r.text()).slice(0, 300));
      continue; // try the next model (rate limit, too large, busy, bad param)
    }
    const data = await r.json();
    const text = data.choices?.[0]?.message?.content || "";
    if (!text.trim()) continue;
    if (!json) return text;
    try {
      return JSON.parse(text);
    } catch {
      const m = text.match(/\{[\s\S]*\}/);
      if (m) { try { return JSON.parse(m[0]); } catch {} }
      continue;
    }
  }
  if (lastStatus === 429 || lastStatus === 413) throw new Error("RATE_LIMIT");
  throw new Error("BUSY");
}
