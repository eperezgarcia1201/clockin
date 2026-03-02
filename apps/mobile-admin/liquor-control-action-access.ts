import type { LiquorControlActionsParams } from "./liquor-control-action-hooks.types";

const managerMessage = "Manager reports access is required for liquor control.";
const premiumMessage = "Premium liquor features are disabled for this tenant.";

export const ensureLiquorManagerAccess = (
  params: LiquorControlActionsParams,
  message: string = managerMessage,
) => {
  if (params.hasLiquorManagerAccess) {
    return true;
  }
  params.setLiquorStatus(message);
  return false;
};

export const ensureLiquorPremiumAccess = (
  params: LiquorControlActionsParams,
  message: string = premiumMessage,
) => {
  if (params.hasLiquorPremiumAccess) {
    return true;
  }
  params.setLiquorStatus(message);
  return false;
};
