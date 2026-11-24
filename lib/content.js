import fs from "fs";
import path from "path";

const DIR = path.join(process.cwd(), "content", "ss1");
let manifest;
const chunkCache = {};

export function getManifest() {
  if (!manifest) manifest = JSON.parse(fs.readFileSync(path.join(DIR, "manifest.json"), "utf8"));
  return manifest;
}

export function getSubject(key) {
  return getManifest().subjects.find((s) => s.key === key);
}

export function getTopic(subjectKey, n) {
  const s = getSubject(subjectKey);
  const t = s?.topics.find((x) => x.n === Number(n));
  return t ? { subject: s, topic: t } : null;
}

// Split a topic file into ~1200 character chunks, remembering which source each came from.
function chunksFor(t) {
  if (chunkCache[t.file]) return chunkCache[t.file];
  const raw = fs.readFileSync(path.join(DIR, t.file), "utf8");
  const out = [];
  let src = "";
  for (const block of raw.split(/\n(?==== SOURCE:)/)) {
    const m = block.match(/^=== SOURCE: (.*?) ===/);
    if (m) src = m[1];
    const body = m ? block.slice(m[0].length) : block.replace(/^TOPIC:[\s\S]*?\n\n/, "");
    let cur = "";
    for (const para of body.split(/\n\s*\n/)) {
      const p = para.trim();
      if (!p) continue;
      if (cur.length + p.length > 1200 && cur) { out.push({ src, text: cur }); cur = ""; }
      cur += (cur ? "\n" : "") + p;
    }
    if (cur) out.push({ src, text: cur });
  }
  chunkCache[t.file] = out;
  return out;
}

const STOP = new Set("the and for with that this from what which when where their there into your about have will than then them they were been being does also more most such other these those using used between".split(" "));
function terms(q) {
  return [...new Set(String(q).toLowerCase().match(/[a-z]{4,}/g) || [])].filter((w) => !STOP.has(w));
}

function render(chunks) {
  let src = null;
  return chunks.map((c) => { const head = c.src !== src ? `[from ${c.src}]\n` : ""; src = c.src; return head + c.text; }).join("\n\n");
}

// The chunks that best match a query (part title, question), kept in book order. Budget in characters.
export function material(t, query, budget = 6000) {
  const ch = chunksFor(t);
  const q = terms(query);
  if (!q.length) return spread(t, budget);
  const scored = ch.map((c, i) => {
    const low = c.text.toLowerCase();
    let s = 0;
    for (const w of q) { const stem = w.slice(0, Math.max(4, w.length - 2)); s += (low.split(stem).length - 1); }
    return { i, s };
  }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
  const pick = [];
  let used = 0;
  for (const x of scored) {
    if (used + ch[x.i].text.length > budget) continue;
    pick.push(x.i); used += ch[x.i].text.length;
  }
  if (!pick.length) return spread(t, budget);
  return render(pick.sort((a, b) => a - b).map((i) => ch[i]));
}

// An even sample across the whole topic, for quizzes and overviews.
export function spread(t, budget = 6000, seed = 0) {
  const ch = chunksFor(t);
  if (!ch.length) return "";
  const per = Math.max(1, Math.floor(budget / 1200));
  const step = Math.max(1, Math.floor(ch.length / per));
  const off = seed % step;
  const pick = [];
  for (let i = off; i < ch.length && pick.length < per; i += step) pick.push(ch[i]);
  return render(pick);
}

// Light outline for the client (no book text leaves the server)
export function getOutline() {
  return getManifest().subjects.map((s) => ({
    key: s.key,
    title: s.title,
    topics: s.topics.map((t) => ({ n: t.n, title: t.title, weeks: t.weeks, scheme: t.scheme, parts: t.parts || [] })),
  }));
}
