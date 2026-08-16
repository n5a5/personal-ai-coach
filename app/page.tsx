"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const affirmation = "If you are distressed by anything external, the pain is not due to the thing itself, but to your estimate of it; and this you have the power to revoke at any moment.";
const actions = [
  { name: "Workout — 20–30 min", detail: "Complete a 20–30 minute workout.", points: 4, icon: "💪", key: "Workout" },
  { name: "Workout — 45–60 min", detail: "Complete a 45–60 minute workout.", points: 8, icon: "💪", key: "Workout" },
  { name: "Family Connection", detail: "Intentional time with wife or kids.", points: 3, icon: "❤️", key: "Family Connection" },
  { name: "Meditation", detail: "Meditate or deliberately quiet your mind.", points: 2, icon: "🧘", key: "Meditation" },
  { name: "Journaling", detail: "Meaningful reflection or daily check-in.", points: 2, icon: "✍️", key: "Journaling" },
  { name: "Reading / Learning", detail: "Focused reading, audiobook, or self-improvement.", points: 2, icon: "📚", key: "Reading / Learning" },
];
const costs = [
  { name: "Alcohol", detail: "Spend 4 points per drink. Can be selected more than once per day.", points: -4, icon: "🍸" },
  { name: "Planned Indulgence", detail: "Spend points on a deliberate indulgence.", points: -2, icon: "🍔" },
];

