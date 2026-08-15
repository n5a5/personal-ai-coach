"use client";

import { useState } from "react";

const affirmation = "I can control what I do today. I am doing everything I can, and I don't need to solve tomorrow today.";

export default function Home() {
  const [showReset, setShowReset] = useState(false);
  const [mood, setMood] = useState(7);

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px 60px" }}>
      <header style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", opacity: .55 }}>Personal AI Coach</div>
        <h1 style={{ fontSize: 42, margin: "8px 0 6px" }}>Build a better day.</h1>
        <p style={{ margin: 0, fontSize: 18, opacity: .7 }}>One day at a time. One decision at a time.</p>
      </header>

      <section style={{ background: "white", borderRadius: 20, padding: 24, marginBottom: 16, boxShadow: "0 8px 30px rgba(0,0,0,.06)" }}>
        <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, opacity: .55 }}>Today&apos;s anchor</div>
        <p style={{ fontSize: 22, lineHeight: 1.4, margin: "12px 0 0", fontWeight: 600 }}>{affirmation}</p>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16 }}>
        <button onClick={() => setShowReset(true)} style={{ textAlign: "left", border: 0, borderRadius: 20, padding: 24, background: "#1f2937", color: "white", minHeight: 150 }}>
          <div style={{ fontSize: 28 }}>⚡</div>
          <h2 style={{ margin: "8px 0 4px" }}>I&apos;m anxious</h2>
          <div style={{ opacity: .75 }}>Immediate reset — breathe, ground, reframe, choose the next action.</div>
        </button>

        <div style={{ background: "white", borderRadius: 20, padding: 24, minHeight: 150 }}>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, opacity: .55 }}>Daily check-in</div>
          <h2 style={{ margin: "8px 0 16px" }}>How are you right now?</h2>
          <input aria-label="Mood" type="range" min="1" max="10" value={mood} onChange={e => setMood(Number(e.target.value))} style={{ width: "100%" }} />
          <div style={{ marginTop: 8, fontWeight: 700 }}>{mood}/10</div>
        </div>
      </section>

      <section style={{ marginTop: 16, background: "white", borderRadius: 20, padding: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, opacity: .55 }}>Today&apos;s focus</div>
        <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
          {[
            ["Move", "Exercise / build muscle / lose fat"],
            ["Mind", "Meditation, music, learning, and mental reset"],
            ["Family", "Be present with wife and kids"],
            ["Growth", "Work on the system that makes tomorrow better"],
          ].map(([title, text]) => <div key={title} style={{ padding: "12px 14px", border: "1px solid #e5e5e5", borderRadius: 12 }}><b>{title}</b><span style={{ marginLeft: 10, opacity: .7 }}>{text}</span></div>)}
        </div>
      </section>

      {showReset && <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "grid", placeItems: "center", padding: 20 }}>
        <div style={{ maxWidth: 520, width: "100%", background: "white", borderRadius: 24, padding: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", opacity: .55 }}>60-second reset</div>
          <h2 style={{ fontSize: 30, margin: "8px 0 14px" }}>Pause. Nothing needs to be solved this minute.</h2>
          <ol style={{ lineHeight: 1.8, paddingLeft: 24 }}><li>Slow your breathing.</li><li>Name what you are feeling without judging it.</li><li>Separate <b>facts</b> from predictions.</li><li>Ask: <b>What can I actually do today?</b></li><li>Choose one small useful action — then return to your life.</li></ol>
          <button onClick={() => setShowReset(false)} style={{ width: "100%", border: 0, borderRadius: 12, padding: 14, background: "#171717", color: "white", fontWeight: 700 }}>I&apos;m ready — back to today</button>
        </div>
      </div>}
    </main>
  );
}
