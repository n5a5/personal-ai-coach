"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

function localDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

type State = {
  win: string;
  lesson: string;
  letGo: string;
  note: string;
  positiveLoops: string[];
};

const empty: State = { win: "", lesson: "", letGo: "", note: "", positiveLoops: ["", "", ""] };

const fields = [
  ["win", "What went well?", "Capture evidence—not just outcomes. What did you do well, handle well, enjoy, or appreciate today?"],
  ["lesson", "What did you learn?", "What did today teach you about yourself, your priorities, or what consistently works?"],
  ["letGo", "What can you let go of tonight?", "Name the thought, problem, or uncertainty you do not need to solve tonight."],
  ["note", "What matters tomorrow?", "One important thing worth carrying forward. Keep it concrete and small."],
] as const;

export default function EveningPage() {
  const supabase = createClient();
  const router = useRouter();
  const [state, setState] = useState<State>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { router.replace("/login"); return; }
      const { data, error } = await supabase.from("daily_logs")
        .select("evening_win,evening_lesson,evening_let_go,evening_note,evening_positive_loops,evening_completed")
        .eq("user_id", userData.user.id).eq("log_date", localDate()).maybeSingle();
      if (error) { setMessage(error.message); }
      if (data) {
        setState({
          win: data.evening_win || "",
          lesson: data.evening_lesson || "",
          letGo: data.evening_let_go || "",
          note: data.evening_note || "",
          positiveLoops: Array.from({ length: 3 }, (_, i) => data.evening_positive_loops?.[i] || ""),
        });
        setSaved(Boolean(data.evening_completed));
      }
      setLoading(false);
    }
    load();
  }, [router, supabase]);

  function update(key: keyof State, value: string) {
    if (key === "positiveLoops") return;
    setState(s => ({ ...s, [key]: value }));
    setSaved(false);
    setMessage("");
  }

  function updateLoop(index: number, value: string) {
    setState(s => ({ ...s, positiveLoops: s.positiveLoops.map((loop, i) => i === index ? value : loop) }));
    setSaved(false);
    setMessage("");
  }

  const hasContent = Boolean(
    state.win.trim() || state.lesson.trim() || state.letGo.trim() || state.note.trim() || state.positiveLoops.some(loop => loop.trim())
  );

  async function save() {
    if (saving || !hasContent) return;
    setSaving(true);
    setMessage("");
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { setSaving(false); return router.replace("/login"); }
    const today = localDate();
    const positiveLoops = state.positiveLoops.map(loop => loop.trim()).filter(Boolean);
    const { error } = await supabase.from("daily_logs").upsert({
      user_id: userData.user.id,
      log_date: today,
      evening_win: state.win.trim() || null,
      evening_lesson: state.lesson.trim() || null,
      evening_let_go: state.letGo.trim() || null,
      evening_note: state.note.trim() || null,
      evening_positive_loops: positiveLoops,
      evening_completed: true,
    }, { onConflict: "user_id,log_date" });
    if (error) { setMessage(error.message); setSaving(false); return; }

    const { data: existing } = await supabase.from("point_transactions")
      .select("id").eq("user_id", userData.user.id).eq("reason", "Evening reflection")
      .gte("created_at", `${today}T00:00:00.000Z`).maybeSingle();
    if (!existing) {
      const { error: pointError } = await supabase.from("point_transactions").insert({ user_id: userData.user.id, amount: 2, reason: "Evening reflection" });
      if (pointError) { setMessage(pointError.message); setSaving(false); return; }
    }
    setSaved(true);
    setMessage(existing ? "Evening journal updated." : "+2 momentum · Evening journal saved.");
    setSaving(false);
  }

  if (loading) return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>Loading your evening journal…</main>;

  return (
    <main className="evening-page" style={{ maxWidth: 760, margin: "0 auto", padding: "30px 20px 100px" }}>
      <header style={{ marginBottom: 22 }}>
        <Link href="/" style={{ color: "inherit", textDecoration: "none", fontWeight: 700 }}>← Today</Link>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.7, color: "#777", marginTop: 28 }}>DAILY JOURNAL · EVENING</div>
        <h1 style={{ fontSize: 48, lineHeight: 1.02, letterSpacing: -1.5, margin: "8px 0 12px" }}>Close the loop.</h1>
        <p style={{ fontSize: 19, lineHeight: 1.5, color: "#666", margin: 0 }}>Capture the evidence, reinforce what is working, release what can wait, and give tomorrow a better starting point.</p>
      </header>

      <section style={{ background: "#171717", color: "white", borderRadius: 22, padding: 24, marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.4, opacity: .6 }}>THE RULE</div>
        <p style={{ fontSize: 22, lineHeight: 1.4, fontWeight: 700, margin: "9px 0 0" }}>Do not judge the day. Extract the lesson, notice what worked, reinforce it, and let the rest go.</p>
      </section>

      <section style={{ display: "grid", gap: 14 }}>
        {fields.map(([key, title, hint]) => (
          <label key={key} style={{ background: "white", borderRadius: 20, padding: 20, display: "block", boxShadow: "0 6px 24px rgba(0,0,0,.04)" }}>
            <div style={{ fontSize: 19, fontWeight: 800, marginBottom: 5 }}>{title}</div>
            <div style={{ color: "#666", fontSize: 14, lineHeight: 1.45, marginBottom: 11 }}>{hint}</div>
            <textarea
              value={state[key]}
              onChange={e => update(key, e.target.value)}
              rows={3}
              placeholder="Write a few words…"
              style={{ width: "100%", boxSizing: "border-box", border: "1px solid #ddd", borderRadius: 12, padding: 12, resize: "vertical", lineHeight: 1.45 }}
            />
          </label>
        ))}
      </section>

      <section style={{ marginTop: 14, background: "#f4f1e9", borderRadius: 22, padding: 22, boxShadow: "0 6px 24px rgba(0,0,0,.04)" }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.5, opacity: .55 }}>POSITIVE LOOPS</div>
        <h2 style={{ fontSize: 27, margin: "7px 0 7px", letterSpacing: -.5 }}>What do you want to reinforce?</h2>
        <p style={{ margin: "0 0 16px", color: "#666", lineHeight: 1.5 }}>
          Write the behaviors, thoughts, or routines that create more of what you want. Think: <strong>action → result → feeling → more action.</strong> These are the loops worth repeating.
        </p>
        <div style={{ display: "grid", gap: 10 }}>
          {state.positiveLoops.map((loop, index) => (
            <textarea
              key={index}
              value={loop}
              onChange={e => updateLoop(index, e.target.value)}
              rows={2}
              placeholder={[
                "Example: I started the hard task first → got momentum → felt in control → kept going.",
                "Example: I paused before reacting → made a better decision → felt calm and powerful.",
                "Example: I followed through on one promise to myself → trusted myself more → wanted to follow through again.",
              ][index]}
              style={{ width: "100%", boxSizing: "border-box", border: "1px solid #d8d3c8", borderRadius: 12, padding: 12, resize: "vertical", lineHeight: 1.45, background: "white" }}
            />
          ))}
        </div>
      </section>

      {message && <div role="status" style={{ marginTop: 14, padding: 13, background: "#e9e7e2", borderRadius: 12, fontWeight: 700 }}>{message}</div>}

      <button type="button" onClick={save} disabled={saving || !hasContent} style={{ width: "100%", marginTop: 16, border: 0, borderRadius: 14, padding: 15, background: saved ? "#e7e5e0" : "#171717", color: saved ? "#555" : "white", fontWeight: 800, fontSize: 16 }}>
        {saving ? "Saving…" : saved ? "✓ Journal saved +2" : "Save today's journal +2"}
      </button>

      {saved && <div style={{ textAlign: "center", marginTop: 14, color: "#666" }}>Tomorrow's Morning Coach will use what you learned today.</div>}
    </main>
  );
}
