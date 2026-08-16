import { createClient } from "@/lib/supabase/server";

const MORNING_SYSTEM = `You are the user's morning coach. Build a realistic, energizing plan for TODAY using the user's long-term profile, durable memories, recent daily logs, recent evening reflections, identity-loop history, recent coaching history, and recent daily-plan completion history.

The purpose is not maximum productivity. The purpose is to make today a genuinely good day while moving the user's life forward.

Priorities:
- Start with the person's current state, not an idealized schedule.
- Treat the behavioral insight from the previous day as feedback, not a verdict. Use it to make today's plan more concrete and adaptive.
- Use the previous evening reflection as behavioral feedback. If the user identified a lesson, let-go item, or priority, carry it forward naturally when relevant.
- Use the identity loop as an identity-to-action bridge. If recent entries show a repeated identity or a specific proof commitment, make today's plan include a small action that can create evidence for that identity. Do not turn the identity exercise into a score or a guilt mechanism.
- Keep the plan small: one BODY action, one MIND action, one IMPORTANT action, and one RELATIONSHIP/LIFE action.
- Use recent completion history as behavioral feedback. Notice patterns without judging them. If the user repeatedly completes some categories and misses another, make that category easier, more concrete, or more realistic rather than simply repeating the same instruction.
- If yesterday was incomplete, do not frame it as failure. Extract one useful lesson and adjust today's plan.
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

const INSIGHT_SYSTEM = `You are the behavioral analyst inside a personal coaching app. Analyze the user's most recent completed day using their planned actions, what they actually completed, and their evening reflection. Produce exactly ONE concise behavioral insight (1-2 sentences, max 45 words).

