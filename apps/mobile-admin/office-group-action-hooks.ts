import type { Dispatch, SetStateAction } from "react";
import { createGroupRequest, validateGroupName } from "./group-runtime";
import {
  createOfficeRequest,
  prepareOfficeGeofenceSave,
  saveOfficeGeofenceRequest,
} from "./office-runtime";
import type { Screen } from "./types";

type FetchJson = (path: string, init?: RequestInit) => Promise<unknown>;

export const useOfficeGroupActions = (params: {
  fetchJson: FetchJson;
  newOfficeName: string;
  newOfficeLatitude: string;
  newOfficeLongitude: string;
  newOfficeRadius: string;
  setOfficeStatus: Dispatch<SetStateAction<string | null>>;
  setNewOfficeName: Dispatch<SetStateAction<string>>;
  setNewOfficeLatitude: Dispatch<SetStateAction<string>>;
  setNewOfficeLongitude: Dispatch<SetStateAction<string>>;
  setNewOfficeRadius: Dispatch<SetStateAction<string>>;
  setActiveLocationId: Dispatch<SetStateAction<string>>;
  setScreen: Dispatch<SetStateAction<Screen>>;
  loadOffices: () => Promise<void>;
  loadSummary: () => Promise<void>;
  loadEmployees: () => Promise<void>;
  loadGroups: () => Promise<void>;
  loadActiveNow: () => Promise<void>;
  officeGeoTargetId: string | null;
  officeGeoLatitude: string;
  officeGeoLongitude: string;
  officeGeoRadius: string;
  setOfficeGeoStatus: Dispatch<SetStateAction<string | null>>;
  setOfficeGeoSaving: Dispatch<SetStateAction<boolean>>;
  newGroupName: string;
  scopedLocationId: string;
  setGroupStatus: Dispatch<SetStateAction<string | null>>;
  setNewGroupName: Dispatch<SetStateAction<string>>;
}) => {
  const handleCreateOffice = async () => {
    params.setOfficeStatus(null);
    const result = await createOfficeRequest({
      fetchJson: params.fetchJson,
      name: params.newOfficeName,
      latitudeInput: params.newOfficeLatitude,
      longitudeInput: params.newOfficeLongitude,
      radiusInput: params.newOfficeRadius,
    });
    if (result.ok === false) {
      params.setOfficeStatus(result.error);
      return;
    }
    params.setNewOfficeName("");
    params.setNewOfficeLatitude("");
    params.setNewOfficeLongitude("");
    params.setNewOfficeRadius("120");
    if (result.createdOfficeId) {
      params.setActiveLocationId(result.createdOfficeId);
    }
    params.setOfficeStatus("Location created. Switched to new location panel.");
    params.setScreen("dashboard");
    void params.loadOffices();
    void params.loadSummary();
    void params.loadEmployees();
    void params.loadGroups();
    void params.loadActiveNow();
  };

  const handleSaveOfficeGeofence = async () => {
    const prepared = prepareOfficeGeofenceSave({
      officeId: params.officeGeoTargetId,
      latitudeInput: params.officeGeoLatitude,
      longitudeInput: params.officeGeoLongitude,
      radiusInput: params.officeGeoRadius,
    });
    if (prepared.ok === false) {
      params.setOfficeGeoStatus(prepared.error);
      return;
    }
    params.setOfficeGeoSaving(true);
    params.setOfficeGeoStatus(null);
    const result = await saveOfficeGeofenceRequest({
      fetchJson: params.fetchJson,
      officeId: prepared.officeId,
      payload: prepared.payload,
    });
    if (result.ok === false) {
      params.setOfficeGeoStatus(result.error);
      params.setOfficeGeoSaving(false);
      return;
    }
    params.setOfficeGeoStatus("Location geofence updated.");
    await params.loadOffices();
    params.setOfficeGeoSaving(false);
  };

  const handleCreateGroup = async () => {
    params.setGroupStatus(null);
    const validation = validateGroupName(params.newGroupName);
    if (validation.ok === false) {
      params.setGroupStatus(validation.error);
      return;
    }
    const result = await createGroupRequest({
      fetchJson: params.fetchJson,
      name: validation.name,
      scopedLocationId: params.scopedLocationId,
    });
    if (result.ok === false) {
      params.setGroupStatus(result.error);
      return;
    }
    params.setNewGroupName("");
    params.setGroupStatus("Group created.");
    void params.loadGroups();
  };

  return {
    handleCreateOffice,
    handleSaveOfficeGeofence,
    handleCreateGroup,
  };
};
