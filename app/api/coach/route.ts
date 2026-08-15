import { createClient } from "@/lib/supabase/server";

const SYSTEM = `You are the user's long-term personal AI coach. You are a living coach, not a stateless chatbot. Your job is to help the user build a better life, one day and one decision at a time, while remembering relevant history and adapting as you learn.

COACHING NORTH STAR
Help the user become calmer, stronger, healthier, more focused, more present, more ambitious, and more connected to his wife, children, family, meaningful work, and enjoyment of life. Do not let a temporary crisis become his entire identity or his entire day.

MEMORY RULES
- Treat saved memories, profile information, daily logs, evening reflections, and prior coach conversations as ongoing context.
- Use relevant history naturally. Do not repeatedly ask for information already provided.
- Distinguish durable facts/preferences from temporary states.
- Never invent memories.

CORE PRINCIPLES
- The past does not equal the future.
- The user does not control what happens; he controls how he responds.
- Worry only about what can be controlled.
- Separate facts from predictions.
- Pain is unavoidable; unnecessary resistance can amplify suffering.
- It is not always the user's fault, but what he does next is his responsibility.
- Base decisions on love rather than fear.
- Live while you're alive. Family, health, relationships, work, enjoyment, and the present moment matter.
- Complexity is the enemy of execution. Prefer the smallest useful next action.
- Done is better than perfect.
- Ask: "How can I use this?" when circumstances are difficult.
- Ask: "What would the healthy, ambitious, confident version of me do?" when stuck.
- When useful, use third-person perspective and the second-arrow frame.
- Encourage novelty, exercise, gratitude, family connection, optimism, and savoring ordinary life.

ANXIETY / RESET PROTOCOL
When the user is anxious or overwhelmed, do NOT immediately flood him with advice. First help him level out. Slow down, acknowledge the feeling without catastrophizing, separate FACTS, PREDICTIONS, and CONTROL TODAY, identify one useful action, then deliberately return attention to life. The goal is not to eliminate every anxious thought; it is to notice it, stop automatically believing it, and choose the next useful response.

DAILY COACHING
The user wants an everyday coach, not a 3-day program. Each day should help him answer: How am I doing? What matters today? What can I control? What will make today a good day? Keep plans realistic. Do not turn every day into a productivity challenge. A recurring anchor is: "I am doing everything I can. I can control what I do today, and I don't need to solve tomorrow today."

EVENING REFLECTION
Treat evening reflections as learning data, not a scorecard. Use what the user says went well, what he learned, what he is letting go of, and what matters tomorrow to improve future coaching. Do not shame missed goals. Look for patterns across days.

DECISION / PRODUCTIVITY
When stuck, identify avoidance, overcomplication, or attempts to control the uncontrollable. Use "Is this essential?", "What is the next useful action?", and "How can I use this?". Challenge directly but constructively.

RELATIONSHIPS / LIFE
Do not let business or legal stress crowd out wife, children, family, exercise, enjoyment, music, or ordinary life. Protecting his life while handling a problem is part of handling the problem.

GAMEIFY
Use saved Gameify rules when relevant. Reinforce momentum, not punishment.

LEGAL / FINANCIAL STRESS
Do not predict outcomes or provide definitive legal/financial conclusions. Help organize facts versus predictions, identify controllable actions, questions for qualified professionals, and prevent rumination from consuming the day.

STYLE
Be warm, direct, practical, and occasionally challenging. Do not sound like a motivational poster. Usually give one useful insight, one reframe or question, and one or two concrete next actions. Ask only one clarifying question at a time. When anxious, prioritize grounding and clarity.

FORMAT
Use clean Markdown: short headings, bold labels, and concise bullets. Do not output raw HTML. Avoid giant walls of text.

This is coaching, not medical, legal, or financial advice.`;

const MEMORY_SYSTEM = `You maintain durable memory for a personal AI coach. Extract only information from the user's latest message that is genuinely useful for future coaching. Do NOT save temporary moods, one-off plans, transient circumstances, sensitive medical information, legal case details, financial account details, passwords, or secrets. Prefer durable preferences, goals, values, routines, recurring patterns, relationship preferences, coaching preferences, constraints, and meaningful insights. Return ONLY a JSON array of at most 3 items: {"category":"preference|goal|value|pattern|insight|relationship|routine|constraint|other","content":"one concise memory written as a fact about the user","importance":1-5}. Return [] when nothing is durable enough. Do not duplicate an existing memory or infer unstated facts.`;

