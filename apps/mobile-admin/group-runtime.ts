export const validateGroupName = (
  rawName: string,
): { ok: true; name: string } | { ok: false; error: string } => {
  const name = rawName.trim();
  if (!name) {
    return { ok: false, error: "Enter a group name." };
  }
  return { ok: true, name };
};

export const buildCreateGroupPayload = (params: {
  name: string;
  scopedLocationId: string;
}): {
  name: string;
  officeId?: string;
} => ({
  name: params.name,
  officeId: params.scopedLocationId || undefined,
});

type FetchJson = (path: string, init?: RequestInit) => Promise<unknown>;

export const createGroupRequest = async (params: {
  fetchJson: FetchJson;
  name: string;
  scopedLocationId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> => {
  try {
    await params.fetchJson("/groups", {
      method: "POST",
      body: JSON.stringify(
        buildCreateGroupPayload({
          name: params.name,
          scopedLocationId: params.scopedLocationId,
        }),
      ),
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to create group.",
    };
  }
};
