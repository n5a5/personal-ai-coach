"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import MarkdownMessage from "@/app/components/markdown-message";

type Message = { id?: string; role: "user" | "assistant"; content: string };

const starters = [
  ["Communicate better", "Help me communicate better with my wife without turning it into an argument."],
  ["More connection", "Give me one small thing I can do today to increase emotional connection and affection."],
  ["We had a conflict", "Help me objectively analyze a conflict we just had and tell me what I should own and what I should do next."],
  ["More intimacy", "Help me improve affection and sexual intimacy in a way that feels natural and mutually desired."],
] as const;

export default function MarriageCoachPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [setup, setSetup] = useState(false);
  const [error, setError] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/marriage-coach", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load history");
        if (active) setMessages(data.messages || []);
      } catch (e: any) {
        if (active && e?.message) setError(e.message);
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  async function send(text = input) {
    const clean = text.trim();
    if (!clean || loading) return;
    setInput(""); setLoading(true); setSetup(false); setError("");
    const next = [...messages, { role: "user" as const, content: clean }];
    setMessages(next);
    try {
      const res = await fetch("/api/marriage-coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next.slice(-20) }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || "The marriage coach could not respond right now.");
      else if (data.setup) setSetup(true);
      else if (data.message) setMessages(m => [...m, { role: "assistant", content: data.message }]);
    } catch { setError("I couldn't reach the marriage coach. Please try again."); }
    finally { setLoading(false); }
  }

  return (
    <main style={{ maxWidth: 850, margin: "0 auto", padding: "24px 16px 140px", minHeight: "100vh" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 18 }}>
        <div><button onClick={() => router.push("/coach")} style={{ border: 0, background: "transparent", padding: 0, fontSize: 14 }}>← Coach</button><div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.5, color: "#6B6B6B", marginTop: 12 }}>MARRIAGE COACH</div><h1 style={{ margin: "6px 0 0", fontSize: "clamp(28px,7vw,38px)" }}>Build a closer marriage.</h1><p style={{ margin: "5px 0 0", opacity: .65 }}>Small, practical changes first. No forced deep conversations.</p></div>
      </header>

      {messages.length === 0 && <section style={{ background: "white", borderRadius: 16, padding: 20, marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", opacity: .5 }}>START HERE</div>
        <h2 style={{ margin: "7px 0 8px" }}>What would help your marriage most right now?</h2>
        <p style={{ margin: "0 0 15px", lineHeight: 1.5, opacity: .75 }}>The coach focuses on communication, emotional openness, affection, intimacy, friendship, parenting teamwork, and breaking recurring conflict cycles.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>{starters.map(([label, prompt]) => <button key={label} onClick={() => send(prompt)} disabled={loading} style={{ textAlign: "left", padding: 12, border: "1px solid #e1dfda", background: "#faf9f6", borderRadius: 12, cursor: "pointer" }}><b>{label}</b><div style={{ fontSize: 12, opacity: .6, marginTop: 4 }}>{prompt}</div></button>)}</div>
      </section>}

      <div style={{ background: "white", borderRadius: 16, padding: 16, minHeight: 420, overflowY: "auto" }}>
        {messages.map((m, i) => <div key={m.id || i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 12 }}><div style={{ maxWidth: "88%", padding: "12px 15px", borderRadius: 16, background: m.role === "user" ? "#171717" : "#f1f0ec", color: m.role === "user" ? "white" : "#171717", lineHeight: 1.5 }}>{m.role === "assistant" ? <MarkdownMessage content={m.content} /> : m.content}</div></div>)}
        {loading && <div style={{ opacity: .6, padding: "8px 4px" }}>Thinking…</div>}
        {setup && <div style={{ marginTop: 15, padding: 15, borderRadius: 12, background: "#f5f3ef" }}>The Marriage Coach is configured, but live AI is not turned on yet. Add <b>OPENAI_API_KEY</b> to Vercel as a server-side secret.</div>}
        {error && <div style={{ marginTop: 15, padding: 15, borderRadius: 12, background: "#fff1f0", color: "#8a1c13" }}>{error}</div>}
        <div ref={bottom} />
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>{starters.map(([label, prompt]) => <button key={label} onClick={() => send(prompt)} disabled={loading} style={{ border: "1px solid #ddd", background: "white", borderRadius: 999, padding: "8px 12px", cursor: "pointer" }}>{label}</button>)}</div>
      <form onSubmit={e => { e.preventDefault(); send(); }} style={{ display: "flex", gap: 8, marginTop: 10 }}><input value={input} onChange={e => setInput(e.target.value)} autoComplete="off" enterKeyHint="send" placeholder="Tell your marriage coach what's going on…" style={{ flex: 1, minWidth: 0, padding: 14, border: "1px solid #ddd", borderRadius: 12, fontSize: 16 }} /><button type="submit" disabled={loading || !input.trim()} style={{ border: 0, borderRadius: 12, padding: "0 18px", background: "#171717", color: "white", fontWeight: 700 }}>{loading ? "Thinking…" : "Send"}</button></form>
    </main>
  );
}
