// One-time helper: transcribe scanned maths pages with Gemini vision so powers and fractions survive.
// Protected by APP_CODE. Page images live in /private (bundled into this function only, never public).
import fs from "fs";
import path from "path";
import { callModel } from "../../../../lib/model";

export const runtime = "nodejs";
export const maxDuration = 60;

const PROMPT =
  "Transcribe this textbook page exactly as plain text. Keep headings, worked examples and exercise numbers. " +
  "Write powers with ^ (10^2, x^-3), roots as sqrt(), fractions as (a)/(b), subscripts with _ . " +
  "For each diagram or table, write one line: [Diagram: short description including readings or labels]. " +
  "Ignore scanner watermarks. Output only the transcription.";

export async function GET(req) {
  const u = new URL(req.url);
  if (!process.env.APP_CODE || u.searchParams.get("code") !== process.env.APP_CODE) {
    return new Response("no", { status: 401 });
  }
  const pages = (u.searchParams.get("pages") || "").split(",").map(Number).filter(Boolean).slice(0, 4);
  const out = {};
  for (const p of pages) {
    const f = path.join(process.cwd(), "private", "maths-pages", `p${String(p).padStart(4, "0")}.jpg`);
    if (!fs.existsSync(f)) { out[p] = null; continue; }
    try {
      out[p] = await callModel({
        system: "You are a careful transcriber of school textbook pages.",
        messages: [{ role: "user", content: PROMPT }],
        images: [{ type: "image/jpeg", data: fs.readFileSync(f).toString("base64") }],
      });
    } catch (e) {
      out[p] = "ERROR " + e.message;
    }
  }
  return Response.json(out);
}
