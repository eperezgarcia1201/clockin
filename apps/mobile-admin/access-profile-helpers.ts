import type { AccessPermissions } from "./types";

export type AccessProfileResponse = {
  multiLocationEnabled?: boolean;
  permissions?: Partial<AccessPermissions>;
  actorType?: string;
  employeeId?: string | null;
  allowedOfficeId?: string | null;
  ownerClockExempt?: boolean;
  liquorInventoryEnabled?: boolean;
  premiumFeaturesEnabled?: boolean;
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
      managerClockExempt: Boolean(profile.ownerClockExempt),
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
