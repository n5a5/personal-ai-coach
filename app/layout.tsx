import type { Metadata } from "next";
import "./globals.css";
import "./today-overrides.css";
import "./mobile-layout-fixes.css";
import CoachNav from "./components/coach-nav";
import TodaysPlan from "./components/todays-plan";

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
        <TodaysPlan />
      </body>
    </html>
  );
}
