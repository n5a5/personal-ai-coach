"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
  const supabase = createClient();
  const storageKey = useMemo(() => `identity-loop:${localDate()}`, []);
  const [entries, setEntries] = useState<Record<string, string[]>>({});
  const [proofs, setProofs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { setLoading(false); return; }
      const { data, error } = await supabase.from("identity_loops").select("identity_key,repetitions,proof").eq("user_id", userData.user.id).eq("loop_date", localDate());
      if (error) { setMessage(error.message); setLoading(false); return; }
      if (data?.length) {
        const nextEntries: Record<string, string[]> = {};
        const nextProofs: Record<string, string> = {};
        for (const row of data) {
          nextEntries[row.identity_key] = Array.isArray(row.repetitions) ? row.repetitions : ["", "", ""];
          nextProofs[row.identity_key] = row.proof || "";
        }
        setEntries(nextEntries);
        setProofs(nextProofs);
        setSaved(true);
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  function updateEntry(key: string, index: number, value: string) {
    setEntries(current => ({ ...current, [key]: Array.from({ length: 3 }, (_, i) => i === index ? value : (current[key]?.[i] || "")) }));
    setSaved(false);
    setMessage("");
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setMessage("");
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { setSaving(false); return; }
    const today = localDate();
    const rows = identities.map(identity => ({ user_id: userData.user.id, loop_date: today, identity_key: identity.key, identity_title: identity.title, repetitions: entries[identity.key] || ["", "", ""], proof: (proofs[identity.key] || "").trim() || null, updated_at: new Date().toISOString() }));
    const { error } = await supabase.from("identity_loops").upsert(rows, { onConflict: "user_id,loop_date,identity_key" });
    if (error) { setMessage(error.message); setSaving(false); return; }
    setSaved(true);
    setMessage("Identity loop saved for today.");
    setSaving(false);
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
              {[0, 1, 2].map(index => <input key={index} value={entries[identity.key]?.[index] || ""} onChange={e => updateEntry(identity.key, index, e.target.value)} placeholder={`Write it ${index + 1}${index === 0 ? "st" : index === 1 ? "nd" : "rd"} time`} style={input} disabled={loading} />)}
            </div>
            <label style={{ display: "block", marginTop: 12, fontSize: 13, fontWeight: 750, opacity: .72 }}>{identity.proof}</label>
            <input value={proofs[identity.key] || ""} onChange={e => { setProofs(p => ({ ...p, [identity.key]: e.target.value })); setSaved(false); setMessage(""); }} placeholder="My proof today…" style={input} disabled={loading} />
          </div>
        ))}
      </div>
      {message && <div role="status" style={{ marginTop: 14, padding: 11, background: "#e9e7e2", borderRadius: 10, fontSize: 13, fontWeight: 700 }}>{message}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
        <button onClick={save} disabled={loading || saving} style={primaryButton}>{saving ? "Saving…" : saved ? "✓ Saved for today" : "Save today's identity"}</button>
        <span style={{ fontSize: 13, opacity: .6 }}>Saved to your coach history. No points.</span>
      </div>
    </section>
  );
}

const eyebrow = { fontSize: 12, fontWeight: 750, letterSpacing: 1.4, opacity: .55 };
const card = { background: "white", borderRadius: 22, padding: 28, boxShadow: "0 8px 30px rgba(0,0,0,.06)" };
const identityCard = { background: "#f7f5f1", borderRadius: 16, padding: 18 };
const input = { width: "100%", boxSizing: "border-box" as const, border: "1px solid #ddd", borderRadius: 10, padding: "11px 12px", background: "white", fontSize: 15 };
const primaryButton = { border: 0, borderRadius: 10, padding: "11px 15px", background: "#171717", color: "white", cursor: "pointer" };
