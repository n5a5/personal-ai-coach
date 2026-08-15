"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

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

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile>({ values:"", vision:"", goals:"", motivations:"", challenges:"", coaching_style:"", identity_statement:"" });
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace("/login");
      const { data } = await supabase.from("profiles").select("display_name,values,vision,goals,motivations,challenges,coaching_style,identity_statement").eq("id", user.id).maybeSingle();
      if (data) {
        setDisplayName(data.display_name || "");
        setProfile({ values:data.values||"", vision:data.vision||"", goals:data.goals||"", motivations:data.motivations||"", challenges:data.challenges||"", coaching_style:data.coaching_style||"", identity_statement:data.identity_statement||"" });
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

  if (loading) return <main style={{padding:40}}>Loading your profile…</main>;

  return <main style={{maxWidth:850,margin:"0 auto",padding:"32px 20px 70px"}}>
    <button onClick={() => router.push("/")} style={{border:0,background:"transparent",padding:0,marginBottom:20}}>← Back to today</button>
    <div style={{fontSize:13,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",opacity:.55}}>Personal AI Coach</div>
    <h1 style={{fontSize:40,margin:"8px 0"}}>Build your coach.</h1>
    <p style={{fontSize:18,opacity:.7,lineHeight:1.5}}>This is the long-term context your AI coach will use. You can change it anytime. Don't try to make it perfect today.</p>
    <section style={{background:"white",borderRadius:20,padding:24,marginTop:20}}>
      <label style={{display:"block",fontWeight:700}}>Name</label><input value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="What should your coach call you?" style={{width:"100%",marginTop:8,padding:12,border:"1px solid #ddd",borderRadius:10}}/>
    </section>
    {fields.map(([key,title,help]) => <section key={key} style={{background:"white",borderRadius:20,padding:24,marginTop:12}}><label style={{display:"block",fontWeight:700,fontSize:19}}>{title}</label><div style={{fontSize:14,opacity:.6,margin:"6px 0 10px"}}>{help}</div><textarea value={profile[key]} onChange={e=>setProfile(p=>({...p,[key]:e.target.value}))} style={{width:"100%",minHeight:110,padding:12,border:"1px solid #ddd",borderRadius:10,resize:"vertical"}}/></section>)}
    <button onClick={save} style={{marginTop:18,width:"100%",border:0,borderRadius:12,padding:15,background:"#171717",color:"white",fontWeight:700}}>Save my coach profile</button>
    {status && <div style={{marginTop:12,textAlign:"center",opacity:.7}}>{status}</div>}
  </main>;
}
