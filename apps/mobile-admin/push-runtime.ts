type FetchJson = (path: string, init?: RequestInit) => Promise<unknown>;

export type PushRegistrationResult =
  | { kind: "skipped" }
  | { kind: "success"; tenantKey: string }
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

export const registerAdminPushDevice = async (params: {
  loggedIn: boolean;
  activeTenant: string;
  pushRegisteredTenant: string;
  isDevice: boolean;
  getPermissions: () => Promise<{ status: string }>;
  requestPermissions: () => Promise<{ status: string }>;
  resolveProjectId: () => string | null;
  getExpoPushToken: (projectId: string) => Promise<string>;
  fetchJson: FetchJson;
  platform: string | null | undefined;
}): Promise<PushRegistrationResult> => {
  const tenantKey = params.activeTenant.trim();
  if (
    !params.loggedIn ||
    !tenantKey ||
    params.pushRegisteredTenant === tenantKey ||
    !params.isDevice
  ) {
    return { kind: "skipped" };
  }

  try {
    const { status } = await params.getPermissions();
    let finalStatus = status;
    if (status !== "granted") {
      const request = await params.requestPermissions();
      finalStatus = request.status;
    }
    if (finalStatus !== "granted") {
      return { kind: "skipped" };
    }

    const projectId = params.resolveProjectId();
    if (!projectId) {
      return {
        kind: "error",
        message:
          "Push registration skipped: missing Expo project ID in runtime config.",
      };
    }

    const token = await params.getExpoPushToken(projectId);
    await params.fetchJson("/admin-devices", {
      method: "POST",
      body: JSON.stringify({
        expoPushToken: token,
        platform: params.platform,
      }),
    });

    return {
      kind: "success",
      tenantKey,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Push registration failed.";
    if (/default firebaseapp is not initialized/i.test(errorMessage)) {
      return {
        kind: "error",
        message:
          "Push registration error: Android Firebase is not configured in this installed build. Ensure apps/mobile-admin/google-services.json is included in the Android build, publish a new Play release, then update/reinstall the app.",
      };
    }
    return {
      kind: "error",
      message:
        error instanceof Error
          ? `Push registration error: ${error.message}`
          : "Push registration failed.",
    };
  }
};
