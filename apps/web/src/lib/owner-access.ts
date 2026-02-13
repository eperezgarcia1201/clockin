import { redirect } from "next/navigation";
import { getOwnerSession } from "./owner-session";

export async function requireOwner() {
  const session = await getOwnerSession();
  if (!session) {
    redirect("/owner-login");
  }
  return session;
}
