import { useState } from "react";
import type { Lang } from "./copy";
import { defaultAccessPermissions } from "./app-state-helpers";
import type {
  AccessPermissions,
  Employee,
  Group,
  NotificationRow,
  Office,
  Screen,
  Summary,
  ThemeMode,
} from "./types";

type PunchRow = { id: string; name: string; status: string };

export function useAdminCoreState() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [tenantInput, setTenantInput] = useState("");
  const [activeTenant, setActiveTenant] = useState("");
  const [activeTenantLabel, setActiveTenantLabel] = useState("");
  const [activeAdminUsername, setActiveAdminUsername] = useState("");
  const [language, setLanguage] = useState<Lang>("en");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginStatus, setLoginStatus] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [permissions, setPermissions] = useState<AccessPermissions>(
    defaultAccessPermissions(),
  );
  const [multiLocationEnabled, setMultiLocationEnabled] = useState(false);
  const [activeLocationId, setActiveLocationId] = useState("");

  const [summary, setSummary] = useState<Summary>({
    total: 0,
    admins: 0,
    timeAdmins: 0,
    reports: 0,
  });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [alertsStatus, setAlertsStatus] = useState<string | null>(null);
  const [employeeMessageEmployeeId, setEmployeeMessageEmployeeId] =
    useState("");
  const [employeeMessageSubject, setEmployeeMessageSubject] = useState("");
  const [employeeMessageBody, setEmployeeMessageBody] = useState("");
  const [employeeMessageSending, setEmployeeMessageSending] = useState(false);
  const [employeeMessageStatus, setEmployeeMessageStatus] = useState<
    string | null
  >(null);
  const [scheduleOverrideLoadingId, setScheduleOverrideLoadingId] = useState<
    string | null
  >(null);

  const [sessionManagerEmployeeId, setSessionManagerEmployeeId] = useState<
    string | null
  >(null);
  const [managerClockExempt, setManagerClockExempt] = useState(false);
  const [activeNow, setActiveNow] = useState<PunchRow[]>([]);
  const [recentPunchRows, setRecentPunchRows] = useState<PunchRow[]>([]);
  const [punchStatus, setPunchStatus] = useState<string | null>(null);
  const [punchLoadingId, setPunchLoadingId] = useState<string | null>(null);
  const [managerPin, setManagerPin] = useState("");
  const [managerPunchLoading, setManagerPunchLoading] = useState(false);
  const [managerPunchStatus, setManagerPunchStatus] = useState<string | null>(
    null,
  );
  const [managerPendingTipWorkDate, setManagerPendingTipWorkDate] = useState<
    string | null
  >(null);
  const [managerCashTips, setManagerCashTips] = useState("0");
  const [managerCreditCardTips, setManagerCreditCardTips] = useState("0");
  const [managerTipSaving, setManagerTipSaving] = useState(false);

  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [resolvedApiBase, setResolvedApiBase] = useState<string | null>(null);
  const [dataSyncError, setDataSyncError] = useState<string | null>(null);
  const [pushRegisteredTenant, setPushRegisteredTenant] = useState("");

  return {
    loggedIn,
    setLoggedIn,
    tenantInput,
    setTenantInput,
    activeTenant,
    setActiveTenant,
    activeTenantLabel,
    setActiveTenantLabel,
    activeAdminUsername,
    setActiveAdminUsername,
    language,
    setLanguage,
    username,
    setUsername,
    password,
    setPassword,
    loginStatus,
    setLoginStatus,
    loginLoading,
    setLoginLoading,
    screen,
    setScreen,
    permissions,
    setPermissions,
    multiLocationEnabled,
    setMultiLocationEnabled,
    activeLocationId,
    setActiveLocationId,
    summary,
    setSummary,
    employees,
    setEmployees,
    offices,
    setOffices,
    groups,
    setGroups,
    notifications,
    setNotifications,
    alertsStatus,
    setAlertsStatus,
    employeeMessageEmployeeId,
    setEmployeeMessageEmployeeId,
    employeeMessageSubject,
    setEmployeeMessageSubject,
    employeeMessageBody,
    setEmployeeMessageBody,
    employeeMessageSending,
    setEmployeeMessageSending,
    employeeMessageStatus,
    setEmployeeMessageStatus,
    scheduleOverrideLoadingId,
    setScheduleOverrideLoadingId,
    sessionManagerEmployeeId,
    setSessionManagerEmployeeId,
    managerClockExempt,
    setManagerClockExempt,
    activeNow,
    setActiveNow,
    recentPunchRows,
    setRecentPunchRows,
    punchStatus,
    setPunchStatus,
    punchLoadingId,
    setPunchLoadingId,
    managerPin,
    setManagerPin,
    managerPunchLoading,
    setManagerPunchLoading,
    managerPunchStatus,
    setManagerPunchStatus,
    managerPendingTipWorkDate,
    setManagerPendingTipWorkDate,
    managerCashTips,
    setManagerCashTips,
    managerCreditCardTips,
    setManagerCreditCardTips,
    managerTipSaving,
    setManagerTipSaving,
    theme,
    setTheme,
    resolvedApiBase,
    setResolvedApiBase,
    dataSyncError,
    setDataSyncError,
    pushRegisteredTenant,
    setPushRegisteredTenant,
  };
}
