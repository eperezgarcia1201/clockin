"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type Theme = "light" | "dark";
type Lang = "en" | "es";

const hasSso =
  Boolean(process.env.NEXT_PUBLIC_AUTH0_DOMAIN) &&
  Boolean(process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID);

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
    mode: "Tenant Admin Portal",
    title: "Administrator Access",
    subtitle: "Sign in to manage employees, locations, and reports.",
    dark: "Dark",
    light: "Light",
    ownerLogin: "Owner Login",
    backToClockin: "Back to ClockIn",
    tenant: "Tenant",
    username: "Username",
    password: "Password",
    tenantHint:
      "Use tenant name plus tenant-admin or manager credentials assigned by your tenant admin.",
    signIn: "Sign In",
    signingIn: "Signing In...",
    forgotPassword: "Forgot password?",
    sso: "Sign in with SSO",
    resetPassword: "Reset Password",
    resetHelp: "We'll send instructions to the admin email on file.",
    sendReset: "Send Reset Link",
    sendingReset: "Sending...",
    invalidCredentials: "Invalid credentials.",
    unableSignIn: "Unable to sign in.",
    unableReset: "Unable to send reset instructions.",
    unableResetLink: "Unable to send reset link.",
    resetSent: "If an admin account exists, reset instructions have been sent.",
  },
  es: {
    mode: "Portal Admin del Inquilino",
    title: "Acceso de Administrador",
    subtitle: "Inicia sesión para gestionar empleados, ubicaciones y reportes.",
    dark: "Oscuro",
    light: "Claro",
    ownerLogin: "Acceso Dueño",
    backToClockin: "Volver a ClockIn",
    tenant: "Inquilino",
    username: "Usuario",
    password: "Contraseña",
    tenantHint:
      "Usa el nombre del inquilino y credenciales de admin del tenant o manager asignadas por tu admin.",
    signIn: "Iniciar Sesión",
    signingIn: "Ingresando...",
    forgotPassword: "¿Olvidaste tu contraseña?",
    sso: "Iniciar con SSO",
    resetPassword: "Restablecer Contraseña",
    resetHelp: "Enviaremos instrucciones al correo de administrador registrado.",
    sendReset: "Enviar Enlace",
    sendingReset: "Enviando...",
    invalidCredentials: "Credenciales inválidas.",
    unableSignIn: "No se pudo iniciar sesión.",
    unableReset: "No se pudieron enviar las instrucciones.",
    unableResetLink: "No se pudo enviar el enlace.",
    resetSent: "Si existe una cuenta admin, se enviaron instrucciones.",
  },
};

export default function AdminLoginPage() {
  const router = useRouter();
  const [tenant, setTenant] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetStatus, setResetStatus] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
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
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant, username, password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || t.invalidCredentials);
      }

      router.push("/admin");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t.unableSignIn);
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
        throw new Error(data?.error || t.unableReset);
      }

      setResetStatus(t.resetSent);
    } catch (error) {
      setResetStatus(error instanceof Error ? error.message : t.unableResetLink);
    } finally {
      setResetting(false);
    }
  };

  return (
    <main className="page admin-login-page">
      <div className="admin-login-card admin-login-card--admin">
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
            <Link href="/owner-login" className="admin-login-switch">
              <i className="fa-solid fa-crown" aria-hidden="true" />
              {t.ownerLogin}
            </Link>
            <Link href="/" className="admin-login-back">
              <i className="fa-solid fa-arrow-left" aria-hidden="true" />
              {t.backToClockin}
            </Link>
          </div>
        </div>

        <form className="admin-login-body" onSubmit={onSubmit}>
          <label className="form-label" htmlFor="admin-tenant">
            {t.tenant}
          </label>
          <div className="input-row">
            <i className="fa-solid fa-building-user" aria-hidden="true" />
            <input
              id="admin-tenant"
              type="text"
              placeholder="tenant name"
              autoComplete="organization"
              value={tenant}
              onChange={(event) => setTenant(event.target.value)}
              required
            />
          </div>

          <label className="form-label" htmlFor="admin-username">
            {t.username}
          </label>
          <div className="input-row">
            <i className="fa-solid fa-user-shield" aria-hidden="true" />
            <input
              id="admin-username"
              type="text"
              placeholder="admin"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </div>

          <label className="form-label" htmlFor="admin-password">
            {t.password}
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

          <div className="alert alert-info mb-0">{t.tenantHint}</div>

          {status && <div className="alert alert-danger">{status}</div>}

          <div className="admin-login-actions">
            <button className="sign-button" type="submit" disabled={submitting}>
              {submitting ? t.signingIn : t.signIn}
            </button>
            <button
              type="button"
              className="admin-forgot"
              onClick={() => setShowReset((prev) => !prev)}
            >
              <i className="fa-solid fa-key" aria-hidden="true" />
              {t.forgotPassword}
            </button>
            {hasSso && (
              <a
                className="btn btn-outline-light admin-sso"
                href="/auth/login?returnTo=/admin"
              >
                <i className="fa-solid fa-shield-halved" aria-hidden="true" />
                {t.sso}
              </a>
            )}
          </div>
        </form>

        {showReset && (
          <form className="admin-reset" onSubmit={onReset}>
            <div>
              <strong>{t.resetPassword}</strong>
              <p>{t.resetHelp}</p>
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
              {resetting ? t.sendingReset : t.sendReset}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
