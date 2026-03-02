export type ManagerTipsAmountsResult =
  | { ok: false; error: string }
  | { ok: true; cash: number; credit: number };

type FetchJson = (path: string, init?: RequestInit) => Promise<unknown>;

export const parseManagerTipsAmounts = (params: {
  cashTips: string;
  creditCardTips: string;
}): ManagerTipsAmountsResult => {
  const cash = Number.parseFloat(params.cashTips || "0");
  const credit = Number.parseFloat(params.creditCardTips || "0");
  if (
    !Number.isFinite(cash) ||
    cash < 0 ||
    !Number.isFinite(credit) ||
    credit < 0
  ) {
    return { ok: false, error: "Tips must be valid non-negative amounts." };
  }
  return { ok: true, cash, credit };
};

export const buildManagerTipsPayload = (params: {
  cash: number;
  credit: number;
  workDate: string;
}): {
  cashTips: number;
  creditCardTips: number;
  workDate: string;
} => ({
  cashTips: params.cash,
  creditCardTips: params.credit,
  workDate: params.workDate,
});

export const isAlreadySubmittedTipsMessage = (message: string): boolean =>
  message.toLowerCase().includes("already submitted");

export const buildManagerTipsSavedStatus = (workDate: string): string =>
  `Tips saved for ${workDate}. You can clock in now.`;

export const buildManagerTipsAlreadySubmittedStatus = (
  workDate: string,
): string => `Tips already submitted for ${workDate}. You can clock in now.`;

export const buildManagerPendingTipsStatus = (workDate: string): string =>
  `Submit tips for ${workDate} before clocking in.`;

export const buildManagerSelfPunchPayload = (params: {
  type: "IN" | "OUT";
  pin: string;
}): {
  type: "IN" | "OUT";
  pin?: string;
  notes: string;
} => {
  const pinValue = params.pin.trim();
  return {
    type: params.type,
    pin: pinValue || undefined,
    notes:
      params.type === "OUT" ? "Manager self clock-out" : "Manager self clock-in",
  };
};

export const buildManagerSelfPunchStatus = (type: "IN" | "OUT"): string =>
  type === "OUT" ? "You are clocked out." : "You are clocked in.";

export const buildForcePunchPayload = (params: {
  employeeId: string;
  type: "IN" | "OUT";
}): {
  employeeId: string;
  type: "IN" | "OUT";
  occurredAt: string;
  notes: string;
} => ({
  employeeId: params.employeeId,
  type: params.type,
  occurredAt: new Date().toISOString(),
  notes: params.type === "OUT" ? "Admin clock-out" : "Admin clock-in",
});

export const buildForcePunchStatus = (type: "IN" | "OUT"): string =>
  type === "OUT" ? "Employee clocked out." : "Employee clocked in.";

export const submitManagerTipsRequest = async (params: {
  fetchJson: FetchJson;
  employeeId: string;
  cash: number;
  credit: number;
  workDate: string;
}): Promise<{ ok: true } | { ok: false; error: string }> => {
  try {
    await params.fetchJson(`/employee-tips/${params.employeeId}`, {
      method: "POST",
      body: JSON.stringify(
        buildManagerTipsPayload({
          cash: params.cash,
          credit: params.credit,
          workDate: params.workDate,
        }),
      ),
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to save tips.",
    };
  }
};

export const recordManagerSelfPunchRequest = async (params: {
  fetchJson: FetchJson;
  employeeId: string;
  type: "IN" | "OUT";
  pin: string;
}): Promise<{ ok: true } | { ok: false; error: string }> => {
  try {
    await params.fetchJson(`/employee-punches/${params.employeeId}`, {
      method: "POST",
      body: JSON.stringify(
        buildManagerSelfPunchPayload({
          type: params.type,
          pin: params.pin,
        }),
      ),
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to record your punch.",
    };
  }
};

export const recordForcePunchRequest = async (params: {
  fetchJson: FetchJson;
  employeeId: string;
  type: "IN" | "OUT";
}): Promise<{ ok: true } | { ok: false; error: string }> => {
  try {
    await params.fetchJson("/employee-punches/records", {
      method: "POST",
      body: JSON.stringify(
        buildForcePunchPayload({
          employeeId: params.employeeId,
          type: params.type,
        }),
      ),
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Unable to clock out employee.",
    };
  }
};
