import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "ClockIn Mobile",
  description:
    "ClockIn is a modern punch clock for teams. Employees clock in with name + PIN, track breaks and lunch, and get instant confirmation.",
};

export default function MarketingPage() {
  return (
    <main className="page marketing-page">
      <header className="landing-nav marketing-nav">
        <div className="landing-brand">
          <div className="landing-logo">
            <Image
              src="/websys-logo.png"
              alt="Websys logo"
              width={40}
              height={40}
              className="landing-logo-image"
              priority
            />
          </div>
          <div className="landing-brand-text">
            <div className="landing-brand-name">Websys</div>
            <div className="landing-brand-sub">ClockIn</div>
          </div>
        </div>
        <nav className="landing-links">
          <a href="/" className="landing-link">
            <i className="fa-solid fa-gauge" aria-hidden="true" />
            Dashboard
          </a>
          <a href="/privacy" className="landing-link">
            <i className="fa-solid fa-shield-halved" aria-hidden="true" />
            Privacy
          </a>
          <a href="/terms" className="landing-link">
            <i className="fa-solid fa-file-lines" aria-hidden="true" />
            Terms
          </a>
          <a href="/support" className="landing-link">
            <i className="fa-solid fa-life-ring" aria-hidden="true" />
            Support
          </a>
        </nav>
      </header>

      <div className="container-xl marketing-container">
        <section className="marketing-hero">
          <div className="marketing-hero-text">
            <span className="marketing-badge">
              <i className="fa-solid fa-mobile-screen-button" aria-hidden="true" />
              ClockIn Mobile
            </span>
            <h1>Clock in fast. Stay accurate. Keep teams on time.</h1>
            <p>
              ClockIn is the modern punch clock for teams that want clean, reliable time
              tracking. Employees clock in with their name and PIN, log breaks and lunch,
              and get instant confirmation in a kiosk-ready interface.
            </p>
            <div className="marketing-hero-actions">
              <a className="marketing-primary" href="mailto:support@websysclockin.com">
                Contact Support
              </a>
              <a className="marketing-secondary" href="/admin-login">
                Admin Login
              </a>
            </div>
          </div>

          <div className="marketing-hero-panel">
            <div className="marketing-panel-header">
              <span>Built for daily punch flow</span>
              <strong>Clock Station Snapshot</strong>
            </div>
            <div className="marketing-panel-grid">
              <div className="marketing-panel-card">
                <h3>Employees</h3>
                <ul>
                  <li>Enter name + 4-digit PIN</li>
                  <li>Tap IN, OUT, BREAK, LUNCH</li>
                  <li>Get instant status confirmation</li>
                </ul>
              </div>
              <div className="marketing-panel-card">
                <h3>Admins</h3>
                <ul>
                  <li>Live punch activity feed</li>
                  <li>Break compliance alerts</li>
                  <li>Export-ready reports</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="marketing-stats">
          <div className="marketing-stat">
            <strong>Seconds</strong>
            <span>to punch in or out</span>
          </div>
          <div className="marketing-stat">
            <strong>Kiosk-ready</strong>
            <span>for tablets and front desks</span>
          </div>
          <div className="marketing-stat">
            <strong>iPhone + iPad</strong>
            <span>designed for mobile teams</span>
          </div>
          <div className="marketing-stat">
            <strong>Secure</strong>
            <span>tenant isolation and audit trails</span>
          </div>
        </section>

        <section className="marketing-features">
          <div className="marketing-section-header">
            <h2>Why teams choose ClockIn</h2>
            <p>Clarity at the punch station and consistency in every report.</p>
          </div>
          <div className="marketing-feature-grid">
            <article className="marketing-feature-card">
              <i className="fa-solid fa-stopwatch" aria-hidden="true" />
              <h3>Fast punches</h3>
              <p>Minimal steps keep lines moving while still verifying the right employee.</p>
            </article>
            <article className="marketing-feature-card">
              <i className="fa-solid fa-mug-hot" aria-hidden="true" />
              <h3>Break &amp; lunch tracking</h3>
              <p>Dedicated actions keep compliance data clean without extra admin work.</p>
            </article>
            <article className="marketing-feature-card">
              <i className="fa-solid fa-bell" aria-hidden="true" />
              <h3>Operational alerts</h3>
              <p>Admins stay informed with live punch notifications and exception signals.</p>
            </article>
            <article className="marketing-feature-card">
              <i className="fa-solid fa-chart-line" aria-hidden="true" />
              <h3>Exportable reporting</h3>
              <p>Hours, audit logs, and payroll exports are ready when you need them.</p>
            </article>
          </div>
        </section>

        <section className="marketing-steps">
          <div className="marketing-section-header">
            <h2>How it works</h2>
            <p>Every punch is consistent, verified, and visible to admins.</p>
          </div>
          <div className="marketing-step-grid">
            <div className="marketing-step">
              <span className="marketing-step-number">01</span>
              <h3>Identify</h3>
              <p>Employees enter their name and PIN at the station.</p>
            </div>
            <div className="marketing-step">
              <span className="marketing-step-number">02</span>
              <h3>Punch</h3>
              <p>Select IN, OUT, BREAK, or LUNCH with instant confirmation.</p>
            </div>
            <div className="marketing-step">
              <span className="marketing-step-number">03</span>
              <h3>Report</h3>
              <p>Admins review activity, alerts, and exports in ClockIn Admin.</p>
            </div>
          </div>
        </section>

        <section className="marketing-privacy">
          <div>
            <h2>Privacy-first by design</h2>
            <p>
              ClockIn collects only the data needed for workforce time tracking. Records
              stay within your organization, with audit trails and export controls.
            </p>
          </div>
          <a className="marketing-secondary" href="/privacy">
            Read Privacy Policy
          </a>
        </section>

        <section className="marketing-cta">
          <div>
            <h2>Ready to clock in?</h2>
            <p>
              ClockIn works with your organization’s admin platform. Need access or setup
              help? Reach out and we’ll point you in the right direction.
            </p>
          </div>
          <div className="marketing-hero-actions">
            <a className="marketing-primary" href="mailto:support@websysclockin.com">
              Email Support
            </a>
            <a className="marketing-secondary" href="/terms">
              Terms of Service
            </a>
          </div>
        </section>

        <footer className="legal-footer marketing-footer">
          <a href="/privacy">Privacy Policy</a>
          <span>•</span>
          <a href="/terms">Terms of Service</a>
          <span>•</span>
          <a href="/support">Support</a>
        </footer>
      </div>
    </main>
  );
}
