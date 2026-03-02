import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import type { LiquorMonthlyReport, LiquorYearlyControl } from "../types";
import { LiquorAnalyticsDetails } from "./LiquorAnalyticsDetails";

type MonthComparisonRow = {
  itemId: string;
  name: string;
  supplierName: string | null;
  currentMl: number;
  previousMl: number;
  deltaMl: number;
  currentCost: number;
  previousCost: number;
  deltaCost: number;
};

type LiquorAnalyticsSectionProps = {
  isLight: boolean;
  inline: (value: string) => string;
  monthlySummary: LiquorMonthlyReport["summary"] | null;
  formatMoneyValue: (value: number | null | undefined) => string;
  formatPercentValue: (value: number | null | undefined) => string;
  formatQtyValue: (value: number | null | undefined) => string;
  liquorExportingFormat: "pdf" | "csv" | "excel" | null;
  onLiquorAnalyticsExport: (format: "pdf" | "csv" | "excel") => void;
  liquorMonthlyMonth: string | null;
  liquorMonthlyPreviousMonth: string | null;
  currentUsageMl: number;
  previousUsageMl: number;
  usageMlDelta: number;
  currentUsageCost: number;
  previousUsageCost: number;
  usageCostDelta: number;
  monthComparisonRows: MonthComparisonRow[];
  liquorMonthlyRows: LiquorMonthlyReport["rows"];
  monthlyIntelligence: LiquorMonthlyReport["intelligence"] | undefined;
  liquorYearly: LiquorYearlyControl | null;
};

export function LiquorAnalyticsSection({
  isLight,
  inline,
  monthlySummary,
  formatMoneyValue,
  formatPercentValue,
  formatQtyValue,
  liquorExportingFormat,
  onLiquorAnalyticsExport,
  liquorMonthlyMonth,
  liquorMonthlyPreviousMonth,
  currentUsageMl,
  previousUsageMl,
  usageMlDelta,
  currentUsageCost,
  previousUsageCost,
  usageCostDelta,
  monthComparisonRows,
  liquorMonthlyRows,
  monthlyIntelligence,
  liquorYearly,
}: LiquorAnalyticsSectionProps) {
  return (
    <View style={[styles.liquorSectionCard, isLight && styles.liquorSectionCardLight]}>
      <Text style={[styles.listName, isLight && styles.listNameLight]}>
        {inline("Analytics")}
      </Text>
      {!monthlySummary ? (
        <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
          No report data for selected period.
        </Text>
      ) : (
        <>
          <View style={styles.summaryGrid}>
            <View style={[styles.summaryTile, isLight && styles.summaryTileLight]}>
              <Text style={[styles.summaryLabel, isLight && styles.summaryLabelLight]}>
                Opening
              </Text>
              <Text style={[styles.summaryValue, isLight && styles.summaryValueLight]}>
                {formatMoneyValue(monthlySummary.openingInventoryValue)}
              </Text>
            </View>
            <View style={[styles.summaryTile, isLight && styles.summaryTileLight]}>
              <Text style={[styles.summaryLabel, isLight && styles.summaryLabelLight]}>
                Closing
              </Text>
              <Text style={[styles.summaryValue, isLight && styles.summaryValueLight]}>
                {formatMoneyValue(monthlySummary.closingInventoryValue)}
              </Text>
            </View>
            <View style={[styles.summaryTile, isLight && styles.summaryTileLight]}>
              <Text style={[styles.summaryLabel, isLight && styles.summaryLabelLight]}>
                Liquor Sales
              </Text>
              <Text style={[styles.summaryValue, isLight && styles.summaryValueLight]}>
                {formatMoneyValue(monthlySummary.liquorSales)}
              </Text>
            </View>
            <View style={[styles.summaryTile, isLight && styles.summaryTileLight]}>
              <Text style={[styles.summaryLabel, isLight && styles.summaryLabelLight]}>
                Usage Variance
              </Text>
              <Text style={[styles.summaryValue, isLight && styles.summaryValueLight]}>
                {formatMoneyValue(monthlySummary.usageCostVariance)}
              </Text>
            </View>
          </View>
          <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
            Items {monthlySummary.itemCount} • Missing closing counts{" "}
            {monthlySummary.itemsMissingClosingCount} • Actual %{" "}
            {formatPercentValue(monthlySummary.actualUsageCostPercent)}
          </Text>

          <View style={styles.companyOrderExportRow}>
            {(["pdf", "csv", "excel"] as const).map((formatOption) => (
              <TouchableOpacity
                key={`liquor-export-${formatOption}`}
                style={[
                  styles.secondaryButton,
                  isLight && styles.secondaryButtonLight,
                ]}
                disabled={
                  liquorExportingFormat !== null &&
                  liquorExportingFormat !== formatOption
                }
                onPress={() => onLiquorAnalyticsExport(formatOption)}
              >
                <Text
                  style={[
                    styles.secondaryButtonText,
                    isLight && styles.secondaryButtonTextLight,
                  ]}
                >
                  {liquorExportingFormat === formatOption
                    ? inline("Preparing...")
                    : `${inline("Export Data")} ${formatOption.toUpperCase()}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
            {inline(
              "All exports include summary, month comparison, item variance, movements, counts, and scans.",
            )}
          </Text>
          <LiquorAnalyticsDetails
            isLight={isLight}
            inline={inline}
            liquorMonthlyMonth={liquorMonthlyMonth}
            liquorMonthlyPreviousMonth={liquorMonthlyPreviousMonth}
            currentUsageMl={currentUsageMl}
            previousUsageMl={previousUsageMl}
            usageMlDelta={usageMlDelta}
            currentUsageCost={currentUsageCost}
            previousUsageCost={previousUsageCost}
            usageCostDelta={usageCostDelta}
            monthComparisonRows={monthComparisonRows}
            liquorMonthlyRows={liquorMonthlyRows}
            monthlyIntelligence={monthlyIntelligence}
            liquorYearly={liquorYearly}
            formatMoneyValue={formatMoneyValue}
            formatPercentValue={formatPercentValue}
            formatQtyValue={formatQtyValue}
          />
        </>
      )}
    </View>
  );
}
