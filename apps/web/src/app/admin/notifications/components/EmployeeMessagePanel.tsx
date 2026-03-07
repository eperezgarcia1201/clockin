import type { EmployeeRow } from "../../../../lib/api/users-admin";
import type { AdminNotificationsTranslate } from "../types";

type EmployeeMessagePanelProps = {
  employeeId: string;
  employees: EmployeeRow[];
  message: string;
  messageStatus: string | null;
  onEmployeeIdChange: (value: string) => void;
  onMessageChange: (value: string) => void;
  onSend: () => void;
  onSubjectChange: (value: string) => void;
  sendingMessage: boolean;
  subject: string;
  tr: AdminNotificationsTranslate;
};

export function EmployeeMessagePanel({
  employeeId,
  employees,
  message,
  messageStatus,
  onEmployeeIdChange,
  onMessageChange,
  onSend,
  onSubjectChange,
  sendingMessage,
  subject,
  tr,
}: EmployeeMessagePanelProps) {
  return (
    <div className="admin-card d-flex flex-column gap-3">
      <div>
        <h2 className="h5 mb-1">
          {tr("Send Employee Message", "Enviar Mensaje al Empleado")}
        </h2>
        <p className="text-muted mb-0">
          {tr(
            "This alert pops up for the employee on their next clock-in.",
            "Esta alerta aparece para el empleado en su proxima entrada.",
          )}
        </p>
      </div>
      <div className="row g-2">
        <div className="col-md-4">
          <label className="form-label">{tr("Employee", "Empleado")}</label>
          <select
            className="form-select"
            value={employeeId}
            onChange={(event) => onEmployeeIdChange(event.target.value)}
            disabled={!employees.length || sendingMessage}
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
            onChange={(event) => onSubjectChange(event.target.value)}
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
            onChange={(event) => onMessageChange(event.target.value)}
            placeholder={tr(
              "Write your message for the employee...",
              "Escribe tu mensaje para el empleado...",
            )}
          />
        </div>
      </div>
      <div className="d-flex align-items-center gap-2 flex-wrap">
        <button className="btn btn-primary" onClick={onSend} disabled={sendingMessage}>
          {sendingMessage ? tr("Sending...", "Enviando...") : tr("Send Message", "Enviar Mensaje")}
        </button>
        {messageStatus ? <span className="text-muted">{messageStatus}</span> : null}
      </div>
    </div>
  );
}
