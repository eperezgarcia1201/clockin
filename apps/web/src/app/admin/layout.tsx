import { redirect } from "next/navigation";
import { auth0, authConfigured } from "../../lib/auth0";
import { requireAdmin } from "../../lib/admin-access";
import { AdminShell } from "../../components/admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (authConfigured && auth0) {
    const session = await auth0.getSession();
    if (!session) {
      // Use local login page (SSO option included there).
      return redirect("/admin-login");
    }
  }

  await requireAdmin();

  return <AdminShell variant="admin">{children}</AdminShell>;
}
