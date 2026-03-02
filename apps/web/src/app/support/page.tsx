"use client";

import {
  useUiCopy,
  useUiLanguage,
  type UiLang,
} from "../../lib/ui-language";

const copy: Record<UiLang, Record<string, string>> = {
  en: {
    title: "Support",
    subtitle: "Need help with ClockIn setup, access, or troubleshooting?",
    contactSupport: "Contact Support",
    includeTitle: "What to Include",
    includeOrg: "Your organization name.",
    includeIssue: "The issue and affected screen (Web, Employee App, Admin App).",
    includeWhen: "Date/time and timezone when the issue occurred.",
    includeEvidence: "Screenshots or exact error messages.",
    adminAccess: "Admin Access",
    adminHelp:
      "For admin login issues, include the admin username and your company domain so we can validate tenant access quickly.",
  },
  es: {
    title: "Soporte",
    subtitle:
      "¿Necesitas ayuda con la configuración de ClockIn, acceso o solución de problemas?",
    contactSupport: "Contactar Soporte",
    includeTitle: "Qué Incluir",
    includeOrg: "Nombre de tu organización.",
    includeIssue:
      "El problema y la pantalla afectada (Web, App de Empleado, App de Admin).",
    includeWhen: "Fecha/hora y zona horaria cuando ocurrió el problema.",
    includeEvidence: "Capturas de pantalla o mensajes de error exactos.",
    adminAccess: "Acceso Admin",
    adminHelp:
      "Para problemas de inicio de sesión de admin, incluye el usuario admin y el dominio de tu empresa para validar acceso del tenant rápidamente.",
  },
};

export default function SupportPage() {
  const lang = useUiLanguage();
  const t = useUiCopy(copy, lang);

  return (
    <main className="page policy-page">
      <section className="policy-card">
        <div className="policy-header">
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
        </div>
        <div className="policy-body">
          <h2>{t.contactSupport}</h2>
          <p>
            Email: <strong>support@websysclockin.com</strong>
          </p>

          <h2>{t.includeTitle}</h2>
          <ul>
            <li>{t.includeOrg}</li>
            <li>{t.includeIssue}</li>
            <li>{t.includeWhen}</li>
            <li>{t.includeEvidence}</li>
          </ul>

          <h2>{t.adminAccess}</h2>
          <p>{t.adminHelp}</p>
        </div>
      </section>
    </main>
  );
}
