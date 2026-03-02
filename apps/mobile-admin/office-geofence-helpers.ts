export type GeofenceValidationResult =
  | {
      ok: true;
      hasLatitude: boolean;
      hasLongitude: boolean;
    }
  | {
      ok: false;
      error: string;
    };

export const validateGeofenceValues = (
  latitude: number | null,
  longitude: number | null,
  radius: number | null,
): GeofenceValidationResult => {
  if (
    Number.isNaN(latitude) ||
    Number.isNaN(longitude) ||
    Number.isNaN(radius)
  ) {
    return {
      ok: false,
      error: "Enter valid numeric geofence values.",
    };
  }

  const hasLatitude = latitude !== null;
  const hasLongitude = longitude !== null;
  if (hasLatitude !== hasLongitude) {
    return {
      ok: false,
      error: "Latitude and longitude are required together.",
    };
  }

  return {
    ok: true,
    hasLatitude,
    hasLongitude,
  };
};

export const buildCreateOfficePayload = (params: {
  name: string;
  latitude: number | null;
  longitude: number | null;
  radius: number | null;
}): Record<string, unknown> => {
  const payload: Record<string, unknown> = {
    name: params.name.trim(),
  };
  if (params.latitude !== null && params.longitude !== null) {
    payload.latitude = params.latitude;
    payload.longitude = params.longitude;
    if (params.radius !== null) {
      payload.geofenceRadiusMeters = params.radius;
    }
  }
  return payload;
};

export const buildOfficeGeofencePatchPayload = (params: {
  hasLatitude: boolean;
  hasLongitude: boolean;
  latitude: number | null;
  longitude: number | null;
  radius: number | null;
}): Record<string, unknown> => {
  const payload: Record<string, unknown> = {};
  if (params.hasLatitude && params.hasLongitude) {
    payload.latitude = params.latitude;
    payload.longitude = params.longitude;
    payload.geofenceRadiusMeters = params.radius;
  } else {
    payload.latitude = null;
    payload.longitude = null;
    payload.geofenceRadiusMeters = null;
  }
  return payload;
};
