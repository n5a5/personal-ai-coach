"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["/", "Today", "⌂"],
  ["/morning", "Morning", "☀"],
  ["/reset", "Reset", "↺"],
  ["/coach", "Coach", "✦"],
  ["/profile", "Profile", "○"],
  ["/reference", "Reference", "?"],
];

export default function CoachNav() {
  const pathname = usePathname();
  if (pathname === "/login" || pathname === "/signup") return null;

  return (
    <nav className="coach-nav" aria-label="Coach navigation">
      {links.map(([href, label, icon]) => (
        <Link key={href} href={href} className={pathname === href ? "active" : ""}>
          <span className="nav-icon" aria-hidden="true">{icon}</span>
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
