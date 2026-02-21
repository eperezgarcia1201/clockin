export default function SupportPage() {
  return (
    <main className="page policy-page">
      <section className="policy-card">
        <div className="policy-header">
          <h1>Support</h1>
          <p>Need help with ClockIn setup, access, or troubleshooting?</p>
        </div>
        <div className="policy-body">
          <h2>Contact Support</h2>
          <p>
            Email: <strong>support@websysclockin.com</strong>
          </p>

          <h2>What to Include</h2>
          <ul>
            <li>Your organization name.</li>
            <li>The issue and affected screen (Web, Employee App, Admin App).</li>
            <li>Date/time and timezone when the issue occurred.</li>
            <li>Screenshots or exact error messages.</li>
          </ul>

          <h2>Admin Access</h2>
          <p>
            For admin login issues, include the admin username and your company
            domain so we can validate tenant access quickly.
          </p>
        </div>
      </section>
    </main>
  );
}
