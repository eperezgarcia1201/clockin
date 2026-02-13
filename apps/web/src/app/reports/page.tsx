export default function ReportsHome() {
  return (
    <div className="reports-home">
      <div className="reports-hero">
        <h1>Run Reports</h1>
        <p>Generate fast, accurate summaries for payroll and compliance.</p>
      </div>

      <div className="reports-menu">
        <a className="report-tile" href="/reports/daily">
          <div className="report-icon report-icon--daily">
            <i className="fa-solid fa-chart-column" aria-hidden="true" />
          </div>
          <div className="report-copy">
            <h2>Daily Time Report</h2>
            <p>Total hours worked in the selected date range per employee.</p>
          </div>
          <div className="report-action">
            <i className="fa-solid fa-chevron-right" aria-hidden="true" />
          </div>
        </a>

        <a className="report-tile" href="/reports/hours">
          <div className="report-icon report-icon--hours">
            <i className="fa-solid fa-clock" aria-hidden="true" />
          </div>
          <div className="report-copy">
            <h2>Hours Worked Report</h2>
            <p>Track total hours and rounding for each employee.</p>
          </div>
          <div className="report-action">
            <i className="fa-solid fa-chevron-right" aria-hidden="true" />
          </div>
        </a>

        <a className="report-tile" href="/reports/payroll">
          <div className="report-icon report-icon--payroll">
            <i className="fa-solid fa-sack-dollar" aria-hidden="true" />
          </div>
          <div className="report-copy">
            <h2>Payroll Summary</h2>
            <p>Weekly totals with overtime and earnings by employee.</p>
          </div>
          <div className="report-action">
            <i className="fa-solid fa-chevron-right" aria-hidden="true" />
          </div>
        </a>

        <a className="report-tile" href="/reports/audit">
          <div className="report-icon report-icon--audit">
            <i className="fa-solid fa-clipboard-check" aria-hidden="true" />
          </div>
          <div className="report-copy">
            <h2>Audit Log</h2>
            <p>Review all punches with date, time, and office details.</p>
          </div>
          <div className="report-action">
            <i className="fa-solid fa-chevron-right" aria-hidden="true" />
          </div>
        </a>

        <a className="report-tile" href="/reports/tips">
          <div className="report-icon report-icon--payroll">
            <i className="fa-solid fa-hand-holding-dollar" aria-hidden="true" />
          </div>
          <div className="report-copy">
            <h2>Tips Report</h2>
            <p>Review cash and credit card tips per server by day.</p>
          </div>
          <div className="report-action">
            <i className="fa-solid fa-chevron-right" aria-hidden="true" />
          </div>
        </a>
      </div>
    </div>
  );
}
