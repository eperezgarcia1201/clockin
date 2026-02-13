"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function OwnerLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);

    try {
      const response = await fetch("/api/owner/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || "Invalid credentials.");
      }

      router.push("/owner");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="page admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-header">
          <div>
            <h1>Owner Access</h1>
            <p>Sign in to manage tenant accounts and feature access.</p>
          </div>
          <Link href="/" className="admin-login-back">
            <i className="fa-solid fa-arrow-left" aria-hidden="true" />
            Back to ClockIn
          </Link>
        </div>

        <form className="admin-login-body" onSubmit={onSubmit}>
          <label className="form-label" htmlFor="owner-username">
            Username
          </label>
          <div className="input-row">
            <i className="fa-solid fa-user-tie" aria-hidden="true" />
            <input
              id="owner-username"
              type="text"
              placeholder="elmer"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </div>

          <label className="form-label" htmlFor="owner-password">
            Password
          </label>
          <div className="input-row">
            <i className="fa-solid fa-lock" aria-hidden="true" />
            <input
              id="owner-password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          {status && <div className="alert alert-danger">{status}</div>}

          <div className="admin-login-actions">
            <button className="sign-button" type="submit" disabled={submitting}>
              {submitting ? "Signing In..." : "Sign In"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
