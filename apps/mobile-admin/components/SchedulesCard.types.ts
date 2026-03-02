import type { Lang } from "../copy";
import type {
  Employee,
  Meridiem,
  ScheduleDay,
  ScheduleTimeKey,
  TodayScheduleRow,
} from "../types";

export type SchedulesCardProps = {
  isLight: boolean;
  language: Lang;
  selectedScheduleEmployee: Employee | null;
  todayScheduleLabel: string;
  todayScheduleLoading: boolean;
  onRefreshTodaySchedule: () => void;
  inline: (value: string) => string;
  todayScheduleStatus: string | null;
  inlineOrNull: (value: string | null | undefined) => string | null;
  todayRoleTabs: string[];
  activeTodayRoleFilter: string;
  onTodayRoleFilterChange: (value: string) => void;
  filteredTodayScheduleRows: TodayScheduleRow[];
  scheduleEmployeePickerOpen: boolean;
  onToggleScheduleEmployeePicker: () => void;
  employees: Employee[];
  scheduleEmployeeSearch: string;
  onScheduleEmployeeSearchChange: (value: string) => void;
  filteredScheduleEmployees: Employee[];
  scheduleEmployeeId: string;
  onSelectScheduleEmployee: (employeeId: string) => void;
  scheduleDays: ScheduleDay[];
  onUpdateScheduleDay: (
    weekday: number,
    key: keyof ScheduleDay,
    value: string | boolean,
  ) => void;
  onAdjustScheduleTime: (
    weekday: number,
    key: ScheduleTimeKey,
    part: "hour" | "minute" | "meridiem",
    direction: 1 | -1,
  ) => void;
  onSetScheduleMeridiem: (
    weekday: number,
    key: ScheduleTimeKey,
    meridiem: Meridiem,
  ) => void;
  scheduleStatus: string | null;
  onSaveSchedule: () => void;
};
