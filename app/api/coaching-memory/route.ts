import { createClient } from "@/lib/supabase/server";

const ALLOWED_CATEGORIES = new Set(["identity", "goal", "pattern", "experiment", "lesson"]);

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const items = Array.isArray(body?.items) ? body.items.slice(0, 10) : [];
    const valid = items.filter((item: any) =>
      item && ALLOWED_CATEGORIES.has(item.category) &&
      typeof item.content === "string" && item.content.trim().length > 0 &&
      item.content.trim().length <= 500
    );

    if (!valid.length) return Response.json({ synced: 0 });

    const existing = await supabase
      .from("coach_memories")
      .select("category,content")
      .eq("user_id", user.id)
      .limit(200);

    const existingSet = new Set((existing.data || []).map((m: any) => `${m.category}|${m.content.trim().toLowerCase()}`));
    const newItems = valid.filter((item: any) => !existingSet.has(`${item.category}|${item.content.trim().toLowerCase()}`));

    if (!newItems.length) return Response.json({ synced: 0 });

    const { error } = await supabase.from("coach_memories").insert(
      newItems.map((item: any) => ({
        user_id: user.id,
        category: item.category,
        content: item.content.trim(),
        importance: typeof item.importance === "number" ? Math.max(1, Math.min(5, Math.round(item.importance))) : 4,
        source: "chatgpt-coaching-sync",
      }))
    );

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ synced: newItems.length });
  } catch (error) {
    console.error("Coaching memory sync error:", error);
    return Response.json({ error: "Unable to sync coaching memory." }, { status: 500 });
  }
}
