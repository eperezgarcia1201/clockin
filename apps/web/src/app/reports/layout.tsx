import { redirect } from "next/navigation";
import { auth0, authConfigured } from "../../lib/auth0";
import { requireAdmin } from "../../lib/admin-access";
import { AdminShell } from "../../components/admin-shell";

export default async function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (authConfigured && auth0) {
    const session = await auth0.getSession();
    if (!session) {
      return redirect("/admin-login");
    }
  }

  await requireAdmin();

  return <AdminShell variant="reports">{children}</AdminShell>;
}
