type FetchJson = (path: string, init?: RequestInit) => Promise<unknown>;

export type EmployeePushRegistrationResult =
  | { kind: "skipped" }
  | { kind: "success"; registrationKey: string }
  | { kind: "error"; message: string };

export const resolveExpoProjectIdFromConstants = (
  constants: unknown,
): string | null => {
  const runtimeConstants = constants as {
    easConfig?: { projectId?: string };
    expoConfig?: { extra?: { eas?: { projectId?: string } } };
  };
  return (
    runtimeConstants.easConfig?.projectId ||
    runtimeConstants.expoConfig?.extra?.eas?.projectId ||
    null
  );
};

export const resolveDeviceTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
};

export const registerEmployeePushDevice = async (params: {
  tenantKey: string;
  employeeId: string;
  registrationKey: string;
  lastRegisteredKey: string;
  isDevice: boolean;
  getPermissions: () => Promise<{ status: string }>;
  requestPermissions: () => Promise<{ status: string }>;
  resolveProjectId: () => string | null;
  getExpoPushToken: (projectId: string) => Promise<string>;
  fetchJson: FetchJson;
  platform: string | null | undefined;
}) => {
  if (
    !params.tenantKey.trim() ||
    !params.employeeId.trim() ||
    params.lastRegisteredKey === params.registrationKey ||
    !params.isDevice
  ) {
    return { kind: "skipped" } satisfies EmployeePushRegistrationResult;
  }

  try {
    const { status } = await params.getPermissions();
    let finalStatus = status;
    if (status !== "granted") {
      const request = await params.requestPermissions();
      finalStatus = request.status;
    }
    if (finalStatus !== "granted") {
      return { kind: "skipped" } satisfies EmployeePushRegistrationResult;
    }

    const projectId = params.resolveProjectId();
    if (!projectId) {
      return {
        kind: "error",
        message:
          "Push registration skipped: missing Expo project ID in runtime config.",
      } satisfies EmployeePushRegistrationResult;
    }

    const token = await params.getExpoPushToken(projectId);
    await params.fetchJson("/employee-devices", {
      method: "POST",
      body: JSON.stringify({
        employeeId: params.employeeId,
        expoPushToken: token,
        platform: params.platform,
        timeZone: resolveDeviceTimeZone(),
      }),
    });

    return {
      kind: "success",
      registrationKey: params.registrationKey,
    } satisfies EmployeePushRegistrationResult;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Push registration failed.";
    if (/default firebaseapp is not initialized/i.test(message)) {
      return {
        kind: "error",
        message:
          "Push registration error: Android Firebase is not configured in this installed build.",
      } satisfies EmployeePushRegistrationResult;
    }
    return {
      kind: "error",
      message: `Push registration error: ${message}`,
    } satisfies EmployeePushRegistrationResult;
  }
};
