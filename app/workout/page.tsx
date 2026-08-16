"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const durations = [5, 10, 15, 20, 30, 45, 60];
const focuses = ["Full body", "Chest", "Back", "Shoulders", "Arms", "Legs", "Core", "Cardio", "Mobility"];
const equipmentOptions = ["Bodyweight / no equipment", "Dumbbells", "Barbell + rack", "Bench + dumbbells", "Resistance bands", "Cable machine", "Full gym"];
const goals = ["General fitness", "Strength", "Muscle / hypertrophy", "Conditioning", "Mobility"];
const intensities = ["Easy", "Moderate", "Hard", "Very hard"];

type WorkoutHistory = { date: string; minutes: number; focus: string; equipment: string; goal: string; workout: string; completed: boolean };

function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function renderMarkdown(text: string) {
  return text.split("\n").map((line, i) => {
    if (line.startsWith("# ")) return <h1 key={i}>{line.slice(2)}</h1>;
    if (line.startsWith("## ")) return <h2 key={i}>{line.slice(3)}</h2>;
    if (line.startsWith("### ")) return <h3 key={i}>{line.slice(4)}</h3>;
    if (/^\d+\. /.test(line)) return <div key={i} style={{ margin: "7px 0" }}>{line}</div>;
    if (line.startsWith("- ")) return <div key={i} style={{ margin: "5px 0" }}>• {line.slice(2)}</div>;
    if (!line.trim()) return <div key={i} style={{ height: 7 }} />;
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return <p key={i} style={{ margin: "7px 0" }}>{parts.map((part, j) => part.startsWith("**") ? <strong key={j}>{part.slice(2, -2)}</strong> : part)}</p>;
  });
}

