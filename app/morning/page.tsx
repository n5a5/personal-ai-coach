"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import IdentityLoop from "@/app/components/identity-loop";

type IdentityCoaching = {
  key: string;
  title: string;
  prompt: string;
  whyToday: string;
  question: string;
  commitmentPrompt: string;
};

function localDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function renderCoachMessage(message: string) {
  const lines = message.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push(<p key={`p-${blocks.length}`} className="coach-paragraph">{paragraph.join(" ")}</p>);
    paragraph = [];
  };

  const flushList = () => {
    if (!list.length) return;
    blocks.push(<ul key={`ul-${blocks.length}`} className="coach-list">{list.map((item, index) => <li key={index}>{item}</li>)}</ul>);
    list = [];
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) { flushParagraph(); flushList(); return; }
    const heading = line.match(/^#{1,4}\s*(?:\d+\.\s*)?(.+)$/);
    if (heading) {
      flushParagraph(); flushList();
      blocks.push(<h2 key={`h-${blocks.length}`} className="coach-section-heading">{heading[1].replace(/\s*[—:-]\s*$/, "")}</h2>);
      return;
    }
    const bullet = line.match(/^(?:[-*•]|\d+\.)\s+(.+)$/);
    if (bullet) { flushParagraph(); list.push(bullet[1]); return; }
    flushList(); paragraph.push(line);
  });

  flushParagraph();
  flushList();
  return blocks;
}

function messageFromSavedPlan(items: any[], identity?: any) {
  const lines: string[] = [];
  if (identity?.why_today) lines.push(`MORNING READ — ${identity.why_today}`);
  const sections = [
    ["BODY", "body"],
    ["MIND", "mind"],
    ["IMPORTANT", "important"],
    ["LIFE", "life"],
  ] as const;
  for (const [label, id] of sections) {
    const item = items.find((entry: any) => entry?.id === id);
    if (item?.detail) lines.push(`${label} — ${item.detail}`);
  }
  return lines.join("\n\n");
}

function getTodayOneThing(items: any[]) {
  const important = items.find((item: any) => item?.id === "important");
  return important?.detail || "Choose one action that would make today meaningfully better.";
}

