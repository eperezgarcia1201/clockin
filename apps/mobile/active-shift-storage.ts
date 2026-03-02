import type { ActiveShift, Employee, TenantContext } from "./types";

export const parseStoredActiveShift = (
  raw: string,
  tenant: TenantContext,
): ActiveShift | null => {
  const parsed = JSON.parse(raw) as Partial<ActiveShift>;
  const employeeId =
    typeof parsed.employeeId === "string" ? parsed.employeeId.trim() : "";
  const employeeName =
    typeof parsed.employeeName === "string" ? parsed.employeeName.trim() : "";
  if (!employeeId || !employeeName) {
    return null;
  }
  const parsedAuthOrgId =
    typeof parsed.tenantAuthOrgId === "string"
      ? parsed.tenantAuthOrgId.trim()
      : "";
  const parsedSlug =
    typeof parsed.tenantSlug === "string" ? parsed.tenantSlug.trim() : "";
  const matchesTenant = parsedAuthOrgId
    ? parsedAuthOrgId === tenant.authOrgId
    : parsedSlug
      ? parsedSlug === tenant.slug
      : true;
  if (!matchesTenant) {
    return null;
  }
  return {
    tenantAuthOrgId: parsedAuthOrgId || tenant.authOrgId,
    tenantSlug: parsedSlug || tenant.slug,
    employeeId,
    employeeName,
    isManager: Boolean(parsed.isManager),
    isServer: Boolean(parsed.isServer),
    isKitchenManager: Boolean(parsed.isKitchenManager),
    startedAt:
      typeof parsed.startedAt === "string" && parsed.startedAt.trim()
        ? parsed.startedAt
        : new Date().toISOString(),
    pin:
      typeof parsed.pin === "string" && parsed.pin.trim()
        ? parsed.pin
        : undefined,
  };
};

export const buildEmployeeActiveShift = ({
  tenant,
  employee,
  pin,
}: {
  tenant: TenantContext;
  employee: Employee;
  pin?: string;
}): ActiveShift => ({
  tenantAuthOrgId: tenant.authOrgId,
  tenantSlug: tenant.slug,
  employeeId: employee.id,
  employeeName: employee.name,
  isManager: Boolean(employee.isManager),
  isServer: Boolean(employee.isServer),
  isKitchenManager: Boolean(employee.isKitchenManager),
  startedAt: new Date().toISOString(),
  pin: pin || undefined,
});
