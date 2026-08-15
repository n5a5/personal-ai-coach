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

function localDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

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
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasPlan, setHasPlan] = useState(false);
  const [eveningCompleted, setEveningCompleted] = useState(false);
  const [showEvening, setShowEvening] = useState(false);

  async function loadPlan() {
    try {
      const date = localDate();
      const response = await fetch(`/api/daily-plan?date=${date}`, { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        const next = normalizeItems(data.plan?.items);
        if (next.length) {
          setItems(next);
          setHasPlan(true);
        }
      }

      // Evening is a lightweight Supabase read — it does not call the AI API.
      const eveningResponse = await fetch(`/api/evening-status?date=${date}`, { cache: "no-store" });
      if (eveningResponse.ok) {
        const evening = await eveningResponse.json();
        setEveningCompleted(Boolean(evening.completed));
      }

      // Surface the evening loop during the natural wind-down window.
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
    const next = items.map(item => item.id === id ? { ...item, completed, done: completed } : item);
    setItems(next);
    setSavingId(id);
    setSaveError(null);

    try {
      const response = await fetch("/api/daily-plan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: id, completed, text: current.text, date: localDate() }),
      });
      if (!response.ok) throw new Error("Unable to save");
      const data = await response.json();
      const saved = normalizeItems(data.plan?.items);
      if (saved.length) {
        setItems(saved);
        setHasPlan(true);
      }
    } catch {
      setItems(previous);
      setSaveError("Couldn't save that checkoff. Tap again to retry.");
    } finally {
      setSavingId(null);
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
          <p>{completed} of {items.length} complete{savingId ? " · Saving…" : ""}</p>
        </div>
        <Link href="/morning" className="plan-morning-link">{hasPlan ? "Rebuild with Morning Coach →" : "Build with Morning Coach →"}</Link>
      </div>
      <div className="plan-progress"><span style={{ width: `${items.length ? completed / items.length * 100 : 0}%` }} /></div>
      {saveError && <button type="button" className="plan-save-error" onClick={() => setSaveError(null)}>{saveError}</button>}
      <div className="plan-items">
        {items.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => toggle(item.id)}
            className={`plan-item ${item.completed ? "done" : ""}`}
            disabled={savingId !== null}
            aria-pressed={Boolean(item.completed)}
          >
            <span className="plan-check" aria-hidden="true">{item.completed ? "✓" : ""}</span>
            <span>{item.text}</span>
          </button>
        ))}
      </div>
      {completed === items.length && items.length > 0 && (
        <div className="plan-complete-message">Day moved forward. Nice work.</div>
      )}

      {showEvening && (
        <div className={`evening-nudge ${eveningCompleted ? "complete" : ""}`}>
          <div className="evening-nudge-copy">
            <div className="eyebrow">Evening coach</div>
            <strong>{eveningCompleted ? "You closed the loop." : "Close the loop before bed."}</strong>
            <span>{eveningCompleted ? "Your reflection is saved. Tomorrow's coach can use it." : "2–3 minutes. Capture the win, the lesson, what you can let go, and what matters tomorrow."}</span>
          </div>
          <Link href="/evening" className="evening-nudge-link">{eveningCompleted ? "Review →" : "Reflect →"}</Link>
        </div>
      )}
    </section>
  );
}
