import { createClient } from "@/lib/supabase/server";

const FALLBACK_ITEMS = [
  { id: "move", text: "Move your body — choose the workout that makes today better.", completed: false },
  { id: "mind", text: "Protect your mind — take a deliberate reset or quiet 5 minutes.", completed: false },
  { id: "family", text: "Be present with family — give them your full attention for one meaningful moment.", completed: false },
  { id: "growth", text: "Move one important thing forward — choose the uncomfortable action that matters.", completed: false },
];

function validDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return value;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const planDate = validDate(url.searchParams.get("date")) || new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("daily_plans")
    .select("id,plan_date,title,items,source,updated_at")
    .eq("user_id", user.id)
    .eq("plan_date", planDate)
    .maybeSingle();

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
  const text = typeof body.text === "string" ? body.text : "";
  const planDate = validDate(body.date) || new Date().toISOString().slice(0, 10);

  if (!itemId) return Response.json({ error: "itemId is required" }, { status: 400 });

  const { data: plan, error: fetchError } = await supabase
    .from("daily_plans")
    .select("id,items")
    .eq("user_id", user.id)
    .eq("plan_date", planDate)
    .maybeSingle();

  if (fetchError) return Response.json({ error: fetchError.message }, { status: 500 });

  let nextItems: any[];
  if (!plan) {
    nextItems = FALLBACK_ITEMS.map(item => ({ ...item }));
    const fallbackIndex = nextItems.findIndex(item => item.id === itemId);
    if (fallbackIndex >= 0) nextItems[fallbackIndex].completed = completed;
    else nextItems.push({ id: itemId, text: text || itemId, completed });

    const { data, error } = await supabase
      .from("daily_plans")
      .insert({ user_id: user.id, plan_date: planDate, title: "Today's Plan", items: nextItems, source: "fallback" })
      .select("id,plan_date,title,items,source,updated_at")
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ plan: data });
  }

  const items = Array.isArray(plan.items) && plan.items.length ? plan.items : FALLBACK_ITEMS.map(item => ({ ...item }));
  const existingIndex = items.findIndex((item: any) => item?.id === itemId);
  if (existingIndex >= 0) {
    items[existingIndex] = { ...items[existingIndex], completed };
  } else {
    items.push({ id: itemId, text: text || itemId, completed });
  }
  nextItems = items;

  const { data, error } = await supabase
    .from("daily_plans")
    .update({ items: nextItems, updated_at: new Date().toISOString() })
    .eq("id", plan.id)
    .eq("user_id", user.id)
    .select("id,plan_date,title,items,source,updated_at")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ plan: data });
}
