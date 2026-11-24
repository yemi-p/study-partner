import fs from "fs";
import path from "path";

const DIR = path.join(process.cwd(), "content", "ss1");
let manifest;

export function getManifest() {
  if (!manifest) manifest = JSON.parse(fs.readFileSync(path.join(DIR, "manifest.json"), "utf8"));
  return manifest;
}

export function getSubject(key) {
  return getManifest().subjects.find((s) => s.key === key);
}

export function getTopicText(subjectKey, n) {
  const s = getSubject(subjectKey);
  const t = s?.topics.find((x) => x.n === Number(n));
  if (!t) return null;
  return { subject: s, topic: t, text: fs.readFileSync(path.join(DIR, t.file), "utf8") };
}

// Light outline for the client (no book text leaves the server)
export function getOutline() {
  return getManifest().subjects.map((s) => ({
    key: s.key,
    title: s.title,
    topics: s.topics.map((t) => ({ n: t.n, title: t.title, weeks: t.weeks, scheme: t.scheme })),
  }));
}
