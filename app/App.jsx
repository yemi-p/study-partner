"use client";
import { useEffect, useMemo, useRef, useState } from "react";

/* ---------- constants ---------- */
const KEY = "studypartner.v1";
const COLORS = { chemistry: "#B0174F", maths: "#1D4ED8", physics: "#C2410C", biology: "#1F6B3A", english: "#6D28D9" };
const ORDER = ["chemistry", "maths", "physics", "biology", "english"];
const ELEMENTS = "H Hydrogen,He Helium,Li Lithium,Be Beryllium,B Boron,C Carbon,N Nitrogen,O Oxygen,F Fluorine,Ne Neon,Na Sodium,Mg Magnesium,Al Aluminium,Si Silicon,P Phosphorus,S Sulfur,Cl Chlorine,Ar Argon,K Potassium,Ca Calcium,Sc Scandium,Ti Titanium,V Vanadium,Cr Chromium,Mn Manganese,Fe Iron,Co Cobalt,Ni Nickel,Cu Copper,Zn Zinc,Ga Gallium,Ge Germanium,As Arsenic,Se Selenium,Br Bromine,Kr Krypton,Rb Rubidium,Sr Strontium,Y Yttrium,Zr Zirconium,Nb Niobium,Mo Molybdenum,Tc Technetium,Ru Ruthenium,Rh Rhodium,Pd Palladium,Ag Silver,Cd Cadmium,In Indium,Sn Tin,Sb Antimony,Te Tellurium,I Iodine,Xe Xenon,Cs Caesium,Ba Barium,La Lanthanum,Ce Cerium,Pr Praseodymium,Nd Neodymium"
  .split(",").map((x, i) => { const [sym, ...n] = x.split(" "); return { z: i + 1, sym, name: n.join(" ") }; });
const XP_PER_LEVEL = 100;
const DAILY_CAP = 150;

const today = () => new Date().toLocaleDateString("en-CA");
const dayNum = () => Math.floor(Date.now() / 86400000);

function fresh() {
  return { xp: 0, dayXp: 0, day: today(), streak: 0, lastActive: null, topics: {}, mission: null, tileLog: [] };
}
function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); return s ? { ...fresh(), ...s } : fresh(); } catch { return fresh(); }
}
function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} }
function getCode() { try { return localStorage.getItem(KEY + ".code") || ""; } catch { return ""; } }
function setCodeLS(c) { try { localStorage.setItem(KEY + ".code", c); } catch {} }

async function ai(body) {
  const r = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json", "x-app-code": getCode() }, body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(data.error || "ERROR");
    e.code = data.error || "ERROR";
    throw e;
  }
  return data;
}
function errText(e) {
  if (e.code === "CODE") return "This phone needs the app code. Go to the Me tab and enter it.";
  if (e.code === "RATE_LIMIT") return "Study Partner needs a short break. Wait a minute, then tap Try again.";
  if (e.code === "BUSY") return "The AI is very busy right now. Wait a minute and try again.";
  if (e.code === "NO_KEY") return "The app isn't connected to its AI yet. Ask Yemi to add the key.";
  return "Something went wrong. Check your data connection and try again.";
}

/* ---------- small pieces ---------- */
const Icon = {
  home: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/></svg>,
  hw: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>,
  trophy: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M9 20h6"/></svg>,
  me: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>,
  back: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>,
  check: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>,
  flame: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3c1 4 5 6 5 11a5 5 0 0 1-10 0c0-3 2-4 2-7 2 1 3 3 3 5"/></svg>,
};

function Pattern({ k }) {
  const g = { fill: "#FFFFFF", fillOpacity: 0.22 };
  if (k === "chemistry") return <svg width="96" height="60" viewBox="0 0 96 60" aria-hidden="true"><g {...g}><path d="M0 60 16 30 32 60z"/><path d="M32 60 48 30 64 60z"/><path d="M64 60 80 30 96 60z"/><path d="M16 30 32 0 48 30z"/><path d="M48 30 64 0 80 30z"/></g></svg>;
  if (k === "maths") return <svg width="96" height="60" viewBox="0 0 96 60" aria-hidden="true"><g {...g}><rect x="4" y="4" width="20" height="20"/><rect x="38" y="4" width="20" height="20"/><rect x="72" y="4" width="20" height="20"/><rect x="21" y="36" width="20" height="20"/><rect x="55" y="36" width="20" height="20"/></g></svg>;
  if (k === "physics") return <svg width="96" height="60" viewBox="0 0 96 60" aria-hidden="true"><g fill="none" stroke="#FFFFFF" strokeOpacity="0.3" strokeWidth="6"><path d="M0 15 Q12 0 24 15 T48 15 T72 15 T96 15"/><path d="M0 45 Q12 30 24 45 T48 45 T72 45 T96 45"/></g></svg>;
  if (k === "biology") return <svg width="96" height="60" viewBox="0 0 96 60" aria-hidden="true"><g {...g}><circle cx="14" cy="14" r="10"/><circle cx="48" cy="14" r="10"/><circle cx="82" cy="14" r="10"/><circle cx="31" cy="46" r="10"/><circle cx="65" cy="46" r="10"/></g></svg>;
  return <svg width="96" height="60" viewBox="0 0 96 60" aria-hidden="true"><g {...g}><path d="M0 0h16v16H0zM32 0h16v16H32zM64 0h16v16H64zM16 22h16v16H16zM48 22h16v16H48zM80 22h16v16H80zM0 44h16v16H0zM32 44h16v16H32zM64 44h16v16H64z"/></g></svg>;
}

