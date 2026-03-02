"use client";

import {
  useUiCopy,
  useUiLanguage,
  type UiLang,
} from "../../lib/ui-language";

const copy: Record<UiLang, Record<string, string>> = {
  en: {
    title: "Privacy Policy",
    updated: "Last updated: February 11, 2026",
    intro:
      'ClockIn ("we", "our", "us") provides time tracking for employees and administrators. This Privacy Policy explains what data we collect, how we use it, and your choices.',
    collectTitle: "Information We Collect",
    collectAccount: "Account details (name, email, role, office, group).",
    collectActivity: "Work activity (clock-in, clock-out, breaks, schedule data).",
    collectMeta: "Device and app metadata for security and diagnostics.",
    useTitle: "How We Use Data",
    useTracking: "Provide time tracking, reports, and payroll summaries.",
    useNotifications: "Send operational notifications (e.g., punch alerts).",
    useSecurity: "Maintain security, audit trails, and system reliability.",
    sharingTitle: "Sharing",
    sharingBody:
      "We do not sell personal data. Data is shared only with your organization’s authorized administrators and service providers that help us operate the platform.",
    retentionTitle: "Retention",
    retentionBody:
      "Data is retained based on your organization’s policies and legal requirements. Administrators can export or delete records where permitted.",
    choicesTitle: "Your Choices",
    choiceProfile: "Contact your administrator to update profile details.",
    choiceExport: "Request exports or deletion where allowed by policy.",
    contactTitle: "Contact",
    contactBody:
      "Questions? Contact your organization’s admin or email support@websysclockin.com.",
  },
  es: {
    title: "Política de Privacidad",
    updated: "Última actualización: 11 de febrero de 2026",
    intro:
      'ClockIn ("nosotros", "nuestro") ofrece control de tiempo para empleados y administradores. Esta política explica qué datos recopilamos, cómo los usamos y tus opciones.',
    collectTitle: "Información que Recopilamos",
    collectAccount: "Datos de cuenta (nombre, correo, rol, ubicación, grupo).",
    collectActivity:
      "Actividad laboral (entrada, salida, descansos, datos de horario).",
    collectMeta: "Metadatos de dispositivo y app para seguridad y diagnóstico.",
    useTitle: "Cómo Usamos los Datos",
    useTracking:
      "Proveer control de tiempo, reportes y resúmenes de nómina.",
    useNotifications:
      "Enviar notificaciones operativas (por ejemplo, alertas de marcación).",
    useSecurity: "Mantener seguridad, auditoría y confiabilidad del sistema.",
    sharingTitle: "Compartición",
    sharingBody:
      "No vendemos datos personales. Solo se comparten con administradores autorizados de tu organización y proveedores que operan la plataforma.",
    retentionTitle: "Retención",
    retentionBody:
      "Los datos se conservan según las políticas de tu organización y requisitos legales. Los administradores pueden exportar o borrar registros cuando aplique.",
    choicesTitle: "Tus Opciones",
    choiceProfile:
      "Contacta a tu administrador para actualizar datos de perfil.",
    choiceExport:
      "Solicita exportaciones o eliminación cuando esté permitido por política.",
    contactTitle: "Contacto",
    contactBody:
      "¿Preguntas? Contacta al admin de tu organización o escribe a support@websysclockin.com.",
  },
};

export default function PrivacyPolicy() {
  const lang = useUiLanguage();
  const t = useUiCopy(copy, lang);

  return (
    <main className="page policy-page">
      <section className="policy-card">
        <div className="policy-header">
          <h1>{t.title}</h1>
          <p>{t.updated}</p>
        </div>
        <div className="policy-body">
          <p>{t.intro}</p>

          <h2>{t.collectTitle}</h2>
          <ul>
            <li>{t.collectAccount}</li>
            <li>{t.collectActivity}</li>
            <li>{t.collectMeta}</li>
          </ul>

          <h2>{t.useTitle}</h2>
          <ul>
            <li>{t.useTracking}</li>
            <li>{t.useNotifications}</li>
            <li>{t.useSecurity}</li>
          </ul>

          <h2>{t.sharingTitle}</h2>
          <p>{t.sharingBody}</p>

          <h2>{t.retentionTitle}</h2>
          <p>{t.retentionBody}</p>

          <h2>{t.choicesTitle}</h2>
          <ul>
            <li>{t.choiceProfile}</li>
            <li>{t.choiceExport}</li>
          </ul>

          <h2>{t.contactTitle}</h2>
          <p>{t.contactBody}</p>
        </div>
      </section>
    </main>
  );
}
