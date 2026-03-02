import type { Dispatch, SetStateAction } from "react";
import type { ActiveShift, Employee, TenantContext, TenantOffice } from "./types";

export type FetchJson = (path: string, init?: RequestInit) => Promise<unknown>;

export type PunchTipsText = {
  tenantNotConfigured: string;
  noActiveShiftUser: string;
  enterUsernameFirst: string;
  employeeNotFoundUseFullName: string;
  submitTipsBeforeOut: string;
  tapSubmitTipsFirst: string;
  pendingTipsBeforeClockIn: string;
  pendingTipsStatus: string;
  pinMustBe4Digits: string;
  locationPermissionRequired: string;
  unableToReadLocation: string;
  punchRecorded: string;
  managerMessageFallbackSubject: string;
  managerMessageFrom: string;
  punchFailed: string;
  activeShiftRestored: string;
  invalidPinResetHint: string;
  selectValidEmployee: string;
  tipsOnlyForServers: string;
  tipsSaved: string;
  tipsMustBeValid: string;
  unableToSaveTips: string;
};

type LastPunchState = {
  name: string;
  type: string;
  occurredAt: Date;
} | null;

export type UsePunchTipActionsParams = {
  t: PunchTipsText;
  tenant: TenantContext | null;
  selectedEmployee: Employee | null;
  selectedOffice: TenantOffice | null;
  punchType: string;
  requiresTipsForOut: boolean;
  hasSubmittedTips: boolean;
  pendingTipDate: string | null;
  employeeName: string;
  pin: string;
  activeShift: ActiveShift | null;
  fetchJson: FetchJson;
  loadWorkingNow: () => Promise<void>;
  persistActiveShift: (shift: ActiveShift) => Promise<void>;
  clearActiveShiftSession: (persist?: boolean) => void;
  scrollToBottom: () => void;
  setStatus: Dispatch<SetStateAction<string | null>>;
  setTipsStatus: Dispatch<SetStateAction<string | null>>;
  setTipsAlert: Dispatch<SetStateAction<boolean>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setServerTipsRequired: Dispatch<SetStateAction<boolean>>;
  setLastPunch: Dispatch<SetStateAction<LastPunchState>>;
  setActiveShift: Dispatch<SetStateAction<ActiveShift | null>>;
  setEmployeeName: Dispatch<SetStateAction<string>>;
  setPendingTipWorkDate: Dispatch<SetStateAction<string | null>>;
  setTipsReminderEmployeeId: Dispatch<SetStateAction<string | null>>;
  setPin: Dispatch<SetStateAction<string>>;
  setCashTips: Dispatch<SetStateAction<string>>;
  setCreditCardTips: Dispatch<SetStateAction<string>>;
  cashTips: string;
  creditCardTips: string;
  tipsSubmittedByDay: Record<string, boolean>;
  getTipSubmissionKey: (employeeId: string, workDate?: string) => string;
  markTipsSubmitted: (tipKey: string) => void;
  setSavingTips: Dispatch<SetStateAction<boolean>>;
};
