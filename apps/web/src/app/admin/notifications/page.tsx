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

type EmployeeOption = {
  id: string;
  name: string;
  active: boolean;
};

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageStatus, setMessageStatus] = useState<string | null>(null);
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

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const response = await fetch("/api/employees", { cache: "no-store" });
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as { employees?: EmployeeOption[] };
        const active = (data.employees || []).filter((employee) => employee.active);
        setEmployees(active);
        setEmployeeId((previous) => {
          if (previous && active.some((employee) => employee.id === previous)) {
            return previous;
          }
          return active[0]?.id || "";
        });
      } catch {
        // keep current list when employee options fail to load
      }
    };

    void loadEmployees();
  }, []);

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

  const handleSendMessage = async () => {
    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();
    if (!employeeId) {
      setMessageStatus("Select an employee.");
      return;
    }
    if (!trimmedSubject) {
      setMessageStatus("Subject is required.");
      return;
    }
    if (!trimmedMessage) {
      setMessageStatus("Message is required.");
      return;
    }

    setSendingMessage(true);
    setMessageStatus(null);
    try {
      const response = await fetch("/api/notifications/employee-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          subject: trimmedSubject,
          message: trimmedMessage,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      if (!response.ok) {
        throw new Error(data.error || data.message || "Unable to send message.");
      }

      setSubject("");
      setMessage("");
      setMessageStatus("Message sent. It will appear when the employee clocks in.");
      await load();
    } catch (error) {
      setMessageStatus(
        error instanceof Error ? error.message : "Unable to send message.",
      );
    } finally {
      setSendingMessage(false);
    }
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

      <div className="admin-card d-flex flex-column gap-3">
        <div>
          <h2 className="h5 mb-1">Send Employee Message</h2>
          <p className="text-muted mb-0">
            This alert pops up for the employee on their next clock-in.
          </p>
        </div>
        <div className="row g-2">
          <div className="col-md-4">
            <label className="form-label">Employee</label>
            <select
              className="form-select"
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
            >
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-8">
            <label className="form-label">Subject</label>
            <input
              className="form-control"
              value={subject}
              maxLength={120}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Subject"
            />
          </div>
          <div className="col-12">
            <label className="form-label">Message</label>
            <textarea
              className="form-control"
              rows={3}
              value={message}
              maxLength={2000}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Write your message for the employee..."
            />
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            className="btn btn-primary"
            onClick={handleSendMessage}
            disabled={sendingMessage}
          >
            {sendingMessage ? "Sending..." : "Send Message"}
          </button>
          {messageStatus && <span className="text-muted">{messageStatus}</span>}
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
