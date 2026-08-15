import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase.from("daily_plans").select("id,plan_date,title,items,source,updated_at").eq("user_id", user.id).eq("plan_date", today).maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ plan: data || null });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const itemId = typeof body.itemId === "string" ? body.itemId : "";
  const completed = Boolean(body.completed);
  if (!itemId) return Response.json({ error: "itemId is required" }, { status: 400 });
  const today = new Date().toISOString().slice(0, 10);
  const { data: plan, error: fetchError } = await supabase.from("daily_plans").select("id,items").eq("user_id", user.id).eq("plan_date", today).maybeSingle();
  if (fetchError) return Response.json({ error: fetchError.message }, { status: 500 });
  if (!plan) return Response.json({ error: "No plan exists for today" }, { status: 404 });
  const items = Array.isArray(plan.items) ? plan.items : [];
  const nextItems = items.map((item: any) => item?.id === itemId ? { ...item, completed } : item);
  const { data, error } = await supabase.from("daily_plans").update({ items: nextItems, updated_at: new Date().toISOString() }).eq("id", plan.id).eq("user_id", user.id).select("id,plan_date,title,items,source,updated_at").single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ plan: data });
}
