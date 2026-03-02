"use client";

import Image from "next/image";
import Link from "next/link";
import { useUiLanguage } from "../../lib/ui-language";

export default function MarketingPage() {
  const lang = useUiLanguage();
  const tr = (en: string, es: string) => (lang === "es" ? es : en);

  return (
    <main className="page marketing-page">
      <header className="landing-nav marketing-nav">
        <div className="landing-brand">
          <div className="landing-logo">
            <Image
              src="/websys-logo.png"
              alt="Websys logo"
              width={40}
              height={40}
              className="landing-logo-image"
              priority
            />
          </div>
          <div className="landing-brand-text">
            <div className="landing-brand-name">Websys</div>
            <div className="landing-brand-sub">ClockIn</div>
          </div>
        </div>
        <nav className="landing-links">
          <Link href="/" className="landing-link">
            <i className="fa-solid fa-gauge" aria-hidden="true" />
            {tr("Dashboard", "Panel")}
          </Link>
          <Link href="/privacy" className="landing-link">
            <i className="fa-solid fa-shield-halved" aria-hidden="true" />
            {tr("Privacy", "Privacidad")}
          </Link>
          <Link href="/terms" className="landing-link">
            <i className="fa-solid fa-file-lines" aria-hidden="true" />
            {tr("Terms", "Terminos")}
          </Link>
          <Link href="/support" className="landing-link">
            <i className="fa-solid fa-life-ring" aria-hidden="true" />
            {tr("Support", "Soporte")}
          </Link>
        </nav>
      </header>

      <div className="container-xl marketing-container">
        <section className="marketing-hero">
          <div className="marketing-hero-text">
            <span className="marketing-badge">
              <i className="fa-solid fa-mobile-screen-button" aria-hidden="true" />
              ClockIn Mobile
            </span>
            <h1>
              {tr(
                "Clock in fast. Stay accurate. Keep teams on time.",
                "Marca rapido. Mantente preciso. Mantiene al equipo a tiempo.",
              )}
            </h1>
            <p>
              {tr(
                "ClockIn is the modern punch clock for teams that want clean, reliable time tracking. Employees clock in with their name and PIN, log breaks and lunch, and get instant confirmation in a kiosk-ready interface.",
                "ClockIn es el reloj checador moderno para equipos que quieren control de tiempo limpio y confiable. Los empleados marcan con nombre y PIN, registran descansos y comida, y reciben confirmacion instantanea en una interfaz lista para kiosko.",
              )}
            </p>
            <div className="marketing-hero-actions">
              <a className="marketing-primary" href="mailto:support@websysclockin.com">
                {tr("Contact Support", "Contactar Soporte")}
              </a>
              <Link className="marketing-secondary" href="/admin-login">
                {tr("Admin Login", "Login Admin")}
              </Link>
            </div>
          </div>

          <div className="marketing-hero-panel">
            <div className="marketing-panel-header">
              <span>{tr("Built for daily punch flow", "Hecho para el flujo diario de marcaciones")}</span>
              <strong>{tr("Clock Station Snapshot", "Resumen de Estacion de Marcaciones")}</strong>
            </div>
            <div className="marketing-panel-grid">
              <div className="marketing-panel-card">
                <h3>{tr("Employees", "Empleados")}</h3>
                <ul>
                  <li>{tr("Enter name + 4-digit PIN", "Ingresa nombre + PIN de 4 digitos")}</li>
                  <li>{tr("Tap IN, OUT, BREAK, LUNCH", "Toca ENTRADA, SALIDA, DESCANSO, COMIDA")}</li>
                  <li>{tr("Get instant status confirmation", "Recibe confirmacion instantanea del estado")}</li>
                </ul>
              </div>
              <div className="marketing-panel-card">
                <h3>{tr("Admins", "Admins")}</h3>
                <ul>
                  <li>{tr("Live punch activity feed", "Feed en vivo de actividad de marcaciones")}</li>
                  <li>{tr("Break compliance alerts", "Alertas de cumplimiento de descansos")}</li>
                  <li>{tr("Export-ready reports", "Reportes listos para exportar")}</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="marketing-stats">
          <div className="marketing-stat">
            <strong>{tr("Seconds", "Segundos")}</strong>
            <span>{tr("to punch in or out", "para marcar entrada o salida")}</span>
          </div>
          <div className="marketing-stat">
            <strong>{tr("Kiosk-ready", "Listo para kiosko")}</strong>
            <span>{tr("for tablets and front desks", "para tablets y recepciones")}</span>
          </div>
          <div className="marketing-stat">
            <strong>{tr("iPhone + iPad", "iPhone + iPad")}</strong>
            <span>{tr("designed for mobile teams", "disenado para equipos moviles")}</span>
          </div>
          <div className="marketing-stat">
            <strong>{tr("Secure", "Seguro")}</strong>
            <span>{tr("tenant isolation and audit trails", "aislamiento por tenant y trazas de auditoria")}</span>
          </div>
        </section>

        <section className="marketing-features">
          <div className="marketing-section-header">
            <h2>{tr("Why teams choose ClockIn", "Por que los equipos eligen ClockIn")}</h2>
            <p>{tr("Clarity at the punch station and consistency in every report.", "Claridad en la estacion de marcaciones y consistencia en cada reporte.")}</p>
          </div>
          <div className="marketing-feature-grid">
            <article className="marketing-feature-card">
              <i className="fa-solid fa-stopwatch" aria-hidden="true" />
              <h3>{tr("Fast punches", "Marcaciones rapidas")}</h3>
              <p>{tr("Minimal steps keep lines moving while still verifying the right employee.", "Pasos minimos mantienen el flujo mientras verifican al empleado correcto.")}</p>
            </article>
            <article className="marketing-feature-card">
              <i className="fa-solid fa-mug-hot" aria-hidden="true" />
              <h3>{tr("Break & lunch tracking", "Control de descanso y comida")}</h3>
              <p>{tr("Dedicated actions keep compliance data clean without extra admin work.", "Acciones dedicadas mantienen datos de cumplimiento limpios sin trabajo extra de admin.")}</p>
            </article>
            <article className="marketing-feature-card">
              <i className="fa-solid fa-bell" aria-hidden="true" />
              <h3>{tr("Operational alerts", "Alertas operativas")}</h3>
              <p>{tr("Admins stay informed with live punch notifications and exception signals.", "Los admins se mantienen informados con notificaciones en vivo y alertas de excepcion.")}</p>
            </article>
            <article className="marketing-feature-card">
              <i className="fa-solid fa-chart-line" aria-hidden="true" />
              <h3>{tr("Exportable reporting", "Reporteria exportable")}</h3>
              <p>{tr("Hours, audit logs, and payroll exports are ready when you need them.", "Horas, auditoria y exportaciones de nomina listas cuando las necesites.")}</p>
            </article>
          </div>
        </section>

        <section className="marketing-steps">
          <div className="marketing-section-header">
            <h2>{tr("How it works", "Como funciona")}</h2>
            <p>{tr("Every punch is consistent, verified, and visible to admins.", "Cada marcacion es consistente, verificada y visible para admins.")}</p>
          </div>
          <div className="marketing-step-grid">
            <div className="marketing-step">
              <span className="marketing-step-number">01</span>
              <h3>{tr("Identify", "Identifica")}</h3>
              <p>{tr("Employees enter their name and PIN at the station.", "Los empleados ingresan su nombre y PIN en la estacion.")}</p>
            </div>
            <div className="marketing-step">
              <span className="marketing-step-number">02</span>
              <h3>{tr("Punch", "Marca")}</h3>
              <p>{tr("Select IN, OUT, BREAK, or LUNCH with instant confirmation.", "Selecciona ENTRADA, SALIDA, DESCANSO o COMIDA con confirmacion instantanea.")}</p>
            </div>
            <div className="marketing-step">
              <span className="marketing-step-number">03</span>
              <h3>{tr("Report", "Reporta")}</h3>
              <p>{tr("Admins review activity, alerts, and exports in ClockIn Admin.", "Los admins revisan actividad, alertas y exportaciones en ClockIn Admin.")}</p>
            </div>
          </div>
        </section>

        <section className="marketing-privacy">
          <div>
            <h2>{tr("Privacy-first by design", "Privacidad primero por diseno")}</h2>
            <p>
              {tr(
                "ClockIn collects only the data needed for workforce time tracking. Records stay within your organization, with audit trails and export controls.",
                "ClockIn recopila solo los datos necesarios para el control de tiempo laboral. Los registros quedan dentro de tu organizacion, con auditoria y controles de exportacion.",
              )}
            </p>
          </div>
          <Link className="marketing-secondary" href="/privacy">
            {tr("Read Privacy Policy", "Leer Politica de Privacidad")}
          </Link>
        </section>

        <section className="marketing-cta">
          <div>
            <h2>{tr("Ready to clock in?", "Listo para marcar?")}</h2>
            <p>
              {tr(
                "ClockIn works with your organization’s admin platform. Need access or setup help? Reach out and we’ll point you in the right direction.",
                "ClockIn funciona con la plataforma admin de tu organizacion. Necesitas acceso o ayuda de configuracion? Escribenos y te guiamos.",
              )}
            </p>
          </div>
          <div className="marketing-hero-actions">
            <a className="marketing-primary" href="mailto:support@websysclockin.com">
              {tr("Email Support", "Enviar Correo a Soporte")}
            </a>
            <Link className="marketing-secondary" href="/terms">
              {tr("Terms of Service", "Terminos del Servicio")}
            </Link>
          </div>
        </section>

        <footer className="legal-footer marketing-footer">
          <Link href="/privacy">{tr("Privacy Policy", "Politica de Privacidad")}</Link>
          <span>•</span>
          <Link href="/terms">{tr("Terms of Service", "Terminos del Servicio")}</Link>
          <span>•</span>
          <Link href="/support">{tr("Support", "Soporte")}</Link>
        </footer>
      </div>
    </main>
  );
}
