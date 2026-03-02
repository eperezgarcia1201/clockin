export const buildPunchPayloads = ({
  type,
  pin,
  coordinates,
}: {
  type: string;
  pin?: string;
  coordinates: { latitude: number; longitude: number } | null;
}): {
  basePayload: Record<string, unknown>;
  payloadWithGeo: Record<string, unknown>;
} => {
  const basePayload: Record<string, unknown> = {
    type,
    pin,
  };
  const payloadWithGeo: Record<string, unknown> = coordinates
    ? {
        ...basePayload,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      }
    : basePayload;
  return {
    basePayload,
    payloadWithGeo,
  };
};

export const shouldRetryPunchWithoutOptionalFields = ({
  basePayload,
  payloadWithGeo,
  errorMessage,
}: {
  basePayload: Record<string, unknown>;
  payloadWithGeo: Record<string, unknown>;
  errorMessage: string;
}): boolean => {
  const optionalKeysUsed =
    Object.keys(payloadWithGeo).length > Object.keys(basePayload).length;
  return optionalKeysUsed && errorMessage.includes("should not exist");
};

export const isEmployeeNotFoundPunchError = (message: string) =>
  message.toLowerCase().includes("employee not found");

export const isServerTipsRequiredPunchError = (message: string) => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("server users must submit") ||
    normalized.includes("submit cash and credit card tips")
  );
};

export const isAlreadyHasActiveShiftError = (message: string) =>
  message.toLowerCase().includes("already has an active shift");

export const isInvalidPinPunchError = (message: string) =>
  message.toLowerCase().includes("invalid pin");
