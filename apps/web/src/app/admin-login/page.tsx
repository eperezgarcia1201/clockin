"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

const hasSso =
  Boolean(process.env.NEXT_PUBLIC_AUTH0_DOMAIN) &&
  Boolean(process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID);

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetStatus, setResetStatus] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || "Invalid credentials.");
      }

      router.push("/admin");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Unable to sign in.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const onReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResetting(true);
    setResetStatus(null);

    try {
      const response = await fetch("/api/admin/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || "Unable to send reset instructions.");
      }

      setResetStatus(
        "If an admin account exists, reset instructions have been sent.",
      );
    } catch (error) {
      setResetStatus(
        error instanceof Error ? error.message : "Unable to send reset link.",
      );
    } finally {
      setResetting(false);
    }
  };

  return (
    <main className="page admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-header">
          <div>
            <h1>Administrator Access</h1>
            <p>Sign in to manage employees, offices, and reports.</p>
          </div>
          <Link href="/" className="admin-login-back">
            <i className="fa-solid fa-arrow-left" aria-hidden="true" />
            Back to ClockIn
          </Link>
        </div>

        <form className="admin-login-body" onSubmit={onSubmit}>
          <label className="form-label" htmlFor="admin-username">
            Username
          </label>
          <div className="input-row">
            <i className="fa-solid fa-user-shield" aria-hidden="true" />
            <input
              id="admin-username"
              type="text"
              placeholder="elmer"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </div>

          <label className="form-label" htmlFor="admin-password">
            Password
          </label>
          <div className="input-row">
            <i className="fa-solid fa-lock" aria-hidden="true" />
            <input
              id="admin-password"
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
            <button
              type="button"
              className="admin-forgot"
              onClick={() => setShowReset((prev) => !prev)}
            >
              <i className="fa-solid fa-key" aria-hidden="true" />
              Forgot password?
            </button>
            {hasSso && (
              <a
                className="btn btn-outline-light admin-sso"
                href="/auth/login?returnTo=/admin"
              >
                <i className="fa-solid fa-shield-halved" aria-hidden="true" />
                Sign in with SSO
              </a>
            )}
          </div>
        </form>

        {showReset && (
          <form className="admin-reset" onSubmit={onReset}>
            <div>
              <strong>Reset Password</strong>
              <p>We’ll send instructions to the admin email on file.</p>
            </div>
            <div className="input-row">
              <i className="fa-solid fa-envelope" aria-hidden="true" />
              <input
                type="email"
                placeholder="admin@yourcompany.com"
                value={resetEmail}
                onChange={(event) => setResetEmail(event.target.value)}
                required
              />
            </div>
            {resetStatus && (
              <div className="alert alert-info mb-0">{resetStatus}</div>
            )}
            <button
              className="btn btn-primary"
              type="submit"
              disabled={resetting}
            >
              {resetting ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
