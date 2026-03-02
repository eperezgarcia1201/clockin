"use client";

import {
  useUiCopy,
  useUiLanguage,
  type UiLang,
} from "../../lib/ui-language";

const copy: Record<UiLang, Record<string, string>> = {
  en: {
    title: "Terms of Service",
    updated: "Last updated: February 11, 2026",
    intro:
      "These Terms govern the use of ClockIn. By using the service, you agree to these terms.",
    accountsTitle: "Accounts",
    accountsBody:
      "Access is provided by your organization. You are responsible for keeping your credentials and PIN secure.",
    useTitle: "Acceptable Use",
    useLawful: "Use the service for lawful workplace time tracking only.",
    useNoAccess: "Do not attempt to access data you are not authorized to view.",
    availabilityTitle: "Availability",
    availabilityBody:
      "We aim for high availability but do not guarantee uninterrupted access. Maintenance or outages may occur.",
    ownershipTitle: "Data & Ownership",
    ownershipBody:
      "Your organization owns its data. We process data solely to provide the service.",
    contactTitle: "Contact",
    contactBody:
      "Questions? Contact your organization’s admin or email support@websysclockin.com.",
  },
  es: {
    title: "Términos del Servicio",
    updated: "Última actualización: 11 de febrero de 2026",
    intro:
      "Estos términos regulan el uso de ClockIn. Al usar el servicio, aceptas estos términos.",
    accountsTitle: "Cuentas",
    accountsBody:
      "El acceso lo proporciona tu organización. Eres responsable de mantener seguras tus credenciales y PIN.",
    useTitle: "Uso Aceptable",
    useLawful:
      "Usa el servicio solo para control laboral de tiempo conforme a la ley.",
    useNoAccess:
      "No intentes acceder a datos que no estás autorizado a ver.",
    availabilityTitle: "Disponibilidad",
    availabilityBody:
      "Buscamos alta disponibilidad pero no garantizamos acceso ininterrumpido. Puede haber mantenimiento o caídas.",
    ownershipTitle: "Datos y Propiedad",
    ownershipBody:
      "Tu organización es dueña de sus datos. Procesamos datos únicamente para prestar el servicio.",
    contactTitle: "Contacto",
    contactBody:
      "¿Preguntas? Contacta al admin de tu organización o escribe a support@websysclockin.com.",
  },
};

export default function TermsOfService() {
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

          <h2>{t.accountsTitle}</h2>
          <p>{t.accountsBody}</p>

          <h2>{t.useTitle}</h2>
          <ul>
            <li>{t.useLawful}</li>
            <li>{t.useNoAccess}</li>
          </ul>

          <h2>{t.availabilityTitle}</h2>
          <p>{t.availabilityBody}</p>

          <h2>{t.ownershipTitle}</h2>
          <p>{t.ownershipBody}</p>

          <h2>{t.contactTitle}</h2>
          <p>{t.contactBody}</p>
        </div>
      </section>
    </main>
  );
}
