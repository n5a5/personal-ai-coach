import { createClient } from "@/lib/supabase/server";

function extractText(data: any) {
  return data.output_text || data.output?.filter((item: any) => item?.type === "message")?.flatMap((item: any) => item.content || [])?.filter((c: any) => c?.type === "output_text")?.map((c: any) => c.text)?.join("\n") || "";
}

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!process.env.OPENAI_API_KEY) return Response.json({ setup: true, error: "OpenAI is not configured." }, { status: 503 });

    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    const date = (d: Date) => d.toISOString().slice(0, 10);
    const startDate = date(start);
    const endDate = date(end);

    const [{ data: logs }, { data: txs }, { data: plans }, { data: memories }] = await Promise.all([
      supabase.from("daily_logs").select("log_date,mood,energy,gratitude,focus,controllable,uncontrollable,intention,evening_win,evening_lesson,evening_let_go,evening_note,evening_completed").eq("user_id", user.id).gte("log_date", startDate).lte("log_date", endDate).order("log_date"),
      supabase.from("point_transactions").select("amount,reason,created_at").eq("user_id", user.id).gte("created_at", `${startDate}T00:00:00`).order("created_at"),
      supabase.from("daily_plans").select("plan_date,items").eq("user_id", user.id).gte("plan_date", startDate).lte("plan_date", endDate).order("plan_date"),
      supabase.from("coach_memories").select("category,content,importance").eq("user_id", user.id).order("importance", { ascending: false }).limit(20),
    ]);

    const context = { period: { start: startDate, end: endDate }, daily_logs: logs || [], point_transactions: txs || [], daily_plans: plans || [], relevant_memories: memories || [] };
    const instructions = `You are the user's long-term personal AI coach. Review the last 7 days as behavioral data, not a grade. Be direct, warm, practical, and specific. Identify only patterns supported by the data. Do not diagnose or shame. Return ONLY valid JSON with this shape: {"headline":"one sentence","wins":["..."],"patterns":["..."],"friction":["..."],"next_week":["..."],"one_focus":"one highest-leverage focus for next week"}. Keep each list to at most 3 short items. Prefer concrete behavior over generic motivation.`;
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-5.6", instructions, input: [{ role: "user", content: JSON.stringify(context) }], max_output_tokens: 900 }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return Response.json({ error: data?.error?.message || "Weekly review failed." }, { status: 502 });
    const raw = extractText(data).trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    const review = JSON.parse(raw);
    if (review.one_focus) {
      await supabase.from("coach_memories").insert({ user_id: user.id, category: "weekly_focus", content: `Weekly coaching focus: ${review.one_focus}`, importance: 5 });
    }
    return Response.json({ review, period: { start: startDate, end: endDate } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Weekly review error:", error);
    return Response.json({ error: "Unable to generate the weekly review." }, { status: 500 });
  }
}
