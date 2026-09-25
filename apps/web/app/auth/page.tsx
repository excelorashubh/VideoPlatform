"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginUser, registerUser } from "../../lib/api";

export default function AuthPage() {
  const router = useRouter();

  useEffect(() => {
    console.log("Signup page loaded: database connection check");
    const requestedMode = new URLSearchParams(window.location.search).get("mode");
    if (requestedMode === "register") setMode("register");
    if (requestedMode === "login") setMode("login");
  }, []);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({
    email: "",
    displayName: "",
    password: "",
    confirmPassword: ""
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "login") {
        await loginUser({ email: form.email, password: form.password });
      } else {
        if (form.password !== form.confirmPassword) {
          throw new Error("Passwords do not match");
        }

        await registerUser({
          email: form.email,
          displayName: form.displayName,
          password: form.password,
          role: "VIEWER"
        });
      }
      const destination = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("next") : null;
      router.push(destination === "/creator" ? "/creator" : "/");
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <Link className="auth-back-link" href="/">Back to GVP</Link>
        <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
            <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "primary-button" : "text-link"} onClick={() => { setMode("login"); setError(null); }}>Login</button>
            <button type="button" role="tab" aria-selected={mode === "register"} className={mode === "register" ? "primary-button" : "text-link"} onClick={() => { setMode("register"); setError(null); }}>Sign up</button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-heading">
            <p className="kicker">Global Video Platform</p>
            <h1>{mode === "login" ? "Welcome back" : "Create your account"}</h1>
            <p className="muted">{mode === "login" ? "Sign in to continue to your workspace." : "Join the viewer and creator community."}</p>
          </div>

            {mode === "register" ? (
              <label>
                Display name
                <input
                  required
                  value={form.displayName}
                  onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))}
                  placeholder="GVP Creator"
                />
              </label>
            ) : null}

            <label>
              Email
              <input
                type="email"
                required
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="creator@example.com"
              />
            </label>

            <label>
              Password
              <input
                type="password"
                minLength={8}
                required
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                placeholder="Password"
              />
            </label>

            {mode === "register" ? (
              <label>
                Confirm password
                <input
                  type="password"
                  minLength={8}
                  required
                  value={form.confirmPassword}
                  onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                />
              </label>
            ) : null}

          {error ? <p className="auth-error" role="alert">{error}</p> : null}

          <button type="submit" className="primary-button auth-submit" disabled={loading}>
            {loading ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>
      </section>
    </main>
  );
}
