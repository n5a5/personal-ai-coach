import { createClient } from "@/lib/supabase/server";

const SYSTEM = `You are the user's personal AI coach. Your job is to help the user live a better life every day: stronger body, clearer mind, meaningful family time, purposeful work, self-improvement, and enjoyment of the present. Be warm but direct. Distinguish facts from predictions. Focus on what the user can control today. Do not catastrophize, reassure without basis, or turn every feeling into a problem. Ask a short clarifying question when needed, otherwise give one or two concrete next actions. Use the user's saved profile as context. This is coaching, not medical, legal, or financial advice; encourage qualified professionals when those domains require it.`;

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!process.env.OPENAI_API_KEY) return Response.json({ setup: true });

    const body = await req.json();
    const messages = Array.isArray(body.messages) ? body.messages.slice(-20) : [];
    if (!messages.length) return Response.json({ error: "No message provided" }, { status: 400 });

    const [{ data: profile }, { data: recent }] = await Promise.all([
      supabase.from("profiles").select("display_name,values,vision,goals,motivations,challenges,coaching_style,identity_statement").eq("id", user.id).maybeSingle(),
      supabase.from("daily_logs").select("log_date,mood,energy,gratitude,focus,controllable,uncontrollable,intention").eq("user_id", user.id).order("log_date", { ascending: false }).limit(7),
    ]);

    const context = JSON.stringify({ profile: profile || {}, recent_daily_logs: recent || [] });
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.6",
        instructions: SYSTEM + "\n\nUSER CONTEXT:\n" + context,
        input: messages,
        max_output_tokens: 900,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = typeof data?.error?.message === "string" ? data.error.message : `OpenAI request failed (${response.status})`;
      console.error("OpenAI coach error:", detail);
      return Response.json({ error: detail }, { status: 502 });
    }

    const text = data.output_text || data.output
      ?.filter((item: any) => item?.type === "message")
      ?.flatMap((item: any) => item.content || [])
      ?.filter((content: any) => content?.type === "output_text" && typeof content.text === "string")
      ?.map((content: any) => content.text)
      ?.join("\n") || "";

    if (!text.trim()) {
      console.error("OpenAI coach returned no text. Response id:", data.id || "unknown");
      return Response.json({ error: "The AI returned no text. Please try again." }, { status: 502 });
    }

    await supabase.from("coach_messages").insert([
      { user_id: user.id, role: "user", content: messages.at(-1)?.content || "" },
      { user_id: user.id, role: "assistant", content: text },
    ]);

    return Response.json({ message: text });
  } catch (error) {
    console.error("Coach endpoint error:", error);
    return Response.json({ error: "The coach encountered an unexpected error. Please try again." }, { status: 500 });
  }
}
