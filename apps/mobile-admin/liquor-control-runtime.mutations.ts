import type { LiquorUpcLookupResponse } from "./types";
import type { FetchJson } from "./liquor-control-runtime.load";

export const saveLiquorCatalogRowRequest = async (params: {
  fetchJson: FetchJson;
  itemId: string;
  payload: Record<string, unknown>;
}): Promise<{ ok: true } | { ok: false; error: string }> => {
  try {
    await params.fetchJson(`/liquor-inventory/catalog/${params.itemId}`, {
      method: "PUT",
      body: JSON.stringify(params.payload),
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to save liquor catalog row.",
    };
  }
};

export const saveLiquorCountRowRequest = async (params: {
  fetchJson: FetchJson;
  payload: Record<string, unknown>;
}): Promise<{ ok: true } | { ok: false; error: string }> => {
  try {
    await params.fetchJson("/liquor-inventory/counts", {
      method: "POST",
      body: JSON.stringify(params.payload),
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Unable to save liquor inventory row.",
    };
  }
};

export const createLiquorCatalogItemRequest = async (params: {
  fetchJson: FetchJson;
  payload: Record<string, unknown>;
}): Promise<{ ok: true } | { ok: false; error: string }> => {
  try {
    await params.fetchJson("/liquor-inventory/catalog", {
      method: "POST",
      body: JSON.stringify(params.payload),
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to create liquor catalog item.",
    };
  }
};

export const createLiquorKindRequest = async (params: {
  fetchJson: FetchJson;
  name: string;
}): Promise<{ ok: true } | { ok: false; error: string }> => {
  try {
    await params.fetchJson("/liquor-inventory/kinds", {
      method: "POST",
      body: JSON.stringify({ name: params.name }),
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to save kind.",
    };
  }
};

export const deleteLiquorKindRequest = async (params: {
  fetchJson: FetchJson;
  name: string;
}): Promise<{ ok: true } | { ok: false; error: string }> => {
  try {
    await params.fetchJson(
      `/liquor-inventory/kinds/${encodeURIComponent(params.name)}`,
      {
        method: "DELETE",
      },
    );
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to delete kind.",
    };
  }
};

export const resolveLiquorUpcLookupStatus = (
  payload: LiquorUpcLookupResponse,
): string => {
  if (payload.item?.id) {
    return "UPC matched an existing liquor catalog item.";
  }
  if (payload.candidate?.name) {
    return "UPC candidate loaded from lookup source.";
  }
  return "UPC lookup found no match.";
};

export const lookupLiquorByUpcRequest = async (params: {
  fetchJson: FetchJson;
  upc: string;
}): Promise<
  | { ok: true; payload: LiquorUpcLookupResponse; statusMessage: string }
  | { ok: false; error: string }
> => {
  try {
    const payload = (await params.fetchJson(
      `/liquor-inventory/catalog/upc/${encodeURIComponent(params.upc)}`,
    )) as LiquorUpcLookupResponse;
    return {
      ok: true,
      payload,
      statusMessage: resolveLiquorUpcLookupStatus(payload),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to lookup UPC.",
    };
  }
};

export const createLiquorMovementRequest = async (params: {
  fetchJson: FetchJson;
  payload: Record<string, unknown>;
}): Promise<{ ok: true } | { ok: false; error: string }> => {
  try {
    await params.fetchJson("/liquor-inventory/movements", {
      method: "POST",
      body: JSON.stringify(params.payload),
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to save liquor movement.",
    };
  }
};

export const saveLiquorQuickCountRequest = async (params: {
  fetchJson: FetchJson;
  payload: Record<string, unknown>;
}): Promise<{ ok: true } | { ok: false; error: string }> => {
  try {
    await params.fetchJson("/liquor-inventory/counts", {
      method: "POST",
      body: JSON.stringify(params.payload),
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to save liquor count.",
    };
  }
};
