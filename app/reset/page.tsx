"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const steps = [
  { label: "REGULATE", title: "First: get out of the alarm state.", body: "You do not need to solve the problem while your nervous system is activated. Drop your shoulders. Unclench your jaw. Take five slow breaths, making the exhale longer than the inhale.", prompt: "For the next minute, your only job is to breathe." },
  { label: "CHANGE STATE", title: "Change your physical state.", body: "Stand up. Put both feet on the floor. Open your chest, relax your jaw, lift your head and let your posture become steady and expansive. This is a state-change tool, not a magic confidence trick.", prompt: "Feet planted. Shoulders open. Slow exhale. Stay here for three breaths." },
  { label: "FACTS", title: "What do you actually know?", body: "Separate what is happening from the story your mind is projecting. Facts are observable or already known. Predictions are possibilities, not facts.", prompt: "FACTS: What is objectively true right now?" },
  { label: "CONTROL", title: "What is yours to control?", body: "You control your actions, preparation, attention, communication and response. You do not control other people's decisions, future outcomes or events already outside your hands.", prompt: "CONTROL: What can you actually do about this today?" },
  { label: "THIRD PERSON", title: "What would you tell someone you love?", body: "Step outside your own emotional frame for a moment. Imagine someone you care about came to you with exactly this problem. What would a calm, confident and rational version of you tell them to do?", prompt: "What would you advise them—and why are you held to a different standard?" },
  { label: "SECOND ARROW", title: "Don't add a second problem to the first.", body: "The first arrow is the difficult event. The second arrow is the extra suffering created by fighting reality, catastrophizing, rehearsing the worst case, or demanding certainty you cannot have.", prompt: "What reaction can you release right now?" },
  { label: "NEXT MOVE", title: "Choose one useful action — or choose to live.", body: "If there is a meaningful action, take the smallest useful step. If there isn't, stop trying to solve it and return to your life. Family, exercise, music, work, food, rest and enjoyment are not distractions from life. They are life.", prompt: "What is the next good decision?" },
];

