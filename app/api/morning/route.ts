import { createClient } from "@/lib/supabase/server";

const MORNING_SYSTEM = `You are the user's morning coach. Build a realistic, energizing plan for TODAY using the user's long-term profile, durable memories, recent daily logs, and recent coaching history.

The purpose is not maximum productivity. The purpose is to make today a genuinely good day while moving the user's life forward.

Priorities:
- Start with the person's current state, not an idealized schedule.
- Keep the plan small: one BODY action, one MIND action, one IMPORTANT action, and one RELATIONSHIP/LIFE action.
- If the user is under unusual stress, explicitly prevent the stressful issue from consuming the whole day. Separate what can be handled today from what cannot.
- Include the user's recurring anchor when appropriate: "I am doing everything I can. I can control what I do today, and I don't need to solve tomorrow today."
- Encourage exercise, meditation/quiet time, gratitude, family connection, music, novelty, enjoyment, and focused work when appropriate.
- Use the user's principles naturally: control what you can control, facts vs predictions, second arrow, love rather than fear, complexity is the enemy of execution, and "How can I use this?"
- Do not give a giant to-do list.
- Do not manufacture certainty about legal, financial, medical, or other high-stakes matters.
- Do not repeat generic motivational language.

Return a concise plan with exactly these sections:
1. MORNING READ — 1-2 sentences about what the user most needs today.
2. TODAY'S ANCHOR — one sentence.
3. BODY — one concrete action.
4. MIND — one concrete action.
5. IMPORTANT — one concrete action that moves life/business/obligations forward.
6. LIFE — one concrete action involving family, enjoyment, connection, or being present.
7. LET GO OF — one thing the user should deliberately stop trying to solve/control today.
8. FIRST MOVE — the single action to do in the next 30 minutes.

Be direct, warm, and personal. The user should finish reading knowing exactly what to do first.`;

function extractText(data: any) {
  return data.output_text || data.output
    ?.filter((item: any) => item?.type === "message")
    ?.flatMap((item: any) => item.content || [])
    ?.filter((content: any) => content?.type === "output_text" && typeof content.text === "string")
    ?.map((content: any) => content.text)
    ?.join("\n") || "";
}

function buildItems(text: string) {
  const sections = [
    ["body", "BODY"],
    ["mind", "MIND"],
    ["important", "IMPORTANT"],
    ["life", "LIFE"],
  ] as const;
  return sections.map(([id, heading]) => {
    const match = text.match(new RegExp(`(?:^|\\n)\\s*(?:\\d+\\.\\s*)?${heading}\\s*[—:-]\\s*(.+?)(?=\\n\\s*(?:\\d+\\.\\s*)?(?:BODY|MIND|IMPORTANT|LIFE|LET GO OF|FIRST MOVE)\\s*[—:-]|$)`, "is"));
    return { id, title: heading, detail: (match?.[1] || "").trim(), completed: false };
  }).filter(item => item.detail);
}

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!process.env.OPENAI_API_KEY) return Response.json({ setup: true });

    const [{ data: profile }, { data: recent }, { data: memories }, { data: history }] = await Promise.all([
      supabase.from("profiles").select("display_name,values,vision,goals,motivations,challenges,coaching_style,identity_statement").eq("id", user.id).maybeSingle(),
      supabase.from("daily_logs").select("log_date,mood,energy,gratitude,focus,controllable,uncontrollable,intention").eq("user_id", user.id).order("log_date", { ascending: false }).limit(7),
      supabase.from("coach_memories").select("category,content,importance,updated_at").eq("user_id", user.id).order("importance", { ascending: false }).order("updated_at", { ascending: false }).limit(40),
      supabase.from("coach_messages").select("role,content,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(24),
    ]);

    const context = JSON.stringify({ today: new Date().toISOString().slice(0, 10), profile: profile || {}, durable_memories: memories || [], recent_daily_logs: recent || [], recent_coach_history: (history || []).reverse() });

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-5.6", instructions: MORNING_SYSTEM + "\n\nPERSISTENT USER CONTEXT:\n" + context, input: [{ role: "user", content: "It is morning. Build my plan for today based on what you know about me." }], max_output_tokens: 750 }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = typeof data?.error?.message === "string" ? data.error.message : `OpenAI request failed (${response.status})`;
      return Response.json({ error: detail }, { status: 502 });
    }

    const text = extractText(data);
    if (!text.trim()) return Response.json({ error: "The morning coach returned no text. Please try again." }, { status: 502 });

    const items = buildItems(text);
    const today = new Date().toISOString().slice(0, 10);
    const { error: planError } = await supabase.from("daily_plans").upsert({ user_id: user.id, plan_date: today, title: "Today's Plan", items, source: "morning-coach", updated_at: new Date().toISOString() }, { onConflict: "user_id,plan_date" });
    if (planError) console.error("Daily plan save error:", planError);

    return Response.json({ message: text, plan: { plan_date: today, title: "Today's Plan", items } });
  } catch (error) {
    console.error("Morning coach error:", error);
    return Response.json({ error: "The morning coach encountered an unexpected error." }, { status: 500 });
  }
}
