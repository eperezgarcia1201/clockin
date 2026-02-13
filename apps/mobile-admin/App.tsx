import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";

const apiBase = (process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000/api").replace(
  /\/$/,
  "",
);

const ADMIN_USERNAME = process.env.EXPO_PUBLIC_ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.EXPO_PUBLIC_ADMIN_PASSWORD || "1234qwer";

const devHeaders = {
  "x-dev-user-id": "dev-user",
  "x-dev-tenant-id": "dev-tenant",
  "x-dev-email": "dev@clockin.local",
  "x-dev-name": "Dev User",
};

type Screen =
  | "dashboard"
  | "users"
  | "offices"
  | "groups"
  | "reports"
  | "alerts"
  | "schedules";

type Summary = {
  total: number;
  admins: number;
  timeAdmins: number;
  reports: number;
};

type Employee = {
  id: string;
  name: string;
  email?: string;
  active: boolean;
  isAdmin?: boolean;
  isTimeAdmin?: boolean;
  isReports?: boolean;
  isServer?: boolean;
};

type Office = { id: string; name: string };

type Group = { id: string; name: string };

type NotificationRow = {
  id: string;
  message: string;
  createdAt: string;
  employeeName?: string | null;
  type: string;
};

type ReportType = "daily" | "hours" | "payroll" | "audit" | "tips";

const tabs: { key: Screen; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "users", label: "Users" },
  { key: "offices", label: "Offices" },
  { key: "groups", label: "Groups" },
  { key: "schedules", label: "Schedules" },
  { key: "reports", label: "Reports" },
  { key: "alerts", label: "Alerts" },
];

type ThemeMode = "dark" | "light";

type ScheduleDay = {
  weekday: number;
  label: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
};

type EditUserForm = {
  fullName: string;
  displayName: string;
  email: string;
  pin: string;
  hourlyRate: string;
  officeId: string;
  groupId: string;
  isAdmin: boolean;
  isTimeAdmin: boolean;
  isReports: boolean;
  isServer: boolean;
  disabled: boolean;
};

const weekDays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const defaultScheduleDays = () =>
  weekDays.map((label, weekday) => ({
    weekday,
    label,
    enabled: false,
    startTime: "09:00",
    endTime: "17:00",
  }));

const emptyEditUserForm = (): EditUserForm => ({
  fullName: "",
  displayName: "",
  email: "",
  pin: "",
  hourlyRate: "",
  officeId: "",
  groupId: "",
  isAdmin: false,
  isTimeAdmin: false,
  isReports: false,
  isServer: false,
  disabled: false,
});

const normalizeTime = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
  if (!match) return trimmed;
  let hours = Number(match[1]);
  const minutes = match[2];
  const meridiem = match[3].toLowerCase();
  if (Number.isNaN(hours)) return trimmed;
  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;
  return `${String(hours).padStart(2, "0")}:${minutes}`;
};

const sanitizeTime = (value: string) => {
  const normalized = normalizeTime(value);
  return /^\d{2}:\d{2}$/.test(normalized) ? normalized : "";
};

