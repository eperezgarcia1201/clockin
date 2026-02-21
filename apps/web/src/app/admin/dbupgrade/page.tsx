export default function DbUpgrade() {
  return (
    <div className="d-flex flex-column gap-4">
      <div className="admin-header">
        <h1>Upgrade Database</h1>
      </div>
      <div className="admin-card">
        <p className="mb-0">
          Database migrations will be handled through Prisma migrations.
          We'll expose safe migration status here in a future admin release.
        </p>
      </div>
    </div>
  );
}
