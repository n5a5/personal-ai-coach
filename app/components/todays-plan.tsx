"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type PlanItem = { id: string; text: string; done: boolean };

const fallback: PlanItem[] = [
  { id: "move", text: "Move your body — choose the workout that makes today better.", done: false },
  { id: "mind", text: "Protect your mind — take a deliberate reset or quiet 10 minutes.", done: false },
  { id: "family", text: "Be present with family — give them your full attention for one meaningful moment.", done: false },
  { id: "growth", text: "Move one important thing forward — choose the uncomfortable action that matters.", done: false },
];

const key = () => `personal-ai-coach-today-plan:${new Date().toISOString().slice(0, 10)}`;

export default function TodaysPlan() {
  const pathname = usePathname();
  const [items, setItems] = useState<PlanItem[]>(fallback);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(key());
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) setItems(parsed);
      }
    } catch {}
    setReady(true);
  }, []);

  function toggle(id: string) {
    const next = items.map(item => item.id === id ? { ...item, done: !item.done } : item);
    setItems(next);
    localStorage.setItem(key(), JSON.stringify(next));
  }

  if (pathname !== "/" || !ready) return null;
  const completed = items.filter(i => i.done).length;

  return (
    <section className="todays-plan" aria-label="Today's plan">
      <div className="todays-plan-head">
        <div>
          <div className="eyebrow">Today's plan</div>
          <h2>Do the few things that matter.</h2>
          <p>{completed} of {items.length} complete</p>
        </div>
        <Link href="/morning" className="plan-morning-link">Build with Morning Coach →</Link>
      </div>
      <div className="plan-progress"><span style={{ width: `${items.length ? completed / items.length * 100 : 0}%` }} /></div>
      <div className="plan-items">
        {items.map(item => (
          <button key={item.id} type="button" onClick={() => toggle(item.id)} className={`plan-item ${item.done ? "done" : ""}`}>
            <span className="plan-check" aria-hidden="true">{item.done ? "✓" : ""}</span>
            <span>{item.text}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