export default function WorkoutPage() {
  const [minutes, setMinutes] = useState(20);
  const [focus, setFocus] = useState<string[]>(["Full body"]);
  const [equipment, setEquipment] = useState("Bodyweight / no equipment");
  const [goal, setGoal] = useState("General fitness");
  const [intensity, setIntensity] = useState("Moderate");
  const [workout, setWorkout] = useState("");
  const [history, setHistory] = useState<WorkoutHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    try { setHistory(JSON.parse(localStorage.getItem("workout_history") || "[]")); } catch { setHistory([]); }
  }, []);

  const recent = useMemo(() => history.slice(-12).map(({ date, minutes, focus, equipment, goal, completed }) => ({ date, minutes, focus, equipment, goal, completed })), [history]);

  function toggleFocus(value: string) {
    if (value === "Full body") {
      setFocus(["Full body"]);
      return;
    }
    setFocus(prev => {
      const withoutFullBody = prev.filter(x => x !== "Full body");
      return withoutFullBody.includes(value)
        ? withoutFullBody.filter(x => x !== value)
        : [...withoutFullBody, value];
    });
  }

  async function generate() {
    if (focus.length === 0) {
      setError("Select at least one body/focus area.");
      return;
    }
    setLoading(true); setError(""); setCompleted(false);
    try {
      const res = await fetch("/api/workout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ minutes, focus, equipment, goal, intensity, recentWorkouts: recent }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to create workout.");
      setWorkout(data.workout);
      const focusLabel = focus.join(", ");
      const entry = { date: localDate(), minutes, focus: focusLabel, equipment, goal, workout: data.workout, completed: false };
      const next = [...history.filter(x => !(x.date === entry.date && x.minutes === minutes && x.focus === focusLabel)), entry].slice(-30);
      setHistory(next); localStorage.setItem("workout_history", JSON.stringify(next));
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to create workout."); }
    finally { setLoading(false); }
  }

  function markComplete() {
    setCompleted(true);
    const next = history.map((x, i) => i === history.length - 1 ? { ...x, completed: true } : x);
    setHistory(next); localStorage.setItem("workout_history", JSON.stringify(next));
  }

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "28px 20px 140px", color: "#171717" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 24 }}>
        <div><div style={{ fontSize: 12, letterSpacing: 2, fontWeight: 800, color: "#6B6B6B" }}>WORKOUT COACH</div><h1 style={{ fontSize: 40, margin: "6px 0" }}>Tell me what you have.</h1><p style={{ margin: 0, color: "#6B6B6B" }}>I'll build a realistic workout around your time, target, equipment, and recent training.</p></div>
        <Link href="/" aria-label="Back to Today" style={{ width: 44, height: 44, display: "grid", placeItems: "center", border: "1px solid #D8D4CC", borderRadius: "50%", textDecoration: "none", color: "#171717", background: "white", fontSize: 24 }}>×</Link>
      </div>

      <section style={{ background: "white", border: "1px solid #E7E5E0", borderRadius: 16, padding: 20, marginBottom: 16 }}>
        <label style={{ display: "block", fontWeight: 800, marginBottom: 10 }}>Time</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>{durations.map(n => <button key={n} onClick={() => setMinutes(n)} style={{ border: `1px solid ${minutes === n ? "#171717" : "#E7E5E0"}`, background: minutes === n ? "#171717" : "white", color: minutes === n ? "white" : "#171717", borderRadius: 999, padding: "9px 14px", fontWeight: 700 }}>{n} min</button>)}</div>

        <label style={{ display: "block", fontWeight: 800, marginBottom: 6 }}>Body / focus</label>
        <p style={{ margin: "0 0 10px", color: "#6B6B6B", fontSize: 13 }}>Select one or more areas. Full body is exclusive.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>{focuses.map(x => <button key={x} aria-pressed={focus.includes(x)} onClick={() => toggleFocus(x)} style={{ border: `1px solid ${focus.includes(x) ? "#171717" : "#E7E5E0"}`, background: focus.includes(x) ? "#171717" : "white", color: focus.includes(x) ? "white" : "#171717", borderRadius: 999, padding: "9px 13px", fontWeight: 700 }}>{x}</button>)}</div>

        <label style={{ display: "block", fontWeight: 800, marginBottom: 10 }}>Equipment</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 8, marginBottom: 20 }}>{equipmentOptions.map(x => <button key={x} onClick={() => setEquipment(x)} style={{ textAlign: "left", border: `1px solid ${equipment === x ? "#171717" : "#E7E5E0"}`, background: equipment === x ? "#F2F0EB" : "white", borderRadius: 12, padding: 12, fontWeight: 700 }}>{x}</button>)}</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
          <div><label style={{ display: "block", fontWeight: 800, marginBottom: 8 }}>Goal</label><select value={goal} onChange={e => setGoal(e.target.value)} style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #D8D4CC", background: "white" }}>{goals.map(x => <option key={x}>{x}</option>)}</select></div>
          <div><label style={{ display: "block", fontWeight: 800, marginBottom: 8 }}>Intensity</label><select value={intensity} onChange={e => setIntensity(e.target.value)} style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #D8D4CC", background: "white" }}>{intensities.map(x => <option key={x}>{x}</option>)}</select></div>
        </div>

        <button onClick={generate} disabled={loading} style={{ width: "100%", marginTop: 20, border: 0, borderRadius: 12, padding: 15, background: "#171717", color: "white", fontWeight: 800, fontSize: 16 }}>{loading ? "Building your workout…" : "Build my workout"}</button>
        {error && <p style={{ color: "#9B2C2C", marginBottom: 0 }}>{error}</p>}
      </section>

      {workout && <section style={{ background: "white", border: "1px solid #E7E5E0", borderRadius: 16, padding: 22 }}>
        <div style={{ lineHeight: 1.55 }}>{renderMarkdown(workout)}</div>
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #E7E5E0", display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={markComplete} disabled={completed} style={{ border: 0, borderRadius: 10, padding: "12px 16px", background: completed ? "#E7E5E0" : "#171717", color: completed ? "#6B6B6B" : "white", fontWeight: 800 }}>{completed ? "Workout completed ✓" : "Mark workout complete"}</button>
          <button onClick={generate} disabled={loading} style={{ border: "1px solid #D8D4CC", borderRadius: 10, padding: "12px 16px", background: "white", fontWeight: 800 }}>Regenerate</button>
        </div>
      </section>}

      <p style={{ marginTop: 18, color: "#6B6B6B", fontSize: 13 }}>Workout planning uses evidence-informed programming rules and your recent Workout Coach history. Bodyweight / no equipment means no weights are required.</p>
    </main>
  );
}
