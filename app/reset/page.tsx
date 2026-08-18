"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const emotions = [
  { name: "Uncomfortable", body: "When you feel uncomfortable, clarify what you want, then take action in that direction." },
  { name: "Fear", body: "Fear is a signal to prepare. If it is beyond your control, change your perception and let it go." },
  { name: "Hurt", body: "Hurt can signal an unmet expectation or sense of loss. Check the expectation, communicate your need, or change the behavior." },
  { name: "Anger", body: "Anger can signal that an important rule has been violated. Clarify the rule and whether it is reasonable to expect others to share it." },
  { name: "Frustration", body: "Frustration can signal that you are repeating an approach without getting the result you want. Change the approach." },
  { name: "Disappointment", body: "Disappointment can signal that an expected outcome or timeframe needs to be reconsidered." },
  { name: "Guilt / Regret", body: "If you violated your own standard, make things right and change the behavior. If the guilt is misplaced, change your perception and let it go." },
  { name: "Inadequacy", body: "Use the feeling as information: improve the skill, practice, or reconsider an unnecessarily harsh standard." },
  { name: "Overloaded", body: "Reevaluate what matters most. Separate what is necessary from what is merely desirable, then take one thing at a time." },
  { name: "Loneliness", body: "Clarify what kind of connection you need, then change your approach or perception to move toward that connection." },
];

const steps = [
  { label: "REGULATE", title: "First: get out of the alarm state.", body: "You do not need to solve the problem while your nervous system is activated. Drop your shoulders, unclench your jaw, and take five slow breaths with a longer exhale.", prompt: "For the next minute, your only job is to breathe.", placeholder: "" },
  { label: "CHANGE STATE", title: "Change your physical state.", body: "Stand up. Put both feet on the floor. Open your chest, relax your jaw, and let your posture become steady. This is a state-change tool, not a magic trick.", prompt: "Feet planted. Shoulders open. Slow exhale. Stay here for three breaths.", placeholder: "" },
  { label: "FACTS", title: "What do you actually know?", body: "Separate what is happening from the story your mind is projecting. Facts are observable or already known. Predictions are possibilities, not facts.", prompt: "FACTS: What is objectively true right now?", placeholder: "Write the facts…" },
  { label: "CONTROL", title: "What is yours to control?", body: "You control your actions, preparation, attention, communication, and response. You do not control other people's decisions or future outcomes.", prompt: "CONTROL: What can you actually do about this today?", placeholder: "What is one thing you can do?" },
  { label: "THIRD PERSON", title: "What would you tell someone you love?", body: "Step outside your own emotional frame. Imagine someone you care about came to you with exactly this problem. What would a calm, confident version of you tell them?", prompt: "What would you advise them—and why are you held to a different standard?", placeholder: "What would you tell them?" },
  { label: "SECOND ARROW", title: "Don't add a second problem to the first.", body: "The first arrow is the difficult event. The second arrow is the extra suffering created by catastrophizing, rehearsing the worst case, or demanding certainty you cannot have.", prompt: "What reaction can you release right now?", placeholder: "What can you stop adding to this situation?" },
  { label: "NEXT MOVE", title: "Choose one useful action — or choose to live.", body: "If there is a meaningful action, take the smallest useful step. If there isn't, stop trying to solve it and return to your life. Family, exercise, music, work, food, rest, and enjoyment are life.", prompt: "What is the next good decision?", placeholder: "One next move — or what you choose to enjoy instead…" },
];

