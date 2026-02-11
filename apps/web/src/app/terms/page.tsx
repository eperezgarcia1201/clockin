export default function TermsOfService() {
  return (
    <main className="page policy-page">
      <section className="policy-card">
        <div className="policy-header">
          <h1>Terms of Service</h1>
          <p>Last updated: February 11, 2026</p>
        </div>
        <div className="policy-body">
          <p>
            These Terms govern the use of ClockIn. By using the service, you
            agree to these terms.
          </p>

          <h2>Accounts</h2>
          <p>
            Access is provided by your organization. You are responsible for
            keeping your credentials and PIN secure.
          </p>

          <h2>Acceptable Use</h2>
          <ul>
            <li>Use the service for lawful workplace time tracking only.</li>
            <li>Do not attempt to access data you are not authorized to view.</li>
          </ul>

          <h2>Availability</h2>
          <p>
            We aim for high availability but do not guarantee uninterrupted
            access. Maintenance or outages may occur.
          </p>

          <h2>Data & Ownership</h2>
          <p>
            Your organization owns its data. We process data solely to provide
            the service.
          </p>

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
