import type { NotificationRow } from "../../../../lib/api/notifications-admin";
import type { AdminNotificationsTranslate } from "../types";

type NotificationsFeedPanelProps = {
  feedStatus: string | null;
  loading: boolean;
  notifications: NotificationRow[];
  onMarkRead: (id: string) => void;
  onUnreadOnlyChange: (value: boolean) => void;
  tr: AdminNotificationsTranslate;
  unreadCount: number;
  unreadOnly: boolean;
};

export function NotificationsFeedPanel({
  feedStatus,
  loading,
  notifications,
  onMarkRead,
  onUnreadOnlyChange,
  tr,
  unreadCount,
  unreadOnly,
}: NotificationsFeedPanelProps) {
  return (
    <div className="admin-card">
      <div className="notification-toolbar">
        <div className="notification-count">
          {unreadCount} {tr("Unread", "No leidas")}
        </div>
        <label className="notification-filter">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(event) => onUnreadOnlyChange(event.target.checked)}
          />
          {tr("Show unread only", "Mostrar solo no leidas")}
        </label>
      </div>

      {feedStatus ? <div className="alert alert-danger">{feedStatus}</div> : null}

      {loading ? (
        <div className="empty-state">
          {tr("Loading notifications...", "Cargando notificaciones...")}
        </div>
      ) : notifications.length === 0 ? (
        <div className="empty-state">
          {tr("No notifications yet.", "Aun no hay notificaciones.")}
        </div>
      ) : (
        <ul className="notification-list">
          {notifications.map((notice) => {
            const created = new Date(notice.createdAt);
            return (
              <li
                key={notice.id}
                className={`notification-item ${notice.readAt ? "is-read" : "is-unread"}`}
              >
                <div className="notification-main">
                  <div className="notification-title">{notice.message}</div>
                  <div className="notification-meta">
                    <span className="badge bg-primary-subtle">
                      {notice.type.replace(/_/g, " ")}
                    </span>
                    {notice.employeeName ? (
                      <span className="meta-pill">{notice.employeeName}</span>
                    ) : null}
                    <span className="meta-time">{created.toLocaleString()}</span>
                  </div>
                </div>
                <div className="notification-actions">
                  {!notice.readAt ? (
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => onMarkRead(notice.id)}
                    >
                      {tr("Mark Read", "Marcar Leida")}
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
