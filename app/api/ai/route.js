import { callModel } from "../../../lib/model";
import * as M from "../../../lib/model";
import { put, get } from "@vercel/blob";
import { getSubject, getTopic, material, spread } from "../../../lib/content";

export const runtime = "nodejs";
export const maxDuration = 60;

// How his own teachers write questions (from his first term papers), so practice feels like the real thing.
const STYLE = {
  chemistry: `Objective: "Which of these solid minerals is used for production of cement? (a) gold (b) copper (c) limestone (d) coal". "A process by which a solid on heating changes directly to gaseous stage without passing through the liquid state is called ___". Theory: "Differentiate between compound and mixture in a tabular form." "Write five separation techniques. (b) Explain any three of the separation techniques with diagrams where necessary." "Define the following terms with one example each: atom, molecule."`,
  physics: `Objective: "The instrument for measuring force is? a) Ammeter b) thermometer c) spring balance d) vernier caliper". "Which of the following is a derived unit? a) ampere b) kilogram c) second d) ohm". Theory: "In tabular form, distinguish between Mass and Weight." "Deduce the dimensions of the following physical quantities: i. Area ii. Impulse iii. Power." "Distinguish between fundamental and derived quantities. Give two examples of each."`,
  english: `Objective: "The word 'equal' has the /kw/ sound in the ___ (a) beginning (b) middle (c) end (d) nowhere". "Pouring of drink to the ancestors is called ___ (a) libation (b) baptism (c) ablution (d) communion". "From the words lettered A to D, choose the word that best completes the sentence: The boys will have to blame ___ for not listening to advice." Theory: "Write a story to illustrate the saying: 'My first day at school'."`,
  maths: `Nigerian SS1 style: "Convert 45 (base ten) to base two." "Evaluate 2^3 x 2^4 / 2^5." "Express 0.00042 in standard form." "Use tables to evaluate 34.5 x 2.18." "If U = {1,2,...,10} and A = {even numbers}, list A'." Show working.`,
  biology: `Nigerian SS1 style: "Which of these is NOT a characteristic of living things? (a) feeding (b) growth (c) rusting (d) excretion". Theory: "State five differences between plant and animal cells in a tabular form." "Define osmosis and give one example."`,
};

function topicList(s) {
  return s.topics.map((t) => `${t.n}. ${t.title}`).join("; ");
}

function rules(s, t) {
  return `You are Study Partner, a patient, warm tutor inside a study app for a Nigerian SS1 student (about 15).
SUBJECT: ${s.title}. TOPIC: ${t.title}. His teacher's scheme for it: ${t.scheme || "not yet scheduled"}.
PARTS OF THIS TOPIC: ${(t.parts || []).map((p, i) => `${i + 1}) ${p}`).join("  ")}

Rules you never break:
- Teach only ${s.title}, based on the TOPIC MATERIAL given. Use standard SS1/WAEC knowledge only where the material is garbled or missing, and stay consistent with it.
- If he asks about anything that is not ${s.title} (other subjects, games, music, celebrities, coding, personal matters), say in one friendly sentence that you can only help with ${s.title} here, and steer back.
- If he asks about ${s.title} from another topic, name the topic that covers it (topics: ${topicList(s)}), answer in one line at most, and steer back.
- Plain Nigerian classroom English. Short paragraphs. Key terms in **bold**. Put every numbered step or bullet point on its own new line. No italics, no headings, no tables, no emojis. Do not use dashes as punctuation.
- Never ask him a question about something you have not taught him yet in this conversation.
- Write formulae plainly: H2O, 2H2 + O2 → 2H2O, x^2, 10^-3, m/s^2. For multiplication ALWAYS use the × sign (2 × 3, a^m × a^n). Never use a dot, an asterisk or the letter x for multiplication. Use ÷ for division where his textbook would.
- Never ask for personal details such as his full name, school or address.
- Note about the material: ${s.caveat}`;
}

function mat(text) {
  return `\n\nTOPIC MATERIAL (from his textbook and class notes):\n<<<\n${text}\n>>>`;
}

const J = (o, init) => Response.json(o, init);

