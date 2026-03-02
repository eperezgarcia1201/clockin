export type CreateUserPayload = {
  fullName: string;
  displayName: string;
  email?: string;
  pin?: string;
  officeId?: string;
  isManager: boolean;
  isOwnerManager: boolean;
  isAdmin: boolean;
  isTimeAdmin: boolean;
  isReports: boolean;
  isServer: boolean;
  isKitchenManager: boolean;
};

export const validateCreateUserName = (
  fullName: string,
): { ok: true; fullName: string } | { ok: false } => {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return { ok: false };
  }
  return { ok: true, fullName: trimmed };
};

export const buildCreateUserPayload = (params: {
  fullName: string;
  email: string;
  pin: string;
  officeId: string;
  isManager: boolean;
  isOwnerManager: boolean;
  isAdmin: boolean;
  isTimeAdmin: boolean;
  isReports: boolean;
  isServer: boolean;
  isKitchenManager: boolean;
}): CreateUserPayload => ({
  fullName: params.fullName.trim(),
  displayName: params.fullName.trim(),
  email: params.email.trim() || undefined,
  pin: params.pin.trim() || undefined,
  officeId: params.officeId || undefined,
  isManager: params.isManager,
  isOwnerManager: params.isManager ? params.isOwnerManager : false,
  isAdmin: params.isAdmin,
  isTimeAdmin: params.isTimeAdmin,
  isReports: params.isReports,
  isServer: params.isServer,
  isKitchenManager: params.isKitchenManager,
});
