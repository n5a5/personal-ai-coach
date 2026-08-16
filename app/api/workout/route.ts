import { createClient } from "@/lib/supabase/server";

const SYSTEM = `You are an evidence-informed workout coach inside a personal AI coaching app.

PROGRAMMING FOUNDATION
- Use current ACSM resistance-training principles as the primary framework and NSCA programming principles as a secondary framework.
- Match exercise selection, volume, repetitions, effort, rest, and structure to the user's time, target, equipment, goal, and recent training.
- Prefer simple, repeatable movements with clear progression over novelty.
- A short workout should be a useful minimum dose, not a falsely compressed full program.
- Respect recovery: if recent training shows a muscle group was trained hard recently, reduce or avoid unnecessary repeat volume unless the user specifically asks for it.
- For bodyweight/no-equipment sessions, use scalable movements such as push-ups, squats, split squats, lunges, hinges, glute bridges, rows only when a safe anchor is available, planks, dead bugs, carries only when an object is available, and conditioning intervals.
- Never invent equipment. Bodyweight means no weights are available.
- For time-limited workouts, include transitions/rest in the time budget. Be realistic.
- Give progression guidance so future sessions can build from the current one.
- Do not diagnose injuries. If the user reports pain or a medical limitation, avoid prescribing through it and recommend appropriate professional guidance.

TIME RULES
5 min: one or two movements, minimum effective dose.
10 min: focused mini-session.
15 min: compact complete session with warm-up/transition and focused work.
20–30 min: meaningful workout with several movements.
45–60 min: substantial session with warm-up, main work, accessories/conditioning, and appropriate rest.

OUTPUT
Return clean Markdown with these sections:
# Workout
**Time:** ...
**Focus:** ...
**Equipment:** ...
**Goal:** ...

## Plan
Use numbered exercises. For each, give sets/reps or work/rest, and a brief cue when useful.

## Time Map
Show how the workout fits the requested time.

## Progression
Give one concrete way to progress next time.

## Why This Workout
Briefly explain the programming logic and any recovery consideration.

Do not include citations or long explanations. Keep the workout easy to follow on a phone.`;

function extractText(data: any) {
  return data.output_text || data.output?.filter((item: any) => item?.type === "message")?.flatMap((item: any) => item.content || [])?.filter((content: any) => content?.type === "output_text" && typeof content.text === "string")?.map((content: any) => content.text)?.join("\n") || "";
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!process.env.OPENAI_API_KEY) return Response.json({ error: "Workout Coach is not configured yet." }, { status: 503 });

    const body = await req.json();
    const minutes = Number(body.minutes);
    const focus = String(body.focus || "Full body");
    const equipment = String(body.equipment || "Bodyweight / no equipment");
    const goal = String(body.goal || "General fitness");
    const intensity = String(body.intensity || "Moderate");
    const recentWorkouts = Array.isArray(body.recentWorkouts) ? body.recentWorkouts.slice(-12) : [];

    if (![5, 10, 15, 20, 30, 45, 60].includes(minutes)) return Response.json({ error: "Choose a supported workout duration." }, { status: 400 });

    const [{ data: memories }, { data: profile }] = await Promise.all([
      supabase.from("coach_memories").select("category,content,importance").eq("user_id", user.id).order("importance", { ascending: false }).limit(20),
      supabase.from("profiles").select("goals,values,challenges").eq("id", user.id).maybeSingle(),
    ]);

    const context = {
      request: { minutes, focus, equipment, goal, intensity },
      recent_workouts: recentWorkouts,
      relevant_coach_context: memories || [],
      profile: profile || {},
    };

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-5.6", instructions: SYSTEM + "\n\nUSER CONTEXT:\n" + JSON.stringify(context), input: [{ role: "user", content: `Create today's workout from this request:\n${JSON.stringify(context)}` }], max_output_tokens: 1200 }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return Response.json({ error: typeof data?.error?.message === "string" ? data.error.message : `OpenAI request failed (${response.status})` }, { status: 502 });
    const workout = extractText(data);
    if (!workout.trim()) return Response.json({ error: "The Workout Coach returned no workout. Please try again." }, { status: 502 });
    return Response.json({ workout, request: { minutes, focus, equipment, goal, intensity }, createdAt: new Date().toISOString() });
  } catch (error) {
    console.error("Workout endpoint error:", error);
    return Response.json({ error: "Unable to create the workout. Please try again." }, { status: 500 });
  }
}
