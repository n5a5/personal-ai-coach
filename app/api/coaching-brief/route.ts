import { createClient } from "@/lib/supabase/server";

function extractText(data: any) {
  return data.output_text || data.output?.filter((item: any) => item?.type === "message")?.flatMap((item: any) => item.content || [])?.filter((content: any) => content?.type === "output_text" && typeof content.text === "string")?.map((content: any) => content.text)?.join("\n") || "";
}

const SYSTEM = `You are generating a concise weekly coaching brief for a persistent personal AI coach. Use only the supplied evidence. Do not diagnose or manufacture certainty. Separate improvement from emerging patterns. Highlight active experiments and lessons. Prefer one or two high-leverage coaching observations over a long list. Return clean Markdown with exactly these headings: ## Improving, ## Emerging Patterns, ## Active Experiments, ## Lessons, ## One Coaching Question. If evidence is insufficient for a section, say so briefly.`;

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!process.env.OPENAI_API_KEY) return Response.json({ setup: true });

    const [{ data: memories }, { data: logs }, { data: loops }] = await Promise.all([
      supabase.from("coach_memories").select("category,content,importance,updated_at,source").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(80),
      supabase.from("daily_logs").select("log_date,mood,energy,gratitude,focus,controllable,uncontrollable,intention,evening_win,evening_lesson,evening_let_go,evening_note,evening_completed").eq("user_id", user.id).order("log_date", { ascending: false }).limit(14),
      supabase.from("identity_loops").select("loop_date,identity_key,identity_title,repetitions,proof,updated_at").eq("user_id", user.id).order("loop_date", { ascending: false }).limit(14),
    ]);

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-5.6", instructions: SYSTEM, input: [{ role: "user", content: JSON.stringify({ memories: memories || [], recent_daily_logs: logs || [], identity_loops: loops || [] }) }], max_output_tokens: 900 }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return Response.json({ error: typeof data?.error?.message === "string" ? data.error.message : "Unable to generate brief." }, { status: 502 });
    const brief = extractText(data).trim();
    if (!brief) return Response.json({ error: "No coaching brief was generated." }, { status: 502 });
    return Response.json({ generated_at: new Date().toISOString(), brief });
  } catch (error) {
    console.error("Coaching brief error:", error);
    return Response.json({ error: "Unable to generate coaching brief." }, { status: 500 });
  }
}
