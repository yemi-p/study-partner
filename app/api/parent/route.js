import { loadProgress } from "../../../lib/store";
import { getOutline } from "../../../lib/content";
export const runtime = "nodejs";

export async function GET(req) {
  const code = process.env.PARENT_CODE;
  if (!code || req.headers.get("x-parent-code") !== code) return Response.json({ error: "CODE" }, { status: 401 });
  return Response.json({ progress: await loadProgress(), outline: getOutline() });
}
