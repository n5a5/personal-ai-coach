"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const emotions = [
  { name: "Uncomfortable", body: "When you feel uncomfortable, this is a signal to change your state. Clarify what you want, then take action in that direction." },
  { name: "Fear", body: "Fear is a signal to prepare or get prepared. Get yourself prepared to deal with something that's about to come. If it's beyond your control, then change your perception and let it go." },
  { name: "Hurt", body: "Hurt is a signal that you have an expectation that's not being met or you have a sense of loss. Evaluate whether there really is a loss. Next, change your perception or change the way you communicate your needs or change the behavior." },
  { name: "Anger", body: "Anger is a signal that an important rule that you have in your life has been violated by somebody else or maybe even by you. Clarify your rules or adjust them. Your rules might not match other people's rules, so if you don't change them, you might be angry the rest of your life." },
  { name: "Frustration", body: "The signal is you're doing the same thing over and again and expecting a different result. You need to change your approach to achieving your goal." },
  { name: "Disappointment", body: "This is a signal that you need to realize that an expectation or an outcome that you want won't happen, and you need to change your expectation. For example, maybe your timeframe was too short." },
  { name: "Guilt / Regret", body: "Guilt is a signal that you violated one of your own standards. Don't stay in guilt, but don't deny it. Make things right when you screw up. When you can't change the past, change your present and future behaviors. Recognize where you feel guilt you shouldn't be, change your perception, and let it go." },
  { name: "Inadequacy", body: "This is a signal that you need to do something to get better. Get up and do something to get better or change your criteria. Maybe your rules are too harsh. You don't have to be perfect — you simply need to start taking action, such as go practice, to improve at whatever it is." },
  { name: "Overloaded", body: "This is a signal to reevaluate what is most important to you in this situation. Distinguish between what is necessary versus what is a desire. Prioritize your list. Make the first one or your list and do something about it. Do the simplest way is to chunk it down, take one thing and act on it." },
  { name: "Loneliness", body: "The signal is we need a connection with people. Clarify what kind of connection you need: basic friendship, somebody to laugh with, somebody to listen to you, etc. Then change your approach or change your perception." },
];

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
  const [emotion, setEmotion] = useState<number | null>(null);
  const [startedEmotion, setStartedEmotion] = useState(false);
  const [step, setStep] = useState(0);
  const [seconds, setSeconds] = useState(60);
  const [started, setStarted] = useState(false);
  const [notes, setNotes] = useState<Record<number, string>>({});
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
  const selectedEmotion = emotion === null ? null : emotions[emotion];
  const currentNote = notes[step] || "";

  function next() {
    if (step < steps.length - 1) {
      setStep(s => s + 1);
    } else {
      setComplete(true);
    }
  }

  function restart() {
    setEmotion(null); setStartedEmotion(false); setStep(0); setSeconds(60); setStarted(false); setNotes({}); setComplete(false); setBefore(7); setAfter(7); setSaved(false);
  }

  function saveResult() {
    const key = `personal-ai-coach-reset:${new Date().toISOString()}`;
    try {
      localStorage.setItem(key, JSON.stringify({ emotion: selectedEmotion?.name, before, after, note: currentNote, completedAt: new Date().toISOString() }));
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

        {!startedEmotion && !complete && (
          <section style={{ marginTop: 22, background: "white", borderRadius: 24, padding: 22, boxShadow: "0 8px 30px rgba(0,0,0,.05)" }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.5, opacity: .5 }}>EMOTIONAL SIGNALS</div>
            <h2 style={{ fontSize: 30, lineHeight: 1.1, margin: "8px 0 8px" }}>What are you feeling?</h2>
            <p style={{ fontSize: 15, lineHeight: 1.5, opacity: .7, margin: 0 }}>Feelings are signals, not commands. Identify the signal, clarify what it means, then choose a response.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginTop: 18 }}>
              {emotions.map((item, i) => (
                <button key={item.name} onClick={() => setEmotion(i)} style={{ textAlign: "left", border: emotion === i ? "2px solid #171717" : "1px solid #ddd", borderRadius: 14, padding: 13, background: emotion === i ? "#f1efea" : "white", cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 20, minWidth: 20, height: 20, minHeight: 20, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 99, background: "#171717", color: "white", fontSize: 11, lineHeight: 1, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{i + 1}</span><strong style={{ fontSize: 14, lineHeight: 1.2 }}>{item.name}</strong></div>
                  <div style={{ marginTop: 8, fontSize: 12, lineHeight: 1.45, opacity: .72 }}>{item.body}</div>
                </button>
              ))}
            </div>
            <button disabled={emotion === null} onClick={() => setStartedEmotion(true)} style={{ width: "100%", marginTop: 16, border: 0, borderRadius: 14, padding: 15, background: emotion === null ? "#ddd" : "#171717", color: emotion === null ? "#888" : "white", fontWeight: 800, fontSize: 16 }}>Continue to reset →</button>
          </section>
        )}

        {startedEmotion && !complete && <>
          {selectedEmotion && <section style={{ marginTop: 22, background: "#171717", color: "white", borderRadius: 24, padding: 22 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.5, opacity: .6 }}>YOUR SIGNAL · {selectedEmotion.name.toUpperCase()}</div>
            <h2 style={{ fontSize: 27, lineHeight: 1.15, margin: "8px 0 10px" }}>What might this feeling be telling you?</h2>
            <p style={{ fontSize: 16, lineHeight: 1.55, margin: 0, opacity: .82 }}>{selectedEmotion.body}</p>
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #444", fontWeight: 800 }}>The feeling is information—not a command. Now let's regulate before deciding what to do.</div>
          </section>}

          <section style={{ marginTop: 16, background: "#171717", color: "white", borderRadius: 24, padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div><div style={{ fontSize: 12, letterSpacing: 1.5, opacity: .6 }}>60-SECOND RESET</div><div style={{ fontSize: 42, fontWeight: 800, marginTop: 3 }}>{String(Math.floor(seconds / 60)).padStart(2,"0")}:{String(seconds % 60).padStart(2,"0")}</div></div>
              {!started && seconds > 0 && <button onClick={() => setStarted(true)} style={{ border: 0, borderRadius: 12, padding: "12px 16px", background: "white", color: "#171717", fontWeight: 800 }}>Start breathing</button>}
              {seconds === 0 && <button onClick={() => { setSeconds(60); setStarted(true); }} style={{ border: "1px solid #555", borderRadius: 12, padding: "10px 14px", background: "transparent", color: "white", fontWeight: 700 }}>Restart timer</button>}
            </div>
            <div style={{ marginTop: 16, height: 7, background: "#3b3b3b", borderRadius: 10, overflow: "hidden" }}><div style={{ width: `${(seconds / 60) * 100}%`, height: "100%", background: "white", transition: "width 1s linear" }} /></div>
            <div style={{ marginTop: 12, opacity: .72, fontSize: 14 }}>Inhale gently. Exhale slowly. Let the body settle before asking the mind to solve anything.</div>
          </section>

          <div style={{ marginTop: 22, display: "flex", gap: 5 }}>{steps.map((_, i) => <div key={i} style={{ height: 5, flex: 1, borderRadius: 10, background: i <= step ? "#171717" : "#ddd" }} />)}</div>
          <section style={{ marginTop: 14, background: "white", borderRadius: 24, padding: 24, boxShadow: "0 8px 30px rgba(0,0,0,.05)" }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.5, opacity: .5 }}>{current.label} · {step + 1}/{steps.length}</div>
            <h2 style={{ fontSize: 30, lineHeight: 1.12, margin: "10px 0 12px" }}>{current.title}</h2>
            <p style={{ fontSize: 17, lineHeight: 1.6, margin: 0, opacity: .75 }}>{current.body}</p>
            <div style={{ marginTop: 20, padding: 16, borderRadius: 14, background: "#f5f3ef", fontWeight: 700, lineHeight: 1.45 }}>{current.prompt}</div>
            {(step >= 2) && <textarea key={`reset-answer-${step}`} value={currentNote} onChange={e => setNotes(n => ({ ...n, [step]: e.target.value }))} placeholder={step === 2 ? "Write the facts…" : step === 3 ? "What is one thing you can do?" : step === 4 ? "What would you tell someone you love?" : step === 5 ? "What can you stop adding to this situation?" : "One next move — or what you choose to enjoy instead…"} autoComplete="off" name={`reset-answer-${step}`} style={{ width: "100%", minHeight: 100, marginTop: 14, boxSizing: "border-box", border: "1px solid #ddd", borderRadius: 12, padding: 12, font: "inherit", resize: "vertical" }} />}
            <button onClick={next} style={{ width: "100%", marginTop: 16, border: 0, borderRadius: 14, padding: 15, background: "#171717", color: "white", fontWeight: 800, fontSize: 16 }}>{step === steps.length - 1 ? "I'm ready to return to my life" : "Next →"}</button>
          </section>
        </>}

        {complete && <section style={{ marginTop: 22, background: "white", borderRadius: 24, padding: 26, boxShadow: "0 8px 30px rgba(0,0,0,.05)" }}>
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
