"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type PlanItem = { id: string; title?: string; text?: string; detail?: string; completed?: boolean; done?: boolean };
type Plan = { id?: string; plan_date?: string; title?: string; items?: PlanItem[]; source?: string; updated_at?: string };

const fallback: PlanItem[] = [
  { id: "move", text: "Move your body — choose the workout that makes today better.", completed: false },
  { id: "mind", text: "Protect your mind — take a deliberate reset or quiet 10 minutes.", completed: false },
  { id: "family", text: "Be present with family — give them your full attention for one meaningful moment.", completed: false },
  { id: "growth", text: "Move one important thing forward — choose the uncomfortable action that matters.", completed: false },
];

function normalizeItems(items?: PlanItem[]) {
  return (items || []).map(item => ({
    ...item,
    text: item.detail || item.text || item.title || "",
    completed: Boolean(item.completed ?? item.done),
  })).filter(item => item.text);
}

export default function TodaysPlan() {
  const pathname = usePathname();
  const [items, setItems] = useState<PlanItem[]>(fallback);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasPlan, setHasPlan] = useState(false);

  async function loadPlan() {
    try {
      const response = await fetch("/api/daily-plan", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      const next = normalizeItems(data.plan?.items);
      if (next.length) {
        setItems(next);
        setHasPlan(true);
      }
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
    const next = items.map(item => item.id === id ? { ...item, completed, done: completed } : item);
    setItems(next);
    setLoading(true);
    try {
      const response = await fetch("/api/daily-plan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: id, completed }),
      });
      if (!response.ok) throw new Error("Unable to save plan item");
      const data = await response.json();
      const saved = normalizeItems(data.plan?.items);
      if (saved.length) setItems(saved);
    } catch {
      setItems(items);
    } finally {
      setLoading(false);
    }
  }

  if (pathname !== "/" || !ready) return null;
  const completed = items.filter(i => i.completed).length;

  return (
    <section className="todays-plan" aria-label="Today's plan">
      <div className="todays-plan-head">
        <div>
          <div className="eyebrow">Today's plan</div>
          <h2>{hasPlan ? "Do the few things that matter." : "Start with what matters."}</h2>
          <p>{completed} of {items.length} complete{loading ? " · Saving…" : ""}</p>
        </div>
        <Link href="/morning" className="plan-morning-link">{hasPlan ? "Rebuild with Morning Coach →" : "Build with Morning Coach →"}</Link>
      </div>
      <div className="plan-progress"><span style={{ width: `${items.length ? completed / items.length * 100 : 0}%` }} /></div>
      <div className="plan-items">
        {items.map(item => (
          <button key={item.id} type="button" onClick={() => toggle(item.id)} className={`plan-item ${item.completed ? "done" : ""}`} disabled={loading}>
            <span className="plan-check" aria-hidden="true">{item.completed ? "✓" : ""}</span>
            <span>{item.text}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
