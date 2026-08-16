"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const earnRules = [
  { name: "Workout — 5 min", points: 1, detail: "A minimum viable movement win." },
  { name: "Workout — 20–30 min", points: 4, detail: "A meaningful workout." },
  { name: "Workout — 45–60 min", points: 8, detail: "A substantial training session." },
  { name: "Family Connection", points: 3, detail: "Intentional time with wife or kids." },
  { name: "Meditation", points: 2, detail: "Quiet the mind deliberately." },
  { name: "Journaling", points: 2, detail: "Meaningful reflection." },
  { name: "Reading / Learning", points: 2, detail: "Focused reading or learning." },
];

const rewards = [
  { name: "30 minutes completely off", cost: 5, detail: "No productivity. Just enjoy it." },
  { name: "Favorite meal / takeout", cost: 10, detail: "A deliberate indulgence." },
  { name: "Movie or entertainment night", cost: 15, detail: "Enjoy it without guilt." },
  { name: "Half-day personal adventure", cost: 30, detail: "Do something purely because you want to." },
];

function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function dateOffset(days: number) {
  const d = new Date(`${localDate()}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function GameifyPage() {
  const router = useRouter();
  const supabase = createClient();
  const [points, setPoints] = useState(0);
  const [weekPoints, setWeekPoints] = useState(0);
  const [checkIns, setCheckIns] = useState(0);
  const [planDays, setPlanDays] = useState(0);
  const [planCompletions, setPlanCompletions] = useState(0);
  const [earnedToday, setEarnedToday] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const level = Math.floor(points / 25) + 1;
  const levelProgress = points % 25;

  useEffect(() => {
    window.history.pushState({ momentumExit: true }, "", window.location.href);
    const onPopState = () => router.replace("/");
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [router]);

  async function load() {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const today = localDate();
    const weekStart = dateOffset(-6);
    const [{ data: txs }, { data: logs }, { data: plans }] = await Promise.all([
      supabase.from("point_transactions").select("amount,reason,created_at").eq("user_id", auth.user.id),
      supabase.from("daily_logs").select("log_date,mood").eq("user_id", auth.user.id).gte("log_date", weekStart).lte("log_date", today),
      supabase.from("daily_plans").select("plan_date,items").eq("user_id", auth.user.id).gte("plan_date", weekStart).lte("plan_date", today),
    ]);
    const allTxs = txs || [];
    setPoints(allTxs.reduce((sum, row) => sum + Number(row.amount || 0), 0));
    setWeekPoints(allTxs.filter(row => String(row.created_at || "") >= `${weekStart}T00:00:00`).reduce((sum, row) => sum + Number(row.amount || 0), 0));
    setCheckIns((logs || []).length);
    const planRows = plans || [];
    setPlanDays(planRows.length);
    let completed = 0;
    for (const plan of planRows) {
      const items = Array.isArray(plan.items) ? plan.items : [];
      completed += items.filter((item: any) => item?.completed).length;
    }
    setPlanCompletions(completed);
    const todayEarned = allTxs.filter(row => String(row.created_at || "") >= `${today}T00:00:00`).map(row => row.reason);
    setEarnedToday(todayEarned);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function earn(rule: typeof earnRules[number]) {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    setMessage("");
    if (earnedToday.includes(rule.name)) { setMessage("That behavior is already counted today."); return; }
    const { error } = await supabase.from("point_transactions").insert({ user_id: auth.user.id, amount: rule.points, reason: rule.name });
    if (error) { setMessage(error.message); return; }
    setPoints(p => p + rule.points);
    setWeekPoints(p => p + rule.points);
    setEarnedToday(v => [...v, rule.name]);
    setMessage(`+${rule.points} momentum · ${rule.name}`);
  }

  async function spend(reward: typeof rewards[number]) {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    if (points < reward.cost) { setMessage(`You need ${reward.cost - points} more points.`); return; }
    const { error } = await supabase.from("point_transactions").insert({ user_id: auth.user.id, amount: -reward.cost, reason: `Reward: ${reward.name}` });
    if (error) { setMessage(error.message); return; }
    setPoints(p => p - reward.cost);
    setWeekPoints(p => p - reward.cost);
    setMessage(`Reward redeemed: ${reward.name}`);
  }

  const balance = useMemo(() => {
    if (!planDays) return "Build the first week of evidence.";
    const expected = planDays * 4;
    const pct = Math.min(100, Math.round((planCompletions / Math.max(expected, 1)) * 100));
    return `${pct}% of planned actions completed`;
  }, [planDays, planCompletions]);

  if (loading) return <main style={{ maxWidth: 900, margin: "0 auto", padding: 32 }}>Loading Momentum…</main>;

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "28px 20px 190px", color: "#171717" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, marginBottom: 24, flexWrap: "wrap", position: "relative" }}>
        <div style={{ paddingRight: 52 }}><div style={{ fontSize: 12, letterSpacing: 2, fontWeight: 800, color: "#6B6B6B" }}>MOMENTUM</div><h1 style={{ fontSize: 42, margin: "6px 0" }}>Build evidence.</h1><p style={{ margin: 0, color: "#6B6B6B" }}>The goal isn't points. The goal is becoming the person you want to be.</p></div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Link href="/workout" style={{ border: "1px solid #D8D4CC", borderRadius: 999, padding: "10px 16px", textDecoration: "none", color: "#171717", background: "white", fontWeight: 700 }}>Workout Coach →</Link>
          <Link href="/weekly" style={{ border: "1px solid #D8D4CC", borderRadius: 999, padding: "10px 16px", textDecoration: "none", color: "#171717", background: "white", fontWeight: 700 }}>Weekly review →</Link>
        </div>
        <Link href="/" aria-label="Close Momentum and return to Today" title="Close" style={{ position: "absolute", top: -4, right: 0, width: 44, height: 44, display: "grid", placeItems: "center", border: "1px solid #D8D4CC", borderRadius: "50%", textDecoration: "none", color: "#171717", background: "white", fontSize: 28, lineHeight: 1, fontWeight: 400, zIndex: 5 }}>×</Link>
      </div>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 24 }}>
        {[["TOTAL", `${points} pts`], ["LEVEL", `Level ${level}`], ["THIS WEEK", `${weekPoints >= 0 ? "+" : ""}${weekPoints}`], ["PLAN FOLLOW-THROUGH", balance]].map(([label, value]) => <div key={label} style={{ background: "#171717", color: "white", borderRadius: 16, padding: 18 }}><div style={{ fontSize: 11, letterSpacing: 1.5, opacity: .65, fontWeight: 800 }}>{label}</div><div style={{ fontSize: label === "PLAN FOLLOW-THROUGH" ? 18 : 28, fontWeight: 800, marginTop: 6 }}>{value}</div></div>)}
      </section>

      <section style={{ background: "white", border: "1px solid #E7E5E0", borderRadius: 16, padding: 22, marginBottom: 16 }}>
        <div style={{ fontSize: 11, letterSpacing: 1.5, color: "#6B6B6B", fontWeight: 800 }}>LEVEL PROGRESS</div>
        <div style={{ marginTop: 10, height: 10, background: "#E7E5E0", borderRadius: 999, overflow: "hidden" }}><div style={{ width: `${(levelProgress / 25) * 100}%`, height: "100%", background: "#A86D20" }} /></div>
        <p style={{ margin: "10px 0 0", color: "#6B6B6B" }}>{25 - levelProgress} points to Level {level + 1} · {checkIns} check-in days in the last 7 days.</p>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 16 }}>
        <section style={{ background: "white", border: "1px solid #E7E5E0", borderRadius: 16, padding: 22 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.5, color: "#6B6B6B", fontWeight: 800 }}>EARN</div>
          <h2 style={{ margin: "5px 0 14px" }}>Reinforce the behaviors that matter.</h2>
          {earnRules.map(rule => { const done = earnedToday.includes(rule.name); return <button key={rule.name} onClick={() => earn(rule)} disabled={done} style={{ display: "flex", justifyContent: "space-between", width: "100%", textAlign: "left", border: "1px solid #E7E5E0", borderRadius: 12, background: done ? "#F2F0EB" : "white", padding: 13, marginBottom: 8, cursor: done ? "default" : "pointer" }}><span><strong>{rule.name}</strong><small style={{ display: "block", color: "#6B6B6B", marginTop: 3 }}>{rule.detail}</small></span><strong>+{rule.points}</strong></button>; })}
        </section>

        <section style={{ background: "white", border: "1px solid #E7E5E0", borderRadius: 16, padding: 22 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.5, color: "#6B6B6B", fontWeight: 800 }}>REWARDS</div>
          <h2 style={{ margin: "5px 0 14px" }}>Spend points intentionally.</h2>
          {rewards.map(reward => <button key={reward.name} onClick={() => spend(reward)} style={{ display: "flex", justifyContent: "space-between", width: "100%", textAlign: "left", border: "1px solid #E7E5E0", borderRadius: 12, background: "white", padding: 13, marginBottom: 8, cursor: "pointer" }}><span><strong>{reward.name}</strong><small style={{ display: "block", color: "#6B6B6B", marginTop: 3 }}>{reward.detail}</small></span><strong>−{reward.cost}</strong></button>)}
          <p style={{ color: "#6B6B6B", fontSize: 13 }}>Rewards are deliberate choices that make progress feel rewarding.</p>
        </section>
      </div>

      {message && <div style={{ position: "fixed", left: 20, right: 20, bottom: 86, margin: "0 auto", maxWidth: 600, padding: 14, background: "#171717", color: "white", borderRadius: 12, textAlign: "center", zIndex: 20 }}>{message}</div>}
    </main>
  );
}
