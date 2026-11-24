"use client";
import { useEffect, useState } from "react";

const PKEY = "studypartner.parentcode";
const COLORS = { chemistry: "#B0174F", maths: "#1D4ED8", physics: "#C2410C", biology: "#1F6B3A", english: "#6D28D9" };
const ORDER = ["chemistry", "maths", "physics", "biology", "english"];

const dayStr = (d) => d.toLocaleDateString("en-CA");
function ago(iso) {
  if (!iso) return "never";
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 2) return "just now";
  if (m < 60) return `${m} minutes ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}
const fmtDate = (iso) => new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

export default function Parent() {
  const [code, setCode] = useState("");
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function load(c) {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/parent", { headers: { "x-parent-code": c } });
      if (r.status === 401) { setErr("That code isn't right."); setData(null); }
      else { const d = await r.json(); setData(d); try { localStorage.setItem(PKEY, c); } catch {} }
    } catch { setErr("Couldn't load. Check your connection."); }
    setBusy(false);
  }
  useEffect(() => { let c = ""; try { c = localStorage.getItem(PKEY) || ""; } catch {} if (c) { setCode(c); load(c); } }, []);

  if (!data) return (
    <div className="shell"><div className="screen">
      <h1 className="h1">Parent view</h1>
      <div className="card soft">
        <label htmlFor="pc" style={{ fontWeight: 700 }}>Parent code</label>
        <div className="row">
          <input id="pc" className="input" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" />
          <button className="btn" disabled={!code || busy} onClick={() => load(code.trim())}>{busy ? "…" : "Open"}</button>
        </div>
        {err && <div className="error">{err}</div>}
      </div>
    </div></div>
  );

  const p = data.progress;
  const outline = data.outline;
  if (!p) return (
    <div className="shell"><div className="screen">
      <h1 className="h1">Parent view</h1>
      <div className="card soft"><strong>No activity yet.</strong><span className="muted">Once he opens the app and does a lesson or quiz, his progress shows up here.</span></div>
    </div></div>
  );

  const log = p.log || { days: {}, quizzes: [], written: [], hw: [], parts: {} };
  const week = [...Array(7)].map((_, i) => { const d = new Date(Date.now() - (6 - i) * 86400000); return { key: dayStr(d), label: d.toLocaleDateString("en-GB", { weekday: "short" }), mins: log.days?.[dayStr(d)]?.mins || 0, active: !!log.days?.[dayStr(d)] }; });
  const weekMins = week.reduce((a, b) => a + b.mins, 0);
  const daysActive = week.filter((d) => d.active).length;
  const maxMins = Math.max(30, ...week.map((d) => d.mins));
  const level = Math.floor((p.xp || 0) / 100) + 1;

  const bySub = ORDER.map((k) => outline.find((s) => s.key === k)).filter(Boolean).map((s) => {
    const sched = s.topics.filter((t) => t.weeks !== "later");
    const rows = s.topics.map((t) => {
      const k = `${s.key}:${t.n}`;
      const best = p.topics?.[k]?.best;
      const partReached = log.parts?.[k];
      const started = partReached != null || best != null;
      return { ...t, best, partReached, started, mastered: (best || 0) >= 4 };
    });
    return { s, rows, started: rows.filter((r) => r.started), mastered: rows.filter((r) => r.mastered && r.weeks !== "later").length, sched: sched.length };
  });
  const topicName = (sub, n) => outline.find((s) => s.key === sub)?.topics.find((t) => t.n === n)?.title || "";
  const subName = (sub) => outline.find((s) => s.key === sub)?.title || sub;

  const scores = [...(log.quizzes || []).map((q) => ({ ...q, kind: "Quiz", text: `${q.score}/5` })), ...(log.written || []).map((w) => ({ ...w, kind: "Theory", text: `${w.score}/${w.outOf}` }))]
    .sort((a, b) => b.d.localeCompare(a.d)).slice(0, 12);
  const weak = bySub.flatMap((x) => x.rows.filter((r) => r.best != null && r.best < 3).map((r) => ({ sub: x.s.key, title: r.title, best: r.best })));
  const hw = [...(log.hw || [])].sort((a, b) => b.d.localeCompare(a.d)).slice(0, 15);
  const lastActive = p.savedAt;

  return (
    <div className="shell"><div className="screen" style={{ paddingBottom: 40 }}>
      <div className="row between">
        <h1 className="h1">His progress</h1>
        <button className="chip" onClick={() => load(code)}>{busy ? "…" : "Refresh"}</button>
      </div>
      <span className="small muted">Last used: <strong>{ago(lastActive)}</strong></span>

      <div className="card">
        <span className="label-caps">This week</span>
        <div className="row" style={{ alignItems: "flex-end", gap: 6, height: 90 }}>
          {week.map((d) => (
            <div key={d.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <span className="small" style={{ fontSize: 11 }}>{d.mins ? d.mins + "m" : ""}</span>
              <div style={{ width: "100%", height: Math.max(4, (d.mins / maxMins) * 56), borderRadius: 6, background: d.active ? "var(--ink)" : "var(--line)" }} />
              <span className="small muted" style={{ fontSize: 11 }}>{d.label}</span>
            </div>
          ))}
        </div>
        <div className="row between small"><span>Days studied</span><strong>{daysActive} of 7</strong></div>
        <div className="row between small"><span>Study time</span><strong>{weekMins} min</strong></div>
        <div className="row between small"><span>Streak</span><strong>{p.streak || 0} day{p.streak === 1 ? "" : "s"}</strong></div>
        <div className="row between small"><span>XP · level</span><strong>{p.xp || 0} · Level {level}</strong></div>
      </div>

      <h2 className="h2">Subjects</h2>
      {bySub.map(({ s, rows, started, mastered, sched }) => (
        <details key={s.key} className="card soft" style={{ borderLeft: `6px solid ${COLORS[s.key]}` }}>
          <summary style={{ cursor: "pointer", listStyle: "none" }}>
            <div className="row between"><strong>{s.title}</strong><span className="small">{mastered}/{sched} mastered · {started.length} started</span></div>
          </summary>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
            {rows.filter((r) => r.weeks !== "later" || r.started).map((r) => (
              <div key={r.n} className="row between small" style={{ borderTop: "1px solid var(--line)", paddingTop: 6 }}>
                <span className="grow">{r.title}</span>
                <span style={{ fontWeight: 700, color: r.mastered ? "var(--good)" : r.started ? "var(--ink)" : "#A8987F" }}>
                  {r.mastered ? `Mastered ${r.best}/5` : r.best != null ? `Quiz ${r.best}/5` : r.partReached != null ? `Part ${r.partReached + 1} of ${(r.parts || []).length || 1}` : "Not started"}
                </span>
              </div>
            ))}
          </div>
        </details>
      ))}

      {weak.length > 0 && (
        <div className="card" style={{ background: "var(--sun-soft)" }}>
          <span className="label-caps">Ask him about these</span>
          {weak.map((w, i) => <span key={i} className="small"><strong>{subName(w.sub)}:</strong> {w.title} (best quiz {w.best}/5)</span>)}
        </div>
      )}

      <h2 className="h2">Recent scores</h2>
      <div className="card soft">
        {scores.length ? scores.map((x, i) => (
          <div key={i} className="row between small" style={{ borderTop: i ? "1px solid var(--line)" : 0, paddingTop: i ? 6 : 0 }}>
            <span className="grow"><span className="muted">{fmtDate(x.d)} · {x.kind}</span><br />{subName(x.sub)}: {topicName(x.sub, x.n)}</span>
            <strong>{x.text}</strong>
          </div>
        )) : <span className="small muted">No quizzes yet.</span>}
      </div>

      <h2 className="h2">Homework</h2>
      <div className="card soft">
        {hw.length ? hw.map((h, i) => (
          <div key={h.id || i} className="small" style={{ borderTop: i ? "1px solid var(--line)" : 0, paddingTop: i ? 8 : 0, display: "flex", flexDirection: "column", gap: 2 }}>
            <span className="muted">{fmtDate(h.d)} · {subName(h.sub)}</span>
            <span style={{ whiteSpace: "pre-wrap" }}>{h.q}</span>
            <strong style={{ color: h.result === "solved" ? "var(--good)" : h.result === "shown answer" ? "var(--bad)" : "var(--ink-2)" }}>
              {h.result === "solved" ? `Solved it himself${h.tries ? ` (${h.tries} ${h.tries === 1 ? "try" : "tries"})` : ""}` : h.result === "shown answer" ? (h.stuck ? "Pressed \"I'm stuck\" and saw the answer" : "Saw the answer after 2 tries") : "Didn't finish"}
            </strong>
          </div>
        )) : <span className="small muted">No homework questions yet.</span>}
      </div>
      <p className="small muted" style={{ margin: 0 }}>Lesson chats stay private on his phone. Progress updates a few seconds after he studies.</p>
    </div></div>
  );
}
