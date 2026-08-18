import { redirect } from "next/navigation";

// Momentum is now part of Today. Keep the legacy route as a safe redirect so
// there is only one authoritative Gameify experience and one point-awarding flow.
export default function GameifyPage() {
  redirect("/");
}