const formatDate = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginStatus, setLoginStatus] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>("dashboard");

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
  const [activeNow, setActiveNow] = useState<{ id: string; name: string; status: string }[]>(
    [],
  );
  const [punchStatus, setPunchStatus] = useState<string | null>(null);
  const [punchLoadingId, setPunchLoadingId] = useState<string | null>(null);

  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPin, setNewUserPin] = useState("");
  const [newUserIsAdmin, setNewUserIsAdmin] = useState(false);
  const [newUserIsTimeAdmin, setNewUserIsTimeAdmin] = useState(false);
  const [newUserIsReports, setNewUserIsReports] = useState(false);
  const [newUserIsServer, setNewUserIsServer] = useState(false);
  const [userStatus, setUserStatus] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserForm, setEditUserForm] = useState<EditUserForm>(emptyEditUserForm());
  const [editUserStatus, setEditUserStatus] = useState<string | null>(null);
  const [editUserLoading, setEditUserLoading] = useState(false);
  const [editUserSaving, setEditUserSaving] = useState(false);

  const [newOfficeName, setNewOfficeName] = useState("");
  const [officeStatus, setOfficeStatus] = useState<string | null>(null);

  const [newGroupName, setNewGroupName] = useState("");
  const [groupStatus, setGroupStatus] = useState<string | null>(null);

  const [scheduleEmployeeId, setScheduleEmployeeId] = useState("");
  const [scheduleDays, setScheduleDays] = useState<ScheduleDay[]>(defaultScheduleDays());
  const [scheduleStatus, setScheduleStatus] = useState<string | null>(null);

  const [calendarOffset, setCalendarOffset] = useState(0);

  const [reportType, setReportType] = useState<ReportType>("daily");
  const [reportEmployeeId, setReportEmployeeId] = useState("");
  const [fromDate, setFromDate] = useState(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    return formatDate(start);
  });
  const [toDate, setToDate] = useState(() => formatDate(new Date()));
  const [reportRows, setReportRows] = useState<any[]>([]);
  const [reportStatus, setReportStatus] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>("dark");

  const fetchJson = useCallback(async (path: string, options?: RequestInit) => {
    const response = await fetch(`${apiBase}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...devHeaders,
        ...(options?.headers || {}),
      },
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data?.message || data?.error || "Request failed");
    }
    return response.json();
  }, []);

  useEffect(() => {
    registerForPush();
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    loadSummary();
    loadEmployees();
    loadOffices();
    loadGroups();
    loadActiveNow();
  }, [loggedIn]);

  useEffect(() => {
    if (!loggedIn) return;
    if (screen === "alerts") {
      loadNotifications();
    }
  }, [loggedIn, screen]);

  useEffect(() => {
    if (!loggedIn) return;
    if (screen === "schedules" && scheduleEmployeeId) {
      loadSchedule(scheduleEmployeeId);
    }
  }, [loggedIn, screen, scheduleEmployeeId]);

  const registerForPush = async () => {
    if (!Device.isDevice) return;
    const { status } = await Notifications.getPermissionsAsync();
    let finalStatus = status;
    if (status !== "granted") {
      const request = await Notifications.requestPermissionsAsync();
      finalStatus = request.status;
    }
    if (finalStatus !== "granted") return;
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    await fetchJson("/admin-devices", {
      method: "POST",
      body: JSON.stringify({ expoPushToken: token, platform: Device.osName }),
    });
  };

  const handleLogin = () => {
    if (!username || !password) {
      setLoginStatus("Enter username and password.");
      return;
    }
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      setLoggedIn(true);
      setLoginStatus(null);
      setScreen("dashboard");
      return;
    }
    setLoginStatus("Invalid credentials.");
  };

  const loadSummary = async () => {
    try {
      const data = (await fetchJson("/employees/summary")) as Summary;
      setSummary(data);
    } catch {
      // ignore
    }
  };

  const loadEmployees = async () => {
    try {
      const data = (await fetchJson("/employees")) as { employees: Employee[] };
      setEmployees(data.employees || []);
      if (!scheduleEmployeeId && data.employees?.[0]) {
        setScheduleEmployeeId(data.employees[0].id);
      }
      if (
        reportEmployeeId &&
        !data.employees?.some((employee) => employee.id === reportEmployeeId)
      ) {
        setReportEmployeeId("");
      }
      if (editingUserId && !data.employees?.some((employee) => employee.id === editingUserId)) {
        setEditingUserId(null);
        setEditUserForm(emptyEditUserForm());
      }
    } catch {
      // ignore
    }
  };

  const loadOffices = async () => {
    try {
      const data = (await fetchJson("/offices")) as { offices: Office[] };
      setOffices(data.offices || []);
    } catch {
      // ignore
    }
  };

  const loadGroups = async () => {
    try {
      const data = (await fetchJson("/groups")) as { groups: Group[] };
      setGroups(data.groups || []);
    } catch {
      // ignore
    }
  };

  const loadNotifications = async () => {
    try {
      const data = (await fetchJson("/notifications?limit=50")) as {
        notifications: NotificationRow[];
      };
      setNotifications(data.notifications || []);
    } catch {
      // ignore
    }
  };

  const loadActiveNow = async () => {
    try {
      const data = (await fetchJson("/employee-punches/recent")) as {
        rows: { id: string; name: string; status: string | null }[];
      };
      setActiveNow(
        (data.rows || []).map((row) => ({
          id: row.id,
          name: row.name,
          status: row.status || "OUT",
        })),
      );
    } catch {
      // ignore
    }
  };

  const handleCreateUser = async () => {
    setUserStatus(null);
    if (!newUserName.trim()) {
      setUserStatus("Enter a full name.");
      return;
    }
    try {
      await fetchJson("/employees", {
        method: "POST",
        body: JSON.stringify({
          fullName: newUserName.trim(),
          displayName: newUserName.trim(),
          email: newUserEmail.trim() || undefined,
          pin: newUserPin.trim() || undefined,
          isAdmin: newUserIsAdmin,
          isTimeAdmin: newUserIsTimeAdmin,
          isReports: newUserIsReports,
          isServer: newUserIsServer,
        }),
      });
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPin("");
      setNewUserIsAdmin(false);
      setNewUserIsTimeAdmin(false);
      setNewUserIsReports(false);
      setNewUserIsServer(false);
      setUserStatus("User created.");
      loadEmployees();
      loadSummary();
    } catch (error) {
      setUserStatus(error instanceof Error ? error.message : "Unable to create user.");
    }
  };

  const handleSetUserDisabled = async (id: string, disabled: boolean) => {
    try {
      await fetchJson(`/employees/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ disabled }),
      });
      if (editingUserId === id) {
        setEditUserForm((prev) => ({ ...prev, disabled }));
      }
      setUserStatus(disabled ? "User disabled." : "User enabled.");
      loadEmployees();
      loadSummary();
      loadActiveNow();
    } catch (error) {
      setUserStatus(error instanceof Error ? error.message : "Unable to update user status.");
    }
  };

  const loadUserForEdit = async (id: string) => {
    setEditUserLoading(true);
    setEditUserStatus(null);
    try {
      const data = (await fetchJson(`/employees/${id}`)) as {
        fullName: string;
        displayName?: string | null;
        email?: string | null;
        hourlyRate?: number | null;
        officeId?: string | null;
        groupId?: string | null;
        isAdmin?: boolean;
        isTimeAdmin?: boolean;
        isReports?: boolean;
        isServer?: boolean;
        disabled?: boolean;
      };
      setEditingUserId(id);
      setEditUserForm({
        fullName: data.fullName || "",
        displayName: data.displayName || "",
        email: data.email || "",
        pin: "",
        hourlyRate:
          typeof data.hourlyRate === "number" && Number.isFinite(data.hourlyRate)
            ? String(data.hourlyRate)
            : "",
        officeId: data.officeId || "",
        groupId: data.groupId || "",
        isAdmin: Boolean(data.isAdmin),
        isTimeAdmin: Boolean(data.isTimeAdmin),
        isReports: Boolean(data.isReports),
        isServer: Boolean(data.isServer),
        disabled: Boolean(data.disabled),
      });
      setEditUserStatus("Loaded user for editing.");
    } catch (error) {
      setEditUserStatus(error instanceof Error ? error.message : "Unable to load user.");
    } finally {
      setEditUserLoading(false);
    }
  };

  const cancelEditUser = () => {
    setEditingUserId(null);
    setEditUserForm(emptyEditUserForm());
    setEditUserStatus(null);
  };

  const saveUserEdits = async () => {
    if (!editingUserId) {
      setEditUserStatus("Select a user to edit.");
      return;
    }

    const fullName = editUserForm.fullName.trim();
    if (!fullName) {
      setEditUserStatus("Full name is required.");
      return;
    }

    const pin = editUserForm.pin.trim();
    if (pin && !/^\d{4}$/.test(pin)) {
      setEditUserStatus("PIN must be 4 digits.");
      return;
    }

    let hourlyRate: number | undefined;
    const hourlyRateRaw = editUserForm.hourlyRate.trim();
    if (hourlyRateRaw) {
      const parsed = Number(hourlyRateRaw);
      if (!Number.isFinite(parsed) || parsed < 0) {
        setEditUserStatus("Hourly rate must be 0 or higher.");
        return;
      }
      hourlyRate = parsed;
    }

    setEditUserSaving(true);
    setEditUserStatus(null);
    try {
      const payload: Record<string, unknown> = {
        fullName,
        displayName: editUserForm.displayName.trim() || fullName,
        email: editUserForm.email.trim(),
        officeId: editUserForm.officeId,
        groupId: editUserForm.groupId,
        isAdmin: editUserForm.isAdmin,
        isTimeAdmin: editUserForm.isTimeAdmin,
        isReports: editUserForm.isReports,
        isServer: editUserForm.isServer,
        disabled: editUserForm.disabled,
      };
      if (hourlyRate !== undefined) {
        payload.hourlyRate = hourlyRate;
      }
      if (pin) {
        payload.pin = pin;
      }

      await fetchJson(`/employees/${editingUserId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setEditUserForm((prev) => ({ ...prev, pin: "" }));
      setEditUserStatus("User updated.");
      loadEmployees();
      loadSummary();
      loadActiveNow();
    } catch (error) {
      setEditUserStatus(error instanceof Error ? error.message : "Unable to update user.");
    } finally {
      setEditUserSaving(false);
    }
  };

  const handleCreateOffice = async () => {
    setOfficeStatus(null);
    if (!newOfficeName.trim()) {
      setOfficeStatus("Enter an office name.");
      return;
    }
    try {
      await fetchJson("/offices", {
        method: "POST",
        body: JSON.stringify({ name: newOfficeName.trim() }),
      });
      setNewOfficeName("");
      setOfficeStatus("Office created.");
      loadOffices();
    } catch (error) {
      setOfficeStatus(error instanceof Error ? error.message : "Unable to create office.");
    }
  };

  const handleCreateGroup = async () => {
    setGroupStatus(null);
    if (!newGroupName.trim()) {
      setGroupStatus("Enter a group name.");
      return;
    }
    try {
      await fetchJson("/groups", {
        method: "POST",
        body: JSON.stringify({ name: newGroupName.trim() }),
      });
      setNewGroupName("");
      setGroupStatus("Group created.");
      loadGroups();
    } catch (error) {
      setGroupStatus(error instanceof Error ? error.message : "Unable to create group.");
    }
  };

  const runReport = async () => {
    setReportStatus(null);
    setReportLoading(true);
    const tzOffset = new Date().getTimezoneOffset();
    try {
      const query = new URLSearchParams({
        from: fromDate,
        to: toDate,
        round: "0",
        tzOffset: String(tzOffset),
      });
      if (reportEmployeeId) {
        query.set("employeeId", reportEmployeeId);
      }

      const data = (await fetchJson(
        `/reports/${reportType}?${query.toString()}`,
      )) as any;
      if (reportType === "audit") {
        setReportRows(data.records || []);
        setReportStatus(`Generated ${(data.records || []).length} audit rows.`);
      } else {
        setReportRows(data.employees || []);
        setReportStatus(`Generated ${(data.employees || []).length} employee report rows.`);
      }
    } catch (error) {
      setReportStatus(error instanceof Error ? error.message : "Report failed.");
    } finally {
      setReportLoading(false);
    }
  };

  const calendar = useMemo(() => {
    const base = new Date();
    const viewDate = new Date(base.getFullYear(), base.getMonth() + calendarOffset, 1);
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    const days: { day: number; isToday: boolean }[] = [];
    for (let i = 0; i < firstDay; i += 1) {
      days.push({ day: 0, isToday: false });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      days.push({
        day,
        isToday: isCurrentMonth && day === today.getDate(),
      });
    }
    while (days.length % 7 !== 0) {
      days.push({ day: 0, isToday: false });
    }
    return {
      label: viewDate.toLocaleString("default", { month: "long", year: "numeric" }),
      days,
    };
  }, [calendarOffset]);

  const loadSchedule = async (employeeId: string) => {
    try {
      const data = (await fetchJson(`/employee-schedules/${employeeId}`)) as {
        days?: ScheduleDay[];
      };
      if (data.days && data.days.length === 7) {
        setScheduleDays(data.days);
      } else {
        setScheduleDays(defaultScheduleDays());
      }
    } catch {
      setScheduleDays(defaultScheduleDays());
    }
  };

  const updateScheduleDay = (
    weekday: number,
    key: keyof ScheduleDay,
    value: string | boolean,
  ) => {
    setScheduleDays((prev) =>
      prev.map((day) => {
        if (day.weekday !== weekday) return day;
        if (key === "enabled") {
          const enabled = Boolean(value);
          if (!enabled) {
            return { ...day, enabled, startTime: "", endTime: "" };
          }
          return {
            ...day,
            enabled,
            startTime: day.startTime || "09:00",
            endTime: day.endTime || "17:00",
          };
        }
        return { ...day, [key]: value };
      }),
    );
  };

  const saveSchedule = async () => {
    if (!scheduleEmployeeId) {
      setScheduleStatus("Select an employee first.");
      return;
    }
    setScheduleStatus(null);
    try {
      const normalizedDays = scheduleDays
        .filter((day) => day.enabled)
        .map((day) => ({
          weekday: day.weekday,
          enabled: true,
          ...(sanitizeTime(day.startTime)
            ? { startTime: sanitizeTime(day.startTime) }
            : {}),
          ...(sanitizeTime(day.endTime) ? { endTime: sanitizeTime(day.endTime) } : {}),
        }));
      await fetchJson(`/employee-schedules/${scheduleEmployeeId}`, {
        method: "PUT",
        body: JSON.stringify({ days: normalizedDays }),
      });
      setScheduleStatus("Schedule saved.");
    } catch (error) {
      setScheduleStatus(error instanceof Error ? error.message : "Unable to save schedule.");
    }
  };

  const handleForcePunch = async (employeeId: string, type: "IN" | "OUT") => {
    setPunchStatus(null);
    setPunchLoadingId(employeeId);
    try {
      await fetchJson("/employee-punches/records", {
        method: "POST",
        body: JSON.stringify({
          employeeId,
          type,
          occurredAt: new Date().toISOString(),
          notes: type === "OUT" ? "Admin clock-out" : "Admin clock-in",
        }),
      });
      setPunchStatus(type === "OUT" ? "Employee clocked out." : "Employee clocked in.");
      await loadActiveNow();
      await loadNotifications();
    } catch (error) {
      setPunchStatus(
        error instanceof Error ? error.message : "Unable to clock out employee.",
      );
    } finally {
      setPunchLoadingId(null);
    }
  };

  const renderLogin = () => (
    <View style={[styles.card, isLight && styles.cardLight]}>
      <Text style={[styles.cardTitle, isLight && styles.cardTitleLight]}>
        Administrator Access
      </Text>
      <Text style={[styles.label, isLight && styles.labelLight]}>Username</Text>
      <TextInput
        style={[styles.input, isLight && styles.inputLight]}
        placeholder="admin"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      <Text style={[styles.label, isLight && styles.labelLight]}>Password</Text>
      <TextInput
        style={[styles.input, isLight && styles.inputLight]}
        placeholder="••••••"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {loginStatus && (
        <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
          {loginStatus}
        </Text>
      )}
      <TouchableOpacity style={[styles.button, styles.primary]} onPress={handleLogin}>
        <Text style={[styles.primaryText, isLight && styles.primaryTextLight]}>
          Sign In
        </Text>
      </TouchableOpacity>
      <Text style={[styles.helperText, isLight && styles.helperTextLight]}>
        Push alerts are enabled once you sign in.
      </Text>
    </View>
  );

  const renderDashboard = () => (
    <>
      <View style={[styles.card, isLight && styles.cardLight]}>
        <Text style={[styles.cardTitle, isLight && styles.cardTitleLight]}>
          Admin Overview
        </Text>
        <View style={styles.summaryGrid}>
          <LinearGradient
            colors={isLight ? ["#eef2ff", "#e0e7ff"] : ["#2b3550", "#1e2a44"]}
            style={[styles.summaryTile, isLight && styles.summaryTileLight]}
          >
            <View style={styles.summaryHeader}>
              <Text style={[styles.summaryLabel, isLight && styles.summaryLabelLight]}>
                TOTAL USERS
              </Text>
              <View style={[styles.summaryIcon, styles.summaryIconUsers]} />
            </View>
            <Text style={[styles.summaryValue, isLight && styles.summaryValueLight]}>
              {summary.total}
            </Text>
          </LinearGradient>
          <LinearGradient
            colors={isLight ? ["#f3f4f6", "#e5e7eb"] : ["#3a3340", "#2a2434"]}
            style={[styles.summaryTile, isLight && styles.summaryTileLight]}
          >
            <View style={styles.summaryHeader}>
              <Text style={[styles.summaryLabel, isLight && styles.summaryLabelLight]}>
                SYS ADMINS
              </Text>
              <View style={[styles.summaryIcon, styles.summaryIconShield]} />
            </View>
            <Text style={[styles.summaryValue, isLight && styles.summaryValueLight]}>
              {summary.admins}
            </Text>
          </LinearGradient>
          <LinearGradient
            colors={isLight ? ["#e8f5f2", "#d7efe8"] : ["#2a3f45", "#20323a"]}
            style={[styles.summaryTile, isLight && styles.summaryTileLight]}
          >
            <View style={styles.summaryHeader}>
              <Text style={[styles.summaryLabel, isLight && styles.summaryLabelLight]}>
                TIME ADMINS
              </Text>
              <View style={[styles.summaryIcon, styles.summaryIconTime]} />
            </View>
            <Text style={[styles.summaryValue, isLight && styles.summaryValueLight]}>
              {summary.timeAdmins}
            </Text>
          </LinearGradient>
          <LinearGradient
            colors={isLight ? ["#f7f2ff", "#ede9fe"] : ["#3d364a", "#2c2636"]}
            style={[styles.summaryTile, isLight && styles.summaryTileLight]}
          >
            <View style={styles.summaryHeader}>
              <Text style={[styles.summaryLabel, isLight && styles.summaryLabelLight]}>
                REPORTS
              </Text>
              <View style={[styles.summaryIcon, styles.summaryIconReports]} />
            </View>
            <Text style={[styles.summaryValue, isLight && styles.summaryValueLight]}>
              {summary.reports}
            </Text>
          </LinearGradient>
        </View>
        <View style={[styles.divider, isLight && styles.dividerLight]} />
        <Text style={[styles.cardTitle, isLight && styles.cardTitleLight]}>
          Working Now
        </Text>
        {activeNow.length === 0 ? (
          <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
            No active employees.
          </Text>
        ) : (
          activeNow.map((row) => {
            const status = row.status.toUpperCase();
            const isActive = ["IN", "BREAK", "LUNCH"].includes(status);
            const actionLabel = isActive ? "Clock Out" : "Clock In";
            const actionType = isActive ? "OUT" : "IN";
            return (
            <View key={row.id} style={[styles.workingCard, isLight && styles.workingCardLight]}>
              <View style={styles.workingRow}>
                <View style={styles.workingLeft}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {row.name
                        .split(" ")
                        .map((part) => part[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.listName, isLight && styles.listNameLight]}>
                    {row.name}
                  </Text>
                </View>
                <View style={styles.listActions}>
                  <View
                    style={[
                      styles.statusPill,
                      !isActive && styles.statusPillOut,
                    ]}
                  >
                    <View style={[styles.statusDot, !isActive && styles.statusDotOut]} />
                    <Text
                      style={[
                        styles.statusPillText,
                        !isActive && styles.statusPillTextOut,
                      ]}
                    >
                      {status}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      isActive ? styles.inlineButton : styles.inlineButtonIn,
                      isLight &&
                        (isActive ? styles.inlineButtonLight : styles.inlineButtonInLight),
                      punchLoadingId === row.id && styles.inlineButtonDisabled,
                    ]}
                    onPress={() => handleForcePunch(row.id, actionType)}
                    disabled={punchLoadingId === row.id}
                  >
                    <Text
                      style={[
                        isActive ? styles.inlineButtonText : styles.inlineButtonTextIn,
                        isLight &&
                          (isActive
                            ? styles.inlineButtonTextLight
                            : styles.inlineButtonTextInLight),
                      ]}
                    >
                      {punchLoadingId === row.id ? "Working..." : actionLabel}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )})
        )}
        {punchStatus && (
          <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
            {punchStatus}
          </Text>
        )}
        <Text style={[styles.footerNote, isLight && styles.footerNoteLight]}>
          Powered by Websys Workforce
        </Text>
      </View>

      <View style={[styles.card, isLight && styles.cardLight]}>
        <View style={styles.calendarHeader}>
          <Text style={[styles.cardTitle, isLight && styles.cardTitleLight]}>
            Calendar
          </Text>
          <View style={styles.calendarControls}>
            <TouchableOpacity
              style={[styles.calendarButton, isLight && styles.calendarButtonLight]}
              onPress={() => setCalendarOffset((prev) => prev - 1)}
            >
              <Text
                style={[
                  styles.calendarButtonText,
                  isLight && styles.calendarButtonTextLight,
                ]}
              >
                ◀
              </Text>
            </TouchableOpacity>
            <Text style={[styles.calendarLabel, isLight && styles.calendarLabelLight]}>
              {calendar.label}
            </Text>
            <TouchableOpacity
              style={[styles.calendarButton, isLight && styles.calendarButtonLight]}
              onPress={() => setCalendarOffset((prev) => prev + 1)}
            >
              <Text
                style={[
                  styles.calendarButtonText,
                  isLight && styles.calendarButtonTextLight,
                ]}
              >
                ▶
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.calendarGrid}>
          {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
            <Text key={`${day}-${index}`} style={styles.calendarDayHead}>
              {day}
            </Text>
          ))}
          {calendar.days.map((cell, index) => (
            <View
              key={`${cell.day}-${index}`}
              style={[
                styles.calendarCell,
                cell.day === 0 && styles.calendarCellEmpty,
                cell.isToday && styles.calendarCellToday,
                isLight && styles.calendarCellLight,
                cell.isToday && isLight && styles.calendarCellTodayLight,
              ]}
            >
              <Text
                style={[
                  styles.calendarCellText,
                  isLight && styles.calendarCellTextLight,
                  cell.day === 0 && styles.calendarCellTextEmpty,
                  cell.isToday && styles.calendarCellTextToday,
                  cell.isToday && isLight && styles.calendarCellTextTodayLight,
                ]}
              >
                {cell.day ? cell.day : ""}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </>
  );

  const renderUsers = () => (
    <View style={[styles.card, isLight && styles.cardLight]}>
      <Text style={[styles.cardTitle, isLight && styles.cardTitleLight]}>Users</Text>
      <Text style={[styles.label, isLight && styles.labelLight]}>Create New User</Text>
      <TextInput
        style={[styles.input, isLight && styles.inputLight]}
        placeholder="Full name"
        value={newUserName}
        onChangeText={setNewUserName}
      />
      <TextInput
        style={[styles.input, isLight && styles.inputLight]}
        placeholder="Email"
        value={newUserEmail}
        onChangeText={setNewUserEmail}
        autoCapitalize="none"
      />
      <TextInput
        style={[styles.input, isLight && styles.inputLight]}
        placeholder="4-digit PIN"
        value={newUserPin}
        onChangeText={setNewUserPin}
        keyboardType="number-pad"
        maxLength={4}
      />
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[
            styles.togglePill,
            isLight && styles.togglePillLight,
            newUserIsAdmin && styles.toggleActive,
            newUserIsAdmin && isLight && styles.toggleActiveLight,
          ]}
          onPress={() => setNewUserIsAdmin((prev) => !prev)}
        >
          <Text
            style={[
              styles.toggleText,
              isLight && styles.toggleTextLight,
              newUserIsAdmin && isLight && styles.toggleTextLightActive,
            ]}
          >
            Sys Admin
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.togglePill,
            isLight && styles.togglePillLight,
            newUserIsTimeAdmin && styles.toggleActive,
            newUserIsTimeAdmin && isLight && styles.toggleActiveLight,
          ]}
          onPress={() => setNewUserIsTimeAdmin((prev) => !prev)}
        >
          <Text
            style={[
              styles.toggleText,
              isLight && styles.toggleTextLight,
              newUserIsTimeAdmin && isLight && styles.toggleTextLightActive,
            ]}
          >
            Time Admin
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.togglePill,
            isLight && styles.togglePillLight,
            newUserIsReports && styles.toggleActive,
            newUserIsReports && isLight && styles.toggleActiveLight,
          ]}
          onPress={() => setNewUserIsReports((prev) => !prev)}
        >
          <Text
            style={[
              styles.toggleText,
              isLight && styles.toggleTextLight,
              newUserIsReports && isLight && styles.toggleTextLightActive,
            ]}
          >
            Reports
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.togglePill,
            isLight && styles.togglePillLight,
            newUserIsServer && styles.toggleActive,
            newUserIsServer && isLight && styles.toggleActiveLight,
          ]}
          onPress={() => setNewUserIsServer((prev) => !prev)}
        >
          <Text
            style={[
              styles.toggleText,
              isLight && styles.toggleTextLight,
              newUserIsServer && isLight && styles.toggleTextLightActive,
            ]}
          >
            Server
          </Text>
        </TouchableOpacity>
      </View>
      {userStatus && (
        <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
          {userStatus}
        </Text>
      )}
      <TouchableOpacity style={[styles.button, styles.primary]} onPress={handleCreateUser}>
        <Text style={[styles.primaryText, isLight && styles.primaryTextLight]}>
          Create User
        </Text>
      </TouchableOpacity>

      <View style={[styles.divider, isLight && styles.dividerLight]} />
      <Text style={[styles.cardTitle, isLight && styles.cardTitleLight]}>Edit User</Text>
      {editUserLoading && (
        <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
          Loading user...
        </Text>
      )}
      {!editingUserId ? (
        <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
          Tap Edit on a user below to load their profile.
        </Text>
      ) : (
        <>
          <Text style={[styles.label, isLight && styles.labelLight]}>Full Name</Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={editUserForm.fullName}
            onChangeText={(value) =>
              setEditUserForm((prev) => ({ ...prev, fullName: value }))
            }
            placeholder="Full name"
          />
          <Text style={[styles.label, isLight && styles.labelLight]}>Display Name</Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={editUserForm.displayName}
            onChangeText={(value) =>
              setEditUserForm((prev) => ({ ...prev, displayName: value }))
            }
            placeholder="Display name"
          />
          <Text style={[styles.label, isLight && styles.labelLight]}>Email</Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={editUserForm.email}
            onChangeText={(value) =>
              setEditUserForm((prev) => ({ ...prev, email: value }))
            }
            autoCapitalize="none"
            placeholder="Email"
          />
          <Text style={[styles.label, isLight && styles.labelLight]}>Reset PIN (optional)</Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={editUserForm.pin}
            onChangeText={(value) =>
              setEditUserForm((prev) => ({ ...prev, pin: value }))
            }
            keyboardType="number-pad"
            maxLength={4}
            placeholder="4-digit PIN"
          />
          <Text style={[styles.label, isLight && styles.labelLight]}>Hourly Rate</Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={editUserForm.hourlyRate}
            onChangeText={(value) =>
              setEditUserForm((prev) => ({ ...prev, hourlyRate: value }))
            }
            keyboardType="decimal-pad"
            placeholder="15.00"
          />

          <Text style={[styles.label, isLight && styles.labelLight]}>Office</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[
                styles.togglePill,
                isLight && styles.togglePillLight,
                !editUserForm.officeId && styles.toggleActive,
                !editUserForm.officeId && isLight && styles.toggleActiveLight,
              ]}
              onPress={() => setEditUserForm((prev) => ({ ...prev, officeId: "" }))}
            >
              <Text
                style={[
                  styles.toggleText,
                  isLight && styles.toggleTextLight,
                  !editUserForm.officeId && isLight && styles.toggleTextLightActive,
                ]}
              >
                No Office
              </Text>
            </TouchableOpacity>
            {offices.map((office) => (
              <TouchableOpacity
                key={office.id}
                style={[
                  styles.togglePill,
                  isLight && styles.togglePillLight,
                  editUserForm.officeId === office.id && styles.toggleActive,
                  editUserForm.officeId === office.id && isLight && styles.toggleActiveLight,
                ]}
                onPress={() =>
                  setEditUserForm((prev) => ({ ...prev, officeId: office.id }))
                }
              >
                <Text
                  style={[
                    styles.toggleText,
                    isLight && styles.toggleTextLight,
                    editUserForm.officeId === office.id &&
                      isLight &&
                      styles.toggleTextLightActive,
                  ]}
                >
                  {office.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, isLight && styles.labelLight]}>Group</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[
                styles.togglePill,
                isLight && styles.togglePillLight,
                !editUserForm.groupId && styles.toggleActive,
                !editUserForm.groupId && isLight && styles.toggleActiveLight,
              ]}
              onPress={() => setEditUserForm((prev) => ({ ...prev, groupId: "" }))}
            >
              <Text
                style={[
                  styles.toggleText,
                  isLight && styles.toggleTextLight,
                  !editUserForm.groupId && isLight && styles.toggleTextLightActive,
                ]}
              >
                No Group
              </Text>
            </TouchableOpacity>
            {groups.map((group) => (
              <TouchableOpacity
                key={group.id}
                style={[
                  styles.togglePill,
                  isLight && styles.togglePillLight,
                  editUserForm.groupId === group.id && styles.toggleActive,
                  editUserForm.groupId === group.id && isLight && styles.toggleActiveLight,
                ]}
                onPress={() =>
                  setEditUserForm((prev) => ({ ...prev, groupId: group.id }))
                }
              >
                <Text
                  style={[
                    styles.toggleText,
                    isLight && styles.toggleTextLight,
                    editUserForm.groupId === group.id &&
                      isLight &&
                      styles.toggleTextLightActive,
                  ]}
                >
                  {group.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[
                styles.togglePill,
                isLight && styles.togglePillLight,
                editUserForm.isAdmin && styles.toggleActive,
                editUserForm.isAdmin && isLight && styles.toggleActiveLight,
              ]}
              onPress={() =>
                setEditUserForm((prev) => ({ ...prev, isAdmin: !prev.isAdmin }))
              }
            >
              <Text
                style={[
                  styles.toggleText,
                  isLight && styles.toggleTextLight,
                  editUserForm.isAdmin && isLight && styles.toggleTextLightActive,
                ]}
              >
                Sys Admin
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.togglePill,
                isLight && styles.togglePillLight,
                editUserForm.isTimeAdmin && styles.toggleActive,
                editUserForm.isTimeAdmin && isLight && styles.toggleActiveLight,
              ]}
              onPress={() =>
                setEditUserForm((prev) => ({
                  ...prev,
                  isTimeAdmin: !prev.isTimeAdmin,
                }))
              }
            >
              <Text
                style={[
                  styles.toggleText,
                  isLight && styles.toggleTextLight,
                  editUserForm.isTimeAdmin && isLight && styles.toggleTextLightActive,
                ]}
              >
                Time Admin
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.togglePill,
                isLight && styles.togglePillLight,
                editUserForm.isReports && styles.toggleActive,
                editUserForm.isReports && isLight && styles.toggleActiveLight,
              ]}
              onPress={() =>
                setEditUserForm((prev) => ({
                  ...prev,
                  isReports: !prev.isReports,
                }))
              }
            >
              <Text
                style={[
                  styles.toggleText,
                  isLight && styles.toggleTextLight,
                  editUserForm.isReports && isLight && styles.toggleTextLightActive,
                ]}
              >
                Reports
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.togglePill,
                isLight && styles.togglePillLight,
                editUserForm.isServer && styles.toggleActive,
                editUserForm.isServer && isLight && styles.toggleActiveLight,
              ]}
              onPress={() =>
                setEditUserForm((prev) => ({
                  ...prev,
                  isServer: !prev.isServer,
                }))
              }
            >
              <Text
                style={[
                  styles.toggleText,
                  isLight && styles.toggleTextLight,
                  editUserForm.isServer && isLight && styles.toggleTextLightActive,
                ]}
              >
                Server
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.togglePill,
                isLight && styles.togglePillLight,
                editUserForm.disabled && styles.toggleDanger,
              ]}
              onPress={() =>
                setEditUserForm((prev) => ({ ...prev, disabled: !prev.disabled }))
              }
            >
              <Text
                style={[
                  styles.toggleText,
                  isLight && styles.toggleTextLight,
                  editUserForm.disabled && styles.toggleTextLightActive,
                ]}
              >
                {editUserForm.disabled ? "Disabled" : "Active"}
              </Text>
            </TouchableOpacity>
          </View>
          {editUserStatus && (
            <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
              {editUserStatus}
            </Text>
          )}
          <View style={styles.rowActions}>
            <TouchableOpacity
              style={[
                styles.secondaryButton,
                isLight && styles.secondaryButtonLight,
                styles.actionButtonCompact,
                (editUserLoading || editUserSaving) && styles.inlineButtonDisabled,
              ]}
              onPress={cancelEditUser}
              disabled={editUserLoading || editUserSaving}
            >
              <Text
                style={[
                  styles.secondaryButtonText,
                  isLight && styles.secondaryButtonTextLight,
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.primary,
                styles.actionButtonPrimary,
                (editUserLoading || editUserSaving) && styles.inlineButtonDisabled,
              ]}
              onPress={saveUserEdits}
              disabled={editUserLoading || editUserSaving}
            >
              <Text style={[styles.primaryText, isLight && styles.primaryTextLight]}>
                {editUserSaving ? "Saving..." : "Save Changes"}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <Text
        style={[
          styles.cardTitle,
          { marginTop: 18 },
          isLight && styles.cardTitleLight,
        ]}
      >
        Users
      </Text>
      <ScrollView
        style={styles.userList}
        contentContainerStyle={styles.userListContent}
        nestedScrollEnabled
      >
        {employees.map((employee) => (
          <View key={employee.id} style={styles.listRow}>
            <View>
              <Text style={[styles.listName, isLight && styles.listNameLight]}>
                {employee.name}
              </Text>
              <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                {employee.email || "No email"} • {employee.active ? "Active" : "Disabled"}
              </Text>
            </View>
            <View style={styles.rowActions}>
              <TouchableOpacity
                style={[styles.secondaryButton, isLight && styles.secondaryButtonLight, styles.actionButtonCompact]}
                onPress={() => loadUserForEdit(employee.id)}
              >
                <Text
                  style={[
                    styles.secondaryButtonText,
                    isLight && styles.secondaryButtonTextLight,
                  ]}
                >
                  Edit
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  isLight && styles.secondaryButtonLight,
                  styles.actionButtonCompact,
                  employee.active && styles.secondaryButtonDanger,
                ]}
                onPress={() => handleSetUserDisabled(employee.id, employee.active)}
              >
                <Text
                  style={[
                    styles.secondaryButtonText,
                    isLight && styles.secondaryButtonTextLight,
                    employee.active && styles.secondaryButtonDangerText,
                  ]}
                >
                  {employee.active ? "Disable" : "Enable"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const renderOffices = () => (
    <View style={[styles.card, isLight && styles.cardLight]}>
      <Text style={[styles.cardTitle, isLight && styles.cardTitleLight]}>Offices</Text>
      <TextInput
        style={[styles.input, isLight && styles.inputLight]}
        placeholder="New office name"
        value={newOfficeName}
        onChangeText={setNewOfficeName}
      />
      {officeStatus && (
        <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
          {officeStatus}
        </Text>
      )}
      <TouchableOpacity style={[styles.button, styles.primary]} onPress={handleCreateOffice}>
        <Text style={[styles.primaryText, isLight && styles.primaryTextLight]}>
          Create Office
        </Text>
      </TouchableOpacity>
      <View style={[styles.divider, isLight && styles.dividerLight]} />
      {offices.map((office) => (
        <Text key={office.id} style={[styles.listName, isLight && styles.listNameLight]}>
          {office.name}
        </Text>
      ))}
    </View>
  );

  const renderGroups = () => (
    <View style={[styles.card, isLight && styles.cardLight]}>
      <Text style={[styles.cardTitle, isLight && styles.cardTitleLight]}>Groups</Text>
      <TextInput
        style={[styles.input, isLight && styles.inputLight]}
        placeholder="New group name"
        value={newGroupName}
        onChangeText={setNewGroupName}
      />
      {groupStatus && (
        <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
          {groupStatus}
        </Text>
      )}
      <TouchableOpacity style={[styles.button, styles.primary]} onPress={handleCreateGroup}>
        <Text style={[styles.primaryText, isLight && styles.primaryTextLight]}>
          Create Group
        </Text>
      </TouchableOpacity>
      <View style={[styles.divider, isLight && styles.dividerLight]} />
      {groups.map((group) => (
        <Text key={group.id} style={[styles.listName, isLight && styles.listNameLight]}>
          {group.name}
        </Text>
      ))}
    </View>
  );

  const renderReports = () => (
    <View style={[styles.card, isLight && styles.cardLight]}>
      <Text style={[styles.cardTitle, isLight && styles.cardTitleLight]}>
        Run Reports
      </Text>
      <View style={styles.toggleRow}>
        {(["daily", "hours", "payroll", "audit", "tips"] as ReportType[]).map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.togglePill,
              isLight && styles.togglePillLight,
              reportType === type && styles.toggleActive,
              reportType === type && isLight && styles.toggleActiveLight,
            ]}
            onPress={() => setReportType(type)}
          >
            <Text
              style={[
                styles.toggleText,
                isLight && styles.toggleTextLight,
                reportType === type && isLight && styles.toggleTextLightActive,
              ]}
            >
              {type.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[styles.label, isLight && styles.labelLight]}>From (YYYY-MM-DD)</Text>
      <TextInput
        style={[styles.input, isLight && styles.inputLight]}
        value={fromDate}
        onChangeText={setFromDate}
      />
      <Text style={[styles.label, isLight && styles.labelLight]}>To (YYYY-MM-DD)</Text>
      <TextInput
        style={[styles.input, isLight && styles.inputLight]}
        value={toDate}
        onChangeText={setToDate}
      />
      <Text style={[styles.label, isLight && styles.labelLight]}>Employee Filter</Text>
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[
            styles.togglePill,
            isLight && styles.togglePillLight,
            !reportEmployeeId && styles.toggleActive,
            !reportEmployeeId && isLight && styles.toggleActiveLight,
          ]}
          onPress={() => setReportEmployeeId("")}
        >
          <Text
            style={[
              styles.toggleText,
              isLight && styles.toggleTextLight,
              !reportEmployeeId && isLight && styles.toggleTextLightActive,
            ]}
          >
            All Employees
          </Text>
        </TouchableOpacity>
        {employees.map((employee) => (
          <TouchableOpacity
            key={`report-filter-${employee.id}`}
            style={[
              styles.togglePill,
              isLight && styles.togglePillLight,
              reportEmployeeId === employee.id && styles.toggleActive,
              reportEmployeeId === employee.id && isLight && styles.toggleActiveLight,
            ]}
            onPress={() => setReportEmployeeId(employee.id)}
          >
            <Text
              style={[
                styles.toggleText,
                isLight && styles.toggleTextLight,
                reportEmployeeId === employee.id && isLight && styles.toggleTextLightActive,
              ]}
            >
              {employee.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {reportStatus && (
        <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
          {reportStatus}
        </Text>
      )}
      <TouchableOpacity
        style={[styles.button, styles.primary, reportLoading && styles.inlineButtonDisabled]}
        onPress={runReport}
        disabled={reportLoading}
      >
        <Text style={[styles.primaryText, isLight && styles.primaryTextLight]}>
          {reportLoading ? "Generating..." : "Generate Report"}
        </Text>
      </TouchableOpacity>
      <View style={[styles.divider, isLight && styles.dividerLight]} />
      {reportRows.length === 0 ? (
        <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
          No report data loaded.
        </Text>
      ) : reportType === "audit" ? (
        reportRows.map((row: any) => (
          <View key={row.id} style={styles.listRow}>
            <View>
              <Text style={[styles.listName, isLight && styles.listNameLight]}>
                {row.employeeName}
              </Text>
              <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                {row.type}
              </Text>
            </View>
            <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
              {new Date(row.occurredAt).toLocaleString()}
            </Text>
          </View>
        ))
      ) : reportType === "tips" ? (
        reportRows.map((row: any) => (
          <View key={row.id} style={styles.listRow}>
            <View>
              <Text style={[styles.listName, isLight && styles.listNameLight]}>
                {row.name}
              </Text>
              <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                CC ${row.totalCreditCardTips?.toFixed?.(2) ?? row.totalCreditCardTips} • Cash ${row.totalCashTips?.toFixed?.(2) ?? row.totalCashTips}
              </Text>
            </View>
            <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
              ${row.totalTips?.toFixed?.(2) ?? row.totalTips}
            </Text>
          </View>
        ))
      ) : (
        reportRows.map((row: any) => (
          <View key={row.id} style={styles.listRow}>
            <View>
              <Text style={[styles.listName, isLight && styles.listNameLight]}>
                {row.name}
              </Text>
              <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                {row.totalHoursFormatted}
              </Text>
            </View>
            <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
              {row.totalHoursDecimal} hrs
            </Text>
          </View>
        ))
      )}
    </View>
  );

  const renderAlerts = () => (
    <View style={[styles.card, isLight && styles.cardLight]}>
      <Text style={[styles.cardTitle, isLight && styles.cardTitleLight]}>Alerts</Text>
      <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
        Push notifications include punches, 6-hour no-break alerts, and 7-day tip summaries.
      </Text>
      <TouchableOpacity
        style={[styles.secondaryButton, isLight && styles.secondaryButtonLight]}
        onPress={loadNotifications}
      >
        <Text
          style={[
            styles.secondaryButtonText,
            isLight && styles.secondaryButtonTextLight,
          ]}
        >
          Refresh Alerts
        </Text>
      </TouchableOpacity>
      <View style={[styles.divider, isLight && styles.dividerLight]} />
      {notifications.length === 0 ? (
        <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
          No alerts yet.
        </Text>
      ) : (
        notifications.map((notice) => (
          <View key={notice.id} style={styles.listRow}>
            <View>
              <Text style={[styles.listName, isLight && styles.listNameLight]}>
                {notice.message}
              </Text>
              <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                {notice.employeeName ? `${notice.employeeName} • ` : ""}
                {new Date(notice.createdAt).toLocaleString()}
              </Text>
            </View>
          </View>
        ))
      )}
    </View>
  );

  const renderSchedules = () => (
    <View style={[styles.card, isLight && styles.cardLight]}>
      <Text style={[styles.cardTitle, isLight && styles.cardTitleLight]}>
        Schedules
      </Text>
      <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
        Enable days an employee is allowed to clock in. Optional start/end times can
        restrict clock-ins to a window.
      </Text>
      <Text style={[styles.label, isLight && styles.labelLight]}>Employee</Text>
      <View style={styles.toggleRow}>
        {employees.map((employee) => (
          <TouchableOpacity
            key={employee.id}
            style={[
              styles.togglePill,
              isLight && styles.togglePillLight,
              scheduleEmployeeId === employee.id && styles.toggleActive,
              scheduleEmployeeId === employee.id && isLight && styles.toggleActiveLight,
            ]}
            onPress={() => setScheduleEmployeeId(employee.id)}
          >
            <Text
              style={[
                styles.toggleText,
                isLight && styles.toggleTextLight,
                scheduleEmployeeId === employee.id && isLight && styles.toggleTextLightActive,
              ]}
            >
              {employee.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {scheduleDays.map((day) => (
        <View key={day.weekday} style={styles.scheduleRow}>
          <TouchableOpacity
            style={[
              styles.scheduleToggle,
              isLight && styles.scheduleToggleLight,
              day.enabled && styles.scheduleToggleActive,
            ]}
            onPress={() => updateScheduleDay(day.weekday, "enabled", !day.enabled)}
          >
            <Text
              style={[
                styles.scheduleToggleText,
                isLight && styles.scheduleToggleTextLight,
                day.enabled && styles.scheduleToggleTextActive,
              ]}
            >
              {day.label}
            </Text>
          </TouchableOpacity>
          <View style={styles.scheduleTimes}>
            <TextInput
              style={[
                styles.scheduleInput,
                isLight && styles.inputLight,
                !day.enabled && styles.scheduleInputDisabled,
              ]}
              editable={day.enabled}
              value={day.startTime}
              onChangeText={(value) => updateScheduleDay(day.weekday, "startTime", value)}
              placeholder="09:00"
            />
            <Text style={[styles.scheduleDash, isLight && styles.listMetaLight]}>–</Text>
            <TextInput
              style={[
                styles.scheduleInput,
                isLight && styles.inputLight,
                !day.enabled && styles.scheduleInputDisabled,
              ]}
              editable={day.enabled}
              value={day.endTime}
              onChangeText={(value) => updateScheduleDay(day.weekday, "endTime", value)}
              placeholder="17:00"
            />
          </View>
        </View>
      ))}
      {scheduleStatus && (
        <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
          {scheduleStatus}
        </Text>
      )}
      <TouchableOpacity style={[styles.button, styles.primary]} onPress={saveSchedule}>
        <Text style={[styles.primaryText, isLight && styles.primaryTextLight]}>
          Save Schedule
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderContent = () => {
    if (!loggedIn) return renderLogin();
    switch (screen) {
      case "dashboard":
        return renderDashboard();
      case "users":
        return renderUsers();
      case "offices":
        return renderOffices();
      case "groups":
        return renderGroups();
      case "reports":
        return renderReports();
      case "alerts":
        return renderAlerts();
      case "schedules":
        return renderSchedules();
      default:
        return renderDashboard();
    }
  };

  const themeColors = useMemo(() => {
    if (theme === "light") {
      return ["#eef2f7", "#e6ebf3", "#dde3ee"] as const;
    }
    return ["#0c121d", "#141b2a", "#1c2334"] as const;
  }, [theme]);
  const isLight = theme === "light";

  return (
    <LinearGradient colors={themeColors} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.brandRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>CA</Text>
            </View>
            <View>
              <Text style={[styles.title, isLight && styles.titleLight]}>
                ClockIn Admin
              </Text>
              <Text style={[styles.subtitle, isLight && styles.subtitleLight]}>
                Native admin console
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.themeToggle, isLight && styles.themeToggleLight]}
              onPress={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
            >
              <Text
                style={[
                  styles.themeToggleText,
                  isLight && styles.themeToggleTextLight,
                ]}
              >
                {theme === "dark" ? "Light" : "Dark"}
              </Text>
            </TouchableOpacity>
          </View>

          {loggedIn && (
            <View style={[styles.tabShell, isLight && styles.tabShellLight]}>
              {tabs.map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.tab,
                    isLight && styles.tabLight,
                    screen === tab.key && (isLight ? styles.tabActiveLight : styles.tabActive),
                  ]}
                  onPress={() => setScreen(tab.key)}
                >
                  <Text
                    style={[
                      styles.tabText,
                      isLight && styles.tabTextLight,
                      screen === tab.key && isLight && styles.tabTextLightActive,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[
                  styles.tab,
                  styles.tabDanger,
                  isLight && styles.tabDangerLight,
                ]}
                onPress={() => {
                  setLoggedIn(false);
                  setUsername("");
                  setPassword("");
                }}
              >
                <Text
                  style={[
                    styles.tabText,
                    isLight && styles.tabTextLight,
                    isLight && styles.tabTextLightDanger,
                  ]}
                >
                  Logout
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {renderContent()}
        </ScrollView>
        <StatusBar style={theme === "dark" ? "light" : "dark"} />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  container: { padding: 20, paddingBottom: 40, gap: 16 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#3b5bdb",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1e3a8a",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  badgeText: { fontSize: 16, fontWeight: "700", color: "#f8fafc" },
  title: { fontSize: 24, fontWeight: "700", color: "#eef2ff" },
  subtitle: { color: "rgba(226, 232, 240, 0.7)", marginTop: 4, fontSize: 13 },
  themeToggle: {
    marginLeft: "auto",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  themeToggleText: {
    color: "#f9f4ea",
    fontWeight: "600",
    fontSize: 12,
  },
  tabRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tabShell: {
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    borderRadius: 999,
    padding: 6,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tabShellLight: { backgroundColor: "#e2e8f0" },
  tab: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  tabActive: { backgroundColor: "#2f5bff" },
  tabDanger: { backgroundColor: "rgba(239, 68, 68, 0.7)" },
  tabText: { color: "#f9f4ea", fontWeight: "600", fontSize: 12 },
  titleLight: { color: "#0f172a" },
  subtitleLight: { color: "#475569" },
  themeToggleLight: { backgroundColor: "#e2e8f0" },
  themeToggleTextLight: { color: "#0f172a" },
  tabLight: { backgroundColor: "#e2e8f0" },
  tabActiveLight: { backgroundColor: "#2563eb" },
  tabDangerLight: { backgroundColor: "#ef4444" },
  tabTextLight: { color: "#0f172a" },
  tabTextLightActive: { color: "#f8fafc" },
  tabTextLightDanger: { color: "#f8fafc" },
  card: {
    backgroundColor: "rgba(16, 23, 35, 0.65)",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)",
    shadowColor: "#0f172a",
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
  },
  cardTitle: { fontSize: 18, fontWeight: "700", color: "#e2e8f0", marginBottom: 12 },
  cardLight: {
    backgroundColor: "#ffffff",
    borderColor: "rgba(15, 23, 42, 0.08)",
  },
  cardTitleLight: { color: "#0f172a" },
  label: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: "#94a3b8",
    marginTop: 10,
    marginBottom: 6,
  },
  labelLight: { color: "#475569" },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    marginBottom: 8,
    color: "#e2e8f0",
  },
  statusText: { marginTop: 8, color: "#cbd5f5" },
  helperText: { color: "#94a3b8", marginTop: 8, fontSize: 12 },
  inputLight: {
    backgroundColor: "#ffffff",
    borderColor: "rgba(15, 23, 42, 0.12)",
    color: "#0f172a",
  },
  statusTextLight: { color: "#334155" },
  helperTextLight: { color: "#64748b" },
  button: {
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  primary: { backgroundColor: "#2f5bff" },
  primaryText: { fontWeight: "700", color: "#eef2ff" },
  primaryTextLight: { color: "#f8fafc" },
  secondaryButton: {
    marginTop: 8,
    backgroundColor: "rgba(148, 163, 184, 0.16)",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
  },
  secondaryButtonText: { fontSize: 12, fontWeight: "600", color: "#e2e8f0" },
  secondaryButtonLight: { backgroundColor: "#e2e8f0" },
  secondaryButtonTextLight: { color: "#0f172a" },
  secondaryButtonDanger: { backgroundColor: "#dc2626" },
  secondaryButtonDangerText: { color: "#ffffff" },
  rowActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  actionButtonCompact: {
    marginTop: 0,
    alignSelf: "auto",
  },
  actionButtonPrimary: {
    minWidth: 140,
    marginTop: 0,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  summaryTile: {
    backgroundColor: "rgba(148, 163, 184, 0.1)",
    borderRadius: 14,
    padding: 12,
    minWidth: 120,
    flexGrow: 1,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
  },
  summaryHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  summaryIcon: {
    width: 22,
    height: 22,
    borderRadius: 8,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
  },
  summaryIconUsers: { backgroundColor: "rgba(59, 130, 246, 0.35)" },
  summaryIconShield: { backgroundColor: "rgba(244, 114, 182, 0.35)" },
  summaryIconTime: { backgroundColor: "rgba(34, 197, 94, 0.35)" },
  summaryIconReports: { backgroundColor: "rgba(148, 163, 184, 0.35)" },
  summaryLabel: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#cbd5f5",
  },
  summaryValue: { fontSize: 20, fontWeight: "700", color: "#e2e8f0", marginTop: 6 },
  summaryTileLight: { backgroundColor: "#f8fafc" },
  summaryLabelLight: { color: "#64748b" },
  summaryValueLight: { color: "#0f172a" },
  toggleRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  togglePill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(148, 163, 184, 0.2)",
  },
  toggleActive: { backgroundColor: "#2f5bff" },
  toggleDanger: { backgroundColor: "#dc2626" },
  toggleText: { fontSize: 11, fontWeight: "600", color: "#e2e8f0" },
  togglePillLight: { backgroundColor: "#e2e8f0" },
  toggleActiveLight: { backgroundColor: "#2563eb" },
  toggleTextLight: { color: "#0f172a" },
  toggleTextLightActive: { color: "#f8fafc" },
  listRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.14)",
  },
  listActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  listName: { fontSize: 14, fontWeight: "600", color: "#e2e8f0" },
  listMeta: { fontSize: 12, color: "#94a3b8" },
  listNameLight: { color: "#0f172a" },
  listMetaLight: { color: "#64748b" },
  userList: { maxHeight: 260, marginTop: 8 },
  userListContent: { paddingBottom: 8 },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 10,
  },
  scheduleToggle: {
    backgroundColor: "rgba(148, 163, 184, 0.2)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    minWidth: 110,
  },
  scheduleToggleActive: { backgroundColor: "#2f5bff" },
  scheduleToggleLight: { backgroundColor: "#e2e8f0" },
  scheduleToggleText: { color: "#e2e8f0", fontWeight: "600", fontSize: 12 },
  scheduleToggleTextLight: { color: "#0f172a" },
  scheduleToggleTextActive: { color: "#f8fafc" },
  scheduleTimes: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  scheduleInput: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    color: "#e2e8f0",
    flex: 1,
    textAlign: "center",
  },
  scheduleInputDisabled: { opacity: 0.6 },
  scheduleDash: { color: "#94a3b8", fontSize: 14 },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  calendarControls: { flexDirection: "row", alignItems: "center", gap: 8 },
  calendarButton: {
    backgroundColor: "rgba(148, 163, 184, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  calendarButtonLight: { backgroundColor: "#e2e8f0" },
  calendarButtonText: { color: "#e2e8f0", fontWeight: "700" },
  calendarButtonTextLight: { color: "#0f172a" },
  calendarLabel: { color: "#e2e8f0", fontWeight: "700" },
  calendarLabelLight: { color: "#0f172a" },
  calendarGrid: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 8,
  },
  calendarDayHead: {
    width: "13.5%",
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "700",
  },
  calendarCell: {
    width: "13.5%",
    aspectRatio: 1,
    borderRadius: 10,
    backgroundColor: "rgba(148, 163, 184, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  calendarCellLight: { backgroundColor: "#f1f5f9", borderColor: "rgba(15, 23, 42, 0.12)" },
  calendarCellEmpty: { backgroundColor: "transparent", borderColor: "transparent" },
  calendarCellToday: {
    backgroundColor: "#2f5bff",
    borderColor: "transparent",
    shadowColor: "#2f5bff",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  calendarCellTodayLight: {
    backgroundColor: "#2563eb",
    borderColor: "transparent",
  },
  calendarCellText: { color: "#e2e8f0", fontWeight: "600" },
  calendarCellTextLight: { color: "#0f172a" },
  calendarCellTextEmpty: { color: "transparent" },
  calendarCellTextToday: { color: "#f8fafc" },
  calendarCellTextTodayLight: { color: "#f8fafc" },
  inlineButton: {
    backgroundColor: "#ef4444",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  inlineButtonText: { color: "#fff7ed", fontSize: 11, fontWeight: "700" },
  inlineButtonLight: { backgroundColor: "#dc2626" },
  inlineButtonTextLight: { color: "#ffffff" },
  inlineButtonDisabled: { opacity: 0.6 },
  divider: { height: 1, backgroundColor: "rgba(0,0,0,0.08)", marginVertical: 12 },
  dividerLight: { backgroundColor: "rgba(15, 23, 42, 0.12)" },
  workingCard: {
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    borderRadius: 18,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
  },
  workingCardLight: { backgroundColor: "#f8fafc" },
  workingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  workingLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(59, 130, 246, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#e2e8f0", fontWeight: "700", fontSize: 12 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(34, 197, 94, 0.18)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#34d399",
  },
  statusPillText: { color: "#d1fae5", fontSize: 11, fontWeight: "700" },
  statusPillOut: { backgroundColor: "rgba(148, 163, 184, 0.18)" },
  statusDotOut: { backgroundColor: "#94a3b8" },
  statusPillTextOut: { color: "#e2e8f0" },
  footerNote: {
    textAlign: "center",
    color: "rgba(226, 232, 240, 0.6)",
    marginTop: 14,
    fontSize: 12,
  },
  footerNoteLight: { color: "#64748b" },
  inlineButtonIn: {
    backgroundColor: "#22c55e",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  inlineButtonTextIn: { color: "#0f172a", fontSize: 11, fontWeight: "700" },
  inlineButtonInLight: { backgroundColor: "#16a34a" },
  inlineButtonTextInLight: { color: "#ffffff" },
});
