"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MarkdownMessage from "@/app/components/markdown-message";

type Message = { id?: string; role: "user" | "assistant"; content: string };

const starters = [
  ["Start my day", "Help me decide what matters most today and keep me from becoming overwhelmed."],
  ["I'm anxious", "I'm feeling anxious. Help me separate facts from predictions, identify what I can control, and get me grounded."],
  ["Think this through", "I have something on my mind. Help me think it through objectively and decide what, if anything, I should do."],
  ["Get me moving", "I'm procrastinating or feeling stuck. Challenge me and help me choose the next useful action."],
] as const;

export default function CoachPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [setup, setSetup] = useState(false);
  const [error, setError] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const historyLoaded = useRef(false);
  const shouldScrollToBottom = useRef(false);

  // Always enter Coach at the top of the page.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/coach", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load history");
        if (active) {
          historyLoaded.current = true;
          setMessages((data.messages || []).map((m: Message) => ({ role: m.role, content: m.content, id: m.id })));
        }
      } catch (e: any) {
        if (active && e?.message) setError(e.message);
      }
    })();
    return () => { active = false; };
  }, []);

  // Only scroll the conversation when the user actually sends a message or a reply arrives.
  // Loading persisted history must never pull the page down to the bottom.
  useEffect(() => {
    if (historyLoaded.current && shouldScrollToBottom.current) {
      bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      shouldScrollToBottom.current = false;
    }
  }, [messages, loading]);

  async function send(text = input) {
    const clean = text.trim();
    if (!clean || loading) return;
    setInput(""); setLoading(true); setSetup(false); setError("");
    shouldScrollToBottom.current = true;
    const next = [...messages, { role: "user" as const, content: clean }];
    setMessages(next);
    try {
      const res = await fetch("/api/coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next.slice(-20) }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || "The coach could not respond right now.");
      else if (data.setup) setSetup(true);
      else if (data.message) setMessages(m => [...m, { role: "assistant", content: data.message }]);
    } catch { setError("I couldn't reach the coach. Please try again."); }
    finally { setLoading(false); }
  }

  return (
    <main className="coach-page" style={{ maxWidth: 850, margin: "0 auto", padding: "24px 16px 140px", minHeight: "100vh" }}>
      <header className="coach-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 18 }}>
        <div><button onClick={() => router.push("/")} style={{ border: 0, background: "transparent", padding: 0, fontSize: 14 }}>← Today</button><h1 style={{ margin: "8px 0 0", fontSize: "clamp(28px,7vw,34px)" }}>Your Coach.</h1><p style={{ margin: "5px 0 0", opacity: .65 }}>Choose the kind of coaching you need right now.</p></div>
        <button onClick={() => router.push("/profile")} style={{ border: "1px solid #ddd", background: "white", borderRadius: 10, padding: "9px 12px", whiteSpace: "nowrap" }}>Profile</button>
      </header>

      <section aria-label="Coach options" style={{ display: "grid", gap: 12, marginBottom: 18 }}>
        <article style={{ background: "#171717", color: "white", borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", opacity: .7 }}>AI COACH</div>
          <h2 style={{ margin: "7px 0 6px", fontSize: 24 }}>Talk to your coach.</h2>
          <p style={{ margin: "0 0 14px", lineHeight: 1.5, opacity: .78 }}>Work through what's on your mind, focus on what you can control, and choose the next useful action.</p>
          <a href="#ai-coach" style={{ display: "inline-block", background: "white", color: "#171717", borderRadius: 10, padding: "10px 14px", fontWeight: 800, textDecoration: "none" }}>Open AI Coach ↓</a>
        </article>

        <Link href="/learning" style={{ display: "block", background: "white", border: "1px solid #E7E5E0", borderRadius: 16, padding: 20, color: "#171717", textDecoration: "none" }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "#6B6B6B" }}>YOUR COACH'S MEMORY</div>
          <h2 style={{ margin: "7px 0 6px", fontSize: 24 }}>What I've learned about you →</h2>
          <p style={{ margin: 0, lineHeight: 1.5, color: "#6B6B6B" }}>See the patterns, preferences, goals, and insights the coach has built from your reflections and conversations—and how confident it is.</p>
        </Link>

        <Link href="/workout" style={{ display: "block", background: "white", border: "1px solid #E7E5E0", borderRadius: 16, padding: 20, color: "#171717", textDecoration: "none" }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "#6B6B6B" }}>WORKOUT COACH</div>
          <h2 style={{ margin: "7px 0 6px", fontSize: 24 }}>Build a workout →</h2>
          <p style={{ margin: 0, lineHeight: 1.5, color: "#6B6B6B" }}>Choose your time, body focus, equipment, goal, and intensity. Includes bodyweight/no-equipment workouts and remembers recent training.</p>
        </Link>
      </section>

      <section id="ai-coach" aria-label="AI Coach conversation">
        {messages.length === 0 && <section className="coach-start" style={{ background: "white", borderRadius: 16, padding: 20, marginBottom: 12 }}><div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", opacity: .5 }}>AI Coach</div><h2 style={{ margin: "7px 0 8px" }}>I'm here. What's going on?</h2><p style={{ margin: "0 0 15px", lineHeight: 1.5, opacity: .75 }}>We'll focus on what you can control, separate facts from predictions, take the next useful action, and then get you back to living your life.</p><div className="coach-starters" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>{starters.map(([label, prompt]) => <button key={label} onClick={() => send(prompt)} disabled={loading} style={{ textAlign: "left", padding: 12, border: "1px solid #e1dfda", background: "#faf9f6", borderRadius: 12, cursor: "pointer" }}><b>{label}</b><div style={{ fontSize: 12, opacity: .6, marginTop: 4 }}>{prompt}</div></button>)}</div></section>}

        <div className="coach-thread" style={{ background: "white", borderRadius: 16, padding: 16, minHeight: 420, overflowY: "auto" }}>
          {messages.map((m, i) => <div key={m.id || i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 12 }}><div style={{ maxWidth: "88%", padding: "12px 15px", borderRadius: 16, background: m.role === "user" ? "#171717" : "#f1f0ec", color: m.role === "user" ? "white" : "#171717", lineHeight: 1.5 }}>{m.role === "assistant" ? <MarkdownMessage content={m.content} /> : m.content}</div></div>)}
          {loading && <div style={{ opacity: .6, padding: "8px 4px" }}>Thinking…</div>}
          {setup && <div style={{ marginTop: 15, padding: 15, borderRadius: 12, background: "#f5f3ef" }}>The coach is configured, but live AI is not turned on yet. Add <b>OPENAI_API_KEY</b> to Vercel as a server-side secret.</div>}
          {error && <div style={{ marginTop: 15, padding: 15, borderRadius: 12, background: "#fff1f0", color: "#8a1c13" }}>{error}</div>}
          <div ref={bottom} />
        </div>

        <div className="coach-suggestion-row" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>{starters.map(([label, prompt]) => <button key={label} onClick={() => send(prompt)} disabled={loading} style={{ border: "1px solid #ddd", background: "white", borderRadius: 999, padding: "8px 12px", cursor: "pointer" }}>{label}</button>)}</div>
        <form className="coach-input" onSubmit={e => { e.preventDefault(); send(); }} style={{ display: "flex", gap: 8, marginTop: 10 }}><input value={input} onChange={e => setInput(e.target.value)} autoComplete="off" enterKeyHint="send" placeholder="Tell your coach what’s on your mind…" style={{ flex: 1, minWidth: 0, padding: 14, border: "1px solid #ddd", borderRadius: 12, fontSize: 16 }} /><button type="submit" disabled={loading || !input.trim()} style={{ border: 0, borderRadius: 12, padding: "0 18px", background: "#171717", color: "white", fontWeight: 700 }}>{loading ? "Thinking…" : "Send"}</button></form>
      </section>
    </main>
  );
}
