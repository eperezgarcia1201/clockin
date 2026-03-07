import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  sendEmployeeMessage,
  type NotificationRow,
} from "../../../../lib/api/notifications-admin";
import {
  listEmployees,
  type EmployeeRow,
} from "../../../../lib/api/users-admin";
import type { AdminNotificationsTranslate } from "../types";

export function useNotificationFeed(tr: AdminNotificationsTranslate) {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageStatus, setMessageStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(true);
  const [feedStatus, setFeedStatus] = useState<string | null>(null);

  const unreadCount = useMemo(
    () => notifications.filter((notice) => !notice.readAt).length,
    [notifications],
  );

  const loadNotificationsFeed = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listNotifications({ limit: 50, unreadOnly });
      setNotifications(rows);
      setFeedStatus(null);
    } catch (error) {
      setFeedStatus(
        error instanceof Error
          ? error.message
          : tr(
              "Unable to load notifications.",
              "No se pudieron cargar las notificaciones.",
            ),
      );
    } finally {
      setLoading(false);
    }
  }, [tr, unreadOnly]);

  useEffect(() => {
    void loadNotificationsFeed();
  }, [loadNotificationsFeed]);

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

  const handleMarkRead = useCallback(
    async (id: string) => {
      try {
        await markNotificationRead(id);
        setNotifications((previous) =>
          previous.map((notice) =>
            notice.id === id
              ? { ...notice, readAt: new Date().toISOString() }
              : notice,
          ),
        );
      } catch (error) {
        setFeedStatus(
          error instanceof Error
            ? error.message
            : tr(
                "Unable to mark the notification as read.",
                "No se pudo marcar la notificación como leída.",
              ),
        );
      }
    },
    [tr],
  );

  const handleMarkAll = useCallback(async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((previous) =>
        previous.map((notice) => ({ ...notice, readAt: new Date().toISOString() })),
      );
      setFeedStatus(null);
    } catch (error) {
      setFeedStatus(
        error instanceof Error
          ? error.message
          : tr(
              "Unable to mark all notifications as read.",
              "No se pudieron marcar todas las notificaciones como leídas.",
            ),
      );
    }
  }, [tr]);

  const handleSendMessage = useCallback(async () => {
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
      setMessageStatus(tr("Message is required.", "El mensaje es obligatorio."));
      return;
    }

    setSendingMessage(true);
    setMessageStatus(null);
    try {
      await sendEmployeeMessage({
        employeeId,
        message: trimmedMessage,
        subject: trimmedSubject,
      });
      setSubject("");
      setMessage("");
      setMessageStatus(
        tr(
          "Message sent. It will appear when the employee clocks in.",
          "Mensaje enviado. Aparecerá cuando el empleado marque entrada.",
        ),
      );
      await loadNotificationsFeed();
    } catch (error) {
      setMessageStatus(
        error instanceof Error
          ? error.message
          : tr("Unable to send message.", "No se pudo enviar el mensaje."),
      );
    } finally {
      setSendingMessage(false);
    }
  }, [employeeId, loadNotificationsFeed, message, subject, tr]);

  return {
    employeeId,
    employees,
    feedStatus,
    handleMarkAll,
    handleMarkRead,
    handleSendMessage,
    loadNotificationsFeed,
    loading,
    message,
    messageStatus,
    notifications,
    sendingMessage,
    setEmployeeId,
    setMessage,
    setSubject,
    setUnreadOnly,
    subject,
    unreadCount,
    unreadOnly,
  };
}
