"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MorningLaunch() {
  const pathname = usePathname();
  if (pathname !== "/") return null;

  return (
    <div style={{ maxWidth: 980, margin: "12px auto 0", padding: "0 20px" }}>
      <Link
        href="/morning"
        style={{
          display: "block",
          textDecoration: "none",
          color: "white",
          background: "#171717",
          borderRadius: 18,
          padding: "18px 20px",
          boxShadow: "0 8px 24px rgba(0,0,0,.12)",
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase", opacity: .7 }}>
          🌅 Morning Coach
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, marginTop: 5 }}>
          Start your day with your personalized plan →
        </div>
        <div style={{ fontSize: 14, opacity: .72, marginTop: 4 }}>
          Based on your goals, memories, recent life and what matters most today.
        </div>
      </Link>
    </div>
  );
}
