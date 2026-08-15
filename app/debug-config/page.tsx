export default function DebugConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

  return (
    <main style={{ fontFamily: "Arial", maxWidth: 700, margin: "40px auto", padding: 20 }}>
      <h1>Configuration Check</h1>
      <p><b>Supabase URL present:</b> {url ? "YES" : "NO"}</p>
      <p><b>Supabase URL:</b> {url || "MISSING"}</p>
      <p><b>Publishable key present:</b> {key ? "YES" : "NO"}</p>
      <p><b>Key prefix:</b> {key ? `${key.slice(0, 16)}...` : "MISSING"}</p>
      <p><b>Key length:</b> {key.length}</p>
      <p style={{ opacity: .65 }}>This page intentionally never displays the complete key.</p>
    </main>
  );
}
