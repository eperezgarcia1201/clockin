import {
  resolveManagerSessionFromAccessProfile,
  shouldClearActiveLocationScope,
  type AccessProfileResponse,
} from "./access-profile-helpers";

type FetchJson = (path: string, init?: RequestInit) => Promise<unknown>;

export const loadAccessProfileData = async (params: {
  fetchJson: FetchJson;
}): Promise<
  | {
      ok: true;
      profile: AccessProfileResponse;
      managerSession: ReturnType<typeof resolveManagerSessionFromAccessProfile>;
      clearActiveLocationScope: boolean;
    }
  | {
      ok: false;
      error: string;
    }
> => {
  try {
    const profile = (await params.fetchJson("/access/me")) as AccessProfileResponse;
    return {
      ok: true,
      profile,
      managerSession: resolveManagerSessionFromAccessProfile(profile),
      clearActiveLocationScope: shouldClearActiveLocationScope(profile),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to load access permissions.",
    };
  }
};