function Rich({ text }) {
  // **bold** only; everything else plain text
  const parts = String(text || "").split(/(\*\*[^*]+\*\*)/g);
  return <>{parts.map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : p.replace(/^[ \t]*[*-][ \t]+/gm, "• ")))}</>;
}

function TopBar({ title, tag, color, onBack }) {
  return (
    <div className="topbar">
      <button className="back" aria-label="Back" onClick={onBack}>{Icon.back}</button>
      <h1 className="h1 grow" style={{ fontSize: 20 }}>{title}</h1>
      {tag && <span className="tag" style={{ background: color }}>{tag}</span>}
    </div>
  );
}

/* ---------- app ---------- */
export default function App({ outline }) {
  const [S, setS] = useState(null);
  const [view, setView] = useState({ name: "home" });
  const [toast, setToast] = useState("");
  const subjects = useMemo(() => ORDER.map((k) => outline.find((s) => s.key === k)).filter(Boolean), [outline]);
  const byKey = useMemo(() => Object.fromEntries(subjects.map((s) => [s.key, s])), [subjects]);

  useEffect(() => {
    const s = load();
    if (s.day !== today()) { s.day = today(); s.dayXp = 0; }
    setS(s);
  }, []);
  useEffect(() => { if (S) save(S); }, [S]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 2200); return () => clearTimeout(t); }, [toast]);
  useEffect(() => { window.scrollTo(0, 0); }, [view.name, view.subject, view.n]);

  if (!S) return <div className="shell" />;

  const tk = (sub, n) => `${sub}:${n}`;
  const tinfo = (sub, n) => S.topics[tk(sub, n)] || {};
  const nextTopic = (sub) => {
    const s = byKey[sub];
    const sched = s.topics.filter((t) => t.weeks !== "later");
    return sched.find((t) => (tinfo(sub, t.n).best || 0) < 4) || sched[sched.length - 1];
  };
  const masteredCount = (sub) => byKey[sub].topics.filter((t) => t.weeks !== "later" && (tinfo(sub, t.n).best || 0) >= 4).length;
  const schedCount = (sub) => byKey[sub].topics.filter((t) => t.weeks !== "later").length;

  // daily mission: rotate subjects by day
  const d = dayNum();
  const m1 = ORDER[d % 5], m2 = ORDER[(d + 2) % 5], m3 = ORDER[(d + 4) % 5];
  const mission = S.mission && S.mission.day === today() ? S.mission : { day: today(), done: [false, false, false], chest: false };
  const missionTasks = [
    { label: `Learn one idea in ${byKey[m1].title}`, go: () => openTopic(m1, nextTopic(m1).n, "learn") },
    { label: `Quiz: ${nextTopic(m2).title} (${byKey[m2].title})`, go: () => openTopic(m2, nextTopic(m2).n, "quiz") },
    { label: `One theory question in ${byKey[m3].title}`, go: () => openTopic(m3, nextTopic(m3).n, "written") },
  ];

  function update(fn) { setS((prev) => { const n = structuredClone(prev); fn(n); return n; }); }
  function addXp(n, why) {
    update((s) => {
      if (s.day !== today()) { s.day = today(); s.dayXp = 0; }
      const give = Math.max(0, Math.min(n, DAILY_CAP - s.dayXp));
      s.xp += give; s.dayXp += give;
      if (s.lastActive !== today()) {
        const y = new Date(Date.now() - 86400000).toLocaleDateString("en-CA");
        s.streak = s.lastActive === y ? s.streak + 1 : 1;
        s.lastActive = today();
      }
      if (give > 0) setToast(`+${give} XP${why ? " · " + why : ""}`);
      else setToast("Daily XP cap reached. Learning still counts!");
    });
  }
  function markMission(kind, sub) {
    const idx = kind === "learn" && sub === m1 ? 0 : kind === "quiz" && sub === m2 ? 1 : kind === "written" && sub === m3 ? 2 : -1;
    if (idx < 0) return;
    update((s) => {
      const mm = s.mission && s.mission.day === today() ? s.mission : { day: today(), done: [false, false, false], chest: false };
      mm.done[idx] = true; s.mission = mm;
    });
  }
  function openTopic(subject, n, tab = "learn") { setView({ name: "topic", subject, n, tab }); }

  const level = Math.floor(S.xp / XP_PER_LEVEL) + 1;
  const el = ELEMENTS[Math.min(level, ELEMENTS.length) - 1];
  const nav = (name) => setView({ name });

  let body;
  if (view.name === "home") {
    body = (
      <div className="screen">
        <div className="row between">
          <h1 className="h1">Today's plan</h1>
          <div className="row" style={{ gap: 6 }}>
            <span className="pill sun">{Icon.flame}{S.streak}</span>
            <span className="pill ink">Lv {level} · {el.sym}</span>
          </div>
        </div>
        <section className="mission" aria-label="Today's mission">
          <svg className="rings" width="140" height="140" viewBox="0 0 140 140" aria-hidden="true"><circle cx="70" cy="70" r="60" fill="none" stroke="#FFC93C" strokeWidth="10"/><circle cx="70" cy="70" r="34" fill="none" stroke="#FFC93C" strokeWidth="10"/><circle cx="70" cy="70" r="10" fill="#FFC93C"/></svg>
          <span className="label">TODAY'S MISSION · {mission.done.filter(Boolean).length} OF 3</span>
          {missionTasks.map((t, i) => (
            <button key={i} className={"task" + (mission.done[i] ? " done" : "")} onClick={t.go}>
              <span className="box">{mission.done[i] && Icon.check}</span>{t.label}
            </button>
          ))}
          {mission.done.every(Boolean) && !mission.chest ? (
            <button className="chest" onClick={() => { update((s) => { s.mission.chest = true; }); addXp(50, "mission chest"); }}>Open the chest · +50 XP</button>
          ) : (
            <span className="small" style={{ color: "#E6DCCD" }}>{mission.chest ? "Chest opened. Come back tomorrow for a new mission." : "Finish all three for a chest: +50 XP."}</span>
          )}
        </section>
        <h2 className="h2">Subjects</h2>
        <div className="row" style={{ flexDirection: "column", gap: 8 }}>
          {subjects.map((s) => {
            const nt = nextTopic(s.key);
            return (
              <button key={s.key} className="subject" style={{ background: COLORS[s.key] }} onClick={() => setView({ name: "subject", subject: s.key })}>
                <span><strong>{s.title}</strong><span>{masteredCount(s.key)} of {schedCount(s.key)} · {nt.title}</span></span>
                <Pattern k={s.key} />
              </button>
            );
          })}
        </div>
      </div>
    );
  } else if (view.name === "subject") {
    const s = byKey[view.subject];
    const color = COLORS[s.key];
    const nt = nextTopic(s.key);
    const groups = [["This term", s.topics.filter((t) => t.weeks !== "later")], ["Later this year", s.topics.filter((t) => t.weeks === "later")]];
    body = (
      <div className="screen">
        <TopBar title={s.title} tag={`${masteredCount(s.key)}/${schedCount(s.key)}`} color={color} onBack={() => nav("home")} />
        {groups.map(([label, list]) => list.length > 0 && (
          <div key={label} className="row" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
            <span className="label-caps">{label}</span>
            {list.map((t) => {
              const inf = tinfo(s.key, t.n);
              const done = (inf.best || 0) >= 4;
              return (
                <button key={t.n} className={"topic" + (done ? " done" : "") + (t.n === nt.n && label === "This term" ? " next" : "")} onClick={() => openTopic(s.key, t.n)}>
                  <span className="num" style={done ? { background: color } : undefined}>{done ? Icon.check : t.n}</span>
                  <span className="grow">
                    <strong style={{ display: "block" }}>{t.title}</strong>
                    <span className="small muted">{t.weeks !== "later" && t.weeks !== "exam extra" ? `Week ${t.weeks}` : t.weeks === "exam extra" ? "Asked in exams" : "Not started in class yet"}{inf.best != null ? ` · quiz best ${inf.best}/5` : ""}</span>
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    );
  } else if (view.name === "topic") {
    body = <TopicView key={view.subject + view.n} view={view} setView={setView} subject={byKey[view.subject]} info={tinfo(view.subject, view.n)}
      onQuizDone={(score) => {
        update((s) => { const k = tk(view.subject, view.n); const t = s.topics[k] || {}; const firstPass = (t.best || 0) < 4 && score >= 4; t.best = Math.max(t.best || 0, score); s.topics[k] = t; if (firstPass) s.tileLog.push(`${view.subject}:${view.n}`); });
        addXp(score * 4 + (score === 5 ? 5 : 0), `${score}/5`); markMission("quiz", view.subject);
      }}
      onLearned={() => { markMission("learn", view.subject); }}
      onLearnXp={() => addXp(5, "good answer")}
      onWritten={(score, outOf) => { update((s) => { const k = tk(view.subject, view.n); const t = s.topics[k] || {}; t.wbest = Math.max(t.wbest || 0, Math.round((score / outOf) * 100)); s.topics[k] = t; }); addXp(Math.round((score / outOf) * 20) + 3, "theory"); markMission("written", view.subject); }}
    />;
  } else if (view.name === "homework") {
    body = <Homework subjects={subjects} onXp={addXp} />;
  } else if (view.name === "trophies") {
    const unlocked = S.tileLog.length;
    body = (
      <div className="screen">
        <h1 className="h1">Trophies</h1>
        <div className="card">
          <div className="row between"><strong>Level {level} · {el.name}</strong><span className="small muted">{S.xp % XP_PER_LEVEL} / {XP_PER_LEVEL} XP</span></div>
          <div className="xpbar"><div style={{ width: `${S.xp % XP_PER_LEVEL}%` }} /></div>
          <span className="small muted">Every level is the next element. {S.xp} XP in total. Daily cap {DAILY_CAP} XP ({S.dayXp} today).</span>
        </div>
        <h2 className="h2">Element tiles · {unlocked}</h2>
        <p className="small muted" style={{ margin: 0 }}>Score 4 or 5 out of 5 on a topic quiz to unlock the next element.</p>
        <div className="tiles">
          {ELEMENTS.slice(0, Math.max(20, unlocked + 5)).map((e, i) => {
            const on = i < unlocked;
            const sub = on ? S.tileLog[i].split(":")[0] : null;
            return <div key={e.z} className={"tile" + (on ? " on" : "")} style={on ? { background: COLORS[sub] } : undefined}><small>{e.z}</small><b>{on ? e.sym : "?"}</b></div>;
          })}
        </div>
        <h2 className="h2">Badges</h2>
        <div className="chips">
          {[["First quiz", Object.values(S.topics).some((t) => t.best != null)], ["Perfect 5/5", Object.values(S.topics).some((t) => t.best === 5)], ["3 day streak", S.streak >= 3], ["7 day streak", S.streak >= 7], ["All five subjects", ORDER.every((k) => Object.keys(S.topics).some((x) => x.startsWith(k + ":")))]].map(([n, ok]) => (
            <span key={n} className="chip" aria-pressed={ok} style={{ display: "inline-flex", alignItems: "center", opacity: ok ? 1 : 0.5 }}>{n}</span>
          ))}
        </div>
      </div>
    );
  } else if (view.name === "me") {
    body = <MeView S={S} subjects={subjects} masteredCount={masteredCount} schedCount={schedCount} onReset={() => { if (confirm("Reset all progress on this phone?")) setS(fresh()); }} />;
  }

  return (
    <div className="shell">
      {body}
      {toast && <div className="toast" role="status">{toast}</div>}
      <nav className="nav" aria-label="Main">
        <div className="in">
          {[["home", "Home", Icon.home], ["homework", "Homework", Icon.hw], ["trophies", "Trophies", Icon.trophy], ["me", "Me", Icon.me]].map(([k, label, ic]) => (
            <button key={k} aria-current={view.name === k || (k === "home" && (view.name === "subject" || view.name === "topic")) ? "page" : undefined} onClick={() => nav(k)}>{ic}{label}</button>
          ))}
        </div>
      </nav>
    </div>
  );
}

/* ---------- topic: learn / quiz / written ---------- */
function TopicView({ view, setView, subject, info, onQuizDone, onLearned, onLearnXp, onWritten }) {
  const t = subject.topics.find((x) => x.n === view.n);
  const color = COLORS[subject.key];
  const tab = view.tab || "learn";
  const setTab = (tb) => setView({ ...view, tab: tb });
  return (
    <div className="screen">
      <TopBar title={t.title} tag={subject.title} color={color} onBack={() => setView({ name: "subject", subject: subject.key })} />
      {t.scheme && <p className="small muted" style={{ margin: 0 }}>In class: {t.scheme}</p>}
      <div className="tabs" role="tablist">
        {[["learn", "Learn"], ["quiz", "Quiz"], ["written", "Theory"]].map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {tab === "learn" && <Learn subject={subject.key} topic={t} onLearned={onLearned} onXp={onLearnXp} onQuiz={() => setTab("quiz")} />}
      {tab === "quiz" && <Quiz subject={subject.key} n={t.n} best={info.best} onDone={onQuizDone} />}
      {tab === "written" && <Written subject={subject.key} n={t.n} onDone={onWritten} />}
    </div>
  );
}

const BOOK = { chemistry: "your Okoye textbook", maths: "New General Mathematics", physics: "New School Physics (Anyakoha)", biology: "your class notes and Biology Matters", english: "your Oxford English course" };
const chatKey = (subject, n) => `${KEY}.chat.${subject}:${n}`;
function loadChat(subject, n) { try { return JSON.parse(localStorage.getItem(chatKey(subject, n))) || null; } catch { return null; } }
function saveChat(subject, n, c) { try { localStorage.setItem(chatKey(subject, n), JSON.stringify({ ...c, msgs: c.msgs.slice(-40) })); } catch {} }

function Learn({ subject, topic, onLearned, onXp, onQuiz }) {
  const n = topic.n;
  const parts = topic.parts?.length ? topic.parts : [topic.title];
  const [c, setC] = useState(() => loadChat(subject, n) || { part: 0, started: false, msgs: [] });
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [retry, setRetry] = useState(null);
  const end = useRef(null);
  const answered = useRef(0);
  useEffect(() => { saveChat(subject, n, c); }, [c, subject, n]);
  useEffect(() => { end.current?.scrollIntoView({ block: "end", behavior: "smooth" }); }, [c.msgs.length, busy]);

  const chatMsgs = (msgs) => msgs.filter((m) => m.role === "user" || m.role === "assistant").map((m) => ({ role: m.role, content: m.content }));

  async function run(fn) {
    setBusy(true); setErr(""); setRetry(null);
    try { await fn(); } catch (e) { setErr(errText(e)); setRetry(() => () => run(fn)); }
    setBusy(false);
  }
  function teach(part, how = "first", userLabel) {
    return run(async () => {
      const base = c.msgs.concat(userLabel ? [{ role: "user", content: userLabel }] : []);
      const r = await ai({ mode: "teach", subject, topic: n, part, how });
      const content = r.lesson + (r.check ? `\n\n**Quick check:** ${r.check}` : "");
      setC({ ...c, started: true, part, msgs: [...base, { role: "assistant", content, recap: r.recap, part }] });
    });
  }
  function chat(content, starter, label) {
    return run(async () => {
      const next = [...c.msgs, { role: "user", content: label || content }];
      const send = [...chatMsgs(c.msgs), { role: "user", content }];
      const r = await ai({ mode: "chat", subject, topic: n, part: c.part, starter, messages: send });
      setC({ ...c, started: true, msgs: [...next, { role: "assistant", content: r.text, part: c.part }] });
      if (!starter) { onLearned(); answered.current += 1; if (answered.current % 2 === 0) onXp(); }
    });
  }
  function nextPart() {
    const lastTeach = [...c.msgs].reverse().find((m) => m.recap?.length);
    const recapMsg = lastTeach ? [{ role: "recap", part: c.part, recap: lastTeach.recap }] : [];
    const p = c.part + 1;
    run(async () => {
      const r = await ai({ mode: "teach", subject, topic: n, part: p, how: "first" });
      const content = r.lesson + (r.check ? `\n\n**Quick check:** ${r.check}` : "");
      setC({ ...c, part: p, msgs: [...c.msgs, ...recapMsg, { role: "user", content: `Next: ${parts[p]}` }, { role: "assistant", content, recap: r.recap, part: p }] });
      onLearned();
    });
  }
  function restart() { if (confirm("Clear this lesson chat and start the topic again?")) setC({ part: 0, started: false, msgs: [] }); }

  const lastRecap = [...c.msgs].reverse().find((m) => m.recap?.length);
  const isLast = c.part >= parts.length - 1;

  return (
    <>
      <div className="partbar" aria-label="Lesson progress">
        <div className="row between small"><strong>Part {c.part + 1} of {parts.length}</strong>{c.started && <button className="linkbtn" onClick={restart}>Start over</button>}</div>
        <div className="partdots">{parts.map((p, i) => <span key={i} className={i < c.part ? "done" : i === c.part ? "now" : ""} title={p} />)}</div>
        <span className="small">{parts[c.part]}</span>
      </div>

      <div className="chat">
        <div className="bubble ai">Hi! I teach from {BOOK[subject] || "your textbook"}: <strong>{topic.title}</strong>. Pick a starter, or ask me anything about this topic.</div>
        {!c.started && !busy && (
          <div className="starters">
            <button className="starter" onClick={() => teach(0, "first", "Teach me this topic step by step")}>Teach me this topic step by step</button>
            <button className="starter" onClick={() => chat("What must I know for the exam on this topic?", "exam")}>What must I know for the exam?</button>
            <button className="starter" onClick={() => chat("Give me an example to try.", "example")}>Give me an example to try</button>
            <button className="starter" onClick={() => chat("Explain the hardest part of this topic simply.", "hardest")}>Explain the hardest part simply</button>
          </div>
        )}
        {c.msgs.map((m, i) => m.role === "recap" ? (
          <div key={i} className="recap">
            <span className="label-caps">Copy into your notebook · {parts[m.part]}</span>
            <ul className="tight">{m.recap.map((x, j) => <li key={j}><Rich text={x} /></li>)}</ul>
          </div>
        ) : <div key={i} className={"bubble " + (m.role === "user" ? "me" : "ai")}><Rich text={m.content} /></div>)}
        {busy && <div className="bubble ai loading">Study Partner is thinking…</div>}
        {err && <div className="error">{err} {retry && <button className="chip" onClick={retry}>Try again</button>}</div>}
        {c.started && !busy && (
          <div className="starters">
            <button className="starter" onClick={() => teach(c.part, "again", "Explain it another way")}>Explain it another way</button>
            <button className="starter" onClick={() => teach(c.part, "example", "Give me a worked example")}>Give me a worked example</button>
            {!isLast && <button className="starter go" onClick={nextPart}>Next part: {parts[c.part + 1]}</button>}
            {isLast && <button className="starter go" onClick={onQuiz}>Finished! Take the topic quiz</button>}
          </div>
        )}
        {isLast && lastRecap && c.started && !busy && c.msgs[c.msgs.length - 1]?.recap && (
          <div className="recap">
            <span className="label-caps">Copy into your notebook · {parts[c.part]}</span>
            <ul className="tight">{lastRecap.recap.map((x, j) => <li key={j}><Rich text={x} /></li>)}</ul>
          </div>
        )}
        <div ref={end} style={{ height: 72 }} />
      </div>
      <form className="composer" onSubmit={(e) => { e.preventDefault(); if (text.trim() && !busy) { const v = text.trim(); setText(""); chat(v); } }}>
        <label htmlFor="chatin" hidden>Your answer or question</label>
        <input id="chatin" className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Answer the check, or ask a question" autoComplete="off" />
        <button className="btn" disabled={busy || !text.trim()}>Send</button>
      </form>
    </>
  );
}

const quizSeen = {};
function Quiz({ subject, n, best, onDone }) {
  const [qs, setQs] = useState(null);
  const [i, setI] = useState(0);
  const [pick, setPick] = useState(null);
  const [score, setScore] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [finished, setFinished] = useState(false);
  const k = subject + ":" + n;

  async function start() {
    setBusy(true); setErr(""); setI(0); setPick(null); setScore(0); setFinished(false);
    try {
      const r = await ai({ mode: "quiz", subject, topic: n, seed: Math.floor(Math.random() * 9), avoid: (quizSeen[k] || []).join(" | ") });
      const list = (r.questions || []).filter((q) => q.options?.length === 4).slice(0, 5);
      if (list.length < 3) throw Object.assign(new Error(), { code: "ERROR" });
      quizSeen[k] = [...(quizSeen[k] || []), ...list.map((q) => q.q.slice(0, 60))].slice(-15);
      setQs(list);
    } catch (e) { setErr(errText(e)); }
    setBusy(false);
  }
  if (!qs) return (
    <div className="card">
      <strong>5 objective questions, exam style</strong>
      <span className="small muted">{best != null ? `Your best: ${best}/5. ` : ""}Score 4 or more to unlock an element tile. 4 XP per correct answer.</span>
      {err && <div className="error">{err}</div>}
      <button className="btn" onClick={start} disabled={busy}>{busy ? "Setting your questions…" : "Start quiz"}</button>
    </div>
  );
  if (finished) return (
    <div className="card">
      <strong className="h2" style={{ fontSize: 22 }}>{score}/{qs.length}</strong>
      <span>{score >= 4 ? "Strong. That topic is yours." : score >= 2 ? "Getting there. Go back to Learn for the ones you missed, then try again." : "This one needs another look. Start with Learn."}</span>
      <button className="btn" onClick={start} disabled={busy}>{busy ? "Setting new questions…" : "New questions"}</button>
    </div>
  );
  const q = qs[i];
  const answered = pick !== null;
  return (
    <>
      <div className="dots">{qs.map((_, j) => <span key={j} className={j < i || (j === i && answered) ? "on" : ""} />)}</div>
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, lineHeight: 1.35 }}>{q.q}</h2>
      <div className="row" style={{ flexDirection: "column", gap: 10 }}>
        {q.options.map((o, j) => (
          <button key={j} className={"opt" + (answered && j === q.answer ? " right" : answered && j === pick ? " wrong" : "")} disabled={answered}
            onClick={() => { setPick(j); if (j === q.answer) setScore((s) => s + 1); }}>
            <span className="letter">{"ABCD"[j]}</span>{o}
          </button>
        ))}
      </div>
      {answered && (
        <div className="card">
          <strong>{pick === q.answer ? "Correct." : `Not quite. It's ${"ABCD"[q.answer]}.`}</strong>
          <span><Rich text={q.why} /></span>
          <button className="btn" onClick={() => { if (i + 1 < qs.length) { setI(i + 1); setPick(null); } else { setFinished(true); onDone(score); } }}>
            {i + 1 < qs.length ? "Next question" : "See my score"}
          </button>
        </div>
      )}
    </>
  );
}

function Written({ subject, n, onDone }) {
  const [q, setQ] = useState(null);
  const [ans, setAns] = useState("");
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function getQ() {
    setBusy(true); setErr(""); setRes(null); setAns("");
    try { setQ(await ai({ mode: "written_q", subject, topic: n, seed: Math.floor(Math.random() * 9) })); } catch (e) { setErr(errText(e)); }
    setBusy(false);
  }
  async function mark() {
    setBusy(true); setErr("");
    try { const r = await ai({ mode: "written_mark", subject, topic: n, question: q.question, points: q.points, marks: q.marks, answer: ans }); setRes(r); onDone(Number(r.score) || 0, Number(r.outOf) || q.marks || 5); } catch (e) { setErr(errText(e)); }
    setBusy(false);
  }
  return (
    <>
      {!q && <div className="card"><strong>One theory question, marked like your teacher would</strong><span className="small muted">Like Section B of your exam. Write your answer, get a score and a model answer.</span><button className="btn" onClick={getQ} disabled={busy}>{busy ? "Writing a question…" : "Give me a question"}</button></div>}
      {err && <div className="error">{err}</div>}
      {q && (
        <div className="card">
          <span className="label-caps">Question · {q.marks || 5} marks</span>
          <span style={{ fontSize: 17, lineHeight: 1.45 }}><Rich text={q.question} /></span>
        </div>
      )}
      {q && !res && (
        <>
          <label htmlFor="wans" className="small" style={{ fontWeight: 700 }}>Your answer</label>
          <textarea id="wans" className="input" value={ans} onChange={(e) => setAns(e.target.value)} placeholder="Write it the way you would in your exam" />
          <button className="btn" onClick={mark} disabled={busy || ans.trim().length < 3}>{busy ? "Marking…" : "Mark my answer"}</button>
        </>
      )}
      {res && (
        <div className="card">
          <strong className="h2" style={{ fontSize: 20 }}>{res.score}/{res.outOf}</strong>
          {res.good && <span><b>Good:</b> <Rich text={res.good} /></span>}
          {res.fix && <span><b>Fix:</b> <Rich text={res.fix} /></span>}
          <div className="bubble hint"><b>Full marks answer</b>{"\n"}<Rich text={res.model} /></div>
          <button className="btn" onClick={getQ} disabled={busy}>Another question</button>
        </div>
      )}
    </>
  );
}

/* ---------- homework ---------- */
function Homework({ subjects, onXp }) {
  const [sub, setSub] = useState(null);
  const [question, setQuestion] = useState("");
  const [topic, setTopic] = useState(null);
  const [explain, setExplain] = useState(null);
  const [tries, setTries] = useState([]); // {attempt, verdict, feedback, hint, real}
  const [answer, setAnswer] = useState(null);
  const [twin, setTwin] = useState(null);
  const [twinRes, setTwinRes] = useState(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const color = sub ? COLORS[sub] : "#1A1410";
  const realTries = tries.filter((t) => t.real);
  const solved = tries.some((t) => t.verdict === "correct");
  const stage = answer || solved ? 2 : explain ? 1 : 0;

  function reset() { setQuestion(""); setTopic(null); setExplain(null); setTries([]); setAnswer(null); setTwin(null); setTwinRes(null); setText(""); setErr(""); setNote(""); }

  async function begin() {
    setBusy("Reading your question…"); setErr(""); setNote("");
    try {
      const r = await ai({ mode: "hw_route", subject: sub, question });
      if (r.inSubject === false) { setNote(`That doesn't look like ${subjects.find((s) => s.key === sub).title}. Pick the right subject, or check the question.`); setBusy(""); return; }
      const s = subjects.find((x) => x.key === sub);
      const n = r.n && s.topics.some((t) => t.n === r.n) ? r.n : s.topics[0].n;
      if (!r.n) setNote("This might not be in your textbook yet. Study Partner will still help, using the closest topic.");
      setTopic(n);
      const ex = await ai({ mode: "hw_explain", subject: sub, topic: n, question });
      setExplain(ex);
    } catch (e) { setErr(errText(e)); }
    setBusy("");
  }
  async function check() {
    const attempt = text.trim();
    setBusy("Checking…"); setErr("");
    try {
      const r = await ai({ mode: "hw_check", subject: sub, topic, question, attempt, tryNo: realTries.length + 1 });
      setTries([...tries, { attempt, ...r }]); setText("");
      if (r.verdict === "correct") onXp(15, "homework");
    } catch (e) { setErr(errText(e)); }
    setBusy("");
  }
  async function reveal() {
    setBusy("Writing it out…"); setErr("");
    try { setAnswer(await ai({ mode: "hw_answer", subject: sub, topic, question, attempts: tries.map((t) => t.attempt).join(" || ") })); } catch (e) { setErr(errText(e)); }
    setBusy("");
  }
  async function getTwin() {
    setBusy("Making a practice question…"); setErr("");
    try { setTwin((await ai({ mode: "hw_twin", subject: sub, topic, question })).question); setTwinRes(null); } catch (e) { setErr(errText(e)); }
    setBusy("");
  }
  async function checkTwin() {
    setBusy("Checking…"); setErr("");
    try {
      const r = await ai({ mode: "hw_check", subject: sub, topic, question: twin, attempt: text.trim(), tryNo: 1 });
      setTwinRes(r); setText("");
      if (r.real) onXp(r.verdict === "correct" ? 15 : 3, r.verdict === "correct" ? "practice" : "good try");
    } catch (e) { setErr(errText(e)); }
    setBusy("");
  }
  const canGiveUp = realTries.length >= 1 && !solved && !answer;
  const maxed = realTries.length >= 2 && !solved;

  return (
    <div className="screen">
      <div className="row between">
        <h1 className="h1">Homework help</h1>
        {sub && <span className="tag" style={{ background: color }}>{subjects.find((s) => s.key === sub).title}</span>}
      </div>
      <div className="steps3" aria-label="Progress">
        <span className={stage > 0 ? "on" : "now"}><i />Understand</span>
        <span className={stage > 1 ? "on" : stage === 1 ? "now" : ""}><i />Try · {Math.min(realTries.length, 2)} of 2</span>
        <span className={stage === 2 ? "now" : ""}><i />Answer</span>
      </div>

      {!explain && (
        <>
          <span className="label-caps">Which subject?</span>
          <div className="chips">{subjects.map((s) => <button key={s.key} className="chip" aria-pressed={sub === s.key} onClick={() => setSub(s.key)}>{s.title}</button>)}</div>
          <label htmlFor="hwq" className="small" style={{ fontWeight: 700 }}>Type the question exactly as your teacher gave it</label>
          <textarea id="hwq" className="input" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="e.g. Convert 45 in base ten to base two" />
          {note && <div className="bubble hint">{note}</div>}
          <button className="btn" disabled={!sub || question.trim().length < 5 || !!busy} onClick={begin}>{busy || "Explain it to me"}</button>
        </>
      )}

      {explain && (
        <div className="card">
          <span className="label-caps">The question</span>
          <span style={{ fontSize: 17, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>{question}</span>
          <span className="small muted"><b>What it wants:</b> {explain.asks}</span>
          {explain.idea?.length > 0 && <ul className="tight small">{explain.idea.map((x, i) => <li key={i}><Rich text={x} /></li>)}</ul>}
          {explain.start && <span className="small"><b>Start here:</b> {explain.start}</span>}
          {note && <span className="small muted">{note}</span>}
        </div>
      )}

      {tries.map((t, i) => (
        <div key={i} className="chat">
          <div className="bubble me">{t.attempt}</div>
          <div className="bubble hint">
            <strong>{!t.real ? "Give it a real go first." : t.verdict === "correct" ? "That's it. Well done." : t.verdict === "partly" ? "Half right, good start." : "Not yet."}</strong>{"\n"}
            <Rich text={t.real ? t.feedback + (t.hint ? "\n" + t.hint : "") : "Write what you think, even if you're unsure. A guess with a reason counts."} />
          </div>
        </div>
      ))}

      {explain && !solved && !answer && !maxed && (
        <>
          <label htmlFor="hwa" className="small" style={{ fontWeight: 700 }}>{realTries.length ? "Your second try" : "Your try"}</label>
          <textarea id="hwa" className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Show your working" />
          <div className="row">
            <button className="btn grow" disabled={!text.trim() || !!busy} onClick={check}>{busy || "Check · +15 XP if right"}</button>
            {canGiveUp && <button className="btn ghost" disabled={!!busy} onClick={reveal}>I'm stuck</button>}
          </div>
        </>
      )}
      {maxed && !answer && <button className="btn" disabled={!!busy} onClick={reveal}>{busy || "Show me how it's done"}</button>}

      {(answer || solved) && (
        <div className="card">
          {answer && (<>
            <span className="label-caps">Worked answer</span>
            <ol className="tight">{(answer.steps || []).map((s, i) => <li key={i}><Rich text={s} /></li>)}</ol>
            <strong>Answer: <Rich text={answer.final} /></strong>
          </>)}
          {!twin && <button className="btn sun" disabled={!!busy} onClick={getTwin}>{busy || "Try one like it · +15 XP"}</button>}
          {!answer && solved && <button className="btn ghost" disabled={!!busy} onClick={reveal}>See the full working</button>}
        </div>
      )}

      {twin && (
        <div className="card">
          <span className="label-caps">Practice question</span>
          <span style={{ fontSize: 17, lineHeight: 1.45 }}><Rich text={twin} /></span>
          {!twinRes || twinRes.verdict !== "correct" ? (<>
            {twinRes && <div className="bubble hint"><Rich text={twinRes.feedback + (twinRes.hint ? "\n" + twinRes.hint : "")} /></div>}
            <label htmlFor="tw" className="small" style={{ fontWeight: 700 }}>Your answer</label>
            <textarea id="tw" className="input" value={text} onChange={(e) => setText(e.target.value)} />
            <button className="btn" disabled={!text.trim() || !!busy} onClick={checkTwin}>{busy || "Check"}</button>
          </>) : <div className="bubble hint"><strong>Nailed it.</strong>{"\n"}<Rich text={twinRes.feedback} /></div>}
        </div>
      )}

      {err && <div className="error">{err}</div>}
      {(explain || note) && <button className="btn ghost" onClick={reset}>New homework question</button>}
    </div>
  );
}

/* ---------- me ---------- */
function MeView({ S, subjects, masteredCount, schedCount, onReset }) {
  const [code, setCode] = useState(getCode());
  const [saved, setSaved] = useState(false);
  return (
    <div className="screen">
      <h1 className="h1">Me</h1>
      <div className="card soft">
        <div className="row between"><span>Total XP</span><strong>{S.xp}</strong></div>
        <div className="row between"><span>Streak</span><strong>{S.streak} day{S.streak === 1 ? "" : "s"}</strong></div>
        {subjects.map((s) => <div key={s.key} className="row between"><span>{s.title}</span><strong>{masteredCount(s.key)} / {schedCount(s.key)} topics</strong></div>)}
      </div>
      <div className="card soft">
        <label htmlFor="code" style={{ fontWeight: 700 }}>App code</label>
        <span className="small muted">Ask Yemi for it. You only enter it once on this phone.</span>
        <div className="row">
          <input id="code" className="input" value={code} onChange={(e) => { setCode(e.target.value); setSaved(false); }} autoComplete="off" />
          <button className="btn" onClick={() => { setCodeLS(code.trim()); setSaved(true); }}>Save</button>
        </div>
        {saved && <span className="small">Saved.</span>}
      </div>
      <p className="small muted" style={{ margin: 0 }}>Progress is saved on this phone only. Study Partner answers from your SS1 textbooks and class notes, and only helps with your five subjects.</p>
      <button className="btn ghost" onClick={onReset}>Reset progress</button>
    </div>
  );
}
