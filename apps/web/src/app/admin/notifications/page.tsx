"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useUiLanguage } from "../../../lib/ui-language";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  sendEmployeeMessage,
  type NotificationRow,
} from "../../../lib/api/notifications-admin";
import {
  listEmployees,
  type EmployeeRow as EmployeeOption,
} from "../../../lib/api/users-admin";
export default function AdminNotifications() {
  const lang = useUiLanguage();
  const tr = useCallback(
    (en: string, es: string) => (lang === "es" ? es : en),
    [lang],
  );
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
      const rows = await listNotifications({ limit: 50, unreadOnly });
      setNotifications(rows);
      setStatus(null);
    } catch {
      setStatus(
        tr(
          "Unable to load notifications.",
          "No se pudieron cargar las notificaciones.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [tr, unreadOnly]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const data = await listEmployees();
        const active = data.filter((employee) => employee.active);
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
    await markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((notice) =>
        notice.id === id
          ? { ...notice, readAt: new Date().toISOString() }
          : notice,
      ),
    );
  };

  const handleMarkAll = async () => {
    await markAllNotificationsRead();
    setNotifications((prev) =>
      prev.map((notice) => ({ ...notice, readAt: new Date().toISOString() })),
    );
  };
  const handleSendMessage = async () => {
    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();
    if (!employeeId) {
      setMessageStatus(tr("Select an employee.", "Selecciona un empleado."));
      return;
    }
    if (!trimmedSubject) {
      setMessageStatus(tr("Subject is required.", "El asunto es obligatorio."));
      return;
    }
    if (!trimmedMessage) {
      setMessageStatus(
        tr("Message is required.", "El mensaje es obligatorio."),
      );
      return;
    }

    setSendingMessage(true);
    setMessageStatus(null);
    try {
      await sendEmployeeMessage({
        employeeId,
        subject: trimmedSubject,
        message: trimmedMessage,
      });

      setSubject("");
      setMessage("");
      setMessageStatus(
        tr(
          "Message sent. It will appear when the employee clocks in.",
          "Mensaje enviado. Aparecerá cuando el empleado marque entrada.",
        ),
      );
      await load();
    } catch (error) {
      setMessageStatus(
        error instanceof Error
          ? error.message
          : tr("Unable to send message.", "No se pudo enviar el mensaje."),
      );
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      <div className="admin-header">
        <div>
          <h1>{tr("Notifications", "Notificaciones")}</h1>
          <p className="text-muted">
            {tr(
              "Live alerts for punch activity and compliance events.",
              "Alertas en vivo para actividad de marcación y cumplimiento.",
            )}
          </p>
        </div>
        <div className="admin-actions">
          <button className="btn btn-outline-secondary" onClick={load}>
            {tr("Refresh", "Actualizar")}
          </button>
          <button className="btn btn-primary" onClick={handleMarkAll}>
            {tr("Mark All Read", "Marcar Todo como Leído")}
          </button>
        </div>
      </div>

      <div className="admin-card d-flex flex-column gap-3">
        <div>
          <h2 className="h5 mb-1">
            {tr("Send Employee Message", "Enviar Mensaje al Empleado")}
          </h2>
          <p className="text-muted mb-0">
            {tr(
              "This alert pops up for the employee on their next clock-in.",
              "Esta alerta aparece para el empleado en su próxima entrada.",
            )}
          </p>
        </div>
        <div className="row g-2">
          <div className="col-md-4">
            <label className="form-label">{tr("Employee", "Empleado")}</label>
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
            <label className="form-label">{tr("Subject", "Asunto")}</label>
            <input
              className="form-control"
              value={subject}
              maxLength={120}
              onChange={(event) => setSubject(event.target.value)}
              placeholder={tr("Subject", "Asunto")}
            />
          </div>
          <div className="col-12">
            <label className="form-label">{tr("Message", "Mensaje")}</label>
            <textarea
              className="form-control"
              rows={3}
              value={message}
              maxLength={2000}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={tr(
                "Write your message for the employee...",
                "Escribe tu mensaje para el empleado...",
              )}
            />
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            className="btn btn-primary"
            onClick={handleSendMessage}
            disabled={sendingMessage}
          >
            {sendingMessage
              ? tr("Sending...", "Enviando...")
              : tr("Send Message", "Enviar Mensaje")}
          </button>
          {messageStatus && <span className="text-muted">{messageStatus}</span>}
        </div>
      </div>

      <div className="admin-card">
        <div className="notification-toolbar">
          <div className="notification-count">
            {unreadCount} {tr("Unread", "No leídas")}
          </div>
          <label className="notification-filter">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(event) => setUnreadOnly(event.target.checked)}
            />
            {tr("Show unread only", "Mostrar solo no leídas")}
          </label>
        </div>

        {status && <div className="alert alert-danger">{status}</div>}

        {loading ? (
          <div className="empty-state">
            {tr("Loading notifications…", "Cargando notificaciones…")}
          </div>
        ) : notifications.length === 0 ? (
          <div className="empty-state">
            {tr("No notifications yet.", "Aún no hay notificaciones.")}
          </div>
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
                    <div className="notification-title">{notice.message}</div>
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
                        {tr("Mark Read", "Marcar Leída")}
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