export async function POST(req) {
  const code = process.env.APP_CODE;
  if (code && req.headers.get("x-app-code") !== code) return J({ error: "CODE" }, { status: 401 });
  let b;
  try { b = await req.json(); } catch { return J({ error: "BAD_REQUEST" }, { status: 400 }); }
  const { mode, subject } = b;
  try {
    const s = getSubject(subject);
    if (!s) return Response.json({ error: "NO_SUBJECT" }, { status: 400 });

    if (mode === "hw_route") {
      const r = await callModel({
        system: `You sort SS1 ${s.title} homework questions into topics. Reply as JSON {"n": number or 0, "inSubject": boolean}. inSubject is false if the question is not ${s.title}. n is the best matching topic number, or 0 if none fits.\nTOPICS: ${topicList(s)}`,
        messages: [{ role: "user", content: String(b.question || "").slice(0, 2000) }],
        json: true, maxTokens: 200,
      });
      return J(r);
    }

    const tt = getTopic(subject, b.topic);
    if (!tt) return Response.json({ error: "NO_TOPIC" }, { status: 400 });
    const t = tt.topic;
    const parts = t.parts || [];
    const pi = Math.max(0, Math.min(Number(b.part) || 0, Math.max(parts.length - 1, 0)));
    const partName = parts[pi] || t.title;
    const base = rules(s, t);

    if (mode === "teach") {
      const how = b.how || "first";
      const ask = how === "again"
        ? `He did not fully get PART ${pi + 1}: "${partName}". Teach the same part again in a different way: simpler words, a fresh everyday analogy, smaller steps.`
        : how === "example"
        ? `For PART ${pi + 1}: "${partName}", give one fully worked example, step by step, the way his teacher would on the board. Then for the check, give him a similar one to try himself.`
        : `Teach PART ${pi + 1} of ${parts.length}: "${partName}". Do not teach the other parts yet.`;
      const r = await callModel({
        system: base + mat(material(t, partName + " " + t.title)),
        messages: [{ role: "user", content: `${ask}
Write 150 to 280 words: explain clearly in small steps, include one real-life example (Nigerian where it fits naturally), put key terms in **bold**, use a short list where it helps.
Then write ONE quick check question that he can answer ONLY from what you just explained in this reply.
Return JSON {"lesson":"the teaching text","check":"the quick check question","recap":["3 short bullet points he can copy into his notebook for this part"]}` }],
        json: true, maxTokens: 1400,
      });
      return J({ lesson: r.lesson || "", check: r.check || "", recap: Array.isArray(r.recap) ? r.recap.slice(0, 4) : [] });
    }

    if (mode === "chat") {
      const msgs = (b.messages || []).slice(-8).map((m) => ({ role: m.role, content: String(m.content).slice(0, 1800) }));
      const last = msgs.filter((m) => m.role === "user").pop()?.content || "";
      const starter = b.starter; // exam | example | hardest
      const extra = starter === "exam"
        ? "He asked what he must know for the exam on this topic. Give the 4 to 6 most examinable points as a short list, each one line, based on the material and his teacher's style below. End by offering to quiz him."
        : starter === "example"
        ? "He wants an example to try. Give ONE exam-style question on the basics of this topic (something a student who read the material can do), and ask him to try it. Do not give the answer yet."
        : starter === "hardest"
        ? "He wants the hardest part of this topic explained simply. Pick the idea students usually find hardest, explain it simply with an everyday analogy in under 200 words, then ask one check question on exactly what you explained."
        : `He is on PART ${pi + 1}: "${partName}". Reply to his message in under 200 words. If he is answering a quick check, say clearly whether he is right, fix any mistake kindly, then invite him to continue. Only ask about things already taught in this conversation.`;
      const text = await callModel({
        system: base + `\n\nHOW HIS TEACHER SETS QUESTIONS: ${STYLE[s.key] || ""}\n\n${extra}` + mat(starter ? spread(t, 6000) : material(t, partName + " " + last)),
        messages: msgs.length ? msgs : [{ role: "user", content: "Help me with this topic." }],
        maxTokens: 900,
      });
      return J({ text });
    }

    if (mode === "quiz") {
      const r = await callModel({
        system: base + `\n\nHOW HIS TEACHER SETS QUESTIONS: ${STYLE[s.key] || ""}` + mat(spread(t, 6500, Number(b.seed) || 0)),
        messages: [{ role: "user", content: `Write a 5 question objective quiz on this topic in exactly the style of his teacher's questions above (one stem, four options, exactly one correct). Mix easy and harder. Base every question on the topic material. ${b.avoid ? "Do not repeat these stems: " + String(b.avoid).slice(0, 1200) : ""}
Return JSON {"questions":[{"q":"...","options":["...","...","...","..."],"answer":0,"why":"one or two sentences; name the tempting wrong option if there is one"}]}` }],
        json: true, maxTokens: 1800,
      });
      return J(r);
    }

    if (mode === "written_q") {
      const r = await callModel({
        system: base + `\n\nHOW HIS TEACHER SETS QUESTIONS: ${STYLE[s.key] || ""}` + mat(spread(t, 6000, Number(b.seed) || 0)),
        messages: [{ role: "user", content: `Set one theory question on this topic exactly like section B of his teacher's papers (define, explain, list, differentiate in a tabular form, or a short calculation). Return JSON {"question":"...","marks":5,"points":["marking point 1","..."]}` }],
        json: true, maxTokens: 600,
      });
      return J(r);
    }

    if (mode === "written_mark") {
      const r = await callModel({
        system: base + mat(material(t, String(b.question || ""), 4500)),
        messages: [{ role: "user", content: `Mark this answer kindly but honestly, like his teacher would.
QUESTION: ${b.question}
MARKING POINTS: ${JSON.stringify(b.points || [])}
OUT OF: ${b.marks || 5}
HIS ANSWER: ${String(b.answer || "").slice(0, 2500)}
Return JSON {"score":number,"outOf":number,"good":"what he got right in one sentence","fix":"the most useful correction in one or two sentences","model":"a full marks answer, short"}` }],
        json: true, maxTokens: 900,
      });
      return J(r);
    }

    const q = String(b.question || "").slice(0, 2500);
    const hwSys = base + mat(material(t, q, 5000));

    if (mode === "hw_explain") {
      return J(await callModel({ system: hwSys, json: true, maxTokens: 700, messages: [{ role: "user", content: `Homework question from his school: """${q}"""
Do NOT solve it. Return JSON {"asks":"what the question wants, in one plain sentence","idea":["2 to 4 short points: the key idea or formula he needs"],"start":"one sentence telling him how to begin"}` }] }));
    }
    if (mode === "hw_check") {
      return J(await callModel({ system: hwSys, json: true, maxTokens: 600, messages: [{ role: "user", content: `Homework question: """${q}"""
His attempt number ${b.tryNo || 1}: """${String(b.attempt || "").slice(0, 2500)}"""
Judge it. "real" is false if the attempt is empty, a joke, "idk" or a copy of the question. Do not reveal the full answer. Return JSON {"real":boolean,"verdict":"correct"|"partly"|"wrong","feedback":"one or two encouraging sentences on what is right","hint":"one nudge towards what is missing, as a question if possible, or empty if correct"}` }] }));
    }
    if (mode === "hw_answer") {
      return J(await callModel({ system: hwSys, json: true, maxTokens: 1200, messages: [{ role: "user", content: `Homework question: """${q}"""
His attempts: """${String(b.attempts || "").slice(0, 2500)}"""
Give the full worked answer, step by step, the way his teacher would want it written in his notebook. Return JSON {"steps":["step 1","..."],"final":"the final answer in one line"}` }] }));
    }
    if (mode === "hw_twin") {
      return J(await callModel({ system: hwSys, json: true, maxTokens: 400, messages: [{ role: "user", content: `Write ONE new practice question that tests exactly the same skill as this one, with different numbers or examples: """${q}""" Return JSON {"question":"..."}` }] }));
    }
    return Response.json({ error: "BAD_MODE" }, { status: 400 });
  } catch (e) {
    const msg = String(e.message || e);
    const status = msg === "RATE_LIMIT" ? 429 : msg === "NO_KEY" || msg === "BUSY" ? 503 : 500;
    console.error(msg);
    return Response.json({ error: msg.split(" ")[0] }, { status });
  }
}

