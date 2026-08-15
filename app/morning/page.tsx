"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import IdentityLoop from "@/app/components/identity-loop";

function localDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function MorningPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function buildMorning() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/morning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: localDate() }),
      });
      const data = await response.json();
      if (data.setup) throw new Error("Live AI is not configured yet.");
      if (!response.ok || data.error) throw new Error(data.error || "Unable to build your morning plan.");
      setMessage(data.message || "");
    } catch (e: any) {
      setError(e?.message || "Unable to build your morning plan.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { buildMorning(); }, []);

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "28px 20px 90px" }}>
      <header style={{ marginBottom: 24 }}>
        <div style={eyebrow}>PERSONAL AI COACH</div>
        <h1 style={{ fontSize: 44, margin: "8px 0 6px" }}>Good morning.</h1>
        <p style={{ fontSize: 18, opacity: .68, margin: 0 }}>Let's make today a good day—not just a productive one.</p>
      </header>

      <IdentityLoop />

      <section style={{ ...card, marginTop: 16 }}>
        {loading ? (
          <div style={{ padding: "36px 8px", textAlign: "center" }}>
            <div style={eyebrow}>YOUR COACH IS THINKING</div>
            <h2 style={{ margin: "10px 0 6px" }}>Building your day…</h2>
            <p style={{ opacity: .65 }}>Looking at your goals, memories, recent days, and what you actually followed through on.</p>
          </div>
        ) : error ? (
          <div>
            <h2 style={{ marginTop: 0 }}>Morning plan unavailable</h2>
            <p style={{ opacity: .7 }}>{error}</p>
            <button onClick={buildMorning} style={primaryButton}>Try again</button>
          </div>
        ) : (
          <>
            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.65, fontSize: 17 }}>{message}</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 24 }}>
              <button onClick={buildMorning} style={secondaryButton}>Rebuild my day</button>
              <Link href="/coach" style={{ ...secondaryButton, textDecoration: "none" }}>Talk to my coach</Link>
              <Link href="/" style={{ ...primaryButton, textDecoration: "none" }}>Start today</Link>
            </div>
          </>
        )}
      </section>

      <section style={{ ...card, marginTop: 16, background: "#f5f3ef" }}>
        <div style={eyebrow}>THE RULE</div>
        <p style={{ fontSize: 20, fontWeight: 650, lineHeight: 1.45, margin: "8px 0 0" }}>
          You don't need to solve your whole life this morning. You need to make the next good decision.
        </p>
      </section>
    </main>
  );
}

const eyebrow = { fontSize: 12, fontWeight: 750, letterSpacing: 1.4, opacity: .55 };
const card = { background: "white", borderRadius: 22, padding: 28, boxShadow: "0 8px 30px rgba(0,0,0,.06)" };
const primaryButton = { display: "inline-block", border: 0, borderRadius: 10, padding: "11px 15px", background: "#171717", color: "white", cursor: "pointer" };
const secondaryButton = { display: "inline-block", border: "1px solid #ddd", borderRadius: 10, padding: "10px 14px", background: "white", color: "#111", cursor: "pointer" };
