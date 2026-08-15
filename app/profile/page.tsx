"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const starterProfile = {
  values: "Family, health, strength, personal growth, freedom, responsibility, meaningful relationships, adding value to other people, and building a life I genuinely enjoy living. I want to be ambitious without sacrificing being present for the people I love.",
  vision: "I am healthy, strong, energetic and mentally grounded. I am financially secure, building successful businesses, and have meaningful freedom over my time. I am present and engaged with my wife and kids, continue learning and improving, enjoy new experiences, and handle uncertainty without allowing it to take over my life. I want to look back and feel that I lived fully rather than simply worked hard.",
  goals: "Lose fat and build muscle; exercise consistently; make meditation, reflection and learning part of everyday life; keep improving as a husband, father and leader; build and protect financial security; make smart decisions during the current period of uncertainty; and create a daily system that keeps me moving forward instead of becoming overwhelmed by everything at once.",
  motivations: "My family, freedom, progress, responsibility, challenge, self-improvement and the desire to become the person I know I can be. I respond well to clear goals, measurable progress, action and the feeling that I am building something better.",
  challenges: "Uncertainty can pull my attention toward worst-case future scenarios. I can become overwhelmed when several important things compete for attention, and I sometimes focus too much on things outside my control. I want the coach to help me distinguish facts from predictions, identify what I can control, take the next useful action, and then return to living my life.",
  coaching_style: "Direct, practical, concise and honest. Challenge me when I am rationalizing, avoiding an important action or creating unnecessary suffering. Do not give me generic motivational fluff. Help me separate facts from predictions, control from no-control, and important actions from busywork. Use questions when they will make me think. Be supportive but hold me accountable. Bring me back to the present and to what I can actually do today.",
  identity_statement: "I am the kind of person who takes responsibility, keeps moving forward, takes care of the people I love, gets stronger when life gets difficult, makes decisions based on love rather than fear, and does not let uncertainty steal today from me. I build the life I want through consistent action.",
} as const;

const fields = [
  ["values", "Core values", "What matters most to you? What kind of person do you want to be?"],
  ["vision", "Vision", "Describe the life you want to be living 1–5 years from now."],
  ["goals", "Current goals", "What are you actively trying to accomplish?"],
  ["motivations", "What motivates you", "What makes you take action when you are at your best?"],
  ["challenges", "Patterns / challenges", "What tends to derail you, overwhelm you, or pull you away from the person you want to be?"],
  ["coaching_style", "How should your coach coach you?", "Direct, encouraging, challenging, analytical, humorous, concise, etc."],
  ["identity_statement", "Identity statement", "Finish: I am the kind of person who…"],
] as const;

type Profile = Record<(typeof fields)[number][0], string>;

const backupTables = [
  "profiles", "goals", "daily_logs", "habits", "habit_completions", "rewards", "point_transactions",
  "anxiety_sessions", "coach_messages", "gameify_rules", "reward_redemptions", "gameify_events",
  "coach_memories", "daily_plans", "daily_plan_completions", "identity_loops",
] as const;

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile>({ ...starterProfile });
  const [displayName, setDisplayName] = useState("Neil");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [backupBusy, setBackupBusy] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace("/login");
      const { data } = await supabase.from("profiles").select("display_name,values,vision,goals,motivations,challenges,coaching_style,identity_statement").eq("id", user.id).maybeSingle();
      if (data) {
        setDisplayName(data.display_name || "Neil");
        setProfile({
          values:data.values || starterProfile.values,
          vision:data.vision || starterProfile.vision,
          goals:data.goals || starterProfile.goals,
          motivations:data.motivations || starterProfile.motivations,
          challenges:data.challenges || starterProfile.challenges,
          coaching_style:data.coaching_style || starterProfile.coaching_style,
          identity_statement:data.identity_statement || starterProfile.identity_statement,
        });
      }
      setLoading(false);
    }
    load();
  }, [router, supabase]);

  async function save() {
    setStatus("Saving…");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.replace("/login");
    const { error } = await supabase.from("profiles").upsert({ id:user.id, display_name:displayName, ...profile, updated_at:new Date().toISOString() });
    setStatus(error ? error.message : "Saved. Your coach can use this context.");
  }

  async function downloadBackup() {
    setBackupBusy(true);
    setStatus("Creating your backup…");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.replace("/login");

    const results = await Promise.all(backupTables.map(async (table) => {
      const { data, error } = await supabase.from(table).select("*");
      return [table, error ? { error: error.message } : (data || [])] as const;
    }));

    const backup = {
      backup_version: 1,
      created_at: new Date().toISOString(),
      user_id: user.id,
      note: "Personal AI Coach data export. Authentication passwords/tokens and Supabase internal tables are intentionally excluded.",
      tables: Object.fromEntries(results),
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `personal-ai-coach-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus("Backup downloaded. Store it somewhere separate from the app.");
    setBackupBusy(false);
  }

  if (loading) return <main style={{padding:40}}>Loading your profile…</main>;

  return <main style={{maxWidth:850,margin:"0 auto",padding:"32px 20px 70px"}}>
    <button onClick={() => router.push("/")} style={{border:0,background:"transparent",padding:0,marginBottom:20}}>← Back to today</button>
    <div style={{fontSize:13,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",opacity:.55}}>Personal AI Coach</div>
    <h1 style={{fontSize:40,margin:"8px 0"}}>Build your coach.</h1>
    <p style={{fontSize:18,opacity:.7,lineHeight:1.5}}>I filled in a first draft from what you've already told me. Edit anything that doesn't feel like you. This becomes the long-term context your AI coach will use.</p>
    <section style={{background:"white",borderRadius:20,padding:24,marginTop:20}}>
      <label style={{display:"block",fontWeight:700}}>Name</label><input value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="What should your coach call you?" style={{width:"100%",marginTop:8,padding:12,border:"1px solid #ddd",borderRadius:10}}/>
    </section>
    {fields.map(([key,title,help]) => <section key={key} style={{background:"white",borderRadius:20,padding:24,marginTop:12}}><label style={{display:"block",fontWeight:700,fontSize:19}}>{title}</label><div style={{fontSize:14,opacity:.6,margin:"6px 0 10px"}}>{help}</div><textarea value={profile[key]} onChange={e=>setProfile(p=>({...p,[key]:e.target.value}))} style={{width:"100%",minHeight:130,padding:12,border:"1px solid #ddd",borderRadius:10,resize:"vertical"}}/></section>)}
    <button onClick={save} style={{marginTop:18,width:"100%",border:0,borderRadius:12,padding:15,background:"#171717",color:"white",fontWeight:700}}>Save my coach profile</button>
    {status && <div style={{marginTop:12,textAlign:"center",opacity:.7}}>{status}</div>}

    <section style={{background:"white",borderRadius:20,padding:24,marginTop:28,border:"1px solid #e5e5e5"}}>
      <div style={{fontSize:13,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",opacity:.55}}>Backup</div>
      <h2 style={{fontSize:24,margin:"8px 0"}}>Protect your coach.</h2>
      <p style={{margin:"0 0 14px",lineHeight:1.5,opacity:.7}}>Download your profile, journal, coaching history, points, plans, identity loops and other personal coach data as a private JSON backup. Passwords and authentication tokens are never included.</p>
      <button onClick={downloadBackup} disabled={backupBusy} style={{width:"100%",border:"1px solid #ccc",borderRadius:12,padding:14,background:"#f7f7f5",fontWeight:700,cursor:backupBusy?"wait":"pointer"}}>{backupBusy ? "Creating backup…" : "Download my backup"}</button>
    </section>
  </main>;
}
