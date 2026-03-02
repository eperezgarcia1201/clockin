import type { EditUserForm } from "./types";

export type EditUserDetailsResponse = {
  fullName: string;
  displayName?: string | null;
  email?: string | null;
  hourlyRate?: number | null;
  officeId?: string | null;
  groupId?: string | null;
  isManager?: boolean;
  isOwnerManager?: boolean;
  isAdmin?: boolean;
  isTimeAdmin?: boolean;
  isReports?: boolean;
  isServer?: boolean;
  isKitchenManager?: boolean;
  disabled?: boolean;
};

export const mapEditUserDetailsToForm = (
  data: EditUserDetailsResponse,
): EditUserForm => ({
  fullName: data.fullName || "",
  displayName: data.displayName || "",
  email: data.email || "",
  pin: "",
  hourlyRate:
    typeof data.hourlyRate === "number" && Number.isFinite(data.hourlyRate)
      ? String(data.hourlyRate)
      : "",
  officeId: data.officeId || "",
  groupId: data.groupId || "",
  isManager: Boolean(data.isManager),
  isOwnerManager: Boolean(data.isOwnerManager),
  isAdmin: Boolean(data.isAdmin),
  isTimeAdmin: Boolean(data.isTimeAdmin),
  isReports: Boolean(data.isReports),
  isServer: Boolean(data.isServer),
  isKitchenManager: Boolean(data.isKitchenManager),
  disabled: Boolean(data.disabled),
});

export type EditUserPayloadValidationResult =
  | { ok: false; error: string }
  | { ok: true; payload: Record<string, unknown> };

export const buildEditUserPayload = (
  form: EditUserForm,
): EditUserPayloadValidationResult => {
  const fullName = form.fullName.trim();
  if (!fullName) {
    return { ok: false, error: "Full name is required." };
  }

  const pin = form.pin.trim();
  if (pin && !/^\d{4}$/.test(pin)) {
    return { ok: false, error: "PIN must be 4 digits." };
  }

  let hourlyRate: number | undefined;
  const hourlyRateRaw = form.hourlyRate.trim();
  if (hourlyRateRaw) {
    const parsed = Number(hourlyRateRaw);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return { ok: false, error: "Hourly rate must be 0 or higher." };
    }
    hourlyRate = parsed;
  }

  const payload: Record<string, unknown> = {
    fullName,
    displayName: form.displayName.trim() || fullName,
    email: form.email.trim(),
    officeId: form.officeId,
    groupId: form.groupId,
    isManager: form.isManager,
    isOwnerManager: form.isManager ? form.isOwnerManager : false,
    isAdmin: form.isAdmin,
    isTimeAdmin: form.isTimeAdmin,
    isReports: form.isReports,
    isServer: form.isServer,
    isKitchenManager: form.isKitchenManager,
    disabled: form.disabled,
  };

  if (hourlyRate !== undefined) {
    payload.hourlyRate = hourlyRate;
  }
  if (pin) {
    payload.pin = pin;
  }

  return { ok: true, payload };
};
