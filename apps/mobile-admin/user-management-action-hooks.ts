import type { Dispatch, SetStateAction } from "react";
import { emptyEditUserForm } from "./app-state-helpers";
import {
  createUserRequest,
  loadUserForEditRequest,
  prepareSaveUserEdits,
  saveUserEditsRequest,
  setUserDisabledRequest,
} from "./user-management-runtime";
import type { EditUserForm } from "./types";

type FetchJson = (path: string, init?: RequestInit) => Promise<unknown>;

export const useUserManagementActions = (params: {
  fetchJson: FetchJson;
  newUserName: string;
  newUserEmail: string;
  newUserPin: string;
  scopedLocationId: string;
  newUserIsManager: boolean;
  newUserIsOwnerManager: boolean;
  newUserIsAdmin: boolean;
  newUserIsTimeAdmin: boolean;
  newUserIsReports: boolean;
  newUserIsServer: boolean;
  newUserIsKitchenManager: boolean;
  setUserStatus: Dispatch<SetStateAction<string | null>>;
  setNewUserName: Dispatch<SetStateAction<string>>;
  setNewUserEmail: Dispatch<SetStateAction<string>>;
  setNewUserPin: Dispatch<SetStateAction<string>>;
  setNewUserIsManager: Dispatch<SetStateAction<boolean>>;
  setNewUserIsOwnerManager: Dispatch<SetStateAction<boolean>>;
  setNewUserIsAdmin: Dispatch<SetStateAction<boolean>>;
  setNewUserIsTimeAdmin: Dispatch<SetStateAction<boolean>>;
  setNewUserIsReports: Dispatch<SetStateAction<boolean>>;
  setNewUserIsServer: Dispatch<SetStateAction<boolean>>;
  setNewUserIsKitchenManager: Dispatch<SetStateAction<boolean>>;
  editingUserId: string | null;
  editUserForm: EditUserForm;
  setEditUserForm: Dispatch<SetStateAction<EditUserForm>>;
  setEditingUserId: Dispatch<SetStateAction<string | null>>;
  setEditUserStatus: Dispatch<SetStateAction<string | null>>;
  setEditUserLoading: Dispatch<SetStateAction<boolean>>;
  setEditUserSaving: Dispatch<SetStateAction<boolean>>;
  loadEmployees: () => Promise<void>;
  loadSummary: () => Promise<void>;
  loadActiveNow: () => Promise<void>;
}) => {
  const handleCreateUser = async () => {
    params.setUserStatus(null);
    const result = await createUserRequest({
      fetchJson: params.fetchJson,
      fullName: params.newUserName,
      email: params.newUserEmail,
      pin: params.newUserPin,
      officeId: params.scopedLocationId,
      isManager: params.newUserIsManager,
      isOwnerManager: params.newUserIsOwnerManager,
      isAdmin: params.newUserIsAdmin,
      isTimeAdmin: params.newUserIsTimeAdmin,
      isReports: params.newUserIsReports,
      isServer: params.newUserIsServer,
      isKitchenManager: params.newUserIsKitchenManager,
    });
    if (result.ok === false) {
      params.setUserStatus(result.error);
      return;
    }
    params.setNewUserName("");
    params.setNewUserEmail("");
    params.setNewUserPin("");
    params.setNewUserIsManager(false);
    params.setNewUserIsOwnerManager(false);
    params.setNewUserIsAdmin(false);
    params.setNewUserIsTimeAdmin(false);
    params.setNewUserIsReports(false);
    params.setNewUserIsServer(false);
    params.setNewUserIsKitchenManager(false);
    params.setUserStatus("User created.");
    void params.loadEmployees();
    void params.loadSummary();
  };

  const handleSetUserDisabled = async (id: string, disabled: boolean) => {
    const result = await setUserDisabledRequest({
      fetchJson: params.fetchJson,
      id,
      disabled,
    });
    if (result.ok === false) {
      params.setUserStatus(result.error);
      return;
    }
    if (params.editingUserId === id) {
      params.setEditUserForm((previous) => ({ ...previous, disabled }));
    }
    params.setUserStatus(result.status);
    void params.loadEmployees();
    void params.loadSummary();
    void params.loadActiveNow();
  };

  const loadUserForEdit = async (id: string) => {
    params.setEditUserLoading(true);
    params.setEditUserStatus(null);
    const result = await loadUserForEditRequest({ fetchJson: params.fetchJson, id });
    if (result.ok === false) {
      params.setEditUserStatus(result.error);
      params.setEditUserLoading(false);
      return;
    }
    params.setEditingUserId(id);
    params.setEditUserForm(result.form);
    params.setEditUserStatus("Loaded user for editing.");
    params.setEditUserLoading(false);
  };

  const cancelEditUser = () => {
    params.setEditingUserId(null);
    params.setEditUserForm(emptyEditUserForm());
    params.setEditUserStatus(null);
  };

  const saveUserEdits = async () => {
    const prepared = prepareSaveUserEdits({
      editingUserId: params.editingUserId,
      editUserForm: params.editUserForm,
    });
    if (prepared.ok === false) {
      params.setEditUserStatus(prepared.error);
      return;
    }

    params.setEditUserSaving(true);
    params.setEditUserStatus(null);
    const result = await saveUserEditsRequest({
      fetchJson: params.fetchJson,
      editingUserId: prepared.editingUserId,
      payload: prepared.payload,
    });
    if (result.ok === false) {
      params.setEditUserStatus(result.error);
      params.setEditUserSaving(false);
      return;
    }
    params.setEditUserForm((previous) => ({
      ...previous,
      pin: "",
    }));
    params.setEditUserStatus("User updated.");
    void params.loadEmployees();
    void params.loadSummary();
    void params.loadActiveNow();
    params.setEditUserSaving(false);
  };

  return {
    handleCreateUser,
    handleSetUserDisabled,
    loadUserForEdit,
    cancelEditUser,
    saveUserEdits,
  };
};
