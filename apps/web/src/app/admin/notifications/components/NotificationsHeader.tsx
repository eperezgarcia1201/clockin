import type { AdminNotificationsTranslate } from "../types";

type NotificationsHeaderProps = {
  disabled: boolean;
  onMarkAllRead: () => void;
  onRefreshAll: () => void;
  tr: AdminNotificationsTranslate;
};

export function NotificationsHeader({
  disabled,
  onMarkAllRead,
  onRefreshAll,
  tr,
}: NotificationsHeaderProps) {
  return (
    <div className="admin-header">
      <div>
        <h1>{tr("Notifications", "Notificaciones")}</h1>
        <p className="text-muted mb-0">
          {tr(
            "Manage server-side notification rules, device delivery, employee messages, and the live admin inbox from the browser.",
            "Administra reglas de notificación del servidor, entrega por dispositivo, mensajes al empleado y la bandeja admin en vivo desde el navegador.",
          )}
        </p>
      </div>
      <div className="admin-actions d-flex flex-wrap gap-2">
        <button
          className="btn btn-outline-secondary"
          onClick={onRefreshAll}
          disabled={disabled}
        >
          {tr("Refresh All", "Actualizar Todo")}
        </button>
        <button className="btn btn-primary" onClick={onMarkAllRead}>
          {tr("Mark All Read", "Marcar Todo como Leído")}
        </button>
      </div>
    </div>
  );
}
