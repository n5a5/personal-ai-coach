import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const requestedDate = url.searchParams.get("date");
    const date = requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
      ? requestedDate
      : new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("daily_logs")
      .select("evening_completed")
      .eq("user_id", user.id)
      .eq("log_date", date)
      .maybeSingle();

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ completed: Boolean(data?.evening_completed) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Unable to load evening status." }, { status: 500 });
  }
}
