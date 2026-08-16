"use client";

import { useState } from "react";
import Link from "next/link";

export default function WeeklyPage() {
  const [review, setReview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/weekly-review", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to generate review.");
      setReview(data.review);
    } catch (e: any) { setError(e.message || "Unable to generate review."); }
    finally { setLoading(false); }
  }

  const card = (title: string, items: string[] | undefined) => (
    <section style={{ background: "white", border: "1px solid #E7E5E0", borderRadius: 16, padding: 22 }}>
      <div style={{ fontSize: 11, letterSpacing: 1.5, color: "#6B6B6B", fontWeight: 800 }}>{title}</div>
      <ul style={{ margin: "12px 0 0", paddingLeft: 20, lineHeight: 1.6 }}>{(items || []).map((item, i) => <li key={i} style={{ marginBottom: 8 }}>{item}</li>)}</ul>
    </section>
  );

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "28px 20px 120px", color: "#171717" }}>
      <Link href="/gameify" style={{ color: "#6B6B6B", textDecoration: "none", fontWeight: 700 }}>← Momentum</Link>
      <div style={{ marginTop: 18, marginBottom: 24 }}>
        <div style={{ fontSize: 12, letterSpacing: 2, fontWeight: 800, color: "#6B6B6B" }}>WEEKLY REVIEW</div>
        <h1 style={{ fontSize: 42, margin: "6px 0" }}>Learn from the week.</h1>
        <p style={{ color: "#6B6B6B", margin: 0 }}>What worked, what got in the way, and what should change next.</p>
      </div>

      {!review && <section style={{ background: "#171717", color: "white", borderRadius: 16, padding: 26, marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Turn seven days into useful feedback.</h2>
        <p style={{ color: "#D8D8D8", lineHeight: 1.6 }}>The coach reviews your check-ins, plans, completion behavior, points, reflections, and relevant memories. It looks for patterns—not a score.</p>
        <button onClick={generate} disabled={loading} style={{ border: 0, borderRadius: 10, padding: "12px 18px", fontWeight: 800, cursor: "pointer" }}>{loading ? "Analyzing…" : "Generate weekly review →"}</button>
      </section>}

      {error && <div style={{ background: "#FFF4E5", border: "1px solid #E7D2AE", padding: 14, borderRadius: 12, marginBottom: 16 }}>{error}</div>}

      {review && <>
        <section style={{ background: "#171717", color: "white", borderRadius: 16, padding: 26, marginBottom: 16 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.5, opacity: .65, fontWeight: 800 }}>THE COACH'S TAKEAWAY</div>
          <h2 style={{ fontSize: 26, lineHeight: 1.25, marginBottom: 0 }}>{review.headline}</h2>
        </section>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16 }}>
          {card("WINS", review.wins)}
          {card("PATTERNS", review.patterns)}
          {card("FRICTION", review.friction)}
          {card("NEXT WEEK", review.next_week)}
        </div>
        <section style={{ marginTop: 16, background: "white", border: "1px solid #E7E5E0", borderRadius: 16, padding: 22 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.5, color: "#6B6B6B", fontWeight: 800 }}>ONE FOCUS</div>
          <h2 style={{ marginBottom: 6 }}>{review.one_focus}</h2>
          <p style={{ color: "#6B6B6B", margin: 0 }}>This focus is saved to your coaching memory so tomorrow's coach can use it.</p>
        </section>
        <button onClick={generate} disabled={loading} style={{ marginTop: 16, border: "1px solid #D8D4CC", borderRadius: 10, padding: "10px 14px", background: "white", fontWeight: 700 }}>{loading ? "Analyzing…" : "Regenerate review"}</button>
      </>}
    </main>
  );
}
