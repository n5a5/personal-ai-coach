"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Analysis = {
  headline?: string;
  learned_about_me?: { title: string; detail: string; confidence: string }[];
  patterns?: { title: string; detail: string; evidence: string }[];
  experiments?: { title: string; reason: string }[];
  identity_arc?: { current: string; recent_focuses: string[]; evidence: string };
  memory_health?: { durable_count: number; behavioral_count: number; tentative_count: number };
};

export default function LearningPage() {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/learning", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load learning snapshot.");
      setAnalysis(data.analysis);
    } catch (e: any) { setError(e.message || "Unable to load learning snapshot."); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const cardStyle = { background: "white", border: "1px solid #E7E5E0", borderRadius: 16, padding: 22 };

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "28px 20px 120px", color: "#171717" }}>
      <Link href="/" style={{ color: "#6B6B6B", textDecoration: "none", fontWeight: 700 }}>← Today</Link>
      <header style={{ marginTop: 18, marginBottom: 24 }}>
        <div style={{ fontSize: 12, letterSpacing: 2, fontWeight: 800, color: "#6B6B6B" }}>WHAT THE COACH HAS LEARNED</div>
        <h1 style={{ fontSize: 42, margin: "6px 0" }}>Your learning snapshot.</h1>
        <p style={{ color: "#6B6B6B", margin: 0, lineHeight: 1.6 }}>A transparent view of what the system thinks it knows about you—and how certain it is.</p>
      </header>

      {loading && <section style={{ ...cardStyle, padding: 28 }}>Analyzing your coaching history…</section>}
      {error && <section style={{ background: "#FFF4E5", border: "1px solid #E7D2AE", borderRadius: 12, padding: 16 }}>{error}</section>}

      {analysis && <>
        <section style={{ background: "#171717", color: "white", borderRadius: 16, padding: 26, marginBottom: 16 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.5, opacity: .65, fontWeight: 800 }}>THE BIG PICTURE</div>
          <h2 style={{ fontSize: 27, lineHeight: 1.3, margin: "8px 0 0" }}>{analysis.headline}</h2>
        </section>

        <section style={{ ...cardStyle, marginBottom: 16 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.5, color: "#6B6B6B", fontWeight: 800 }}>WHAT I'VE LEARNED ABOUT YOU</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14, marginTop: 14 }}>
            {(analysis.learned_about_me || []).map((item, i) => (
              <article key={i} style={{ border: "1px solid #ECE9E3", borderRadius: 12, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                  <strong>{item.title}</strong>
                  <span style={{ fontSize: 11, color: "#6B6B6B", textTransform: "uppercase", letterSpacing: 1 }}>{item.confidence}</span>
                </div>
                <p style={{ margin: "8px 0 0", lineHeight: 1.55, color: "#4F4F4F" }}>{item.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 16 }}>
          <section style={cardStyle}>
            <div style={{ fontSize: 11, letterSpacing: 1.5, color: "#6B6B6B", fontWeight: 800 }}>REPEATED PATTERNS</div>
            {(analysis.patterns || []).map((item, i) => <article key={i} style={{ padding: "15px 0", borderBottom: i === (analysis.patterns || []).length - 1 ? 0 : "1px solid #ECE9E3" }}><strong>{item.title}</strong><p style={{ margin: "6px 0 4px", lineHeight: 1.5, color: "#4F4F4F" }}>{item.detail}</p><small style={{ color: "#777" }}>Evidence: {item.evidence}</small></article>)}
          </section>

          <section style={cardStyle}>
            <div style={{ fontSize: 11, letterSpacing: 1.5, color: "#6B6B6B", fontWeight: 800 }}>IDENTITY ARC</div>
            <h3 style={{ marginBottom: 6 }}>{analysis.identity_arc?.current}</h3>
            <p style={{ color: "#4F4F4F", lineHeight: 1.5 }}>{analysis.identity_arc?.evidence}</p>
            <div style={{ fontSize: 11, letterSpacing: 1.2, color: "#6B6B6B", fontWeight: 800, marginTop: 18 }}>RECENT FOCUSES</div>
            <ul style={{ lineHeight: 1.6, paddingLeft: 20 }}>{(analysis.identity_arc?.recent_focuses || []).map((x, i) => <li key={i}>{x}</li>)}</ul>
          </section>
        </div>

        <section style={{ ...cardStyle, marginTop: 16 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.5, color: "#6B6B6B", fontWeight: 800 }}>WORTH TESTING</div>
          <p style={{ color: "#6B6B6B", marginTop: 6 }}>These are experiments, not prescriptions.</p>
          <div style={{ display: "grid", gap: 10 }}>
            {(analysis.experiments || []).map((item, i) => <div key={i} style={{ background: "#F7F5F1", borderRadius: 12, padding: 15 }}><strong>{item.title}</strong><div style={{ marginTop: 5, color: "#4F4F4F", lineHeight: 1.5 }}>{item.reason}</div></div>)}
          </div>
        </section>

        <section style={{ ...cardStyle, marginTop: 16 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.5, color: "#6B6B6B", fontWeight: 800 }}>MEMORY HEALTH</div>
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap", marginTop: 12 }}>
            <div><strong>{analysis.memory_health?.durable_count ?? 0}</strong><div style={{ color: "#6B6B6B", fontSize: 13 }}>durable</div></div>
            <div><strong>{analysis.memory_health?.behavioral_count ?? 0}</strong><div style={{ color: "#6B6B6B", fontSize: 13 }}>behavioral</div></div>
            <div><strong>{analysis.memory_health?.tentative_count ?? 0}</strong><div style={{ color: "#6B6B6B", fontSize: 13 }}>tentative</div></div>
          </div>
        </section>

        <button onClick={load} disabled={loading} style={{ marginTop: 16, border: "1px solid #D8D4CC", borderRadius: 10, padding: "10px 14px", background: "white", fontWeight: 700 }}>{loading ? "Analyzing…" : "Refresh learning snapshot"}</button>
      </>}
    </main>
  );
}
