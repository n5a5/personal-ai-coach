import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const [{ data: profile }, { data: memories }, { data: logs }, { data: loops }, { data: messages }] = await Promise.all([
      supabase.from("profiles").select("display_name,values,vision,goals,motivations,challenges,coaching_style,identity_statement").eq("id", user.id).maybeSingle(),
      supabase.from("coach_memories").select("category,content,importance,updated_at,source").eq("user_id", user.id).order("importance", { ascending: false }).order("updated_at", { ascending: false }).limit(100),
      supabase.from("daily_logs").select("log_date,mood,energy,gratitude,focus,controllable,uncontrollable,intention,evening_win,evening_lesson,evening_let_go,evening_note,evening_completed").eq("user_id", user.id).order("log_date", { ascending: false }).limit(14),
      supabase.from("identity_loops").select("loop_date,identity_key,identity_title,repetitions,proof,updated_at").eq("user_id", user.id).order("loop_date", { ascending: false }).limit(30),
      supabase.from("coach_messages").select("role,content,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
    ]);

    const grouped = { identity: [], goal: [], pattern: [], experiment: [], lesson: [] } as Record<string, any[]>;
    for (const memory of memories || []) {
      if (grouped[memory.category]) grouped[memory.category].push(memory);
    }

    return Response.json({
      generated_at: new Date().toISOString(),
      profile: profile || {},
      coaching_memory: grouped,
      recent_daily_logs: logs || [],
      identity_loop_history: loops || [],
      recent_coach_history: (messages || []).reverse(),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Coaching context error:", error);
    return Response.json({ error: "Unable to load coaching context." }, { status: 500 });
  }
}
