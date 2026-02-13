"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export function OwnerShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

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
            Owner Dashboard
          </Link>
          <Link
            className={`topnav-link ${
              pathname?.startsWith("/owner/tenants") ? "is-active" : ""
            }`}
            href="/owner/tenants"
          >
            <i className="fa-solid fa-building-user" aria-hidden="true" />
            Tenants
          </Link>
        </nav>
        <div className="admin-top-actions">
          <button type="button" className="admin-logout" onClick={logout}>
            <i className="fa-solid fa-right-from-bracket" aria-hidden="true" />
            Logout
          </button>
        </div>
      </header>
      <div className="admin-body">
        <aside className="admin-nav">
          <div className="admin-section">
            <div className="admin-section-title">Owner</div>
            <Link className="admin-link" href="/owner">
              <i className="fa-solid fa-gauge-high" aria-hidden="true" />
              Dashboard
            </Link>
            <Link className="admin-link" href="/owner/tenants">
              <i className="fa-solid fa-building-user" aria-hidden="true" />
              Tenant Accounts
            </Link>
          </div>
        </aside>
        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
}
