import {
  parseOptionalCoordinate,
  parseOptionalRadius,
} from "./app-helpers";
import {
  buildCreateOfficePayload,
  buildOfficeGeofencePatchPayload,
  validateGeofenceValues,
} from "./office-geofence-helpers";

type FetchJson = (path: string, init?: RequestInit) => Promise<unknown>;

export const createOfficeRequest = async (params: {
  fetchJson: FetchJson;
  name: string;
  latitudeInput: string;
  longitudeInput: string;
  radiusInput: string;
}): Promise<
  | { ok: true; createdOfficeId: string | null }
  | { ok: false; error: string }
> => {
  if (!params.name.trim()) {
    return { ok: false, error: "Enter a location name." };
  }

  const latitude = parseOptionalCoordinate(params.latitudeInput);
  const longitude = parseOptionalCoordinate(params.longitudeInput);
  const radius = parseOptionalRadius(params.radiusInput);

  const geofenceValidation = validateGeofenceValues(latitude, longitude, radius);
  if (geofenceValidation.ok === false) {
    return { ok: false, error: geofenceValidation.error };
  }

  try {
    const created = (await params.fetchJson("/offices", {
      method: "POST",
      body: JSON.stringify(
        buildCreateOfficePayload({
          name: params.name,
          latitude,
          longitude,
          radius,
        }),
      ),
    })) as { id?: string };
    return { ok: true, createdOfficeId: created?.id || null };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Unable to create location.",
    };
  }
};

export const saveOfficeGeofenceRequest = async (params: {
  fetchJson: FetchJson;
  officeId: string;
  payload: Record<string, unknown>;
}): Promise<{ ok: true } | { ok: false; error: string }> => {
  try {
    await params.fetchJson(`/offices/${params.officeId}`, {
      method: "PATCH",
      body: JSON.stringify(params.payload),
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Unable to update geofence.",
    };
  }
};

export const prepareOfficeGeofenceSave = (params: {
  officeId: string | null | undefined;
  latitudeInput: string;
  longitudeInput: string;
  radiusInput: string;
}):
  | { ok: false; error: string }
  | { ok: true; officeId: string; payload: Record<string, unknown> } => {
  if (!params.officeId) {
    return { ok: false, error: "Select a location first." };
  }

  const latitude = parseOptionalCoordinate(params.latitudeInput);
  const longitude = parseOptionalCoordinate(params.longitudeInput);
  const radius = parseOptionalRadius(params.radiusInput);

  const geofenceValidation = validateGeofenceValues(latitude, longitude, radius);
  if (geofenceValidation.ok === false) {
    return { ok: false, error: geofenceValidation.error };
  }

  return {
    ok: true,
    officeId: params.officeId,
    payload: buildOfficeGeofencePatchPayload({
      hasLatitude: geofenceValidation.hasLatitude,
      hasLongitude: geofenceValidation.hasLongitude,
      latitude,
      longitude,
      radius,
    }),
  };
};

export const resolveOfficeGeofenceDraftValues = (office: {
  latitude?: number | null;
  longitude?: number | null;
  geofenceRadiusMeters?: number | null;
} | null): {
  latitude: string;
  longitude: string;
  radius: string;
} => {
  if (!office) {
    return {
      latitude: "",
      longitude: "",
      radius: "120",
    };
  }
  return {
    latitude:
      office.latitude !== null && office.latitude !== undefined
        ? String(office.latitude)
        : "",
    longitude:
      office.longitude !== null && office.longitude !== undefined
        ? String(office.longitude)
        : "",
    radius:
      office.geofenceRadiusMeters !== null &&
      office.geofenceRadiusMeters !== undefined
        ? String(office.geofenceRadiusMeters)
        : "120",
  };
};
