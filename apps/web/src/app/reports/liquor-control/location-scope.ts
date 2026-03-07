const ACTIVE_LOCATION_STORAGE_KEY = "clockin_active_location_id";
const ACTIVE_LOCATION_ALL_STORAGE_KEY = "clockin_active_location_all";
const ACTIVE_LOCATION_COOKIE_KEY = "clockin_active_location_id";

const readCookieValue = (key: string) => {
  if (typeof document === "undefined") return "";
  const keyPrefix = `${key}=`;
  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(keyPrefix));

  if (!cookie) {
    return "";
  }

  const rawValue = cookie.slice(keyPrefix.length).trim();
  if (!rawValue) {
    return "";
  }

  try {
    return decodeURIComponent(rawValue);
  } catch {
    return rawValue;
  }
};

export const readPersistedLocationScope = () => {
  if (typeof window === "undefined") {
    return { officeId: "", explicitAllLocations: false };
  }

  const explicitAllLocations =
    sessionStorage.getItem(ACTIVE_LOCATION_ALL_STORAGE_KEY) === "1";

  if (explicitAllLocations) {
    return { officeId: "", explicitAllLocations: true };
  }

  const officeId = (
    sessionStorage.getItem(ACTIVE_LOCATION_STORAGE_KEY) ||
    readCookieValue(ACTIVE_LOCATION_COOKIE_KEY)
  ).trim();

  return {
    officeId,
    explicitAllLocations: false,
  };
};
