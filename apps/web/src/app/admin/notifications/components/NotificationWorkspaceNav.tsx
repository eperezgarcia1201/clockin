import type { AdminNotificationsTranslate } from "../types";

export type NotificationWorkspaceKey = "policy" | "delivery" | "inbox";

export type NotificationWorkspaceItem = {
  key: NotificationWorkspaceKey;
  title: string;
  description: string;
  badge: string;
};

type NotificationWorkspaceNavProps = {
  activeKey: NotificationWorkspaceKey;
  items: NotificationWorkspaceItem[];
  onSelect: (key: NotificationWorkspaceKey) => void;
  tr: AdminNotificationsTranslate;
};

export function NotificationWorkspaceNav({
  activeKey,
  items,
  onSelect,
  tr,
}: NotificationWorkspaceNavProps) {
  return (
    <div className="admin-card d-flex flex-column gap-3">
      <div className="d-flex flex-column flex-lg-row justify-content-between gap-2 align-items-lg-center">
        <div>
          <h2 className="h5 mb-1">{tr("Notification Categories", "Categorias de Notificaciones")}</h2>
          <p className="text-muted mb-0">
            {tr(
              "Switch between policy, delivery, and inbox workflows instead of managing everything in one long page.",
              "Cambia entre flujos de politica, entrega y bandeja en lugar de administrar todo en una sola pagina larga.",
            )}
          </p>
        </div>
        <div className="small text-muted">
          {tr("Each category keeps the same controls, only grouped better.", "Cada categoria mantiene los mismos controles, solo mejor agrupados.")}
        </div>
      </div>

      <div className="row g-3">
        {items.map((item) => {
          const isActive = item.key === activeKey;
          return (
            <div className="col-12 col-xl-4" key={item.key}>
              <button
                type="button"
                className={`w-100 text-start border rounded p-3 bg-white ${
                  isActive ? "border-primary shadow-sm" : "border-secondary-subtle"
                }`}
                onClick={() => onSelect(item.key)}
                aria-pressed={isActive}
              >
                <div className="d-flex justify-content-between align-items-start gap-3">
                  <div>
                    <div className="fw-semibold">{item.title}</div>
                    <div className="text-muted small mt-1">{item.description}</div>
                  </div>
                  <span className={`badge ${isActive ? "bg-primary" : "bg-secondary"}`}>
                    {item.badge}
                  </span>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
