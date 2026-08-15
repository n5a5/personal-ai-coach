"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setMessage("");
    const result = mode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    if (result.error) setMessage(result.error.message);
    else if (mode === "signup" && !result.data.session) setMessage("Check your email to confirm your account, then sign in.");
    else router.replace("/");
    setBusy(false);
  }

  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
    <form onSubmit={submit} style={{ width: "100%", maxWidth: 420, background: "white", borderRadius: 22, padding: 28, boxShadow: "0 8px 30px rgba(0,0,0,.06)" }}>
      <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", opacity: .55 }}>Personal AI Coach</div>
      <h1 style={{ margin: "8px 0" }}>{mode === "login" ? "Welcome back." : "Create your private coach."}</h1>
      <p style={{ opacity: .7 }}>Your journal, goals, points, and coaching history stay tied to your private account.</p>
      <label>Email<input required type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: "100%", margin: "6px 0 14px", padding: 12, border: "1px solid #ddd", borderRadius: 10 }} /></label>
      <label>Password<input required minLength={6} type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: "100%", margin: "6px 0 14px", padding: 12, border: "1px solid #ddd", borderRadius: 10 }} /></label>
      {message && <div style={{ background: "#f5f3ef", borderRadius: 10, padding: 10, marginBottom: 12 }}>{message}</div>}
      <button disabled={busy} style={{ width: "100%", border: 0, borderRadius: 12, padding: 14, background: "#171717", color: "white", fontWeight: 700 }}>{busy ? "Working…" : mode === "login" ? "Log in" : "Create account"}</button>
      <button type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }} style={{ width: "100%", marginTop: 10, border: 0, background: "transparent", padding: 10 }}>{mode === "login" ? "Create an account" : "I already have an account"}</button>
    </form>
  </main>;
}
