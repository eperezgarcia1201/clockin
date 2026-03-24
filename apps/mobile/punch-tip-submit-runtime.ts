import {
  isAlreadySubmittedTipsError,
  parseTipsAmounts,
  resolveTipsWorkDate,
} from "./tips-runtime";
import type { UsePunchTipActionsParams } from "./punch-tip-action-types";

export const submitEmployeeTipsFromPunchScreen = async (
  params: UsePunchTipActionsParams,
) => {
  const targetEmployee = params.selectedEmployee;

  if (!targetEmployee) {
    params.setTipsStatus(params.t.selectValidEmployee);
    return;
  }
  if (!targetEmployee.isServer) {
    params.setTipsStatus(params.t.tipsOnlyForServers);
    return;
  }

  const targetWorkDate = resolveTipsWorkDate(params.pendingTipDate);
  const targetTipKey = params.getTipSubmissionKey(
    targetEmployee.id,
    targetWorkDate,
  );
  if (params.tipsSubmittedByDay[targetTipKey]) {
    params.setTipsStatus(params.t.tipsSaved);
    params.setTipsAlert(false);
    if (params.pendingTipDate) {
      params.setPendingTipWorkDate(null);
    }
    return;
  }

  const parsedTips = parseTipsAmounts(params.cashTips, params.creditCardTips);
  if (!parsedTips.ok) {
    params.setTipsStatus(params.t.tipsMustBeValid);
    return;
  }

  params.setSavingTips(true);
  params.setTipsStatus(null);
  try {
    await params.fetchJson(`/employee-tips/${targetEmployee.id}`, {
      method: "POST",
      body: JSON.stringify({
        cashTips: parsedTips.cash,
        creditCardTips: parsedTips.credit,
        workDate: targetWorkDate,
      }),
    });
    params.setServerTipsRequired(false);
    params.markTipsSubmitted(targetTipKey);
    params.clearTiplessClockOutWarning(targetTipKey);
    if (params.pendingTipDate) {
      params.setPendingTipWorkDate(null);
    }
    params.setTipsStatus(params.t.tipsSaved);
    params.setTipsAlert(false);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : params.t.unableToSaveTips;
    if (isAlreadySubmittedTipsError(message)) {
      params.markTipsSubmitted(targetTipKey);
      params.setServerTipsRequired(false);
      params.clearTiplessClockOutWarning(targetTipKey);
      if (params.pendingTipDate) {
        params.setPendingTipWorkDate(null);
      }
      params.setTipsStatus(params.t.tipsSaved);
      params.setTipsAlert(false);
    } else {
      params.setTipsStatus(message);
    }
  } finally {
    params.setSavingTips(false);
  }
};
