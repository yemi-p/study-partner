// Progress snapshot in a private Vercel Blob (one small JSON file). Server only.
import { put, get } from "@vercel/blob";

const PATH = "progress/student.json";

export async function saveProgress(obj) {
  await put(PATH, JSON.stringify(obj), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
}

export async function loadProgress() {
  try {
    const r = await get(PATH, { access: "private", useCache: false });
    if (!r || r.statusCode !== 200) return null;
    return JSON.parse(await new Response(r.stream).text());
  } catch {
    return null;
  }
}
