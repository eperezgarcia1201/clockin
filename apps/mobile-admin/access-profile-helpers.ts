import type { AccessPermissions } from "./types";

export type AccessProfileResponse = {
  multiLocationEnabled?: boolean;
  permissions?: Partial<AccessPermissions>;
  actorType?: string;
  employeeId?: string | null;
  ownerClockExempt?: boolean;
  liquorInventoryEnabled?: boolean;
  premiumFeaturesEnabled?: boolean;
};

export const resolveManagerSessionFromAccessProfile = (
  profile: AccessProfileResponse,
): {
  sessionManagerEmployeeId: string | null;
  managerClockExempt: boolean;
} => {
  if (profile.actorType === "manager" && typeof profile.employeeId === "string") {
    return {
      sessionManagerEmployeeId: profile.employeeId,
      managerClockExempt: Boolean(profile.ownerClockExempt),
    };
  }

  return {
    sessionManagerEmployeeId: null,
    managerClockExempt: false,
  };
};

export const shouldClearActiveLocationScope = (
  profile: AccessProfileResponse,
): boolean =>
  !profile.multiLocationEnabled || !profile.permissions?.manageMultiLocation;
