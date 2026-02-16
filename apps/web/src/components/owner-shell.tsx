"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export function OwnerShell({
  children,
}: {
  children: React.ReactNode;
}) {
  type Lang = "en" | "es";
  type Theme = "light" | "dark";

  const translations: Record<Lang, Record<string, string>> = {
    en: {
      ownerDashboard: "Owner Dashboard",
      tenants: "Tenants",
      logout: "Logout",
      owner: "Owner",
      dashboard: "Dashboard",
      tenantAccounts: "Tenant Accounts",
      language: "Language",
      theme: "Theme",
      light: "Light",
      dark: "Dark",
    },
    es: {
      ownerDashboard: "Panel de Dueño",
      tenants: "Inquilinos",
      logout: "Salir",
      owner: "Dueño",
      dashboard: "Tablero",
      tenantAccounts: "Cuentas de Inquilino",
      language: "Idioma",
      theme: "Tema",
      light: "Claro",
      dark: "Oscuro",
    },
  };

  const pathname = usePathname();
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("en");
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    if (typeof window === "undefined") return;
    setLang(localStorage.getItem("clockin-lang") === "es" ? "es" : "en");
    setTheme(localStorage.getItem("clockin-theme") === "dark" ? "dark" : "light");
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

  const t = useMemo(() => translations[lang] ?? translations.en, [lang]);

  const logout = async () => {
    await fetch("/api/owner/logout", { method: "POST" });
    router.push("/owner-login");
  };

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <div className="admin-branding">
          <div className="admin-logo">W</div>
          <div className="admin-brand-text">
            <div className="admin-brand-name">Websys</div>
            <div className="admin-brand-sub">ClockIn Owner</div>
          </div>
        </div>
        <nav className="admin-topnav">
          <Link
            className={`topnav-link ${pathname === "/owner" ? "is-active" : ""}`}
            href="/owner"
          >
            <i className="fa-solid fa-gauge-high" aria-hidden="true" />
            {t.ownerDashboard}
          </Link>
          <Link
            className={`topnav-link ${
              pathname?.startsWith("/owner/tenants") ? "is-active" : ""
            }`}
            href="/owner/tenants"
          >
            <i className="fa-solid fa-building-user" aria-hidden="true" />
            {t.tenants}
          </Link>
        </nav>
        <div className="admin-top-actions">
          <div className="admin-controls">
            <label className="admin-control">
              <span>{t.language}</span>
              <select
                className="admin-select"
                value={lang}
                onChange={(event) => setLang(event.target.value as Lang)}
              >
                <option value="en">EN</option>
                <option value="es">ES</option>
              </select>
            </label>
            <label className="admin-control">
              <span>{t.theme}</span>
              <button
                type="button"
                className="admin-toggle"
                onClick={() =>
                  setTheme((prev) => (prev === "dark" ? "light" : "dark"))
                }
              >
                <i
                  className={`fa-solid ${
                    theme === "dark" ? "fa-moon" : "fa-sun"
                  }`}
                  aria-hidden="true"
                />
                {theme === "dark" ? t.dark : t.light}
              </button>
            </label>
          </div>
          <button type="button" className="admin-logout" onClick={logout}>
            <i className="fa-solid fa-right-from-bracket" aria-hidden="true" />
            {t.logout}
          </button>
        </div>
      </header>
      <div className="admin-body">
        <aside className="admin-nav">
          <div className="admin-section">
            <div className="admin-section-title">{t.owner}</div>
            <Link className="admin-link" href="/owner">
              <i className="fa-solid fa-gauge-high" aria-hidden="true" />
              {t.dashboard}
            </Link>
            <Link className="admin-link" href="/owner/tenants">
              <i className="fa-solid fa-building-user" aria-hidden="true" />
              {t.tenantAccounts}
            </Link>
          </div>
        </aside>
        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
}
