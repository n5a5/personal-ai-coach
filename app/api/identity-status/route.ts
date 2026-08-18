import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const date = url.searchParams.get("date") || new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
  const { data, error } = await supabase
    .from("identity_loops")
    .select("identity_title,commitment,commitment_result")
    .eq("user_id", user.id)
    .eq("loop_date", date)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ identity: data || null });
}