export default function MorningPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [identityCoaching, setIdentityCoaching] = useState<IdentityCoaching | null>(null);
  const [todayOneThing, setTodayOneThing] = useState("");
  const [noticing, setNoticing] = useState("");
  const supabase = createClient();

  async function loadLatestPattern() {
    try {
      const { data } = await supabase
        .from("coach_memories")
        .select("content,confidence,status,updated_at")
        .eq("category", "pattern")
        .in("status", ["candidate", "active", "established"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const content = data?.content || "";
      setNoticing(content);
      return content;
    } catch {
      setNoticing("");
      return "";
    }
  }

  async function buildMorning(force = false) {
    setLoading(true);
    setError("");
    try {
      const today = localDate();
      const cacheKey = `morning-coach:${today}`;

      if (!force) {
        try {
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed?.message) {
              setMessage(parsed.message);
              setIdentityCoaching(parsed.identityCoaching || null);
              setTodayOneThing(parsed.todayOneThing || "");
              setNoticing(parsed.noticing || "");
              setLoading(false);
              return;
            }
          }
        } catch {}

        const [{ data: plan }, { data: identity }] = await Promise.all([
          supabase.from("daily_plans").select("items").eq("plan_date", today).maybeSingle(),
          supabase.from("identity_loops").select("identity_key,identity_title,why_today,adaptive_question").eq("loop_date", today).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
        ]);

        if (plan?.items?.length) {
          const savedIdentity = identity ? {
            key: identity.identity_key,
            title: identity.identity_title,
            prompt: "",
            whyToday: identity.why_today || "",
            question: identity.adaptive_question || "",
            commitmentPrompt: "What specific action will you use as today's proof?",
          } : null;
          const savedMessage = messageFromSavedPlan(plan.items, identity);
          const oneThing = getTodayOneThing(plan.items);
          const latestPattern = await loadLatestPattern();
          setMessage(savedMessage);
          setIdentityCoaching(savedIdentity);
          setTodayOneThing(oneThing);
          try { localStorage.setItem(cacheKey, JSON.stringify({ message: savedMessage, identityCoaching: savedIdentity, todayOneThing: oneThing, noticing: latestPattern })); } catch {}
          setLoading(false);
          return;
        }
      }

      const response = await fetch("/api/morning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today, force }),
      });
      const data = await response.json();
      if (data.setup) throw new Error("Live AI is not configured yet.");
      if (!response.ok || data.error) throw new Error(data.error || "Unable to build your morning plan.");
      const oneThing = getTodayOneThing(data?.plan?.items || []);
      const pattern = typeof data?.behavioralInsight === "string" ? data.behavioralInsight : "";
      const latestPattern = pattern || await loadLatestPattern();
      setMessage(data.message || "");
      setIdentityCoaching(data.identityCoaching || null);
      setTodayOneThing(oneThing);
      setNoticing(latestPattern);
      try { localStorage.setItem(cacheKey, JSON.stringify({ message: data.message || "", identityCoaching: data.identityCoaching || null, todayOneThing: oneThing, noticing: latestPattern })); } catch {}
    } catch (e: any) {
      setError(e?.message || "Unable to build your morning plan.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { buildMorning(false); }, []);

  function rebuild() {
    try { localStorage.removeItem(`morning-coach:${localDate()}`); } catch {}
    buildMorning(true);
  }

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "28px 20px 90px" }}>
      <header style={{ marginBottom: 24 }}>
        <div style={eyebrow}>PERSONAL AI COACH</div>
        <h1 style={{ fontSize: 44, margin: "8px 0 6px" }}>Good morning.</h1>
        <p style={{ fontSize: 18, opacity: .68, margin: 0 }}>Let's make today a good day—not just a productive one.</p>
      </header>

      <IdentityLoop coaching={identityCoaching} />

      {!loading && !error && (
        <>
          <section style={{ ...focusCard, marginTop: 16 }}>
            <div style={eyebrow}>TODAY'S ONE THING</div>
            <h2 style={{ margin: "8px 0 8px", fontSize: 28, lineHeight: 1.15 }}>Make this the thing that matters.</h2>
            <p style={{ margin: 0, fontSize: 18, lineHeight: 1.55 }}>{todayOneThing}</p>
          </section>

          {noticing && (
            <section style={{ ...noticeCard, marginTop: 12 }}>
              <div style={eyebrow}>WHAT I'M NOTICING</div>
              <p style={{ margin: "8px 0 0", fontSize: 17, lineHeight: 1.55 }}>{noticing}</p>
            </section>
          )}
        </>
      )}

      <section style={{ ...card, marginTop: 16 }}>
        {loading ? (
          <div style={{ padding: "36px 8px", textAlign: "center" }}>
            <div style={eyebrow}>YOUR COACH IS THINKING</div>
            <h2 style={{ margin: "10px 0 6px" }}>Building your day…</h2>
            <p style={{ opacity: .65 }}>Looking at your goals, memories, recent days, and what you actually followed through on.</p>
          </div>
        ) : error ? (
          <div>
            <h2 style={{ marginTop: 0 }}>Morning plan unavailable</h2>
            <p style={{ opacity: .7 }}>{error}</p>
            <button onClick={() => buildMorning(true)} style={primaryButton}>Try again</button>
          </div>
        ) : (
          <>
            <div className="coach-message">{renderCoachMessage(message)}</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 24 }}>
              <button onClick={rebuild} style={secondaryButton}>Refresh today's coaching</button>
              <Link href="/coach" style={{ ...secondaryButton, textDecoration: "none" }}>Talk to my coach</Link>
              <Link href="/" style={{ ...primaryButton, textDecoration: "none" }}>Start today</Link>
            </div>
          </>
        )}
      </section>

      <section style={{ ...card, marginTop: 16, background: "#f5f3ef" }}>
        <div style={eyebrow}>THE RULE</div>
        <p style={{ fontSize: 20, fontWeight: 650, lineHeight: 1.45, margin: "8px 0 0" }}>
          You don't need to solve your whole life this morning. You need to make the next good decision.
        </p>
      </section>

      <style jsx>{`
        .coach-message { font-size: 17px; line-height: 1.7; }
        .coach-paragraph { margin: 0 0 22px; }
        .coach-section-heading { margin: 30px 0 10px; font-size: 13px; line-height: 1.3; letter-spacing: 1.4px; font-weight: 800; text-transform: uppercase; opacity: .55; }
        .coach-section-heading:first-child { margin-top: 0; }
        .coach-list { margin: 0 0 22px; padding-left: 22px; }
        .coach-list li { margin: 7px 0; }
        @media (max-width: 640px) {
          .coach-message { font-size: 16px; line-height: 1.65; }
          .coach-section-heading { margin-top: 26px; }
        }
      `}</style>
    </main>
  );
}

const eyebrow = { fontSize: 12, fontWeight: 750, letterSpacing: 1.4, opacity: .55 };
const card = { background: "white", borderRadius: 22, padding: 28, boxShadow: "0 8px 30px rgba(0,0,0,.06)" };
const focusCard = { background: "#171717", color: "white", borderRadius: 22, padding: 28, boxShadow: "0 8px 30px rgba(0,0,0,.08)" };
const noticeCard = { background: "#f5f3ef", borderRadius: 18, padding: "18px 20px", border: "1px solid #e5e1da" };
const primaryButton = { display: "inline-block", border: 0, borderRadius: 10, padding: "11px 15px", background: "#171717", color: "white", cursor: "pointer" };
const secondaryButton = { display: "inline-block", border: "1px solid #ddd", borderRadius: 10, padding: "10px 14px", background: "white", color: "#111", cursor: "pointer" };
