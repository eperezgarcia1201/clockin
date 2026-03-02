"use client";

import {
  useUiCopy,
  useUiLanguage,
  type UiLang,
} from "../../../lib/ui-language";

const copy: Record<UiLang, Record<string, string>> = {
  en: {
    title: "Upgrade Database",
    body: "Database migrations will be handled through Prisma migrations. We'll expose safe migration status here in a future admin release.",
  },
  es: {
    title: "Actualizar Base de Datos",
    body: "Las migraciones de base de datos se manejarán con Prisma migrations. Mostraremos aquí un estado seguro de migraciones en una próxima versión de admin.",
  },
};

export default function DbUpgrade() {
  const lang = useUiLanguage();
  const t = useUiCopy(copy, lang);

  return (
    <div className="d-flex flex-column gap-4">
      <div className="admin-header">
        <h1>{t.title}</h1>
      </div>
      <div className="admin-card">
        <p className="mb-0">{t.body}</p>
      </div>
    </div>
  );
}
