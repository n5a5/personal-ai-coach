import type { Metadata } from "next";
import "./globals.css";
import "./today-overrides.css";
import "./mobile-layout-fixes.css";
import "./momentum-modal-fixes.css";
import CoachNav from "./components/coach-nav";
import MomentumHistoryGuard from "./components/momentum-history-guard";
import TodaysPlan from "./components/todays-plan";

export const metadata: Metadata = {
  title: "Personal AI Coach",
  description: "A daily system for focus, resilience, health, growth, and purposeful living.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <MomentumHistoryGuard />
        <CoachNav />
        {children}
        <TodaysPlan />
      </body>
    </html>
  );
}
