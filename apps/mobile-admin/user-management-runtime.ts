import {
  buildCreateUserPayload,
  validateCreateUserName,
} from "./user-create-helpers";
import {
  buildEditUserPayload,
  mapEditUserDetailsToForm,
  type EditUserDetailsResponse,
} from "./user-edit-helpers";
import type { EditUserForm } from "./types";

type FetchJson = (path: string, init?: RequestInit) => Promise<unknown>;

export const createUserRequest = async (params: {
  fetchJson: FetchJson;
  fullName: string;
  email: string;
  pin: string;
  officeId: string;
  isManager: boolean;
  isOwnerManager: boolean;
  isAdmin: boolean;
  isTimeAdmin: boolean;
  isReports: boolean;
  isServer: boolean;
  isKitchenManager: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> => {
  const validation = validateCreateUserName(params.fullName);
  if (!validation.ok) {
    return { ok: false, error: "Enter a full name." };
  }

  try {
    await params.fetchJson("/employees", {
      method: "POST",
      body: JSON.stringify(
        buildCreateUserPayload({
          fullName: validation.fullName,
          email: params.email,
          pin: params.pin,
          officeId: params.officeId,
          isManager: params.isManager,
          isOwnerManager: params.isOwnerManager,
          isAdmin: params.isAdmin,
          isTimeAdmin: params.isTimeAdmin,
          isReports: params.isReports,
          isServer: params.isServer,
          isKitchenManager: params.isKitchenManager,
        }),
      ),
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to create user.",
    };
  }
};

export const setUserDisabledRequest = async (params: {
  fetchJson: FetchJson;
  id: string;
  disabled: boolean;
}): Promise<{ ok: true; status: string } | { ok: false; error: string }> => {
  try {
    await params.fetchJson(`/employees/${params.id}`, {
      method: "PATCH",
      body: JSON.stringify({ disabled: params.disabled }),
    });
    return {
      ok: true,
      status: params.disabled ? "User disabled." : "User enabled.",
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to update user status.",
    };
  }
};

export const loadUserForEditRequest = async (params: {
  fetchJson: FetchJson;
  id: string;
}): Promise<{ ok: true; form: EditUserForm } | { ok: false; error: string }> => {
  try {
    const data = (await params.fetchJson(
      `/employees/${params.id}`,
    )) as EditUserDetailsResponse;
    return {
      ok: true,
      form: mapEditUserDetailsToForm(data),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to load user.",
    };
  }
};

export const prepareSaveUserEdits = (params: {
  editingUserId: string | null;
  editUserForm: EditUserForm;
}):
  | {
      ok: true;
      editingUserId: string;
      payload: Record<string, unknown>;
    }
  | { ok: false; error: string } => {
  if (!params.editingUserId) {
    return { ok: false, error: "Select a user to edit." };
  }

  const payloadResult = buildEditUserPayload(params.editUserForm);
  if (payloadResult.ok === false) {
    return { ok: false, error: payloadResult.error };
  }

  return {
    ok: true,
    editingUserId: params.editingUserId,
    payload: payloadResult.payload,
  };
};

export const saveUserEditsRequest = async (params: {
  fetchJson: FetchJson;
  editingUserId: string;
  payload: Record<string, unknown>;
}): Promise<{ ok: true } | { ok: false; error: string }> => {
  try {
    await params.fetchJson(`/employees/${params.editingUserId}`, {
      method: "PATCH",
      body: JSON.stringify(params.payload),
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to update user.",
    };
  }
};
