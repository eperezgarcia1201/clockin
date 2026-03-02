import { useState } from "react";
import {
  defaultScheduleDays,
  emptyEditUserForm,
} from "./app-state-helpers";
import type {
  EditUserForm,
  ScheduleDay,
  TodayScheduleResponse,
} from "./types";

export function useAdminManagementState() {
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPin, setNewUserPin] = useState("");
  const [newUserIsManager, setNewUserIsManager] = useState(false);
  const [newUserIsOwnerManager, setNewUserIsOwnerManager] = useState(false);
  const [newUserIsAdmin, setNewUserIsAdmin] = useState(false);
  const [newUserIsTimeAdmin, setNewUserIsTimeAdmin] = useState(false);
  const [newUserIsReports, setNewUserIsReports] = useState(false);
  const [newUserIsServer, setNewUserIsServer] = useState(false);
  const [newUserIsKitchenManager, setNewUserIsKitchenManager] = useState(false);
  const [userStatus, setUserStatus] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserForm, setEditUserForm] =
    useState<EditUserForm>(emptyEditUserForm());
  const [editUserStatus, setEditUserStatus] = useState<string | null>(null);
  const [editUserLoading, setEditUserLoading] = useState(false);
  const [editUserSaving, setEditUserSaving] = useState(false);

  const [newOfficeName, setNewOfficeName] = useState("");
  const [newOfficeLatitude, setNewOfficeLatitude] = useState("");
  const [newOfficeLongitude, setNewOfficeLongitude] = useState("");
  const [newOfficeRadius, setNewOfficeRadius] = useState("120");
  const [officeStatus, setOfficeStatus] = useState<string | null>(null);
  const [officeGeoLatitude, setOfficeGeoLatitude] = useState("");
  const [officeGeoLongitude, setOfficeGeoLongitude] = useState("");
  const [officeGeoRadius, setOfficeGeoRadius] = useState("120");
  const [officeGeoStatus, setOfficeGeoStatus] = useState<string | null>(null);
  const [officeGeoSaving, setOfficeGeoSaving] = useState(false);

  const [newGroupName, setNewGroupName] = useState("");
  const [groupStatus, setGroupStatus] = useState<string | null>(null);

  const [scheduleEmployeeId, setScheduleEmployeeId] = useState("");
  const [scheduleEmployeePickerOpen, setScheduleEmployeePickerOpen] =
    useState(false);
  const [scheduleEmployeeSearch, setScheduleEmployeeSearch] = useState("");
  const [scheduleDays, setScheduleDays] = useState<ScheduleDay[]>(
    defaultScheduleDays(),
  );
  const [scheduleStatus, setScheduleStatus] = useState<string | null>(null);
  const [todaySchedule, setTodaySchedule] =
    useState<TodayScheduleResponse | null>(null);
  const [todayScheduleStatus, setTodayScheduleStatus] = useState<string | null>(
    null,
  );
  const [todayScheduleLoading, setTodayScheduleLoading] = useState(false);
  const [todayRoleFilter, setTodayRoleFilter] = useState("All");

  return {
    newUserName,
    setNewUserName,
    newUserEmail,
    setNewUserEmail,
    newUserPin,
    setNewUserPin,
    newUserIsManager,
    setNewUserIsManager,
    newUserIsOwnerManager,
    setNewUserIsOwnerManager,
    newUserIsAdmin,
    setNewUserIsAdmin,
    newUserIsTimeAdmin,
    setNewUserIsTimeAdmin,
    newUserIsReports,
    setNewUserIsReports,
    newUserIsServer,
    setNewUserIsServer,
    newUserIsKitchenManager,
    setNewUserIsKitchenManager,
    userStatus,
    setUserStatus,
    editingUserId,
    setEditingUserId,
    editUserForm,
    setEditUserForm,
    editUserStatus,
    setEditUserStatus,
    editUserLoading,
    setEditUserLoading,
    editUserSaving,
    setEditUserSaving,
    newOfficeName,
    setNewOfficeName,
    newOfficeLatitude,
    setNewOfficeLatitude,
    newOfficeLongitude,
    setNewOfficeLongitude,
    newOfficeRadius,
    setNewOfficeRadius,
    officeStatus,
    setOfficeStatus,
    officeGeoLatitude,
    setOfficeGeoLatitude,
    officeGeoLongitude,
    setOfficeGeoLongitude,
    officeGeoRadius,
    setOfficeGeoRadius,
    officeGeoStatus,
    setOfficeGeoStatus,
    officeGeoSaving,
    setOfficeGeoSaving,
    newGroupName,
    setNewGroupName,
    groupStatus,
    setGroupStatus,
    scheduleEmployeeId,
    setScheduleEmployeeId,
    scheduleEmployeePickerOpen,
    setScheduleEmployeePickerOpen,
    scheduleEmployeeSearch,
    setScheduleEmployeeSearch,
    scheduleDays,
    setScheduleDays,
    scheduleStatus,
    setScheduleStatus,
    todaySchedule,
    setTodaySchedule,
    todayScheduleStatus,
    setTodayScheduleStatus,
    todayScheduleLoading,
    setTodayScheduleLoading,
    todayRoleFilter,
    setTodayRoleFilter,
  };
}