// Owner-only health check: GET /api/ai?code=APP_CODE runs one tiny request.
export async function GET(req) {
  const u = new URL(req.url);
  if (!process.env.APP_CODE || u.searchParams.get("code") !== process.env.APP_CODE) return new Response("no", { status: 401 });
  const t0 = Date.now();
  if (u.searchParams.get("blobtest")) {
    try {
      await put("progress/_test.json", JSON.stringify({ at: new Date().toISOString() }), { access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json" });
      const r = await get("progress/_test.json", { access: "private", useCache: false });
      return J({ blob: await new Response(r.stream).text() });
    } catch (e) { return J({ blobError: String(e.message || e) }); }
  }
  if (u.searchParams.get("mode")) {
    const body = Object.fromEntries(u.searchParams.entries());
    if (body.messages) body.messages = JSON.parse(body.messages);
    const res = await POST(new Request(req.url, { method: "POST", headers: { "x-app-code": process.env.APP_CODE }, body: JSON.stringify(body) }));
    const out = await res.json();
    return J({ model: M.lastModel, ms: Date.now() - t0, out });
  }
  try {
    const r = await callModel({ system: "Reply with JSON only.", messages: [{ role: "user", content: 'Return {"ok":true}' }], json: true, maxTokens: 50 });
    return J({ ok: r, ms: Date.now() - t0 });
  } catch (e) { return J({ error: String(e.message), ms: Date.now() - t0 }); }
}
