"use client";

import { useEffect, useState } from "react";

type PlanItem = { id: string; title: string; detail: string; category: string; completed: boolean; points?: number };

type Plan = { id: string; plan_date: string; title: string; items: PlanItem[] };

export default function DailyPlan() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      const response = await fetch("/api/daily-plan", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load today's plan.");
      setPlan(data.plan || null);
    } catch (e: any) { setError(e?.message || "Unable to load today's plan."); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function toggle(id: string, completed: boolean) {
    setPlan(current => current ? { ...current, items: current.items.map(item => item.id === id ? { ...item, completed } : item) } : current);
    try {
      const response = await fetch("/api/daily-plan", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId: id, completed }) });
      if (!response.ok) throw new Error("Unable to save progress.");
    } catch (e: any) { setError(e?.message || "Unable to save progress."); await load(); }
  }

  if (loading) return <section className="daily-plan-card"><div className="daily-plan-eyebrow">TODAY'S PLAN</div><h2>Loading your plan…</h2></section>;
  if (error) return <section className="daily-plan-card"><div className="daily-plan-eyebrow">TODAY'S PLAN</div><h2>Plan unavailable</h2><p>{error}</p><button onClick={load}>Try again</button></section>;
  if (!plan) return <section className="daily-plan-card"><div className="daily-plan-eyebrow">TODAY'S PLAN</div><h2>Your day hasn't been built yet.</h2><p>Build your Morning plan and it will appear here automatically.</p></section>;

  const completed = plan.items.filter(item => item.completed).length;
  return <section className="daily-plan-card">
    <div className="daily-plan-eyebrow">TODAY'S PLAN</div>
    <div className="daily-plan-heading"><div><h2>{plan.title}</h2><p>{completed} of {plan.items.length} complete</p></div><div className="daily-plan-progress"><span style={{ width: `${plan.items.length ? completed / plan.items.length * 100 : 0}%` }} /></div></div>
    <div className="daily-plan-items">
      {plan.items.map(item => <button key={item.id} className={`daily-plan-item ${item.completed ? "completed" : ""}`} onClick={() => toggle(item.id, !item.completed)} aria-pressed={item.completed}>
        <span className="daily-plan-check">{item.completed ? "✓" : ""}</span>
        <span><b>{item.title}</b><small>{item.detail}</small></span>
        {item.points ? <strong>+{item.points}</strong> : null}
      </button>)}
    </div>
  </section>;
}
