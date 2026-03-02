export const resolveTipsWorkDate = (pendingTipDate: string | null): string =>
  pendingTipDate || new Date().toISOString().slice(0, 10);

export const parseTipsAmounts = (
  cashTips: string,
  creditCardTips: string,
):
  | { ok: true; cash: number; credit: number }
  | { ok: false } => {
  const cash = Number.parseFloat(cashTips || "0");
  const credit = Number.parseFloat(creditCardTips || "0");
  if (
    !Number.isFinite(cash) ||
    cash < 0 ||
    !Number.isFinite(credit) ||
    credit < 0
  ) {
    return { ok: false };
  }
  return { ok: true, cash, credit };
};

export const isAlreadySubmittedTipsError = (message: string): boolean =>
  message.toLowerCase().includes("already submitted");
