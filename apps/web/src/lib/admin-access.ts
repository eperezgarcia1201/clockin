import { redirect } from "next/navigation";
import { clockinFetch } from "./clockin-api";
import { getAdminSession } from "./admin-session";
import { authConfigured } from "./auth0";

type AccessResponse = {
  role: string;
  status: string;
  isAdmin: boolean;
};

export async function requireAdmin() {
  const session = await getAdminSession();
  if (session) {
    return;
  }

  if (!authConfigured) {
    redirect("/admin-login");
  }

  try {
    const response = await clockinFetch("/access/me");
    if (!response.ok) {
      redirect("/admin-login");
    }
    const data = (await response.json()) as AccessResponse;
    if (!data.isAdmin) {
      redirect("/admin-login");
    }
  } catch {
    redirect("/admin-login");
  }
}