export default function ResetPage() {
  const [step, setStep] = useState(0);
  const [seconds, setSeconds] = useState(60);
  const [started, setStarted] = useState(false);
  const [note, setNote] = useState("");
  const [complete, setComplete] = useState(false);
  const [before, setBefore] = useState(7);
  const [after, setAfter] = useState(7);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!started || seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [started, seconds]);

  const current = steps[step];

  function next() {
    if (step < steps.length - 1) setStep(s => s + 1);
    else setComplete(true);
  }

  function restart() {
    setStep(0); setSeconds(60); setStarted(false); setNote(""); setComplete(false); setBefore(7); setAfter(7); setSaved(false);
  }

  function saveResult() {
    const key = `personal-ai-coach-reset:${new Date().toISOString()}`;
    try {
      localStorage.setItem(key, JSON.stringify({ before, after, note, completedAt: new Date().toISOString() }));
      setSaved(true);
    } catch {}
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f5f3ef", padding: "18px 16px 90px" }}>
      <div style={{ maxWidth: 620, margin: "0 auto" }}>
        <Link href="/" style={{ textDecoration: "none", color: "#171717", fontWeight: 700 }}>← Today</Link>
        <header style={{ marginTop: 28 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.8, opacity: .5 }}>INSTANT RESET</div>
          <h1 style={{ fontSize: "clamp(34px,9vw,52px)", lineHeight: 1, margin: "8px 0 12px", letterSpacing: -1.5 }}>Pause. Reset. Return to life.</h1>
          <p style={{ fontSize: 17, lineHeight: 1.55, opacity: .7, margin: 0 }}>The goal is not to make uncertainty disappear. It is to stop uncertainty from running the next hour of your life.</p>
        </header>

        <section style={{ marginTop: 22, background: "#171717", color: "white", borderRadius: 24, padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div><div style={{ fontSize: 12, letterSpacing: 1.5, opacity: .6 }}>60-SECOND RESET</div><div style={{ fontSize: 42, fontWeight: 800, marginTop: 3 }}>{String(Math.floor(seconds / 60)).padStart(2,"0")}:{String(seconds % 60).padStart(2,"0")}</div></div>
            {!started && seconds > 0 && <button onClick={() => setStarted(true)} style={{ border: 0, borderRadius: 12, padding: "12px 16px", background: "white", color: "#171717", fontWeight: 800 }}>Start breathing</button>}
            {seconds === 0 && <button onClick={() => { setSeconds(60); setStarted(true); }} style={{ border: "1px solid #555", borderRadius: 12, padding: "10px 14px", background: "transparent", color: "white", fontWeight: 700 }}>Restart timer</button>}
          </div>
          <div style={{ marginTop: 16, height: 7, background: "#3b3b3b", borderRadius: 10, overflow: "hidden" }}><div style={{ width: `${(seconds / 60) * 100}%`, height: "100%", background: "white", transition: "width 1s linear" }} /></div>
          <div style={{ marginTop: 12, opacity: .72, fontSize: 14 }}>Inhale gently. Exhale slowly. Let the body settle before asking the mind to solve anything.</div>
        </section>

        {!complete ? <>
          <div style={{ marginTop: 22, display: "flex", gap: 5 }}>{steps.map((_, i) => <div key={i} style={{ height: 5, flex: 1, borderRadius: 10, background: i <= step ? "#171717" : "#ddd" }} />)}</div>
          <section style={{ marginTop: 14, background: "white", borderRadius: 24, padding: 24, boxShadow: "0 8px 30px rgba(0,0,0,.05)" }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.5, opacity: .5 }}>{current.label} · {step + 1}/{steps.length}</div>
            <h2 style={{ fontSize: 30, lineHeight: 1.12, margin: "10px 0 12px" }}>{current.title}</h2>
            <p style={{ fontSize: 17, lineHeight: 1.6, margin: 0, opacity: .75 }}>{current.body}</p>
            <div style={{ marginTop: 20, padding: 16, borderRadius: 14, background: "#f5f3ef", fontWeight: 700, lineHeight: 1.45 }}>{current.prompt}</div>
            {(step >= 2) && <textarea value={note} onChange={e => setNote(e.target.value)} placeholder={step === 2 ? "Write the facts…" : step === 3 ? "What is one thing you can do?" : step === 4 ? "What would you tell someone you love?" : step === 5 ? "What can you stop adding to this situation?" : "One next move — or what you choose to enjoy instead…"} style={{ width: "100%", minHeight: 100, marginTop: 14, boxSizing: "border-box", border: "1px solid #ddd", borderRadius: 12, padding: 12, font: "inherit", resize: "vertical" }} />}
            <button onClick={next} style={{ width: "100%", marginTop: 16, border: 0, borderRadius: 14, padding: 15, background: "#171717", color: "white", fontWeight: 800, fontSize: 16 }}>{step === steps.length - 1 ? "I'm ready to return to my life" : "Next →"}</button>
          </section>
        </> : <section style={{ marginTop: 22, background: "white", borderRadius: 24, padding: 26, boxShadow: "0 8px 30px rgba(0,0,0,.05)" }}>
          <div style={{ fontSize: 42 }}>✓</div>
          <h2 style={{ fontSize: 32, margin: "8px 0 12px" }}>You don't need to solve everything right now.</h2>
          <p style={{ fontSize: 18, lineHeight: 1.6, opacity: .75 }}>You separated the problem from the reaction. Now measure the shift, choose one good decision, and return to your life.</p>

          <div style={{ marginTop: 20, padding: 18, borderRadius: 16, background: "#f5f3ef" }}>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>How did the reset change your state?</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <label style={{ fontSize: 14, fontWeight: 700 }}>Before: {before}/10<input aria-label="Anxiety before reset" type="range" min="1" max="10" value={before} onChange={e => setBefore(Number(e.target.value))} style={{ width: "100%", display: "block", marginTop: 8 }} /></label>
              <label style={{ fontSize: 14, fontWeight: 700 }}>After: {after}/10<input aria-label="Anxiety after reset" type="range" min="1" max="10" value={after} onChange={e => setAfter(Number(e.target.value))} style={{ width: "100%", display: "block", marginTop: 8 }} /></label>
            </div>
          </div>

          <div style={{ marginTop: 18, padding: 18, borderRadius: 14, background: "#f5f3ef", fontWeight: 700, lineHeight: 1.5 }}>I am doing everything I can. I can control what I do today. I don't need to solve tomorrow today.</div>
          <button onClick={saveResult} style={{ width: "100%", marginTop: 14, border: 0, borderRadius: 13, padding: 14, background: saved ? "#e7e5e0" : "#171717", color: saved ? "#555" : "white", fontWeight: 800 }}>{saved ? "✓ Reset result saved on this device" : "Save reset result"}</button>
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}><Link href="/coach" style={{ textAlign: "center", textDecoration: "none", borderRadius: 13, padding: 14, background: "#171717", color: "white", fontWeight: 800 }}>Talk to my Coach</Link><button onClick={restart} style={{ border: "1px solid #ddd", borderRadius: 13, padding: 14, background: "white", fontWeight: 700 }}>Run reset again</button><Link href="/" style={{ textAlign: "center", textDecoration: "none", borderRadius: 13, padding: 14, color: "#171717", fontWeight: 700 }}>Return to Today</Link></div>
        </section>}
        <div style={{ marginTop: 22, textAlign: "center", fontSize: 14, opacity: .55 }}>A reset is a tool, not a diagnosis. If anxiety is severe, persistent, or feels unsafe, seek appropriate professional help.</div>
      </div>
    </main>
  );
}
