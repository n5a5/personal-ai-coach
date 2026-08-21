"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type IdentityCoaching = {
  key: string;
  title: string;
  prompt: string;
  whyToday: string;
  question: string;
  commitmentPrompt: string;
};

const fallback: IdentityCoaching = {
  key: "discipline",
  title: "I am disciplined.",
  prompt: "I do what I say I'm going to do, especially when I don't feel like it.",
  whyToday: "Use today to create one small piece of evidence for the person you are becoming.",
  question: "Where would following through matter most today?",
  commitmentPrompt: "What specific action will you use as today's proof?",
};

function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function normalizeTitle(title: string) {
  const cleaned = (title || "I am disciplined.").trim().replace(/\s+(by|when|because|so that|to)\.?\s*$/i, "").trim();
  return cleaned.endsWith(".") ? cleaned : `${cleaned}.`;
}

export default function IdentityLoop({ coaching }: { coaching?: IdentityCoaching | null }) {
  const supabase = createClient();
  const [focus, setFocus] = useState<IdentityCoaching>(coaching ? { ...coaching, title: normalizeTitle(coaching.title) } : fallback);
  const [entries, setEntries] = useState<string[]>(["", "", ""]);
  const [commitment, setCommitment] = useState("");
  const [adaptiveAnswer, setAdaptiveAnswer] = useState("");
  const [avoidance, setAvoidance] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (coaching) setFocus({ ...coaching, title: normalizeTitle(coaching.title) });
  }, [coaching]);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { setLoading(false); return; }
      const { data, error } = await supabase
        .from("identity_loops")
        .select("identity_key,identity_title,identity_prompt,repetitions,proof,why_today,adaptive_question,adaptive_answer,commitment,avoidance")
        .eq("user_id", userData.user.id)
        .eq("loop_date", localDate())
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) { setMessage(error.message); setLoading(false); return; }
      if (data) {
        setFocus(current => ({
          ...current,
          key: data.identity_key || current.key,
          title: normalizeTitle(data.identity_title || current.title),
          prompt: data.identity_prompt || current.prompt,
          whyToday: data.why_today || current.whyToday,
          question: data.adaptive_question || current.question,
        }));
        setEntries(Array.from({ length: 3 }, (_, i) => data.repetitions?.[i] || ""));
        setAdaptiveAnswer(data.adaptive_answer || "");
        setCommitment(data.commitment || data.proof || "");
        setAvoidance(data.avoidance || "");
        setSaved(Boolean((data.repetitions || []).some((value: string) => value?.trim()) || data.adaptive_answer || data.commitment || data.proof || data.avoidance));
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  function clearStatus() {
    setSaved(false);
    setMessage("");
  }

  function updateEntry(index: number, value: string) {
    setEntries(current => current.map((entry, i) => i === index ? value : entry));
    clearStatus();
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setMessage("");
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { setSaving(false); return; }
    const today = localDate();
    const { error } = await supabase.from("identity_loops").upsert({
      user_id: userData.user.id,
      loop_date: today,
      focus_date: today,
      identity_key: focus.key,
      identity_title: normalizeTitle(focus.title),
      identity_prompt: focus.prompt,
      repetitions: entries,
      why_today: focus.whyToday,
      adaptive_question: focus.question,
      adaptive_answer: adaptiveAnswer.trim() || null,
      avoidance: avoidance.trim() || null,
      commitment: commitment.trim() || null,
      proof: commitment.trim() || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,loop_date,identity_key" });
    if (error) { setMessage(error.message); setSaving(false); return; }
    setSaved(true);
    setMessage("Morning coaching saved. Your coach will use this in future sessions.");
    setSaving(false);
  }

  return (
    <section style={card}>
      <div style={eyebrow}>3-MINUTE IDENTITY LOOP</div>
      <h2 style={{ margin: "8px 0 6px", fontSize: 28 }}>Become it. Prove it.</h2>
      <p style={{ margin: 0, opacity: .68, lineHeight: 1.5 }}>Keep the three-time affirmation. The difference is that today's identity and coaching are chosen around what is actually happening in your life.</p>

      <div style={{ ...identityCard, marginTop: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>{focus.title}</div>
        <div style={{ marginTop: 5, opacity: .65, lineHeight: 1.45 }}>{focus.prompt}</div>
        <div style={whyBox}>
          <div style={smallLabel}>WHY THIS TODAY</div>
          <div style={{ marginTop: 5, lineHeight: 1.45 }}>{focus.whyToday}</div>
        </div>

        <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
          {[0, 1, 2].map(index => (
            <input key={index} value={entries[index] || ""} onChange={e => updateEntry(index, e.target.value)} placeholder={`Write it ${index + 1}${index === 0 ? "st" : index === 1 ? "nd" : "rd"} time`} style={input} disabled={loading} />
          ))}
        </div>

        <div style={coachQuestion}>
          <div style={smallLabel}>ONE COURAGEOUS QUESTION</div>
          <div style={{ marginTop: 5, fontSize: 18, fontWeight: 750, lineHeight: 1.4 }}>What am I avoiding because it's uncomfortable?</div>
          <div style={{ marginTop: 6, opacity: .62, lineHeight: 1.45 }}>You don't have to solve it right now. Just name it honestly.</div>
          <textarea value={avoidance} onChange={e => { setAvoidance(e.target.value); clearStatus(); }} placeholder="I'm avoiding…" rows={2} style={textarea} disabled={loading} />
        </div>

        <label style={{ display: "block", marginTop: 16 }}>
          <div style={smallLabel}>COACH'S QUESTION</div>
          <div style={{ margin: "5px 0 9px", fontWeight: 650, lineHeight: 1.45 }}>{focus.question}</div>
          <textarea value={adaptiveAnswer} onChange={e => { setAdaptiveAnswer(e.target.value); clearStatus(); }} placeholder="A few honest words…" rows={2} style={textarea} disabled={loading} />
        </label>

        <label style={{ display: "block", marginTop: 14 }}>
          <div style={smallLabel}>TODAY'S PROOF</div>
          <div style={{ margin: "5px 0 9px", fontWeight: 650, lineHeight: 1.45 }}>{focus.commitmentPrompt}</div>
          <input value={commitment} onChange={e => { setCommitment(e.target.value); clearStatus(); }} placeholder="Make it specific and doable today…" style={input} disabled={loading} />
        </label>
      </div>

      {message && <div role="status" style={{ marginTop: 14, padding: 11, background: "#e9e7e2", borderRadius: 10, fontSize: 13, fontWeight: 700 }}>{message}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
        <button onClick={save} disabled={loading || saving} style={primaryButton}>{saving ? "Saving…" : saved ? "✓ Saved for today" : "Save today's coaching"}</button>
        <span style={{ fontSize: 13, opacity: .6 }}>Stored as coaching history. No points.</span>
      </div>
    </section>
  );
}

const eyebrow = { fontSize: 12, fontWeight: 750, letterSpacing: 1.4, opacity: .55 };
const smallLabel = { fontSize: 11, fontWeight: 800, letterSpacing: 1.3, opacity: .52 };
const card = { background: "white", borderRadius: 22, padding: 28, boxShadow: "0 8px 30px rgba(0,0,0,.06)" };
const identityCard = { background: "#f7f5f1", borderRadius: 16, padding: 18 };
const whyBox = { marginTop: 14, padding: "12px 13px", background: "white", borderRadius: 12, border: "1px solid #e7e3dc" };
const coachQuestion = { marginTop: 18, padding: "16px 14px 14px", background: "white", borderRadius: 12, border: "1px solid #e7e3dc" };
const input = { width: "100%", boxSizing: "border-box" as const, border: "1px solid #ddd", borderRadius: 10, padding: "11px 12px", background: "white", fontSize: 15 };
const textarea = { ...input, resize: "vertical" as const, lineHeight: 1.45, marginTop: 12 };
const primaryButton = { border: 0, borderRadius: 10, padding: "11px 15px", background: "#171717", color: "white", cursor: "pointer" };