export default function Home() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [showGameify, setShowGameify] = useState(false);
  const [mood, setMood] = useState(7);
  const [gratitude, setGratitude] = useState("");
  const [points, setPoints] = useState(0);
  const [earned, setEarned] = useState<string[]>([]);
  const [rules, setRules] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [checkInSaved, setCheckInSaved] = useState(false);
  const [gratitudeSaved, setGratitudeSaved] = useState(false);
  const [savingCheckIn, setSavingCheckIn] = useState(false);
  const [savingGratitude, setSavingGratitude] = useState(false);
  const [alcoholToday, setAlcoholToday] = useState(0);

  const level = useMemo(() => Math.floor(points / 25) + 1, [points]);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { router.replace("/login"); return; }
      const today = new Date().toISOString().slice(0, 10);
      const [{ data: log }, { data: txs }, { data: ruleRows }, { data: events }] = await Promise.all([
        supabase.from("daily_logs").select("mood, gratitude").eq("user_id", userData.user.id).eq("log_date", today).maybeSingle(),
        supabase.from("point_transactions").select("amount, reason, created_at").eq("user_id", userData.user.id),
        supabase.from("gameify_rules").select("id,name").eq("user_id", userData.user.id).eq("active", true),
        supabase.from("gameify_events").select("rule_id").eq("user_id", userData.user.id).eq("event_date", today),
      ]);
      if (log) { if (log.mood) setMood(log.mood); setGratitude(log.gratitude || ""); }
      setPoints((txs || []).reduce((sum, row) => sum + row.amount, 0));
      setRules(Object.fromEntries((ruleRows || []).map(r => [r.name.toLowerCase(), r.id])));
      const eventIds = new Set((events || []).map(e => e.rule_id));
      const todayReasons = new Set((txs || []).filter(row => row.reason === "Daily check-in" || row.reason === "Gratitude").map(row => row.reason));
      setEarned((ruleRows || []).filter(r => eventIds.has(r.id)).map(r => r.name));
      if (todayReasons.has("Daily check-in")) setCheckInSaved(true);
      if (todayReasons.has("Gratitude")) setGratitudeSaved(true);
      setAlcoholToday((txs || []).filter(row => row.reason === "Alcohol" && row.created_at >= `${today}T00:00:00.000Z`).length);
      setLoading(false);
    }
    load();
  }, [router, supabase]);

  async function saveCheckIn() {
    if (savingCheckIn || checkInSaved) return;
    setSavingCheckIn(true);
    setMessage("");
    const { data } = await supabase.auth.getUser();
    if (!data.user) { setSavingCheckIn(false); return router.replace("/login"); }
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("daily_logs").upsert({ user_id: data.user.id, log_date: today, mood, gratitude }, { onConflict: "user_id,log_date" });
    if (error) { setMessage(error.message); setSavingCheckIn(false); return; }
    const { data: existing } = await supabase.from("point_transactions").select("id").eq("user_id", data.user.id).eq("reason", "Daily check-in").gte("created_at", `${today}T00:00:00.000Z`).maybeSingle();
    if (!existing) {
      const { error: pointError } = await supabase.from("point_transactions").insert({ user_id: data.user.id, amount: 1, reason: "Daily check-in" });
      if (pointError) { setMessage(pointError.message); setSavingCheckIn(false); return; }
      setPoints(p => p + 1);
    }
    setCheckInSaved(true);
    setMessage("+1 momentum · Daily check-in saved.");
    setSavingCheckIn(false);
  }

  async function saveGratitude() {
    if (savingGratitude || gratitudeSaved || !gratitude.trim()) return;
    setSavingGratitude(true);
    setMessage("");
    const { data } = await supabase.auth.getUser();
    if (!data.user) { setSavingGratitude(false); return router.replace("/login"); }
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("daily_logs").upsert({ user_id: data.user.id, log_date: today, mood, gratitude }, { onConflict: "user_id,log_date" });
    if (error) { setMessage(error.message); setSavingGratitude(false); return; }
    const { data: existing } = await supabase.from("point_transactions").select("id").eq("user_id", data.user.id).eq("reason", "Gratitude").gte("created_at", `${today}T00:00:00.000Z`).maybeSingle();
    if (!existing) {
      const { error: pointError } = await supabase.from("point_transactions").insert({ user_id: data.user.id, amount: 1, reason: "Gratitude" });
      if (pointError) { setMessage(pointError.message); setSavingGratitude(false); return; }
      setPoints(p => p + 1);
    }
    setGratitudeSaved(true);
    setMessage("+1 momentum · Gratitude saved.");
    setSavingGratitude(false);
  }

  async function award(name: string, value: number, ruleKey?: string) {
    const earnedKey = ruleKey || name;
    if (earned.includes(earnedKey)) return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) return router.replace("/login");
    const ruleId = rules[earnedKey.toLowerCase()] || rules[name.toLowerCase()];
    if (!ruleId) { setMessage("Rule not found. Your account may need to be refreshed."); return; }
    const today = new Date().toISOString().slice(0, 10);
    const { data: existing } = await supabase.from("gameify_events").select("id").eq("user_id", data.user.id).eq("rule_id", ruleId).eq("event_date", today).maybeSingle();
    if (existing) return;
    const { error: eventError } = await supabase.from("gameify_events").insert({ user_id: data.user.id, rule_id: ruleId, points: value });
    if (eventError) { setMessage(eventError.message); return; }
    const { error } = await supabase.from("point_transactions").insert({ user_id: data.user.id, amount: value, reason: earnedKey });
    if (error) { setMessage(error.message); return; }
    setPoints(p => p + value); setEarned(e => [...e, earnedKey]); setMessage(`+${value} points earned.`);
  }

  async function spend(name: string, value: number) {
    if (points < Math.abs(value)) return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) return router.replace("/login");
    const { error } = await supabase.from("point_transactions").insert({ user_id: data.user.id, amount: value, reason: name });
    if (error) { setMessage(error.message); return; }
    setPoints(p => p + value);
    if (name === "Alcohol") setAlcoholToday(c => c + 1);
    setMessage(name === "Alcohol" ? `−4 points · Drink ${alcoholToday + 1} today.` : `${Math.abs(value)} points spent.`);
  }

  if (loading) return <main className="today-page-loading">Loading your coach…</main>;

  return <main className="today-page">
    <header className="today-header">
      <div className="today-title-group">
        <div className="today-eyebrow">PERSONAL AI COACH</div>
        <h1>Build a better day.</h1>
        <p>One day at a time. One decision at a time.</p>
      </div>
      <div className="today-actions">
        <button className="momentum-tile" onClick={() => setShowGameify(true)} aria-label="Open Momentum">
          <div className="momentum-label">MOMENTUM</div>
          <div className="momentum-points">{points} pts</div>
          <div className="momentum-sub">Level {level} · {points % 25}/25 to next level</div>
        </button>
      </div>
    </header>

    <section className="today-anchor">
      <div className="today-anchor-eyebrow">TODAY&apos;S PRINCIPLE</div>
      <p>{affirmation}</p>
    </section>

    <section className="today-entry-row">
      <a className="reset-entry" href="/reset">
        <div className="reset-entry-icon">↻</div>
        <div>
          <div className="reset-entry-title">Reset</div>
          <div className="reset-entry-copy">Feeling anxious, overloaded, angry, stuck, or off? Reset and return to your life.</div>
        </div>
      </a>
    </section>

    <section className="today-journal-grid">
      <div className="today-card">
        <div className="today-card-eyebrow">DAILY CHECK-IN</div>
        <h2>How are you right now?</h2>
        <input aria-label="Mood" type="range" min="1" max="10" value={mood} onChange={e => { setMood(Number(e.target.value)); setCheckInSaved(false); }} />
        <div className="mood-value">{mood}/10</div>
        <button className={`save-button ${checkInSaved ? "saved" : ""}`} onClick={saveCheckIn} disabled={savingCheckIn || checkInSaved}>{savingCheckIn ? "Saving…" : checkInSaved ? "✓ Saved +1" : "Save check-in +1"}</button>
      </div>
      <div className="today-card">
        <div className="today-card-eyebrow">GRATITUDE</div>
        <h2>What are you grateful for?</h2>
        <textarea value={gratitude} onChange={e => { setGratitude(e.target.value); setGratitudeSaved(false); }} placeholder="One thing is enough." />
        <button className={`save-button ${gratitudeSaved ? "saved" : ""}`} onClick={saveGratitude} disabled={savingGratitude || gratitudeSaved || !gratitude.trim()}>{savingGratitude ? "Saving…" : gratitudeSaved ? "✓ Saved +1" : "Save gratitude +1"}</button>
      </div>
    </section>

    {showGameify && <div role="dialog" aria-modal="true" className="gameify-modal"><div className="gameify-panel"><div className="gameify-head"><div><div className="today-card-eyebrow">MOMENTUM</div><h2>Build momentum. Spend intentionally.</h2></div><button className="modal-close" onClick={() => setShowGameify(false)} aria-label="Close">×</button></div><p>Points reinforce behaviors that make your life better. Discretionary choices have an opportunity cost.</p><h3>Earn</h3>{actions.map(a => <button key={a.name} onClick={() => award(a.name, a.points, a.key)} disabled={earned.includes(a.key)} className={`gameify-row ${earned.includes(a.key) ? "earned" : ""}`}><b>{a.icon} {a.name}</b><span>{a.detail}</span><strong>+{a.points}</strong></button>)}<h3>Spend</h3>{costs.map(c => <button key={c.name} onClick={() => spend(c.name, c.points)} disabled={points < Math.abs(c.points)} className="gameify-row"><b>{c.icon} {c.name}</b><span>{c.detail}</span><strong>{c.points}</strong>{c.name === "Alcohol" && <small>Today: {alcoholToday} drink{alcoholToday === 1 ? "" : "s"} · {alcoholToday * 4} points spent</small>}</button>)}<div className="gameify-balance">Balance: {points} points · Level {level}</div></div></div>}

    <style jsx>{`
      @media (max-width: 640px) {
        .today-header { align-items: flex-start; gap: 10px; }
        .today-title-group { min-width: 0; flex: 1 1 auto; }
        .today-actions { flex: 0 0 150px; min-width: 0; }
        .momentum-tile { width: 150px; min-width: 0; max-width: 100%; padding: 12px 14px; overflow: hidden; }
        .momentum-points { font-size: 24px; white-space: nowrap; }
        .momentum-sub { white-space: normal; overflow-wrap: anywhere; line-height: 1.3; }
      }
    `}</style>
  </main>;
}
