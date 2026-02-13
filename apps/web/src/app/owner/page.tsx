import Link from "next/link";

export default function OwnerDashboardPage() {
  return (
    <div className="d-flex flex-column gap-4">
      <div className="admin-header">
        <h1>Owner Dashboard</h1>
      </div>

      <div className="admin-card">
        <h2 className="h4 mb-2">Tenant Management</h2>
        <p className="mb-3">
          Create tenant accounts, enable or disable features, and control
          whether tenant access is active.
        </p>
        <Link href="/owner/tenants" className="btn btn-primary">
          Open Tenant Accounts
        </Link>
      </div>
    </div>
  );
}
