"use client";

import type { SalesLocationBreakdownRow } from "../location-breakdown";

type SalesLocationBreakdownTableProps = {
  title: string;
  description: string;
  summaryLabel: string;
  rows: SalesLocationBreakdownRow[];
  locationLabel: string;
  salesReportsLabel: string;
  expenseEntriesLabel: string;
  totalSalesLabel: string;
  paymentsLabel: string;
  balanceLabel: string;
  totalExpensesLabel: string;
  formatOfficeName: (officeName: string | null) => string;
  formatMoney: (value: number) => string;
};

export function SalesLocationBreakdownTable({
  title,
  description,
  summaryLabel,
  rows,
  locationLabel,
  salesReportsLabel,
  expenseEntriesLabel,
  totalSalesLabel,
  paymentsLabel,
  balanceLabel,
  totalExpensesLabel,
  formatOfficeName,
  formatMoney,
}: SalesLocationBreakdownTableProps) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <section className="admin-card sales-card">
      <div className="sales-card-head">
        <div className="sales-location-breakdown-copy">
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <p className="sales-location-breakdown-count">{summaryLabel}</p>
      </div>
      <div className="table-responsive sales-table-wrap">
        <table className="report-table">
          <thead>
            <tr>
              <th>{locationLabel}</th>
              <th>{salesReportsLabel}</th>
              <th>{expenseEntriesLabel}</th>
              <th>{totalSalesLabel}</th>
              <th>{paymentsLabel}</th>
              <th>{balanceLabel}</th>
              <th>{totalExpensesLabel}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.officeId || row.officeName || "__unassigned__"}>
                <td>{formatOfficeName(row.officeName)}</td>
                <td>{row.reportCount}</td>
                <td>{row.expenseCount}</td>
                <td>{formatMoney(row.totalSales)}</td>
                <td>{formatMoney(row.totalPayments)}</td>
                <td>{formatMoney(row.balance)}</td>
                <td>{formatMoney(row.totalExpenses)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
