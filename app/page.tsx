"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const affirmation = "I can control what I do today. I am doing everything I can, and I don't need to solve tomorrow today.";
const actions = [
  { name: "Workout", detail: "Complete your planned workout.", points: 4, icon: "💪" },
  { name: "Family Connection", detail: "Intentional time with wife or kids.", points: 3, icon: "❤️" },
  { name: "Meditation", detail: "Meditate or deliberately quiet your mind.", points: 2, icon: "🧘" },
  { name: "Journaling", detail: "Meaningful reflection or daily check-in.", points: 2, icon: "✍️" },
  { name: "Reading / Learning", detail: "Focused reading, audiobook, or self-improvement.", points: 2, icon: "📚" },
];
const costs = [
  { name: "Alcohol", detail: "Spend points when choosing a drink.", points: -4, icon: "🍸" },
  { name: "Planned Indulgence", detail: "Spend points on a deliberate indulgence.", points: -2, icon: "🍔" },
];

export default function Home() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [showReset, setShowReset] = useState(false);
  const [showGameify, setShowGameify] = useState(false);
  const [mood, setMood] = useState(7);
  const [gratitude, setGratitude] = useState("");
  const [points, setPoints] = useState(0);
  const [earned, setEarned] = useState<string[]>([]);
  const [rules, setRules] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  const level = useMemo(() => Math.floor(points / 25) + 1, [points]);
  const progress = (Math.max(0, points) % 25) / 25 * 100;

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { router.replace("/login"); return; }
      const today = new Date().toISOString().slice(0, 10);
      const [{ data: log }, { data: txs }, { data: ruleRows }, { data: events }] = await Promise.all([
        supabase.from("daily_logs").select("mood, gratitude").eq("user_id", userData.user.id).eq("log_date", today).maybeSingle(),
        supabase.from("point_transactions").select("amount").eq("user_id", userData.user.id),
        supabase.from("gameify_rules").select("id,name").eq("user_id", userData.user.id).eq("active", true),
        supabase.from("gameify_events").select("rule_id").eq("user_id", userData.user.id).eq("event_date", today),
      ]);
      if (log) { if (log.mood) setMood(log.mood); setGratitude(log.gratitude || ""); }
      setPoints((txs || []).reduce((sum, row) => sum + row.amount, 0));
      setRules(Object.fromEntries((ruleRows || []).map(r => [r.name.toLowerCase(), r.id])));
      const eventIds = new Set((events || []).map(e => e.rule_id));
      setEarned((ruleRows || []).filter(r => eventIds.has(r.id)).map(r => r.name));
      setLoading(false);
    }
    load();
  }, [router, supabase]);

  async function saveCheckIn() {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return router.replace("/login");
    const { error } = await supabase.from("daily_logs").upsert({ user_id: data.user.id, log_date: new Date().toISOString().slice(0, 10), mood, gratitude }, { onConflict: "user_id,log_date" });
    setMessage(error ? error.message : "Saved.");
  }

  async function award(name: string, value: number) {
    if (earned.includes(name)) return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) return router.replace("/login");
    const ruleId = rules[name.toLowerCase()];
    if (!ruleId) { setMessage("Rule not found. Your account may need to be refreshed."); return; }
    const { data: existing } = await supabase.from("gameify_events").select("id").eq("user_id", data.user.id).eq("rule_id", ruleId).eq("event_date", new Date().toISOString().slice(0, 10)).maybeSingle();
    if (existing) return;
    const { error: eventError } = await supabase.from("gameify_events").insert({ user_id: data.user.id, rule_id: ruleId, points: value });
    if (eventError) { setMessage(eventError.message); return; }
    const { error } = await supabase.from("point_transactions").insert({ user_id: data.user.id, amount: value, reason: name });
    if (error) { setMessage(error.message); return; }
    setPoints(p => p + value); setEarned(e => [...e, name]); setMessage(`+${value} points earned.`);
  }

  async function spend(name: string, value: number) {
    if (points < Math.abs(value)) return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) return router.replace("/login");
    const { error } = await supabase.from("point_transactions").insert({ user_id: data.user.id, amount: value, reason: name });
    if (error) { setMessage(error.message); return; }
    setPoints(p => p + value); setMessage(`${Math.abs(value)} points spent.`);
  }

  async function signOut() { await supabase.auth.signOut(); router.replace("/login"); }

  if (loading) return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>Loading your coach…</main>;

  return <main style={{ maxWidth: 980, margin: "0 auto", padding: "32px 20px 70px" }}>
    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, marginBottom: 28 }}>
      <div><div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", opacity: .55 }}>Personal AI Coach</div><h1 style={{ fontSize: 42, margin: "8px 0 6px" }}>Build a better day.</h1><p style={{ margin: 0, fontSize: 18, opacity: .7 }}>One day at a time. One decision at a time.</p></div>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}><div style={{ background: "#171717", color: "white", borderRadius: 16, padding: "14px 18px", minWidth: 150 }}><div style={{ fontSize: 12, opacity: .65, textTransform: "uppercase", letterSpacing: 1 }}>Momentum</div><div style={{ fontSize: 28, fontWeight: 800 }}>{points} pts</div><div style={{ fontSize: 12, opacity: .7 }}>Level {level}</div></div><button onClick={signOut} style={{ border: "1px solid #ddd", background: "white", borderRadius: 10, padding: "9px 12px" }}>Sign out</button></div>
    </header>

    <section style={{ background: "white", borderRadius: 20, padding: 24, marginBottom: 16, boxShadow: "0 8px 30px rgba(0,0,0,.06)" }}><div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, opacity: .55 }}>Today&apos;s anchor</div><p style={{ fontSize: 22, lineHeight: 1.4, margin: "12px 0 0", fontWeight: 600 }}>{affirmation}</p></section>

    <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16 }}>
      <button onClick={() => setShowReset(true)} style={{ textAlign: "left", border: 0, borderRadius: 20, padding: 24, background: "#1f2937", color: "white", minHeight: 150 }}><div style={{ fontSize: 28 }}>⚡</div><h2 style={{ margin: "8px 0 4px" }}>I&apos;m anxious</h2><div style={{ opacity: .75 }}>Immediate reset — breathe, ground, reframe, choose the next action.</div></button>
      <button onClick={() => setShowGameify(true)} style={{ textAlign: "left", border: "1px solid #e5e5e5", borderRadius: 20, padding: 24, background: "white", minHeight: 150 }}><div style={{ fontSize: 28 }}>🎮</div><h2 style={{ margin: "8px 0 4px" }}>Gameify today</h2><div style={{ opacity: .7 }}>Earn momentum for actions that move your life forward.</div></button>
    </section>

    <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16, marginTop: 16 }}>
      <div style={{ background: "white", borderRadius: 20, padding: 24 }}><div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, opacity: .55 }}>Daily check-in</div><h2 style={{ margin: "8px 0 16px" }}>How are you right now?</h2><input aria-label="Mood" type="range" min="1" max="10" value={mood} onChange={e => setMood(Number(e.target.value))} style={{ width: "100%" }} /><div style={{ marginTop: 8, fontWeight: 700 }}>{mood}/10</div><button onClick={saveCheckIn} style={{ marginTop: 12, border: 0, borderRadius: 10, padding: 10, background: "#171717", color: "white" }}>Save check-in</button></div>
      <div style={{ background: "white", borderRadius: 20, padding: 24 }}><div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, opacity: .55 }}>Gratitude</div><h2 style={{ margin: "8px 0 12px" }}>What are you grateful for?</h2><textarea value={gratitude} onChange={e => setGratitude(e.target.value)} placeholder="One thing is enough." style={{ width: "100%", minHeight: 70, border: "1px solid #ddd", borderRadius: 10, padding: 10, resize: "vertical" }} /><button onClick={saveCheckIn} style={{ marginTop: 10, border: 0, borderRadius: 10, padding: 10, background: "#171717", color: "white" }}>Save gratitude</button></div>
    </section>

    <section style={{ marginTop: 16, background: "white", borderRadius: 20, padding: 24 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 20 }}><div><div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, opacity: .55 }}>Level {level}</div><h2 style={{ margin: "8px 0 4px" }}>Momentum meter</h2></div><b>{points % 25}/25</b></div><div style={{ height: 10, background: "#e9e7e2", borderRadius: 20, marginTop: 16, overflow: "hidden" }}><div style={{ width: `${progress}%`, height: "100%", background: "#171717", transition: "width .25s" }} /></div>{message && <div style={{ marginTop: 12, opacity: .7 }}>{message}</div>}</section>

    <section style={{ marginTop: 16, background: "white", borderRadius: 20, padding: 24 }}><div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, opacity: .55 }}>Today&apos;s focus</div><div style={{ display: "grid", gap: 10, marginTop: 14 }}>{[["Move", "Exercise / build muscle / lose fat"],["Mind", "Meditation, music, learning, and mental reset"],["Family", "Be present with wife and kids"],["Growth", "Work on the system that makes tomorrow better"]].map(([title, text]) => <div key={title} style={{ padding: "12px 14px", border: "1px solid #e5e5e5", borderRadius: 12 }}><b>{title}</b><span style={{ marginLeft: 10, opacity: .7 }}>{text}</span></div>)}</div></section>

    {showGameify && <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "grid", placeItems: "center", padding: 20, zIndex: 10 }}><div style={{ maxWidth: 600, width: "100%", maxHeight: "90vh", overflow: "auto", background: "white", borderRadius: 24, padding: 28 }}><div style={{ display: "flex", justifyContent: "space-between" }}><div><div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", opacity: .55 }}>Gameify</div><h2 style={{ fontSize: 30, margin: "8px 0 6px" }}>Earn points. Spend intentionally.</h2></div><button onClick={() => setShowGameify(false)} style={{ border: 0, background: "transparent", fontSize: 24 }}>×</button></div><p style={{ opacity: .7 }}>Points reinforce behaviors that make your life better. Discretionary choices have an opportunity cost.</p><h3>Earn</h3>{actions.map(a => <button key={a.name} onClick={() => award(a.name, a.points)} disabled={earned.includes(a.name)} style={{ width: "100%", textAlign: "left", border: "1px solid #e5e5e5", background: earned.includes(a.name) ? "#f1f1ef" : "white", borderRadius: 12, padding: 13, marginBottom: 8, opacity: earned.includes(a.name) ? .6 : 1 }}><b>{a.icon} {a.name}</b><span style={{ marginLeft: 10, opacity: .65 }}>{a.detail}</span><strong style={{ float: "right" }}>+{a.points}</strong></button>)}<h3>Spend</h3>{costs.map(c => <button key={c.name} onClick={() => spend(c.name, c.points)} disabled={points < Math.abs(c.points)} style={{ width: "100%", textAlign: "left", border: "1px solid #e5e5e5", background: "white", borderRadius: 12, padding: 13, marginBottom: 8, opacity: points < Math.abs(c.points) ? .45 : 1 }}><b>{c.icon} {c.name}</b><span style={{ marginLeft: 10, opacity: .65 }}>{c.detail}</span><strong style={{ float: "right" }}>{c.points}</strong></button>)}<div style={{ marginTop: 16, padding: 16, background: "#f5f3ef", borderRadius: 12, fontWeight: 700 }}>Balance: {points} points · Level {level}</div></div></div>}

    {showReset && <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "grid", placeItems: "center", padding: 20, zIndex: 20 }}><div style={{ maxWidth: 520, width: "100%", background: "white", borderRadius: 24, padding: 28 }}><div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", opacity: .55 }}>60-second reset</div><h2 style={{ fontSize: 30, margin: "8px 0 14px" }}>Pause. Nothing needs to be solved this minute.</h2><ol style={{ lineHeight: 1.8, paddingLeft: 24 }}><li>Slow your breathing.</li><li>Name what you are feeling without judging it.</li><li>Separate <b>facts</b> from predictions.</li><li>Ask: <b>What can I actually do today?</b></li><li>Choose one small useful action — then return to your life.</li></ol><button onClick={() => setShowReset(false)} style={{ width: "100%", border: 0, borderRadius: 12, padding: 14, background: "#171717", color: "white", fontWeight: 700 }}>I&apos;m ready — back to today</button></div></div>}
  </main>;
}
