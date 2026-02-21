"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type Theme = "light" | "dark";
type Lang = "en" | "es";

const getStoredTheme = (): Theme => {
  if (typeof window === "undefined") {
    return "light";
  }
  return localStorage.getItem("clockin-theme") === "dark" ? "dark" : "light";
};

const getStoredLang = (): Lang => {
  if (typeof window === "undefined") {
    return "en";
  }
  return localStorage.getItem("clockin-lang") === "es" ? "es" : "en";
};

const copy: Record<Lang, Record<string, string>> = {
  en: {
    mode: "Owner Command Portal",
    title: "Owner Access",
    subtitle: "Sign in to manage tenant accounts and feature access.",
    dark: "Dark",
    light: "Light",
    adminLogin: "Admin Login",
    backToClockin: "Back to ClockIn",
    username: "Username",
    password: "Password",
    signIn: "Sign In",
    signingIn: "Signing In...",
    invalidCredentials: "Invalid credentials.",
    unableSignIn: "Unable to sign in.",
  },
  es: {
    mode: "Portal de Comando del Dueño",
    title: "Acceso de Dueño",
    subtitle: "Inicia sesión para administrar inquilinos y funciones.",
    dark: "Oscuro",
    light: "Claro",
    adminLogin: "Acceso Admin",
    backToClockin: "Volver a ClockIn",
    username: "Usuario",
    password: "Contraseña",
    signIn: "Iniciar Sesión",
    signingIn: "Ingresando...",
    invalidCredentials: "Credenciales inválidas.",
    unableSignIn: "No se pudo iniciar sesión.",
  },
};

export default function OwnerLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    setTheme(getStoredTheme());
    setLang(getStoredLang());
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.dataset.theme = theme;
      document.documentElement.lang = lang;
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("clockin-theme", theme);
      localStorage.setItem("clockin-lang", lang);
      window.dispatchEvent(new Event("clockin-lang-change"));
    }
  }, [lang, theme]);

  const t = useMemo(() => copy[lang] ?? copy.en, [lang]);

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
        throw new Error(data?.error || t.invalidCredentials);
      }

      router.push("/owner");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t.unableSignIn);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="page admin-login-page">
      <div className="admin-login-card admin-login-card--owner">
        <div className="admin-login-header">
          <div>
            <span className="admin-login-mode">{t.mode}</span>
            <h1>{t.title}</h1>
            <p>{t.subtitle}</p>
          </div>
          <div className="admin-login-header-actions">
            <label className="admin-control">
              <span>Lang</span>
              <select
                className="admin-select"
                value={lang}
                onChange={(event) => setLang(event.target.value as Lang)}
              >
                <option value="en">EN</option>
                <option value="es">ES</option>
              </select>
            </label>
            <button
              type="button"
              className="admin-login-theme"
              onClick={() =>
                setTheme((prev) => (prev === "dark" ? "light" : "dark"))
              }
            >
              <i
                className={`fa-solid ${theme === "dark" ? "fa-moon" : "fa-sun"}`}
                aria-hidden="true"
              />
              {theme === "dark" ? t.dark : t.light}
            </button>
            <Link href="/admin-login" className="admin-login-switch">
              <i className="fa-solid fa-user-shield" aria-hidden="true" />
              {t.adminLogin}
            </Link>
            <Link href="/" className="admin-login-back">
              <i className="fa-solid fa-arrow-left" aria-hidden="true" />
              {t.backToClockin}
            </Link>
          </div>
        </div>

        <form className="admin-login-body" onSubmit={onSubmit}>
          <label className="form-label" htmlFor="owner-username">
            {t.username}
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
            {t.password}
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
              {submitting ? t.signingIn : t.signIn}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
