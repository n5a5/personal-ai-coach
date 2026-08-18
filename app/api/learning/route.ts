import { createClient } from "@/lib/supabase/server";

function extractText(data: any) {
  return data.output_text || data.output?.filter((item: any) => item?.type === "message")?.flatMap((item: any) => item.content || [])?.filter((c: any) => c?.type === "output_text" && typeof c.text === "string")?.map((c: any) => c.text)?.join("\n") || "";
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!process.env.OPENAI_API_KEY) return Response.json({ setup: true, error: "OpenAI is not configured." }, { status: 503 });

    const [{ data: profile }, { data: memories }, { data: logs }, { data: identityLoops }, { data: plans }] = await Promise.all([
      supabase.from("profiles").select("display_name,values,vision,goals,motivations,challenges,coaching_style,identity_statement").eq("id", user.id).maybeSingle(),
      supabase.from("coach_memories").select("id,category,content,importance,source,updated_at,created_at").eq("user_id", user.id).order("importance", { ascending: false }).order("updated_at", { ascending: false }).limit(60),
      supabase.from("daily_logs").select("log_date,mood,energy,focus,intention,evening_win,evening_lesson,evening_let_go,evening_note,evening_completed").eq("user_id", user.id).order("log_date", { ascending: false }).limit(30),
      supabase.from("identity_loops").select("loop_date,identity_key,identity_title,repetitions,proof,why_today,adaptive_question,adaptive_answer,commitment,commitment_result,commitment_reflection").eq("user_id", user.id).order("loop_date", { ascending: false }).limit(30),
      supabase.from("daily_plans").select("plan_date,items").eq("user_id", user.id).order("plan_date", { ascending: false }).limit(14),
    ]);

    const context = {
      profile: profile || {},
      durable_memories: memories || [],
      recent_logs: logs || [],
      identity_history: identityLoops || [],
      recent_plans: plans || [],
    };

    const instructions = `You are the learning analyst for a persistent personal AI coach. Turn the user's accumulated coaching data into a transparent, evidence-based snapshot of what the system has learned. Do not diagnose. Do not invent patterns. Distinguish durable facts/preferences from tentative behavioral patterns. If evidence is weak, explicitly say so. Avoid generic praise. Return ONLY valid JSON with this shape: {"headline":"one sentence","learned_about_me":[{"title":"short title","detail":"1-2 sentences grounded in evidence","confidence":"high|medium|tentative"}],"patterns":[{"title":"short title","detail":"1-2 sentences grounded in repeated behavior","evidence":"specific evidence"}],"experiments":[{"title":"small experiment","reason":"why this is worth testing"}],"identity_arc":{"current":"one sentence","recent_focuses":["..."],"evidence":"one sentence"},"memory_health":{"durable_count":0,"behavioral_count":0,"tentative_count":0}}. Keep learned_about_me to at most 6, patterns to at most 5, experiments to at most 3, recent_focuses to at most 5. Count memory categories conservatively; only count categories as durable when they represent persistent user facts/preferences/values/goals, behavioral when they represent observed patterns/insights, and tentative when explicitly tentative or low-confidence. The UI will show this analysis back to the user, so be candid about uncertainty.`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-5.6", instructions, input: [{ role: "user", content: JSON.stringify(context) }], max_output_tokens: 1400 }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return Response.json({ error: data?.error?.message || "Learning analysis failed." }, { status: 502 });
    const raw = extractText(data).trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    const analysis = JSON.parse(raw);

    return Response.json({ analysis, generated_at: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Learning analysis error:", error);
    return Response.json({ error: "Unable to generate the learning snapshot." }, { status: 500 });
  }
}
