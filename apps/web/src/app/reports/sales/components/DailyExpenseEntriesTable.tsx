"use client";

type ExpensePaymentMethod = "CHECK" | "DEBIT_CARD" | "CASH";

type DailyExpenseRow = {
  id: string;
  date: string;
  officeId: string | null;
  officeName: string | null;
  companyName: string;
  paymentMethod: ExpensePaymentMethod;
  invoiceNumber: string;
  amount: number;
  checkNumber: string | null;
  payToCompany: string | null;
  hasReceipt: boolean;
  notes: string;
  submittedBy: string | null;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
};

type DailyExpenseEntriesTableProps = {
  title: string;
  exportExcelLabel: string;
  exportCsvLabel: string;
  exportPdfLabel: string;
  excelHref: string;
  csvHref: string;
  pdfHref: string;
  expenses: DailyExpenseRow[];
  dateLabel: string;
  locationLabel: string;
  companyNameLabel: string;
  methodLabel: string;
  amountLabel: string;
  invoiceNumberLabel: string;
  checkNumberLabel: string;
  payToCompanyLabel: string;
  submittedByLabel: string;
  receiptLabel: string;
  notesLabel: string;
  actionsLabel: string;
  noDataLabel: string;
  viewLabel: string;
  editLabel: string;
  deleteLabel: string;
  expenseSaving: boolean;
  formatDateForDisplay: (date: string) => string;
  formatOfficeName: (officeName: string | null) => string;
  formatMoney: (value: number) => string;
  paymentMethodLabel: (method: ExpensePaymentMethod) => string;
  onEdit: (row: DailyExpenseRow) => void;
  onDelete: (row: DailyExpenseRow) => void;
};

export function DailyExpenseEntriesTable({
  title,
  exportExcelLabel,
  exportCsvLabel,
  exportPdfLabel,
  excelHref,
  csvHref,
  pdfHref,
  expenses,
  dateLabel,
  locationLabel,
  companyNameLabel,
  methodLabel,
  amountLabel,
  invoiceNumberLabel,
  checkNumberLabel,
  payToCompanyLabel,
  submittedByLabel,
  receiptLabel,
  notesLabel,
  actionsLabel,
  noDataLabel,
  viewLabel,
  editLabel,
  deleteLabel,
  expenseSaving,
  formatDateForDisplay,
  formatOfficeName,
  formatMoney,
  paymentMethodLabel,
  onEdit,
  onDelete,
}: DailyExpenseEntriesTableProps) {
  return (
    <section className="admin-card sales-card">
      <div className="sales-card-head">
        <h3>{title}</h3>
        <div className="sales-export-actions">
          <a className="btn btn-outline-secondary" href={excelHref}>
            {exportExcelLabel}
          </a>
          <a className="btn btn-outline-secondary" href={csvHref}>
            {exportCsvLabel}
          </a>
          <a className="btn btn-outline-secondary" href={pdfHref}>
            {exportPdfLabel}
          </a>
        </div>
      </div>
      <div className="table-responsive sales-table-wrap">
        <table className="report-table">
          <thead>
            <tr>
              <th>{dateLabel}</th>
              <th>{locationLabel}</th>
              <th>{companyNameLabel}</th>
              <th>{methodLabel}</th>
              <th>{amountLabel}</th>
              <th>{invoiceNumberLabel}</th>
              <th>{checkNumberLabel}</th>
              <th>{payToCompanyLabel}</th>
              <th>{submittedByLabel}</th>
              <th>{receiptLabel}</th>
              <th>{notesLabel}</th>
              <th>{actionsLabel}</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={12}>{noDataLabel}</td>
              </tr>
            ) : (
              expenses.map((row) => (
                <tr key={row.id}>
                  <td>{formatDateForDisplay(row.date)}</td>
                  <td>{formatOfficeName(row.officeName)}</td>
                  <td>{row.companyName}</td>
                  <td>{paymentMethodLabel(row.paymentMethod)}</td>
                  <td>{formatMoney(row.amount)}</td>
                  <td>{row.invoiceNumber}</td>
                  <td>{row.checkNumber || "-"}</td>
                  <td>{row.payToCompany || "-"}</td>
                  <td>{row.submittedBy || "-"}</td>
                  <td>
                    {row.hasReceipt ? (
                      <a
                        className="btn btn-sm btn-outline-secondary"
                        href={`/api/reports/sales/expenses/${encodeURIComponent(row.id)}/receipt`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {viewLabel}
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>{row.notes || "-"}</td>
                  <td>
                    <div className="d-flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => onEdit(row)}
                        disabled={expenseSaving}
                      >
                        {editLabel}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => onDelete(row)}
                        disabled={expenseSaving}
                      >
                        {deleteLabel}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
