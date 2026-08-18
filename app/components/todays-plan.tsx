"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type PlanItem = { id: string; title?: string; text?: string; detail?: string; completed?: boolean; done?: boolean };
type Plan = { id?: string; plan_date?: string; title?: string; items?: PlanItem[]; source?: string; updated_at?: string };
type Identity = { identity_title?: string; commitment?: string | null };

const fallback: PlanItem[] = [
  { id: "move", text: "Move your body — choose the workout that makes today better.", completed: false },
  { id: "mind", text: "Protect your mind — take a deliberate reset or quiet 5 minutes.", completed: false },
  { id: "family", text: "Be present with family — give them your full attention for one meaningful moment.", completed: false },
  { id: "growth", text: "Move one important thing forward — choose the uncomfortable action that matters.", completed: false },
];

const categoryMeta: Record<string, { label: string; icon: string }> = {
  body: { label: "BODY", icon: "💪" }, mind: { label: "MIND", icon: "🧘" }, important: { label: "IMPORTANT", icon: "🎯" }, life: { label: "LIFE", icon: "❤️" },
  move: { label: "BODY", icon: "💪" }, family: { label: "LIFE", icon: "❤️" }, growth: { label: "IMPORTANT", icon: "🎯" },
};

function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function normalizeItems(items?: PlanItem[]) {
  return (items || []).map(item => ({ ...item, text: (item.detail || item.text || item.title || "").replace(/\b10 minutes\b/g, "5 minutes"), completed: Boolean(item.completed ?? item.done) })).filter(item => item.text);
}

export default function TodaysPlan() {
  const pathname = usePathname();
  const [items, setItems] = useState<PlanItem[]>(fallback);
  const [ready, setReady] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasPlan, setHasPlan] = useState(false);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [eveningCompleted, setEveningCompleted] = useState(false);
  const [showEvening, setShowEvening] = useState(false);

  async function loadPlan() {
    try {
      const date = localDate();
      const response = await fetch(`/api/daily-plan?date=${date}`, { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        const next = normalizeItems(data.plan?.items);
        setItems(next.length ? next : fallback);
        setHasPlan(next.length > 0);
      }
      const [eveningResponse, identityResponse] = await Promise.all([
        fetch(`/api/evening-status?date=${date}`, { cache: "no-store" }).catch(() => null),
        fetch(`/api/identity-status?date=${date}`, { cache: "no-store" }).catch(() => null),
      ]);
      if (eveningResponse?.ok) setEveningCompleted(Boolean((await eveningResponse.json()).completed));
      if (identityResponse?.ok) setIdentity((await identityResponse.json()).identity || null);
      setShowEvening(new Date().getHours() >= 18);
    } catch {}
  }

  useEffect(() => {
    loadPlan().finally(() => setReady(true));
    const onFocus = () => loadPlan();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  async function toggle(id: string) {
    const current = items.find(item => item.id === id);
    if (!current) return;
    const completed = !Boolean(current.completed);
    const previous = items;
    setItems(items.map(item => item.id === id ? { ...item, completed, done: completed } : item));
    setSavingId(id); setSaveError(null);
    try {
      const response = await fetch("/api/daily-plan", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId: id, completed, text: current.text, date: localDate() }) });
      if (!response.ok) throw new Error("Unable to save");
      const data = await response.json();
      const saved = normalizeItems(data.plan?.items);
      if (saved.length) { setItems(saved); setHasPlan(true); }
    } catch {
      setItems(previous); setSaveError("Couldn't save that checkoff. Tap again to retry.");
    } finally { setSavingId(null); }
  }

  if (pathname !== "/" || !ready) return null;
  const completed = items.filter(i => i.completed).length;
  const nextAction = items.find(item => !item.completed);
  const nextMeta = nextAction ? categoryMeta[nextAction.id] || { label: nextAction.title || "NEXT", icon: "→" } : null;
  const completionPct = items.length ? Math.round(completed / items.length * 100) : 0;

  return (
    <section className="todays-command-center" aria-label="Today's command center">
      <div className="command-head">
        <div><div className="eyebrow">TODAY</div><h2>{hasPlan ? "Do the few things that matter." : "Let's build your day."}</h2><p>{hasPlan ? `${completed} of ${items.length} commitments complete · ${completionPct}%` : "Your Morning Coach will turn your priorities into a small, executable plan."}</p></div>
        <Link href="/morning" className="command-primary">{hasPlan ? "Adjust with Coach →" : "Build my day →"}</Link>
      </div>

      {hasPlan ? <>
        <div className="command-progress"><span style={{ width: `${completionPct}%` }} /></div>
        <div className="next-action-card">
          <div className="eyebrow">WHAT TO DO NEXT</div>
          {nextAction ? <button type="button" className="next-action-button" onClick={() => toggle(nextAction.id)} disabled={savingId !== null}><span className="next-action-icon">{nextMeta?.icon}</span><span className="next-action-copy"><b>{nextAction.text}</b><small>{nextMeta?.label} · Tap when complete</small></span><span className="next-action-arrow">✓</span></button> : <div className="next-action-complete">✓ You completed today's commitments. Now enjoy the day.</div>}
        </div>

        {identity?.commitment && <div className="identity-command-card"><div className="eyebrow">IDENTITY → ACTION</div><strong>{identity.identity_title}</strong><span>{identity.commitment}</span><Link href="/morning">Review identity loop →</Link></div>}

        <div className="command-grid">
          {items.map(item => { const meta = categoryMeta[item.id] || { label: item.title || item.id, icon: "•" }; return <button key={item.id} type="button" onClick={() => toggle(item.id)} disabled={savingId !== null} className={`command-category ${item.completed ? "done" : ""}`}><span className="command-category-top"><span>{meta.icon} {meta.label}</span><i>{item.completed ? "✓" : ""}</i></span><span>{item.text}</span></button>; })}
        </div>
        {saveError && <button type="button" className="plan-save-error" onClick={() => setSaveError(null)}>{saveError}</button>}
        {completed === items.length && items.length > 0 && <div className="plan-complete-message">Day moved forward. Nice work.</div>}
      </> : <div className="command-empty"><div className="command-empty-icon">☀️</div><div><strong>Start with Morning Coach.</strong><span>It will look at your goals, recent behavior, reflections, and today's reality—not just give you a generic to-do list.</span></div></div>}

      {showEvening && <div className={`evening-nudge ${eveningCompleted ? "complete" : ""}`}><div className="evening-nudge-copy"><div className="eyebrow">EVENING COACH</div><strong>{eveningCompleted ? "You closed the loop." : "Close the loop before bed."}</strong><span>{eveningCompleted ? "Your reflection is saved. Tomorrow's coach can use it." : "2–3 minutes. Capture the win, the lesson, what you can let go, and what matters tomorrow."}</span></div><Link href="/evening" className="evening-nudge-link">{eveningCompleted ? "Review →" : "Reflect →"}</Link></div>}
    </section>
  );
}