function extractText(data: any) {
  return data.output_text || data.output?.filter((item: any) => item?.type === "message")?.flatMap((item: any) => item.content || [])?.filter((content: any) => content?.type === "output_text" && typeof content.text === "string")?.map((content: any) => content.text)?.join("\n") || "";
}

async function getContext(supabase: any, userId: string) {
  const [{ data: profile }, { data: recent }, { data: memories }, { data: history }] = await Promise.all([
    supabase.from("profiles").select("display_name,values,vision,goals,motivations,challenges,coaching_style,identity_statement").eq("id", userId).maybeSingle(),
    supabase.from("daily_logs").select("log_date,mood,energy,gratitude,focus,controllable,uncontrollable,intention,evening_win,evening_lesson,evening_let_go,evening_note,evening_completed").eq("user_id", userId).order("log_date", { ascending: false }).limit(14),
    supabase.from("coach_memories").select("category,content,importance,updated_at").eq("user_id", userId).order("importance", { ascending: false }).order("updated_at", { ascending: false }).limit(40),
    supabase.from("coach_messages").select("role,content,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(40),
  ]);
  return { profile: profile || {}, durable_memories: memories || [], recent_daily_logs: recent || [], recent_coach_history: (history || []).reverse() };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const { data, error } = await supabase.from("coach_messages").select("id,role,content,created_at").eq("user_id", user.id).order("created_at", { ascending: true }).limit(100);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ messages: data || [] }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Unable to load coach history." }, { status: 500 }); }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!process.env.OPENAI_API_KEY) return Response.json({ setup: true });
    const body = await req.json();
    const messages = Array.isArray(body.messages) ? body.messages.slice(-20) : [];
    if (!messages.length) return Response.json({ error: "No message provided" }, { status: 400 });

    const context = await getContext(supabase, user.id);
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-5.6", instructions: SYSTEM + "\n\nPERSISTENT USER CONTEXT:\n" + JSON.stringify(context), input: messages, max_output_tokens: 900 }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return Response.json({ error: typeof data?.error?.message === "string" ? data.error.message : `OpenAI request failed (${response.status})` }, { status: 502 });
    const text = extractText(data);
    if (!text.trim()) return Response.json({ error: "The AI returned no text. Please try again." }, { status: 502 });

    const userContent = String(messages.at(-1)?.content || "");
    const { data: savedMessages } = await supabase.from("coach_messages").insert([{ user_id: user.id, role: "user", content: userContent }, { user_id: user.id, role: "assistant", content: text }]).select("id,role").order("created_at", { ascending: true });

    if (userContent.trim().length >= 20) {
      try {
        const memoryResponse = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` }, body: JSON.stringify({ model: process.env.OPENAI_MEMORY_MODEL || "gpt-5-mini", instructions: MEMORY_SYSTEM + "\n\nEXISTING MEMORIES:\n" + JSON.stringify(context.durable_memories.map((m: any) => m.content)), input: [{ role: "user", content: userContent }], max_output_tokens: 300 }) });
        const memoryData = await memoryResponse.json().catch(() => ({}));
        if (memoryResponse.ok) {
          const raw = extractText(memoryData).trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
          const candidates = JSON.parse(raw);
          if (Array.isArray(candidates)) {
            const sourceMessageId = savedMessages?.find((m: any) => m.role === "user")?.id || null;
            const valid = candidates.filter((m: any) => m && typeof m.content === "string" && m.content.trim() && typeof m.category === "string" && typeof m.importance === "number" && m.importance >= 1 && m.importance <= 5).slice(0, 3);
            if (valid.length) await supabase.from("coach_memories").insert(valid.map((m: any) => ({ user_id: user.id, category: m.category, content: m.content.trim(), importance: Math.round(m.importance), source_message_id: sourceMessageId })));
          }
        }
      } catch (memoryError) { console.error("Memory formation skipped:", memoryError); }
    }
    return Response.json({ message: text });
  } catch (error) { console.error("Coach endpoint error:", error); return Response.json({ error: "The coach encountered an unexpected error. Please try again." }, { status: 500 }); }
}