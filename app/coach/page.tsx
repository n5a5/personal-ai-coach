"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Message = { role: "user" | "assistant"; content: string };

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

  useEffect(() => {
    // The coach UI deliberately does not initialize Supabase in the browser.
    // Authentication, profile context, history, and AI calls are handled server-side.
    // This keeps the page usable even if browser storage or Supabase client initialization fails.
  }, []);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text = input) {
    const clean = text.trim();
    if (!clean || loading) return;
    setInput("");
    setLoading(true);
    setSetup(false);
    setError("");
    const next = [...messages, { role: "user" as const, content: clean }];
    setMessages(next);

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-20) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "The coach could not respond right now.");
      } else if (data.setup) {
        setSetup(true);
      } else if (data.message) {
        setMessages((m) => [...m, { role: "assistant", content: data.message }]);
      }
    } catch {
      setError("I couldn't reach the coach. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 850, margin: "0 auto", padding: "28px 20px 40px", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div>
          <button onClick={() => router.push("/")} style={{ border: 0, background: "transparent", padding: 0 }}>← Today</button>
          <h1 style={{ margin: "8px 0 0", fontSize: 34 }}>Talk to your coach.</h1>
          <p style={{ margin: "5px 0 0", opacity: 0.65 }}>Built around your goals, values and the person you're trying to become.</p>
        </div>
        <button onClick={() => router.push("/profile")} style={{ border: "1px solid #ddd", background: "white", borderRadius: 10, padding: "9px 12px" }}>Coach profile</button>
      </header>

      {messages.length === 0 && (
        <section style={{ background: "white", borderRadius: 20, padding: 22, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", opacity: 0.5 }}>Your starting point</div>
          <h2 style={{ margin: "7px 0 8px" }}>You don't need to solve everything today.</h2>
          <p style={{ margin: "0 0 15px", lineHeight: 1.5, opacity: 0.75 }}>We'll focus on what you can control, separate facts from predictions, take the next useful action, and then get you back to living your life. When you're anxious, we can slow things down instead of letting the second arrow make things worse.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
            {starters.map(([label, prompt]) => (
              <button key={label} onClick={() => send(prompt)} disabled={loading} style={{ textAlign: "left", padding: 12, border: "1px solid #e1dfda", background: "#faf9f6", borderRadius: 12, cursor: "pointer" }}>
                <b>{label}</b><div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>{prompt}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      <div style={{ flex: 1, background: "white", borderRadius: 20, padding: 20, minHeight: 420, overflowY: "auto" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 12 }}>
            <div style={{ maxWidth: "78%", padding: "12px 15px", borderRadius: 16, background: m.role === "user" ? "#171717" : "#f1f0ec", color: m.role === "user" ? "white" : "#171717", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{m.content}</div>
          </div>
        ))}
        {loading && <div style={{ opacity: 0.6 }}>Thinking…</div>}
        {setup && <div style={{ marginTop: 15, padding: 15, borderRadius: 12, background: "#f5f3ef" }}>The coach is configured, but live AI is not turned on yet. Add <b>OPENAI_API_KEY</b> to Vercel as a server-side secret.</div>}
        {error && <div style={{ marginTop: 15, padding: 15, borderRadius: 12, background: "#fff1f0", color: "#8a1c13" }}>{error}</div>}
        <div ref={bottom} />
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
        {starters.map(([label, prompt]) => <button key={label} onClick={() => send(prompt)} disabled={loading} style={{ border: "1px solid #ddd", background: "white", borderRadius: 999, padding: "8px 12px", cursor: "pointer" }}>{label}</button>)}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(); }} style={{ display: "flex", gap: 10, marginTop: 10 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Tell your coach what’s on your mind…" style={{ flex: 1, padding: 14, border: "1px solid #ddd", borderRadius: 12 }} />
        <button disabled={loading} style={{ border: 0, borderRadius: 12, padding: "0 20px", background: "#171717", color: "white", fontWeight: 700 }}>{loading ? "Thinking…" : "Send"}</button>
      </form>
    </main>
  );
}