export default function ResetPage() {
  const [emotion, setEmotion] = useState<number | null>(null);
  const [startedEmotion, setStartedEmotion] = useState(false);
  const [step, setStep] = useState(0);
  const [seconds, setSeconds] = useState(60);
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [answerDraft, setAnswerDraft] = useState("");
  const [complete, setComplete] = useState(false);
  const [before, setBefore] = useState(7);
  const [after, setAfter] = useState(7);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!started || seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [started, seconds]);

  const selectedEmotion = emotion === null ? null : emotions[emotion];
  const current = steps[step];

  function next() {
    if (step < steps.length - 1) {
      setAnswers(a => ({ ...a, [step]: answerDraft }));
      setAnswerDraft("");
      setStep(s => s + 1);
      return;
    }
    setAnswers(a => ({ ...a, [step]: answerDraft }));
    setComplete(true);
  }

  function restart() {
    setEmotion(null);
    setStartedEmotion(false);
    setStep(0);
    setSeconds(60);
    setStarted(false);
    setAnswers({});
    setAnswerDraft("");
    setComplete(false);
    setBefore(7);
    setAfter(7);
    setSaved(false);
  }

  function saveResult() {
    const key = `personal-ai-coach-reset:${new Date().toISOString()}`;
    try {
      localStorage.setItem(key, JSON.stringify({ emotion: selectedEmotion?.name, before, after, answers, completedAt: new Date().toISOString() }));
      setSaved(true);
    } catch {}
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f5f3ef", padding: "18px 16px 150px" }}>
      <div style={{ maxWidth: 620, margin: "0 auto" }}>
        <Link href="/" style={{ textDecoration: "none", color: "#171717", fontWeight: 800 }}>← Today</Link>
        <header style={{ marginTop: 28 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.8, opacity: .5 }}>INSTANT RESET</div>
          <h1 style={{ fontSize: "clamp(34px,9vw,52px)", lineHeight: 1, margin: "8px 0 12px", letterSpacing: -1.5 }}>Pause. Reset. Return to life.</h1>
          <p style={{ fontSize: 17, lineHeight: 1.55, opacity: .7, margin: 0 }}>The goal is not to make uncertainty disappear. It is to stop uncertainty from running the next hour of your life.</p>
        </header>

        {!startedEmotion && !complete && (
          <section style={{ marginTop: 22, background: "white", borderRadius: 24, padding: 22, boxShadow: "0 8px 30px rgba(0,0,0,.05)" }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.5, opacity: .5 }}>EMOTIONAL SIGNALS</div>
            <h2 style={{ fontSize: 30, lineHeight: 1.1, margin: "8px 0" }}>What are you feeling?</h2>
            <p style={{ fontSize: 15, lineHeight: 1.5, opacity: .7, margin: 0 }}>Feelings are signals, not commands. Identify the signal, clarify what it means, then choose a response.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginTop: 18 }}>
              {emotions.map((item, i) => (
                <button key={item.name} onClick={() => setEmotion(i)} style={{ textAlign: "left", border: emotion === i ? "2px solid #171717" : "1px solid #ddd", borderRadius: 14, padding: 13, background: emotion === i ? "#f1efea" : "white", cursor: "pointer" }}>
                  <strong style={{ fontSize: 14, lineHeight: 1.2 }}>{i + 1}. {item.name}</strong>
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
            {step >= 2 && <textarea key={`reset-answer-${step}`} value={answerDraft} onChange={e => setAnswerDraft(e.target.value)} placeholder={current.placeholder} autoComplete="off" autoCorrect="off" spellCheck={false} name="reset-current-answer" style={{ width: "100%", minHeight: 100, marginTop: 14, boxSizing: "border-box", border: "1px solid #ddd", borderRadius: 12, padding: 12, font: "inherit", resize: "vertical" }} />}
            <button onClick={next} style={{ width: "100%", marginTop: 16, border: 0, borderRadius: 14, padding: 15, background: "#171717", color: "white", fontWeight: 800, fontSize: 16 }}>{step === steps.length - 1 ? "I'm ready to return to my life" : "Next →"}</button>
          </section>
        </>}

        {complete && <section style={{ marginTop: 22, background: "white", borderRadius: 24, padding: 26, boxShadow: "0 8px 30px rgba(0,0,0,.05)" }}>
          <div style={{ fontSize: 42 }}>✓</div>
          <h2 style={{ fontSize: 32, lineHeight: 1.1, margin: "8px 0 12px" }}>You don't need to solve everything right now.</h2>
          <p style={{ fontSize: 18, lineHeight: 1.6, opacity: .75 }}>You separated the problem from the reaction. Now measure the shift, choose one good decision, and return to your life.</p>
          <div style={{ marginTop: 20, padding: 18, borderRadius: 16, background: "#f5f3ef" }}>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>How did the reset change your state?</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <label style={{ fontWeight: 700 }}>Before<input type="range" min="1" max="10" value={before} onChange={e => setBefore(Number(e.target.value))} style={{ width: "100%" }} /><div>{before}/10</div></label>
              <label style={{ fontWeight: 700 }}>After<input type="range" min="1" max="10" value={after} onChange={e => setAfter(Number(e.target.value))} style={{ width: "100%" }} /><div>{after}/10</div></label>
            </div>
          </div>
          <button onClick={saveResult} style={{ width: "100%", marginTop: 16, border: 0, borderRadius: 14, padding: 15, background: "#171717", color: "white", fontWeight: 800 }}>{saved ? "✓ Saved" : "Save reset"}</button>
          <button onClick={restart} style={{ width: "100%", marginTop: 10, border: "1px solid #ddd", borderRadius: 14, padding: 14, background: "white", color: "#171717", fontWeight: 800 }}>Start another reset</button>
        </section>}
      </div>
    </main>
  );
}
