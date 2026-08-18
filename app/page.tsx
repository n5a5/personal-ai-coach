"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const principles = [
  { text: "If you are distressed by anything external, the pain is not due to the thing itself, but to your estimate of it; and this you have the power to revoke at any moment.", source: "Stoic principle", practice: "When something bothers you today, separate what happened from the meaning you are adding to it." },
  { text: "You do not control what happens. You control what you do next.", source: "Control what you can control", practice: "When uncertainty appears, name the next useful action you can actually take." },
  { text: "Facts are not predictions.", source: "Mental reset principle", practice: "When your mind jumps ahead, write down what you know versus what you are predicting." },
  { text: "Do not add a second arrow to the first.", source: "Buddhist psychology", practice: "Notice the original difficulty, then stop adding unnecessary fear, judgment, or rumination." },
  { text: "How can I use this?", source: "Reframe principle", practice: "Turn one frustration, obstacle, or disappointment today into information or an opportunity to act." },
  { text: "Complexity is the enemy of execution.", source: "Execution principle", practice: "Make the important action smaller and clearer rather than making the plan bigger." },
  { text: "Love rather than fear.", source: "Relationship principle", practice: "In one important interaction today, choose the response that comes from connection rather than protection." },
];

const actions = [
  { name: "Workout — 5 min", detail: "Complete at least a 5-minute workout or deliberate movement session.", points: 1, icon: "💪", key: "Workout" },
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

const APP_TIME_ZONE = "America/New_York";
function localDate() {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: APP_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
function transactionDate(createdAt: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: APP_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(createdAt));
  const values = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

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
  const [pendingAward, setPendingAward] = useState<string | null>(null);
  const [checkInSaved, setCheckInSaved] = useState(false);
  const [gratitudeSaved, setGratitudeSaved] = useState(false);
  const [savingCheckIn, setSavingCheckIn] = useState(false);
  const [savingGratitude, setSavingGratitude] = useState(false);
  const [alcoholToday, setAlcoholToday] = useState(0);
  const [oneThing, setOneThing] = useState("");

  const todayPrinciple = useMemo(() => {
    const date = localDate();
    const dayNumber = Math.floor(new Date(`${date}T12:00:00`).getTime() / 86400000);
    return principles[((dayNumber % principles.length) + principles.length) % principles.length];
  }, []);
  const level = useMemo(() => Math.floor(points / 25) + 1, [points]);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { router.replace("/login"); return; }
      const today = localDate();
      const [{ data: log }, { data: txs }, { data: ruleRows }, { data: events }, planResponse] = await Promise.all([
        supabase.from("daily_logs").select("mood, gratitude").eq("user_id", userData.user.id).eq("log_date", today).maybeSingle(),
        supabase.from("point_transactions").select("amount, reason, created_at, event_date").eq("user_id", userData.user.id),
        supabase.from("gameify_rules").select("id,name").eq("user_id", userData.user.id).eq("active", true),
        supabase.from("gameify_events").select("rule_id").eq("user_id", userData.user.id).eq("event_date", today),
        fetch(`/api/daily-plan?date=${today}`, { cache: "no-store" }).catch(() => null),
      ]);
      if (log) { if (log.mood) setMood(log.mood); setGratitude(log.gratitude || ""); }
      setPoints((txs || []).reduce((sum, row) => sum + row.amount, 0));
      setRules(Object.fromEntries((ruleRows || []).map(r => [r.name.toLowerCase(), r.id])));
      const eventIds = new Set((events || []).map(e => e.rule_id));
      const todayReasons = new Set((txs || []).filter(row => {
        const rowDate = row.event_date || transactionDate(row.created_at);
        return rowDate === today && (row.reason === "Daily check-in" || row.reason === "Gratitude");
      }).map(row => row.reason));
      setEarned((ruleRows || []).filter(r => eventIds.has(r.id)).map(r => r.name));
      if (todayReasons.has("Daily check-in")) setCheckInSaved(true);
      if (todayReasons.has("Gratitude")) setGratitudeSaved(true);
      setAlcoholToday((txs || []).filter(row => row.reason === "Alcohol" && (row.event_date || transactionDate(row.created_at)) === today).length);
      if (planResponse?.ok) {
        const planData = await planResponse.json().catch(() => null);
        const important = planData?.plan?.items?.find((item: any) => item?.id === "important");
        if (important?.detail || important?.text || important?.title) setOneThing(important.detail || important.text || important.title);
      }
      setLoading(false);
    }
    load();
  }, [router, supabase]);

  async function saveCheckIn() {
    if (savingCheckIn || checkInSaved) return;
    setSavingCheckIn(true); setMessage("");
    const { data } = await supabase.auth.getUser();
    if (!data.user) { setSavingCheckIn(false); return router.replace("/login"); }
    const today = localDate();
    const { error } = await supabase.from("daily_logs").upsert({ user_id: data.user.id, log_date: today, mood, gratitude }, { onConflict: "user_id,log_date" });
    if (error) { setMessage(error.message); setSavingCheckIn(false); return; }
    const { data: existing } = await supabase.from("point_transactions").select("id").eq("user_id", data.user.id).eq("reason", "Daily check-in").eq("event_date", today).maybeSingle();
    if (!existing) {
      const { error: pointError } = await supabase.from("point_transactions").insert({ user_id: data.user.id, amount: 1, reason: "Daily check-in", event_date: today });
      if (pointError) { setMessage(pointError.message); setSavingCheckIn(false); return; }
      setPoints(p => p + 1);
    }
    setCheckInSaved(true); setMessage("+1 momentum · Daily check-in saved."); setSavingCheckIn(false);
  }

  async function saveGratitude() {
    if (savingGratitude || gratitudeSaved || !gratitude.trim()) return;
    setSavingGratitude(true); setMessage("");
    const { data } = await supabase.auth.getUser();
    if (!data.user) { setSavingGratitude(false); return router.replace("/login"); }
    const today = localDate();
    const { error } = await supabase.from("daily_logs").upsert({ user_id: data.user.id, log_date: today, mood, gratitude }, { onConflict: "user_id,log_date" });
    if (error) { setMessage(error.message); setSavingGratitude(false); return; }
    const { data: existing } = await supabase.from("point_transactions").select("id").eq("user_id", data.user.id).eq("reason", "Gratitude").eq("event_date", today).maybeSingle();
    if (!existing) {
      const { error: pointError } = await supabase.from("point_transactions").insert({ user_id: data.user.id, amount: 1, reason: "Gratitude", event_date: today });
      if (pointError) { setMessage(pointError.message); setSavingGratitude(false); return; }
      setPoints(p => p + 1);
    }
    setGratitudeSaved(true); setMessage("+1 momentum · Gratitude saved."); setSavingGratitude(false);
  }

  async function award(name: string, value: number, ruleKey?: string) {
    const earnedKey = ruleKey || name;
    if (earned.includes(earnedKey) || pendingAward === earnedKey) return;
    setPendingAward(earnedKey);
    setMessage(`Adding +${value}…`);

    const { data } = await supabase.auth.getUser();
    if (!data.user) { setPendingAward(null); return router.replace("/login"); }
    const ruleId = rules[earnedKey.toLowerCase()] || rules[name.toLowerCase()];
    if (!ruleId) { setPendingAward(null); setMessage("Rule not found. Refresh and try again."); return; }
    const today = localDate();
    const { data: existing } = await supabase.from("gameify_events").select("id").eq("user_id", data.user.id).eq("rule_id", ruleId).eq("event_date", today).maybeSingle();
    if (existing) {
      setEarned(e => e.includes(earnedKey) ? e : [...e, earnedKey]);
      setPendingAward(null);
      setMessage("Already counted today.");
      return;
    }
    const { error: eventError } = await supabase.from("gameify_events").insert({ user_id: data.user.id, rule_id: ruleId, points: value });
    if (eventError) { setPendingAward(null); setMessage(eventError.message); return; }
    setPoints(p => p + value);
    setEarned(e => [...e, earnedKey]);
    setPendingAward(null);
    setMessage(`✓ +${value} added · ${name}`);
    const { error } = await supabase.from("point_transactions").insert({ user_id: data.user.id, amount: value, reason: earnedKey, event_date: today });
    if (error) setMessage(`Saved the behavior, but points sync failed: ${error.message}`);
  }

  async function spend(name: string, value: number) {
    if (points < Math.abs(value)) { setMessage(`You need ${Math.abs(value) - points} more points.`); return; }
    const { data } = await supabase.auth.getUser();
    if (!data.user) return router.replace("/login");
    const today = localDate();
    const { error } = await supabase.from("point_transactions").insert({ user_id: data.user.id, amount: value, reason: name, event_date: today });
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
      <div className="today-actions"><button className="momentum-tile" onClick={() => setShowGameify(true)} aria-label="Open Momentum"><div className="momentum-label">MOMENTUM</div><div className="momentum-points">{points} pts</div><div className="momentum-sub">Level {level} · {points % 25}/25 to next level</div></button></div>
    </header>

    <section className="today-anchor"><div className="today-anchor-eyebrow">TODAY&apos;S PRINCIPLE</div><p>{todayPrinciple.text}</p><div className="today-principle-source">{todayPrinciple.source}</div><div className="today-principle-practice"><strong>Practice:</strong> {todayPrinciple.practice}</div></section>
    <section className="today-one-thing" aria-label="Today's one thing"><div className="today-anchor-eyebrow">ONE THING THAT MATTERS</div><h2>{oneThing || "Choose the single action that would make today meaningfully better."}</h2><p>Don't solve everything. Move the most important thing forward.</p></section>

    <section className="today-journal-grid">
      <div className="today-card"><div className="today-card-eyebrow">DAILY CHECK-IN</div><h2>How are you right now?</h2><input aria-label="Mood" type="range" min="1" max="10" value={mood} onChange={e => { setMood(Number(e.target.value)); setCheckInSaved(false); }} /><div className="mood-value">{mood}/10</div><button className={`save-button ${checkInSaved ? "saved" : ""}`} onClick={saveCheckIn} disabled={savingCheckIn || checkInSaved}>{savingCheckIn ? "Saving…" : checkInSaved ? "✓ Saved +1" : "Save check-in +1"}</button></div>
      <div className="today-card"><div className="today-card-eyebrow">GRATITUDE</div><h2>What are you grateful for?</h2><textarea value={gratitude} onChange={e => { setGratitude(e.target.value); setGratitudeSaved(false); }} placeholder="One thing is enough." /><button className={`save-button ${gratitudeSaved ? "saved" : ""}`} onClick={saveGratitude} disabled={savingGratitude || gratitudeSaved || !gratitude.trim()}>{savingGratitude ? "Saving…" : gratitudeSaved ? "✓ Saved +1" : "Save gratitude +1"}</button></div>
    </section>

    {showGameify && <div role="dialog" aria-modal="true" className="gameify-modal"><div className="gameify-panel">
      <div className="gameify-head"><div><div className="today-card-eyebrow">MOMENTUM</div><h2>Build momentum. Spend intentionally.</h2></div><button className="modal-close" onClick={() => setShowGameify(false)} aria-label="Close">×</button></div>
      <p>Points reinforce behaviors that make your life better. Discretionary choices have an opportunity cost.</p>
      <h3>Earn</h3>
      <div className="gameify-actions" aria-live="polite">{actions.map(a => { const done = earned.includes(a.key); const pending = pendingAward === a.key; return <button key={a.name} onClick={() => award(a.name, a.points, a.key)} disabled={done || pending} className={`gameify-row ${done ? "earned" : ""} ${pending ? "pending" : ""}`} aria-label={done ? `${a.name}, added today` : pending ? `Adding ${a.name}` : `Add ${a.name}, ${a.points} points`}><span className="gameify-main"><b>{a.icon} {a.name}</b><small>{a.detail}</small></span><span className="gameify-action-label">{done ? `✓ Added +${a.points}` : pending ? "Adding…" : "Tap to add"}</span></button>; })}</div>
      <h3>Spend</h3>
      <div className="gameify-actions">{costs.map(c => <button key={c.name} onClick={() => spend(c.name, c.points)} disabled={points < Math.abs(c.points)} className="gameify-row"><span className="gameify-main"><b>{c.icon} {c.name}</b><small>{c.detail}</small></span><span className="gameify-action-label">−{Math.abs(c.points)}</span>{c.name === "Alcohol" && <small className="gameify-meta">Today: {alcoholToday} drink{alcoholToday === 1 ? "" : "s"} · {alcoholToday * 4} points spent</small>}</button>)}</div>
      <div className="gameify-balance">Balance: {points} points · Level {level}</div>
      {message && <div className={`gameify-feedback ${message.startsWith("✓") ? "success" : ""}`} role="status">{message}</div>}
    </div></div>}

    <style jsx>{`
      .today-principle-source { margin-top: 10px; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; opacity: .7; }
      .today-principle-practice { margin-top: 12px; font-size: 14px; line-height: 1.55; }
      .today-one-thing { margin: 0 0 24px; padding: 22px 24px; border: 1px solid #e7e5e0; border-radius: 16px; background: #fff; }
      .today-one-thing h2 { margin: 8px 0 6px; font-size: 24px; line-height: 1.2; }
      .today-one-thing p { margin: 0; font-size: 14px; line-height: 1.55; opacity: .72; }
      .gameify-actions { display: grid; gap: 8px; }
      .gameify-row { width: 100%; display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 14px; align-items: center; text-align: left; color: #171717; border: 1px solid #e2dfd8; background: white; border-radius: 14px; padding: 14px; margin-bottom: 0; cursor: pointer; transition: transform .12s ease, border-color .12s ease, background .12s ease, box-shadow .12s ease; touch-action: manipulation; }
      .gameify-row:hover:not(:disabled) { border-color: #bdb8ae; box-shadow: 0 2px 8px rgba(23,23,23,.06); }
      .gameify-row:active:not(:disabled) { transform: scale(.985); background: #f7f5f1; }
      .gameify-row:focus-visible { outline: 3px solid rgba(166,107,31,.22); outline-offset: 2px; border-color: #a66b1f; }
      .gameify-row.pending { background: #f5f3ef; border-color: #cfc9bf; }
      .gameify-row.earned { background: #f0eee9; border-color: #d8d4cc; cursor: default; }
      .gameify-main { min-width: 0; display: grid; gap: 4px; }
      .gameify-main b { font-size: 16px; line-height: 1.25; }
      .gameify-main small { color: #6b6b6b; line-height: 1.45; font-size: 13px; }
      .gameify-action-label { flex: 0 0 auto; color: #6b6b6b; font-size: 12px; font-weight: 800; white-space: nowrap; }
      .gameify-row.earned .gameify-action-label { color: #7b4d11; }
      .gameify-row.pending .gameify-action-label { color: #171717; }
      .gameify-meta { grid-column: 1 / -1; color: #6b6b6b; font-size: 12px; }
      .gameify-feedback { position: sticky; bottom: 0; margin-top: 12px; padding: 11px 13px; border-radius: 10px; background: #171717; color: white; text-align: center; font-size: 13px; font-weight: 700; box-shadow: 0 4px 18px rgba(0,0,0,.14); }
      .gameify-feedback.success { background: #f0dfbf; color: #7b4d11; }
      @media (max-width: 640px) {
        .today-header { align-items: flex-start; gap: 10px; }
        .today-title-group { min-width: 0; flex: 1 1 auto; }
        .today-actions { flex: 0 0 150px; min-width: 0; }
        .momentum-tile { width: 150px; min-width: 0; max-width: 100%; padding: 12px 14px; overflow: hidden; }
        .momentum-points { font-size: 24px; white-space: nowrap; }
        .momentum-sub { white-space: normal; overflow-wrap: anywhere; line-height: 1.3; }
        .today-one-thing { padding: 18px; }
        .today-one-thing h2 { font-size: 20px; }
        .gameify-modal { padding: 12px; align-items: end; }
        .gameify-panel { max-height: 92vh; border-radius: 20px 20px 14px 14px; padding: 20px 16px calc(20px + env(safe-area-inset-bottom)); }
        .gameify-head h2 { font-size: 26px; }
        .gameify-row { grid-template-columns: minmax(0,1fr) auto; padding: 14px 12px; min-height: 76px; }
        .gameify-main b { font-size: 15px; }
        .gameify-main small { font-size: 12px; }
        .gameify-action-label { font-size: 11px; }
      }
    `}</style>
  </main>;
}
