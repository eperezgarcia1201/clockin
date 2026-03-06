import type { AccessPermissions } from "./types";

export type AccessProfileResponse = {
  multiLocationEnabled?: boolean;
  permissions?: Partial<AccessPermissions>;
  actorType?: string;
  employeeId?: string | null;
  allowedOfficeId?: string | null;
  ownerClockExempt?: unknown;
  liquorInventoryEnabled?: boolean;
  premiumFeaturesEnabled?: boolean;
};

const coerceBoolean = (value: unknown): boolean => {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value === 1;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "yes") {
      return true;
    }
    if (
      normalized === "false" ||
      normalized === "0" ||
      normalized === "no" ||
      normalized === ""
    ) {
      return false;
    }
  }
  return false;
};

export const resolveManagerSessionFromAccessProfile = (
  profile: AccessProfileResponse,
): {
  sessionManagerEmployeeId: string | null;
  sessionManagerOfficeId: string | null;
  managerClockExempt: boolean;
} => {
  if (profile.actorType === "manager" && typeof profile.employeeId === "string") {
    const managerOfficeId =
      typeof profile.allowedOfficeId === "string"
        ? profile.allowedOfficeId.trim()
        : "";
    return {
      sessionManagerEmployeeId: profile.employeeId,
      sessionManagerOfficeId: managerOfficeId || null,
      managerClockExempt: coerceBoolean(profile.ownerClockExempt),
    };
  }

  return {
    sessionManagerEmployeeId: null,
    sessionManagerOfficeId: null,
    managerClockExempt: false,
  };
};

export const shouldClearActiveLocationScope = (
  profile: AccessProfileResponse,
): boolean =>
  profile.actorType !== "manager" &&
  (!profile.multiLocationEnabled || !profile.permissions?.manageMultiLocation);
