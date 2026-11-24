import { callModel } from "../../../lib/model";
import { getSubject, getTopicText } from "../../../lib/content";

export const runtime = "nodejs";
export const maxDuration = 60;

function topicList(s) {
  return s.topics.map((t) => `${t.n}. ${t.title} (week ${t.weeks})`).join("\n");
}

function rules(s, t) {
  return `You are Study Partner, a patient tutor inside a study app for a Nigerian SS1 student (about 15 years old).
SUBJECT: ${s.title}. CURRENT TOPIC: ${t.title}. What his teacher listed for it: ${t.scheme || "not yet scheduled"}.

Rules you never break:
- Teach only ${s.title}, and only from the TOPIC MATERIAL below. Use standard SS1 / WAEC level knowledge only to fill gaps where the material is garbled or missing, and keep it consistent with the material.
- If he asks about anything that is not ${s.title} (other subjects, general chat, games, music, coding, celebrities, personal advice, writing things unrelated to the topic), reply in one friendly sentence that you can only help with ${s.title} here, then steer back to the topic.
- If he asks about ${s.title} that belongs to a different topic, tell him which topic in the list covers it, give a one line answer at most, and steer back.
- Keep replies under 150 words. Plain Nigerian classroom English. Short paragraphs. No emojis. Do not use dashes as punctuation.
- Teach in small steps and end every teaching reply with ONE check question for him to answer.
- If he pastes what looks like homework or an exam question, do not just give the answer: explain what it is asking, give the key idea, and ask him to try first.
- Write formulae plainly: H2O, CO2, 2H2 + O2 → 2H2O, x^2, 10^-3, m/s^2.
- Never ask for or repeat personal details such as full name, school or address.
- Note about the material: ${s.caveat}

ALL TOPICS IN THIS SUBJECT:
${topicList(s)}`;
}

function material(text) {
  return `TOPIC MATERIAL (from his textbook and class notes):\n<<<\n${text}\n>>>`;
}

async function routeTopic(s, question) {
  const r = await callModel({
    system: `You sort SS1 ${s.title} homework questions into topics. Reply as JSON {"n": number or 0, "inSubject": boolean}. inSubject is false if the question is not ${s.title}. n is the best matching topic number, or 0 if none fits.\n\nTOPICS:\n${topicList(s)}`,
    messages: [{ role: "user", content: question }],
    json: true,
  });
  return r;
}

export async function POST(req) {
  const code = process.env.APP_CODE;
  if (code && req.headers.get("x-app-code") !== code) {
    return Response.json({ error: "CODE" }, { status: 401 });
  }
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "BAD_REQUEST" }, { status: 400 });
  }
  const { mode, subject, topic } = body;
  try {
    const s = getSubject(subject);
    if (!s) return Response.json({ error: "NO_SUBJECT" }, { status: 400 });

    if (mode === "hw_route") {
      const q = String(body.question || "").slice(0, 3000);
      const r = await routeTopic(s, q);
      return Response.json(r);
    }

    const tt = getTopicText(subject, topic);
    if (!tt) return Response.json({ error: "NO_TOPIC" }, { status: 400 });
    const sys = rules(s, tt.topic) + "\n\n" + material(tt.text);

    if (mode === "chat") {
      const msgs = (body.messages || []).slice(-16).map((m) => ({ role: m.role, content: String(m.content).slice(0, 4000) }));
      if (!msgs.length) msgs.push({ role: "user", content: "Start the lesson. Greet me in one line, then teach the first small idea of this topic." });
      const text = await callModel({ system: sys, messages: msgs });
      return Response.json({ text });
    }

    if (mode === "quiz") {
      const r = await callModel({
        system: sys,
        json: true,
        messages: [{ role: "user", content: `Write a 5 question objective quiz on this topic only, in the style of a Nigerian SS1 school exam (one stem, four options a to d, exactly one correct). Mix easy and harder questions. Base every question on the topic material. ${body.avoid ? "Avoid repeating these stems: " + String(body.avoid).slice(0, 1500) : ""}
Return JSON: {"questions":[{"q":"...","options":["...","...","...","..."],"answer":0,"why":"one or two sentences, and name the tempting wrong option if there is one"}]}` }],
      });
      return Response.json(r);
    }

    if (mode === "written_q") {
      const r = await callModel({
        system: sys,
        json: true,
        messages: [{ role: "user", content: `Set one short theory question on this topic like section B of his school exam (define, explain, list, differentiate, or a short calculation). Return JSON {"question":"...","marks":5,"points":["marking point 1","..."]}` }],
      });
      return Response.json(r);
    }

    if (mode === "written_mark") {
      const r = await callModel({
        system: sys,
        json: true,
        messages: [{ role: "user", content: `Mark this answer kindly but honestly, like his teacher would.
QUESTION: ${body.question}
MARKING POINTS: ${JSON.stringify(body.points || [])}
OUT OF: ${body.marks || 5}
HIS ANSWER: ${String(body.answer || "").slice(0, 3000)}
Return JSON {"score":number,"outOf":number,"good":"what he got right in one sentence","fix":"the most useful correction in one or two sentences","model":"a full marks answer, short"}` }],
      });
      return Response.json(r);
    }

    const q = String(body.question || "").slice(0, 3000);

    if (mode === "hw_explain") {
      const r = await callModel({
        system: sys,
        json: true,
        messages: [{ role: "user", content: `Homework question from his school: """${q}"""
Do NOT solve it. Return JSON {"asks":"what the question wants, in one plain sentence","idea":["2 to 4 short bullet points: the key idea or formula he needs, from the topic material"],"start":"one sentence telling him how to begin"}` }],
      });
      return Response.json(r);
    }

    if (mode === "hw_check") {
      const r = await callModel({
        system: sys,
        json: true,
        messages: [{ role: "user", content: `Homework question: """${q}"""
His attempt number ${body.tryNo || 1}: """${String(body.attempt || "").slice(0, 3000)}"""
Judge it. "real" is false if the attempt is empty, a joke, "idk" or just a copy of the question. Do not reveal the full answer. Return JSON {"real":boolean,"verdict":"correct"|"partly"|"wrong","feedback":"one or two encouraging sentences on what is right","hint":"one nudge towards what is missing, as a question if possible, or empty if correct"}` }],
      });
      return Response.json(r);
    }

    if (mode === "hw_answer") {
      const r = await callModel({
        system: sys,
        json: true,
        messages: [{ role: "user", content: `Homework question: """${q}"""
His attempts: """${String(body.attempts || "").slice(0, 3000)}"""
Now give the full worked answer, step by step, the way his teacher would want it written in his notebook. Return JSON {"steps":["step 1","..."],"final":"the final answer in one line"}` }],
      });
      return Response.json(r);
    }

    if (mode === "hw_twin") {
      const r = await callModel({
        system: sys,
        json: true,
        messages: [{ role: "user", content: `Write ONE new practice question that tests exactly the same skill as this one, with different numbers or examples: """${q}""" Return JSON {"question":"..."}` }],
      });
      return Response.json(r);
    }

    return Response.json({ error: "BAD_MODE" }, { status: 400 });
  } catch (e) {
    const msg = String(e.message || e);
    const status = msg === "RATE_LIMIT" ? 429 : msg === "NO_KEY" || msg === "BUSY" ? 503 : 500;
    console.error(msg);
    return Response.json({ error: msg.split(" ")[0] }, { status });
  }
}
