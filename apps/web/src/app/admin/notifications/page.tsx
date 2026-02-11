"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type NotificationRow = {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  readAt: string | null;
  employeeId?: string | null;
  employeeName?: string | null;
};

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(true);
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/notifications?limit=50${unreadOnly ? "&unread=1" : ""}`,
        { cache: "no-store" },
      );
      if (!response.ok) {
        setStatus("Unable to load notifications.");
        return;
      }
      const data = (await response.json()) as { notifications?: NotificationRow[] };
      setNotifications(data.notifications || []);
      setStatus(null);
    } catch {
      setStatus("Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [unreadOnly]);

  useEffect(() => {
    load();
  }, [load]);

  const unreadCount = useMemo(
    () => notifications.filter((notice) => !notice.readAt).length,
    [notifications],
  );

  const handleMarkRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    setNotifications((prev) =>
      prev.map((notice) =>
        notice.id === id ? { ...notice, readAt: new Date().toISOString() } : notice,
      ),
    );
  };

  const handleMarkAll = async () => {
    await fetch("/api/notifications/read-all", { method: "POST" });
    setNotifications((prev) =>
      prev.map((notice) => ({ ...notice, readAt: new Date().toISOString() })),
    );
  };

  return (
    <div className="d-flex flex-column gap-4">
      <div className="admin-header">
        <div>
          <h1>Notifications</h1>
          <p className="text-muted">
            Live alerts for punch activity and compliance events.
          </p>
        </div>
        <div className="admin-actions">
          <button className="btn btn-outline-secondary" onClick={load}>
            Refresh
          </button>
          <button className="btn btn-primary" onClick={handleMarkAll}>
            Mark All Read
          </button>
        </div>
      </div>

      <div className="admin-card">
        <div className="notification-toolbar">
          <div className="notification-count">
            {unreadCount} Unread
          </div>
          <label className="notification-filter">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(event) => setUnreadOnly(event.target.checked)}
            />
            Show unread only
          </label>
        </div>

        {status && <div className="alert alert-danger">{status}</div>}

        {loading ? (
          <div className="empty-state">Loading notifications…</div>
        ) : notifications.length === 0 ? (
          <div className="empty-state">No notifications yet.</div>
        ) : (
          <ul className="notification-list">
            {notifications.map((notice) => {
              const created = new Date(notice.createdAt);
              return (
                <li
                  key={notice.id}
                  className={`notification-item ${
                    notice.readAt ? "is-read" : "is-unread"
                  }`}
                >
                  <div className="notification-main">
                    <div className="notification-title">
                      {notice.message}
                    </div>
                    <div className="notification-meta">
                      <span className="badge bg-primary-subtle">
                        {notice.type.replace(/_/g, " ")}
                      </span>
                      {notice.employeeName && (
                        <span className="meta-pill">{notice.employeeName}</span>
                      )}
                      <span className="meta-time">
                        {created.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="notification-actions">
                    {!notice.readAt && (
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => handleMarkRead(notice.id)}
                      >
                        Mark Read
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
