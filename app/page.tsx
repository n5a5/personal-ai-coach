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
  { name: "Workout — 5 min", detail: "5 minutes of deliberate movement.", points: 1, icon: "💪", key: "Workout — 5 min" },
  { name: "Workout — 20–30 min", detail: "A focused 20–30 minute workout.", points: 4, icon: "💪", key: "Workout — 20–30 min" },
  { name: "Workout — 45–60 min", detail: "A full 45–60 minute workout.", points: 8, icon: "💪", key: "Workout — 45–60 min" },
  { name: "Family Connection", detail: "Intentional time with wife or kids.", points: 3, icon: "❤️", key: "Family Connection" },
  { name: "Meditation", detail: "Meditate or deliberately quiet your mind.", points: 2, icon: "🧘", key: "Meditation" },
  { name: "Reading / Learning", detail: "Focused reading, audiobook, or self-improvement.", points: 2, icon: "📚", key: "Reading / Learning" },
];

const costs = [
  { name: "Alcohol", detail: "4 points per drink · repeatable", points: -4, icon: "🍸" },
  { name: "Planned Indulgence", detail: "A deliberate discretionary choice.", points: -2, icon: "🍔" },
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

function friendlyError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  if (/duplicate key|unique constraint|already exists/i.test(message)) return "Already recorded today.";
  if (/not authenticated|jwt|auth/i.test(message)) return "Your session expired. Please sign in again.";
  if (/network|fetch|failed to fetch/i.test(message)) return "Couldn't save that. Check your connection and try again.";
  return "Couldn't save that. Please try again.";
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
  const [legacyWorkoutToday, setLegacyWorkoutToday] = useState(false);

  const todayPrinciple = useMemo(() => {
    const date = localDate();
    const dayNumber = Math.floor(new Date(`${date}T12:00:00`).getTime() / 86400000);
    return principles[((dayNumber % principles.length) + principles.length) % principles.length];
  }, []);

  const level = useMemo(() => Math.floor(points / 25) + 1, [points]);
  const workoutEarned = legacyWorkoutToday || earned.some(name => name.startsWith("Workout — "));

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

      if (log) {
        if (log.mood) setMood(log.mood);
        setGratitude(log.gratitude || "");
      }

      const allTxs = txs || [];
      setPoints(allTxs.reduce((sum, row) => sum + Number(row.amount || 0), 0));
      setRules(Object.fromEntries((ruleRows || []).map(r => [r.name.toLowerCase(), r.id])));

      const eventIds = new Set((events || []).map(e => e.rule_id));
      setEarned((ruleRows || []).filter(r => eventIds.has(r.id)).map(r => r.name));

      const todayTxs = allTxs.filter(row => (row.event_date || transactionDate(row.created_at)) === today);
      const todayReasons = new Set(todayTxs.map(row => row.reason));
      if (todayReasons.has("Daily check-in")) setCheckInSaved(true);
      if (todayReasons.has("Gratitude")) setGratitudeSaved(true);
      setAlcoholToday(todayTxs.filter(row => row.reason === "Alcohol").length);
      setLegacyWorkoutToday(todayReasons.has("Workout"));

      if (planResponse?.ok) {
        const planData = await planResponse.json().catch(() => null);
        const important = planData?.plan?.items?.find((item: any) => item?.id === "important");
        if (important?.detail || important?.text || important?.title) setOneThing(important.detail || important.text || important.title);
      }

      setLoading(false);
    }
    load();
  }, [router, supabase]);

  useEffect(() => {
    if (!showGameify) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setShowGameify(false); };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKeyDown); };
  }, [showGameify]);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 2600);
    return () => window.clearTimeout(timer);
  }, [message]);

  async function saveCheckIn() {
    if (savingCheckIn || checkInSaved) return;
    setSavingCheckIn(true); setMessage("");
    const { data } = await supabase.auth.getUser();
    if (!data.user) { setSavingCheckIn(false); return router.replace("/login"); }
    const today = localDate();
    const { error } = await supabase.from("daily_logs").upsert({ user_id: data.user.id, log_date: today, mood, gratitude }, { onConflict: "user_id,log_date" });
    if (error) { setMessage(friendlyError(error)); setSavingCheckIn(false); return; }
    const { data: existing } = await supabase.from("point_transactions").select("id").eq("user_id", data.user.id).eq("reason", "Daily check-in").eq("event_date", today).maybeSingle();
    if (!existing) {
      const { error: pointError } = await supabase.from("point_transactions").insert({ user_id: data.user.id, amount: 1, reason: "Daily check-in", event_date: today });
      if (pointError && !/duplicate key|unique constraint/i.test(pointError.message)) { setMessage(friendlyError(pointError)); setSavingCheckIn(false); return; }
      if (!pointError) setPoints(p => p + 1);
    }
    setCheckInSaved(true); setMessage("✓ +1 · Daily check-in saved."); setSavingCheckIn(false);
  }

  async function saveGratitude() {
    if (savingGratitude || gratitudeSaved || !gratitude.trim()) return;
    setSavingGratitude(true); setMessage("");
    const { data } = await supabase.auth.getUser();
    if (!data.user) { setSavingGratitude(false); return router.replace("/login"); }
    const today = localDate();
    const { error } = await supabase.from("daily_logs").upsert({ user_id: data.user.id, log_date: today, mood, gratitude }, { onConflict: "user_id,log_date" });
    if (error) { setMessage(friendlyError(error)); setSavingGratitude(false); return; }
    const { data: existing } = await supabase.from("point_transactions").select("id").eq("user_id", data.user.id).eq("reason", "Gratitude").eq("event_date", today).maybeSingle();
    if (!existing) {
      const { error: pointError } = await supabase.from("point_transactions").insert({ user_id: data.user.id, amount: 1, reason: "Gratitude", event_date: today });
      if (pointError && !/duplicate key|unique constraint/i.test(pointError.message)) { setMessage(friendlyError(pointError)); setSavingGratitude(false); return; }
      if (!pointError) setPoints(p => p + 1);
    }
    setGratitudeSaved(true); setMessage("✓ +1 · Gratitude saved."); setSavingGratitude(false);
  }

  async function award(name: string, _value: number, ruleKey: string) {
    if (earned.includes(ruleKey) || pendingAward === ruleKey) return;
    if (ruleKey.startsWith("Workout — ") && workoutEarned) {
      setMessage("Workout already counted today. Choose one workout level per day.");
      return;
    }

    const ruleId = rules[ruleKey.toLowerCase()];
    if (!ruleId) { setMessage("That action is unavailable right now. Refresh and try again."); return; }

    setPendingAward(ruleKey);
    setMessage("");
    const today = localDate();
    const { data, error } = await supabase.rpc("record_gameify_event", { p_rule_id: ruleId, p_event_date: today });
    if (error) {
      setPendingAward(null);
      setMessage(friendlyError(error));
      return;
    }

    const result = data as { status?: string; points?: number; name?: string } | null;
    const awardedPoints = Number(result?.points ?? 0);
    setPendingAward(null);
    setEarned(current => current.includes(ruleKey) ? current : [...current, ruleKey]);
    if (awardedPoints > 0 && result?.status !== "already_recorded") setPoints(p => p + awardedPoints);
    setMessage(result?.status === "already_recorded" ? "Already counted today." : `✓ +${awardedPoints} · ${name}`);
  }

  async function spend(name: string, value: number) {
    if (value >= 0) return;
    setMessage("");
    const { data } = await supabase.auth.getUser();
    if (!data.user) return router.replace("/login");
    const today = localDate();
    const { data: result, error } = await supabase.rpc("record_gameify_spend", { p_reason: name, p_amount: value, p_event_date: today });
    if (error) { setMessage(friendlyError(error)); return; }
    const response = result as { status?: string; balance?: number; required?: number } | null;
    if (response?.status === "insufficient_points") {
      setMessage(`You need ${Number(response.required || Math.abs(value)) - Number(response.balance || 0)} more points.`);
      return;
    }
    setPoints(Number(response?.balance ?? points + value));
    if (name === "Alcohol") setAlcoholToday(c => c + 1);
    setMessage(name === "Alcohol" ? `✓ −4 · Drink ${alcoholToday + 1} today` : `✓ ${Math.abs(value)} points spent.`);
  }

  if (loading) return <main className="today-page-loading">Loading your coach…</main>;

  return (
    <main className="today-page">
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
        <p>{todayPrinciple.text}</p>
        <div className="today-principle-source">{todayPrinciple.source}</div>
        <div className="today-principle-practice"><strong>Practice:</strong> {todayPrinciple.practice}</div>
      </section>

      <section className="today-one-thing" aria-label="Today's one thing">
        <div className="today-anchor-eyebrow">ONE THING THAT MATTERS</div>
        <h2>{oneThing || "Choose the single action that would make today meaningfully better."}</h2>
        <p>Don&apos;t solve everything. Move the most important thing forward.</p>
      </section>

      <section className="today-journal-grid">
        <div className="today-card">
          <div className="today-card-eyebrow">DAILY CHECK-IN</div>
          <h2>How are you right now?</h2>
          <input aria-label="Mood" type="range" min="1" max="10" value={mood} onChange={e => { setMood(Number(e.target.value)); setCheckInSaved(false); }} />
          <div className="mood-value">{mood}/10</div>
          <button className={`save-button ${checkInSaved ? "saved" : ""}`} onClick={saveCheckIn} disabled={savingCheckIn || checkInSaved}>
            {savingCheckIn ? "Saving…" : checkInSaved ? "✓ Saved +1" : "Save check-in +1"}
          </button>
        </div>
        <div className="today-card">
          <div className="today-card-eyebrow">GRATITUDE</div>
          <h2>What are you grateful for?</h2>
          <textarea value={gratitude} onChange={e => { setGratitude(e.target.value); setGratitudeSaved(false); }} placeholder="One thing is enough." />
          <button className={`save-button ${gratitudeSaved ? "saved" : ""}`} onClick={saveGratitude} disabled={savingGratitude || gratitudeSaved || !gratitude.trim()}>
            {savingGratitude ? "Saving…" : gratitudeSaved ? "✓ Saved +1" : "Save gratitude +1"}
          </button>
        </div>
      </section>

      {showGameify && (
        <div role="dialog" aria-modal="true" className="gameify-modal" onMouseDown={event => { if (event.target === event.currentTarget) setShowGameify(false); }}>
          <div className="gameify-panel">
            <div className="gameify-head">
              <div>
                <div className="today-card-eyebrow">MOMENTUM</div>
                <h2>Build momentum.</h2>
              </div>
              <button className="modal-close" onClick={() => setShowGameify(false)} aria-label="Close Momentum">×</button>
            </div>
            <p className="gameify-intro">Log the behaviors you completed. The points are the reinforcement—not the goal.</p>

            <h3>Earn</h3>
            <div className="gameify-actions" aria-live="polite">
              {actions.map(a => {
                const done = earned.includes(a.key);
                const pending = pendingAward === a.key;
                const isWorkout = a.key.startsWith("Workout — ");
                const blocked = isWorkout && workoutEarned && !done;
                return (
                  <button
                    key={a.key}
                    onClick={() => award(a.name, a.points, a.key)}
                    disabled={done || pending || blocked}
                    className={`gameify-row ${done ? "earned" : ""} ${pending ? "pending" : ""} ${blocked ? "blocked" : ""}`}
                    aria-label={done ? `${a.name}, added today` : blocked ? "Another workout is already counted today" : pending ? `Adding ${a.name}` : `Add ${a.name}, ${a.points} points`}
                  >
                    <span className="gameify-main">
                      <b>{a.icon} {a.name}</b>
                      <small>{a.detail}</small>
                    </span>
                    <span className="gameify-action-label">
                      {done ? `✓ +${a.points}` : pending ? "Adding…" : blocked ? "Already logged" : `+${a.points}`}
                    </span>
                  </button>
                );
              })}
            </div>

            <h3>Spend</h3>
            <div className="gameify-actions">
              {costs.map(c => (
                <button key={c.name} onClick={() => spend(c.name, c.points)} disabled={points < Math.abs(c.points)} className="gameify-row">
                  <span className="gameify-main">
                    <b>{c.icon} {c.name}</b>
                    <small>{c.detail}</small>
                  </span>
                  <span className="gameify-action-label">−{Math.abs(c.points)}</span>
                  {c.name === "Alcohol" && <small className="gameify-meta">Today: {alcoholToday} drink{alcoholToday === 1 ? "" : "s"} · {alcoholToday * 4} points spent</small>}
                </button>
              ))}
            </div>

            <div className="gameify-balance"><span>Balance</span><strong>{points} pts</strong><small>Level {level} · {points % 25}/25 to next level</small></div>
            {message && <div className={`gameify-feedback ${message.startsWith("✓") ? "success" : ""}`} role="status">{message}</div>}
          </div>
        </div>
      )}
    </main>
  );
}
