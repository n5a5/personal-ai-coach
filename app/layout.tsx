import type { Metadata } from "next";
import "./globals.css";
import CoachNav from "./components/coach-nav";
import MorningLaunch from "./components/morning-launch";
import TodaysPlan from "./components/todays-plan";
import RemoveAnxiousCard from "./components/remove-anxious-card";

export const metadata: Metadata = {
  title: "Personal AI Coach",
  description: "A daily system for focus, resilience, health, growth, and purposeful living.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <CoachNav />
        {children}
        <MorningLaunch />
        <TodaysPlan />
        <RemoveAnxiousCard />
      </body>
    </html>
  );
}
