import { OwnerShell } from "../../components/owner-shell";
import { requireOwner } from "../../lib/owner-access";

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOwner();
  return <OwnerShell>{children}</OwnerShell>;
}
