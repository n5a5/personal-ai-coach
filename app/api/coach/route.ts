import { createClient } from "@/lib/supabase/server";

const SYSTEM = `You are the user's personal AI coach. Your job is to help the user live a better life every day: stronger body, clearer mind, meaningful family time, purposeful work, self-improvement, and enjoyment of the present. Be warm but direct. Distinguish facts from predictions. Focus on what the user can control today. Do not catastrophize, reassure without basis, or turn every feeling into a problem. Ask a short clarifying question when needed, otherwise give one or two concrete next actions. Use the user's saved profile as context. This is coaching, not medical, legal, or financial advice; encourage qualified professionals when those domains require it.`;

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data:{ user } } = await supabase.auth.getUser();
  if (!user) return Response.json({error:"Unauthorized"},{status:401});
  if (!process.env.OPENAI_API_KEY) return Response.json({setup:true});
  const body = await req.json();
  const messages = Array.isArray(body.messages) ? body.messages.slice(-20) : [];
  const [{data:profile},{data:recent}] = await Promise.all([
    supabase.from("profiles").select("display_name,values,vision,goals,motivations,challenges,coaching_style,identity_statement").eq("id",user.id).maybeSingle(),
    supabase.from("daily_logs").select("log_date,mood,energy,gratitude,focus,controllable,uncontrollable,intention").eq("user_id",user.id).order("log_date",{ascending:false}).limit(7),
  ]);
  const context = JSON.stringify({profile:profile||{},recent_daily_logs:recent||[]});
  const response = await fetch("https://api.openai.com/v1/responses",{
    method:"POST",
    headers:{"Content-Type":"application/json","Authorization":`Bearer ${process.env.OPENAI_API_KEY}`},
    body:JSON.stringify({model:process.env.OPENAI_MODEL||"gpt-5-mini",instructions:SYSTEM+"\n\nUSER CONTEXT:\n"+context,input:messages,max_output_tokens:700})
  });
  if(!response.ok) return Response.json({error:"AI request failed"},{status:502});
  const data=await response.json();
  const text=data.output_text || data.output?.flatMap((o:any)=>o.content||[]).map((c:any)=>c.text||"").join("") || "I’m here. Tell me what’s happening.";
  await supabase.from("coach_messages").insert([{user_id:user.id,role:"user",content:messages.at(-1)?.content||""},{user_id:user.id,role:"assistant",content:text}]);
  return Response.json({message:text});
}

// Deployment trigger after environment configuration.
