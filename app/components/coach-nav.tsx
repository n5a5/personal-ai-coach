"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function CoachNav() {
  const pathname = usePathname();
  if (pathname === "/login" || pathname === "/signup") return null;

  const links = [
    ["/", "Today"],
    ["/morning", "Morning"],
    ["/reset", "Reset"],
    ["/coach", "Coach"],
    ["/profile", "Profile"],
  ];

  return (
    <nav style={{ maxWidth: 980, margin: "0 auto", padding: "14px 20px 0", display: "flex", gap: 8, overflowX: "auto" }} aria-label="Coach navigation">
      {links.map(([href, label]) => (
        <Link key={href} href={href} style={{ flex: "0 0 auto", textDecoration: "none", color: pathname === href ? "white" : "#171717", background: pathname === href ? "#171717" : "white", border: "1px solid #e5e5e5", borderRadius: 10, padding: "8px 12px", fontSize: 14, fontWeight: 700 }}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
