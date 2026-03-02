import type { Dispatch, SetStateAction } from "react";
import { extractPendingTipsWorkDate } from "./api-runtime";
import {
  buildForcePunchStatus,
  buildManagerPendingTipsStatus,
  buildManagerSelfPunchStatus,
  buildManagerTipsAlreadySubmittedStatus,
  buildManagerTipsSavedStatus,
  isAlreadySubmittedTipsMessage,
  parseManagerTipsAmounts,
  recordForcePunchRequest,
  recordManagerSelfPunchRequest,
  submitManagerTipsRequest,
} from "./manager-punch-runtime";

type FetchJson = (path: string, init?: RequestInit) => Promise<unknown>;

export const useManagerPunchActions = (params: {
  fetchJson: FetchJson;
  sessionManagerEmployeeId: string | null;
  managerPendingTipWorkDate: string | null;
  managerCashTips: string;
  managerCreditCardTips: string;
  setManagerPunchStatus: Dispatch<SetStateAction<string | null>>;
  setManagerTipSaving: Dispatch<SetStateAction<boolean>>;
  setManagerPendingTipWorkDate: Dispatch<SetStateAction<string | null>>;
  setManagerCashTips: Dispatch<SetStateAction<string>>;
  setManagerCreditCardTips: Dispatch<SetStateAction<string>>;
  managerClockExempt: boolean;
  managerNextPunchType: "IN" | "OUT";
  managerPin: string;
  setManagerPunchLoading: Dispatch<SetStateAction<boolean>>;
  setManagerPin: Dispatch<SetStateAction<string>>;
  loadActiveNow: () => Promise<void>;
  loadNotifications: () => Promise<void>;
  setPunchStatus: Dispatch<SetStateAction<string | null>>;
  setPunchLoadingId: Dispatch<SetStateAction<string | null>>;
}) => {
  const handleSubmitManagerPendingTips = async () => {
    if (!params.sessionManagerEmployeeId || !params.managerPendingTipWorkDate) {
      return;
    }

    const parsedTips = parseManagerTipsAmounts({
      cashTips: params.managerCashTips,
      creditCardTips: params.managerCreditCardTips,
    });
    if (parsedTips.ok === false) {
      params.setManagerPunchStatus(parsedTips.error);
      return;
    }

    params.setManagerTipSaving(true);
    params.setManagerPunchStatus(null);
    try {
      const result = await submitManagerTipsRequest({
        fetchJson: params.fetchJson,
        employeeId: params.sessionManagerEmployeeId,
        cash: parsedTips.cash,
        credit: parsedTips.credit,
        workDate: params.managerPendingTipWorkDate,
      });
      if (result.ok === false) {
        if (isAlreadySubmittedTipsMessage(result.error)) {
          const submittedDate = params.managerPendingTipWorkDate;
          params.setManagerPendingTipWorkDate(null);
          params.setManagerCashTips("0");
          params.setManagerCreditCardTips("0");
          params.setManagerPunchStatus(
            buildManagerTipsAlreadySubmittedStatus(submittedDate),
          );
        } else {
          params.setManagerPunchStatus(result.error);
        }
      } else {
        const submittedDate = params.managerPendingTipWorkDate;
        params.setManagerPendingTipWorkDate(null);
        params.setManagerCashTips("0");
        params.setManagerCreditCardTips("0");
        params.setManagerPunchStatus(buildManagerTipsSavedStatus(submittedDate));
      }
    } finally {
      params.setManagerTipSaving(false);
    }
  };

  const handleManagerSelfPunch = async () => {
    if (!params.sessionManagerEmployeeId) {
      return;
    }
    if (params.managerClockExempt) {
      params.setManagerPunchStatus(
        "Owner privilege is active. Clock in/out is not required.",
      );
      return;
    }
    if (
      params.managerNextPunchType === "IN" &&
      params.managerPendingTipWorkDate
    ) {
      params.setManagerPunchStatus(
        buildManagerPendingTipsStatus(params.managerPendingTipWorkDate),
      );
      return;
    }

    params.setManagerPunchLoading(true);
    params.setManagerPunchStatus(null);
    try {
      const result = await recordManagerSelfPunchRequest({
        fetchJson: params.fetchJson,
        employeeId: params.sessionManagerEmployeeId,
        type: params.managerNextPunchType,
        pin: params.managerPin,
      });
      if (result.ok === false) {
        const pendingDate = extractPendingTipsWorkDate(result.error);
        if (pendingDate) {
          params.setManagerPendingTipWorkDate(pendingDate);
          params.setManagerPunchStatus(buildManagerPendingTipsStatus(pendingDate));
        } else {
          params.setManagerPunchStatus(result.error);
        }
      } else {
        if (params.managerNextPunchType === "IN") {
          params.setManagerPendingTipWorkDate(null);
        }
        params.setManagerPin("");
        params.setManagerPunchStatus(
          buildManagerSelfPunchStatus(params.managerNextPunchType),
        );
        await params.loadActiveNow();
        await params.loadNotifications();
      }
    } finally {
      params.setManagerPunchLoading(false);
    }
  };

  const handleForcePunch = async (employeeId: string, type: "IN" | "OUT") => {
    params.setPunchStatus(null);
    params.setPunchLoadingId(employeeId);
    try {
      const result = await recordForcePunchRequest({
        fetchJson: params.fetchJson,
        employeeId,
        type,
      });
      if (result.ok === false) {
        params.setPunchStatus(result.error);
        return;
      }
      params.setPunchStatus(buildForcePunchStatus(type));
      await params.loadActiveNow();
      await params.loadNotifications();
    } finally {
      params.setPunchLoadingId(null);
    }
  };

  return {
    handleSubmitManagerPendingTips,
    handleManagerSelfPunch,
    handleForcePunch,
  };
};
