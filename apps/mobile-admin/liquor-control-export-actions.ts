import { exportLiquorAnalytics } from "./liquor-analytics-export";
import { ensureLiquorManagerAccess } from "./liquor-control-action-access";
import type { LiquorControlActionsParams } from "./liquor-control-action-hooks.types";

export const createLiquorControlExportActions = (
  params: LiquorControlActionsParams,
) => {
  const handleLiquorAnalyticsExport = async (format: "pdf" | "csv" | "excel") => {
    if (!ensureLiquorManagerAccess(params, "Manager account with reports access is required.")) {
      return;
    }
    if (!params.liquorMonthly) {
      params.setLiquorStatus("No report data for selected period.");
      return;
    }

    params.setLiquorExportingFormat(format);
    try {
      await exportLiquorAnalytics({
        format,
        language: params.language,
        liquorMonthly: params.liquorMonthly,
        liquorMonthlyPrevious: params.liquorMonthlyPrevious,
        liquorYearly: params.liquorYearly,
        liquorMovements: params.liquorMovements,
        liquorCounts: params.liquorCounts,
        liquorBottleScans: params.liquorBottleScans,
        bytesToBase64: params.bytesToBase64,
      });
      params.setLiquorStatus(
        `${format.toUpperCase()} ready for liquor control ${params.liquorMonthly.month}.`,
      );
    } catch (error) {
      params.setLiquorStatus(
        error instanceof Error ? error.message : "Unable to export liquor control.",
      );
    } finally {
      params.setLiquorExportingFormat(null);
    }
  };

  return { handleLiquorAnalyticsExport };
};
