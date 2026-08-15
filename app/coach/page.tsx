"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Message = { role:"user"|"assistant"; content:string };

export default function CoachPage() {
  const supabase = createClient();
  const router = useRouter();
  const [messages,setMessages] = useState<Message[]>([]);
  const [input,setInput] = useState("");
  const [loading,setLoading] = useState(false);
  const [setup,setSetup] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(()=>{
    async function load(){
      const {data:{user}}=await supabase.auth.getUser();
      if(!user) return router.replace("/login");
      const {data}=await supabase.from("coach_messages").select("role,content").eq("user_id",user.id).order("created_at",{ascending:true}).limit(50);
      if(data) setMessages(data.filter((m):m is Message => m.role==="user"||m.role==="assistant"));
    }
    load();
  },[router,supabase]);

  useEffect(()=>bottom.current?.scrollIntoView({behavior:"smooth"}),[messages]);

  async function send(){
    const text=input.trim(); if(!text||loading)return;
    setInput(""); setLoading(true); setSetup(false);
    const next=[...messages,{role:"user" as const,content:text}]; setMessages(next);
    const res=await fetch("/api/coach",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:next.slice(-20)})});
    const data=await res.json();
    if(data.setup){setSetup(true);} else if(data.message){setMessages(m=>[...m,{role:"assistant",content:data.message}]);}
    setLoading(false);
  }

  return <main style={{maxWidth:850,margin:"0 auto",padding:"28px 20px 40px",minHeight:"100vh",display:"flex",flexDirection:"column"}}>
    <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}><div><button onClick={()=>router.push("/")} style={{border:0,background:"transparent",padding:0}}>← Today</button><h1 style={{margin:"8px 0 0",fontSize:34}}>Talk to your coach.</h1></div><button onClick={()=>router.push("/profile")} style={{border:"1px solid #ddd",background:"white",borderRadius:10,padding:"9px 12px"}}>Coach profile</button></header>
    <div style={{flex:1,background:"white",borderRadius:20,padding:20,minHeight:520,overflowY:"auto"}}>
      {messages.length===0 && <div style={{padding:"50px 15px",textAlign:"center",opacity:.7}}><div style={{fontSize:40}}>🤖</div><h2>What&apos;s going on?</h2><p>You can talk to me about your goals, motivation, anxiety, decisions, family, work, habits—or just tell me how you&apos;re feeling.</p></div>}
      {messages.map((m,i)=><div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",marginBottom:12}}><div style={{maxWidth:"78%",padding:"12px 15px",borderRadius:16,background:m.role==="user"?"#171717":"#f1f0ec",color:m.role==="user"?"white":"#171717",whiteSpace:"pre-wrap",lineHeight:1.5}}>{m.content}</div></div>)}
      {loading&&<div style={{opacity:.6}}>Thinking…</div>}
      {setup&&<div style={{marginTop:15,padding:15,borderRadius:12,background:"#f5f3ef"}}>The coach interface is ready. To turn on live AI conversations, add your OpenAI API key to Vercel as <b>OPENAI_API_KEY</b>. Your key should be a server-side secret—not a NEXT_PUBLIC variable.</div>}
      <div ref={bottom}/>
    </div>
    <form onSubmit={e=>{e.preventDefault();send()}} style={{display:"flex",gap:10,marginTop:12}}><input value={input} onChange={e=>setInput(e.target.value)} placeholder="Tell your coach what’s on your mind…" style={{flex:1,padding:14,border:"1px solid #ddd",borderRadius:12}}/><button disabled={loading} style={{border:0,borderRadius:12,padding:"0 20px",background:"#171717",color:"white",fontWeight:700}}>Send</button></form>
  </main>;
}