Identify a useful pattern about what helped, what got in the way, or what should change tomorrow. Prefer specific evidence over motivational language. Never shame the user. Do not diagnose. Do not make unsupported claims. If evidence is weak, say what is tentatively suggested rather than pretending certainty.`;

const FALLBACK_ITEMS = [
  { id: "body", title: "BODY", detail: "Move your body — choose the workout that makes today better.", completed: false },
  { id: "mind", title: "MIND", detail: "Protect your mind — take a deliberate reset or quiet 5 minutes.", completed: false },
  { id: "important", title: "IMPORTANT", detail: "Move one important thing forward — choose the uncomfortable action that matters.", completed: false },
  { id: "life", title: "LIFE", detail: "Be present with family — give them your full attention for one meaningful moment.", completed: false },
];

function extractText(data: any) {
  return data.output_text || data.output?.filter((item: any) => item?.type === "message")?.flatMap((item: any) => item.content || [])?.filter((content: any) => content?.type === "output_text" && typeof content.text === "string")?.map((content: any) => content.text)?.join("\n") || "";
}

function buildItems(text: string) {
  const sections = [["body", "BODY"], ["mind", "MIND"], ["important", "IMPORTANT"], ["life", "LIFE"]] as const;
  const generated = sections.map(([id, heading]) => {
    const match = text.match(new RegExp(`(?:^|\\n)\\s*(?:\\d+\\.\\s*)?${heading}\\s*[—:-]\\s*(.+?)(?=\\n\\s*(?:\\d+\\.\\s*)?(?:BODY|MIND|IMPORTANT|LIFE|LET GO OF|FIRST MOVE)\\s*[—:-]|$)`, "is"));
    return { id, title: heading, detail: (match?.[1] || "").trim(), completed: false };
  });
  return generated.map((item, index) => ({ ...item, detail: item.detail || FALLBACK_ITEMS[index].detail }));
}

function completionSummary(plans: any[]) {
  return plans.map(plan => {
    const items = Array.isArray(plan.items) ? plan.items : [];
    const completed = items.filter((item: any) => Boolean(item?.completed ?? item?.done)).length;
    return { date: plan.plan_date, completed, total: items.length, percent: items.length ? Math.round((completed / items.length) * 100) : 0, items: items.map((item: any) => ({ category: item?.id, completed: Boolean(item?.completed ?? item?.done), text: item?.detail || item?.text || item?.title || "" })) };
  });
}

async function generateBehavioralInsight(context: string) {
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-5.6", instructions: INSIGHT_SYSTEM, input: [{ role: "user", content: "Analyze this recent-day coaching context and return one behavioral insight:\n" + context }], max_output_tokens: 120 }),
    });
    if (!response.ok) return "";
    return extractText(await response.json().catch(() => ({}))).trim();
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!process.env.OPENAI_API_KEY) return Response.json({ setup: true });

    const body = await request.json().catch(() => ({}));
    const requestedDate = typeof body?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : null;
    const today = requestedDate || new Date().toISOString().slice(0, 10);

    const [{ data: profile }, { data: recent }, { data: memories }, { data: history }, { data: recentPlans }, { data: existingToday }, { data: identityLoops }] = await Promise.all([
      supabase.from("profiles").select("display_name,values,vision,goals,motivations,challenges,coaching_style,identity_statement").eq("id", user.id).maybeSingle(),
      supabase.from("daily_logs").select("log_date,mood,energy,gratitude,focus,controllable,uncontrollable,intention,evening_win,evening_lesson,evening_let_go,evening_note,evening_completed,evening_positive_loops").eq("user_id", user.id).order("log_date", { ascending: false }).limit(7),
      supabase.from("coach_memories").select("category,content,importance,updated_at").eq("user_id", user.id).order("importance", { ascending: false }).order("updated_at", { ascending: false }).limit(40),
      supabase.from("coach_messages").select("role,content,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(24),
      supabase.from("daily_plans").select("plan_date,title,items,source,updated_at").eq("user_id", user.id).order("plan_date", { ascending: false }).limit(7),
      supabase.from("daily_plans").select("id,items").eq("user_id", user.id).eq("plan_date", today).maybeSingle(),
      supabase.from("identity_loops").select("loop_date,identity_key,identity_title,repetitions,proof").eq("user_id", user.id).order("loop_date", { ascending: false }).limit(21),
    ]);

    const contextData = { today, profile: profile || {}, durable_memories: memories || [], recent_daily_logs: recent || [], identity_loop_history: identityLoops || [], recent_coach_history: (history || []).reverse(), recent_daily_plan_completion: completionSummary(recentPlans || []) };
    const context = JSON.stringify(contextData);
    const behavioralInsight = await generateBehavioralInsight(context);

    if (behavioralInsight) {
      await supabase.from("coach_memories").delete().eq("user_id", user.id).eq("category", "behavioral_insight").eq("source", "evening-reflection");
      await supabase.from("coach_memories").insert({ user_id: user.id, category: "behavioral_insight", content: behavioralInsight, source: "evening-reflection", importance: 7 });
    }

    const enhancedContext = JSON.stringify({ ...contextData, latest_behavioral_insight: behavioralInsight || null });

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-5.6", instructions: MORNING_SYSTEM + "\n\nPERSISTENT USER CONTEXT:\n" + enhancedContext, input: [{ role: "user", content: "It is morning. Build my plan for today based on what you know about me, including what I learned, what I actually followed through on recently, and the identity I am practicing." }], max_output_tokens: 750 }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = typeof data?.error?.message === "string" ? data.error.message : `OpenAI request failed (${response.status})`;
      return Response.json({ error: detail }, { status: 502 });
    }

    const text = extractText(data);
    if (!text.trim()) return Response.json({ error: "The morning coach returned no text. Please try again." }, { status: 502 });

    const generatedItems = buildItems(text);
    const previousItems = Array.isArray(existingToday?.items) && existingToday.items.length ? existingToday.items : [];
    const items = generatedItems.map(item => {
      const previous = previousItems.find((old: any) => old?.id === item.id);
      return previous ? { ...item, completed: Boolean(previous.completed ?? previous.done) } : item;
    });

    const { error: planError } = await supabase.from("daily_plans").upsert({ user_id: user.id, plan_date: today, title: "Today's Plan", items, source: "morning-coach", updated_at: new Date().toISOString() }, { onConflict: "user_id,plan_date" });
    if (planError) console.error("Daily plan save error:", planError);

    return Response.json({ message: text, behavioralInsight, plan: { plan_date: today, title: "Today's Plan", items } });
  } catch (error) {
    console.error("Morning coach error:", error);
    return Response.json({ error: "The morning coach encountered an unexpected error." }, { status: 500 });
  }
}
