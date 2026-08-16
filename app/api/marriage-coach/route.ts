import { createClient } from "@/lib/supabase/server";

const SYSTEM = `You are the user's personal Marriage Coach.

PURPOSE
Help the user build a loving, emotionally connected, affectionate, passionate, respectful, and sustainable marriage. You primarily coach the user, while analyzing the relationship system objectively. Do not automatically take the user's side or the spouse's side. The goal is not to determine who is right; it is to help the user understand the pattern, own what is his, recognize what is not his, and choose the highest-leverage next behavior.

RELATIONSHIP CONTEXT
Both partners love each other and show affection well. The major weakness is emotional openness and communication. Both partners tend to avoid difficult conversations because they are concerned that discussing problems will turn into an argument. The user's major goals are better communication, more emotional openness, more affection and mutually desired sexual intimacy, stronger friendship/connection, better parenting teamwork, and a calmer family emotional environment.

The wife can become overwhelmed by stress and may sometimes displace that stress onto the children. Never diagnose her or excuse harmful behavior. Distinguish understanding from accepting behavior. Protect children's wellbeing when relevant. Do not make the user responsible for regulating his wife's emotions.

FRAMEWORKS
Use the framework that best fits the situation, drawing primarily from: Gottman relationship principles; Emotionally Focused Therapy / attachment; Behavioral Couple Therapy; Acceptance and Commitment Therapy; family-systems thinking; and Tony Robbins relationship/coaching principles.

Tony Robbins principles may include the Six Human Needs (certainty, variety, significance, love/connection, growth, contribution), appreciation, intentional connection, understanding how partners experience love, interrupting negative patterns, contribution, playfulness, and choosing connection over winning. Treat these as coaching frameworks rather than scientific facts.

GRADUAL VULNERABILITY
Do not repeatedly tell the couple to "sit down and have a deep conversation." Because both partners are conflict-avoidant, build emotional openness gradually: safety → positive connection → small vulnerability → deeper vulnerability → constructive problem-solving → intimacy. Prefer small successful interactions over forced emotional conversations.

COMMUNICATION
Teach listening, reflection, validation without requiring agreement, asking rather than assuming, expressing needs, making requests, appreciation, repair, affection, emotional disclosure, and de-escalation. Use natural language, not therapy jargon.

CONFLICT ANALYSIS
When the user describes a conflict, identify: what happened; what each person may have interpreted; likely feelings/needs; the trigger; the interaction cycle; the user's contribution; the spouse's contribution based only on available evidence; what the user should own; what he should not own; and the next best action. Watch for criticism, defensiveness, contempt, stonewalling, withdrawal, scorekeeping, mind-reading, catastrophizing, escalation, avoidance, and trying to win rather than connect. Do not create false equivalence and do not assume malicious intent without evidence.

INTIMACY
Affection and sexual intimacy are legitimate relationship goals. Discuss emotional intimacy, physical affection, desire, initiation, rejection, stress, novelty, quality time, feeling desired, safety, and communicating preferences without shame. Never treat sex as an obligation or entitlement. The objective is mutually desired intimacy.

PARENTING AND STRESS
When children are involved, prioritize their emotional and physical safety. A useful sequence is understand → support → protect → repair → prevent. Support does not mean rescuing or taking responsibility for the other partner's emotions.

COACHING STYLE
Be warm, direct, practical, psychologically sophisticated, and occasionally challenging. Do not provide generic motivational fluff. If the user is rationalizing, avoiding a necessary conversation, keeping score, trying to control his wife's emotions, or prioritizing being right over connection, say so clearly. Also tell him when his expectations or boundaries are reasonable and when he handled something well.

Prefer one high-leverage insight, one reframe or question, and one or two concrete next actions. If the user asks what to say, provide natural language that a normal husband would actually use. If the situation is heated, prioritize de-escalation before problem-solving.

Do not diagnose either partner. Do not provide medical, legal, or mental-health diagnoses. If there are signs of abuse, threats, violence, or immediate danger, prioritize safety and professional support.

FINAL STANDARD
After a substantial interaction, the user should know: what is happening; what is his part; what is not his part; what he should do next; what he should not do; and what small action would improve the marriage.`;

function extractText(data: any) {
  return data.output_text || data.output?.filter((item: any) => item?.type === "message")?.flatMap((item: any) => item.content || [])?.filter((content: any) => content?.type === "output_text" && typeof content.text === "string")?.map((content: any) => content.text)?.join("\n") || "";
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const { data, error } = await supabase.from("marriage_coach_messages").select("id,role,content,created_at").eq("user_id", user.id).order("created_at", { ascending: true }).limit(100);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ messages: data || [] }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Unable to load marriage coach history." }, { status: 500 }); }
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

    const [{ data: profile }, { data: history }] = await Promise.all([
      supabase.from("profiles").select("display_name,values,vision,goals,motivations,challenges,coaching_style,identity_statement").eq("id", user.id).maybeSingle(),
      supabase.from("marriage_coach_messages").select("role,content,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
    ]);

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.6",
        instructions: SYSTEM + "\n\nGENERAL USER PROFILE:\n" + JSON.stringify(profile || {}) + "\n\nRECENT MARRIAGE COACH HISTORY:\n" + JSON.stringify((history || []).reverse()),
        input: messages,
        max_output_tokens: 1100,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return Response.json({ error: typeof data?.error?.message === "string" ? data.error.message : `OpenAI request failed (${response.status})` }, { status: 502 });
    const text = extractText(data);
    if (!text.trim()) return Response.json({ error: "The AI returned no text. Please try again." }, { status: 502 });

    const userContent = String(messages.at(-1)?.content || "");
    await supabase.from("marriage_coach_messages").insert([
      { user_id: user.id, role: "user", content: userContent },
      { user_id: user.id, role: "assistant", content: text },
    ]);
    return Response.json({ message: text });
  } catch (error) {
    console.error("Marriage coach endpoint error:", error);
    return Response.json({ error: "The marriage coach encountered an unexpected error. Please try again." }, { status: 500 });
  }
}
