"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MorningLaunch() {
  const pathname = usePathname();
  if (pathname !== "/") return null;

  return (
    <div className="morning-launch">
      <Link href="/morning" className="morning-launch-card">
        <div className="morning-launch-eyebrow">MORNING COACH</div>
        <div className="morning-launch-title">Build today's plan with your Coach →</div>
        <div className="morning-launch-copy">
          Based on your goals, memories, recent life and what matters most today.
        </div>
      </Link>
    </div>
  );
}
