"use client";

import { useEffect, useMemo, useState } from "react";

const identities = [
  { key: "discipline", title: "I am disciplined.", prompt: "I do what I say I'm going to do, especially when I don't feel like it.", proof: "What is one thing you will do today that proves it?" },
  { key: "composure", title: "I am calm, powerful and decisive.", prompt: "I control how I respond. Uncertainty does not get to control my state.", proof: "Where will you pause instead of reacting today?" },
  { key: "builder", title: "I am building an extraordinary life.", prompt: "I consistently take actions that compound into wealth, health, relationships and freedom.", proof: "What is the uncomfortable action that moves your life forward today?" },
];

function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export default function IdentityLoop() {
  const storageKey = useMemo(() => `identity-loop:${localDate()}`, []);
  const [entries, setEntries] = useState<Record<string, string[]>>({});
  const [proofs, setProofs] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        setEntries(parsed.entries || {});
        setProofs(parsed.proofs || {});
      }
    } catch {}
  }, [storageKey]);

  function updateEntry(key: string, index: number, value: string) {
    setEntries(current => ({ ...current, [key]: Array.from({ length: 3 }, (_, i) => i === index ? value : (current[key]?.[i] || "")) }));
    setSaved(false);
  }

  function save() {
    localStorage.setItem(storageKey, JSON.stringify({ entries, proofs }));
    setSaved(true);
  }

  return (
    <section style={card}>
      <div style={eyebrow}>3-MINUTE IDENTITY LOOP</div>
      <h2 style={{ margin: "8px 0 6px", fontSize: 28 }}>Become it. Prove it.</h2>
      <p style={{ margin: 0, opacity: .68, lineHeight: 1.5 }}>Write each identity three times. Don't copy mechanically—picture the person you're becoming, then create evidence today.</p>
      <div style={{ display: "grid", gap: 18, marginTop: 20 }}>
        {identities.map(identity => (
          <div key={identity.key} style={identityCard}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{identity.title}</div>
            <div style={{ marginTop: 5, opacity: .65, lineHeight: 1.45 }}>{identity.prompt}</div>
            <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
              {[0, 1, 2].map(index => (
                <input key={index} value={entries[identity.key]?.[index] || ""} onChange={e => updateEntry(identity.key, index, e.target.value)} placeholder={`Write it ${index + 1}${index === 0 ? "st" : index === 1 ? "nd" : "rd"} time`} style={input} />
              ))}
            </div>
            <label style={{ display: "block", marginTop: 12, fontSize: 13, fontWeight: 750, opacity: .72 }}>{identity.proof}</label>
            <input value={proofs[identity.key] || ""} onChange={e => { setProofs(p => ({ ...p, [identity.key]: e.target.value })); setSaved(false); }} placeholder="My proof today…" style={input} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
        <button onClick={save} style={primaryButton}>{saved ? "✓ Saved for today" : "Save today's identity"}</button>
        <span style={{ fontSize: 13, opacity: .6 }}>No points. This is about identity, not checking a box.</span>
      </div>
    </section>
  );
}

const eyebrow = { fontSize: 12, fontWeight: 750, letterSpacing: 1.4, opacity: .55 };
const card = { background: "white", borderRadius: 22, padding: 28, boxShadow: "0 8px 30px rgba(0,0,0,.06)" };
const identityCard = { background: "#f7f5f1", borderRadius: 16, padding: 18 };
const input = { width: "100%", boxSizing: "border-box" as const, border: "1px solid #ddd", borderRadius: 10, padding: "11px 12px", background: "white", fontSize: 15 };
const primaryButton = { border: 0, borderRadius: 10, padding: "11px 15px", background: "#171717", color: "white", cursor: "pointer" };
