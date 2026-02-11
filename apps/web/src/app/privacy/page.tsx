export default function PrivacyPolicy() {
  return (
    <main className="page policy-page">
      <section className="policy-card">
        <div className="policy-header">
          <h1>Privacy Policy</h1>
          <p>Last updated: February 11, 2026</p>
        </div>
        <div className="policy-body">
          <p>
            ClockIn ("we", "our", "us") provides time tracking for employees and
            administrators. This Privacy Policy explains what data we collect,
            how we use it, and your choices.
          </p>

          <h2>Information We Collect</h2>
          <ul>
            <li>Account details (name, email, role, office, group).</li>
            <li>Work activity (clock-in, clock-out, breaks, schedule data).</li>
            <li>Device and app metadata for security and diagnostics.</li>
          </ul>

          <h2>How We Use Data</h2>
          <ul>
            <li>Provide time tracking, reports, and payroll summaries.</li>
            <li>Send operational notifications (e.g., punch alerts).</li>
            <li>Maintain security, audit trails, and system reliability.</li>
          </ul>

          <h2>Sharing</h2>
          <p>
            We do not sell personal data. Data is shared only with your
            organization’s authorized administrators and service providers that
            help us operate the platform.
          </p>

          <h2>Retention</h2>
          <p>
            Data is retained based on your organization’s policies and legal
            requirements. Administrators can export or delete records where
            permitted.
          </p>

          <h2>Your Choices</h2>
          <ul>
            <li>Contact your administrator to update profile details.</li>
            <li>Request exports or deletion where allowed by policy.</li>
          </ul>

          <h2>Contact</h2>
          <p>
            Questions? Contact your organization’s admin or email{" "}
            <strong>support@websysclockin.com</strong>.
          </p>
        </div>
      </section>
    </main>
  );
}
