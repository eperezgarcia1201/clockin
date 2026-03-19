"use client";

import type { UiLang } from "../../../lib/ui-language";

type PunchPhotoLink = {
  punchId: string;
  type: string;
  occurredAt: string;
  photoCapturedAt?: string | null;
};

type Props = {
  punches?: PunchPhotoLink[];
  lang: UiLang;
};

export function PunchPhotoLinks({ punches, lang }: Props) {
  const rows = punches ?? [];
  if (!rows.length) {
    return <span className="text-muted">—</span>;
  }

  return (
    <div className="d-flex flex-wrap gap-1">
      {rows.map((punch) => {
        const occurredLabel = new Date(punch.occurredAt).toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        });
        const label = `${punch.type} ${occurredLabel}`;
        const title =
          lang === "es"
            ? `Abrir foto de marcación: ${label}`
            : `Open punch photo: ${label}`;

        return (
          <a
            key={punch.punchId}
            className="btn btn-sm btn-outline-secondary"
            href={`/api/employee-punches/records/${encodeURIComponent(punch.punchId)}/photo`}
            target="_blank"
            rel="noreferrer"
            title={title}
          >
            {label}
          </a>
        );
      })}
    </div>
  );
}
