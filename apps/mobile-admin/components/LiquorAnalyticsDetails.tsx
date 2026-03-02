import { Text, View } from "react-native";
import { styles } from "../App.styles";
import type { LiquorMonthlyReport, LiquorYearlyControl } from "../types";

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

type LiquorAnalyticsDetailsProps = {
  isLight: boolean;
  inline: (value: string) => string;
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
  formatMoneyValue: (value: number | null | undefined) => string;
  formatPercentValue: (value: number | null | undefined) => string;
  formatQtyValue: (value: number | null | undefined) => string;
};

export function LiquorAnalyticsDetails({
  isLight,
  inline,
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
  formatMoneyValue,
  formatPercentValue,
  formatQtyValue,
}: LiquorAnalyticsDetailsProps) {
  const formatSignedQtyValue = (value: number) => {
    const absolute = Math.abs(value);
    const formatted = absolute.toLocaleString("en-US", {
      maximumFractionDigits: 3,
    });
    return `${value >= 0 ? "+" : "-"}${formatted}`;
  };
  const formatSignedMoneyValue = (value: number) => {
    const absolute = Math.abs(value);
    return `${value >= 0 ? "+" : "-"}$${absolute.toFixed(2)}`;
  };
  const usageMlDeltaTone =
    usageMlDelta >= 0 ? styles.liquorDeltaNegative : styles.liquorDeltaPositive;
  const usageCostDeltaTone =
    usageCostDelta >= 0 ? styles.liquorDeltaNegative : styles.liquorDeltaPositive;

  return (
    <>
      <View style={[styles.divider, isLight && styles.dividerLight]} />
      <Text style={[styles.listName, isLight && styles.listNameLight]}>
        {inline("Month-over-Month Comparison")}
      </Text>
      <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
        {inline("Current Month")}: {liquorMonthlyMonth || "-"} • {inline("Previous Month")}:{" "}
        {liquorMonthlyPreviousMonth || "-"}
      </Text>
      <View style={styles.summaryGrid}>
        <View style={[styles.summaryTile, isLight && styles.summaryTileLight]}>
          <Text style={[styles.summaryLabel, isLight && styles.summaryLabelLight]}>
            {inline("Current Usage ML")}
          </Text>
          <Text style={[styles.summaryValue, isLight && styles.summaryValueLight]}>
            {formatQtyValue(currentUsageMl)}
          </Text>
        </View>
        <View style={[styles.summaryTile, isLight && styles.summaryTileLight]}>
          <Text style={[styles.summaryLabel, isLight && styles.summaryLabelLight]}>
            {inline("Previous Usage ML")}
          </Text>
          <Text style={[styles.summaryValue, isLight && styles.summaryValueLight]}>
            {formatQtyValue(previousUsageMl)}
          </Text>
        </View>
        <View style={[styles.summaryTile, isLight && styles.summaryTileLight]}>
          <Text style={[styles.summaryLabel, isLight && styles.summaryLabelLight]}>
            {inline("Delta Usage ML")}
          </Text>
          <Text
            style={[styles.summaryValue, isLight && styles.summaryValueLight, usageMlDeltaTone]}
          >
            {formatSignedQtyValue(usageMlDelta)}
          </Text>
        </View>
        <View style={[styles.summaryTile, isLight && styles.summaryTileLight]}>
          <Text style={[styles.summaryLabel, isLight && styles.summaryLabelLight]}>
            {inline("Current Usage Cost")}
          </Text>
          <Text style={[styles.summaryValue, isLight && styles.summaryValueLight]}>
            {formatMoneyValue(currentUsageCost)}
          </Text>
        </View>
        <View style={[styles.summaryTile, isLight && styles.summaryTileLight]}>
          <Text style={[styles.summaryLabel, isLight && styles.summaryLabelLight]}>
            {inline("Previous Usage Cost")}
          </Text>
          <Text style={[styles.summaryValue, isLight && styles.summaryValueLight]}>
            {formatMoneyValue(previousUsageCost)}
          </Text>
        </View>
        <View style={[styles.summaryTile, isLight && styles.summaryTileLight]}>
          <Text style={[styles.summaryLabel, isLight && styles.summaryLabelLight]}>
            {inline("Delta Usage Cost")}
          </Text>
          <Text
            style={[styles.summaryValue, isLight && styles.summaryValueLight, usageCostDeltaTone]}
          >
            {formatSignedMoneyValue(usageCostDelta)}
          </Text>
        </View>
      </View>
      <Text style={[styles.label, isLight && styles.labelLight]}>
        {inline("Largest Bottle Spend Changes")}
      </Text>
      {monthComparisonRows.length === 0 ? (
        <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
          {inline("No month comparison data available.")}
        </Text>
      ) : (
        monthComparisonRows.slice(0, 20).map((row) => (
          <View key={`comparison-${row.itemId}`} style={styles.listRow}>
            <View style={styles.reportRowMain}>
              <Text style={[styles.listName, isLight && styles.listNameLight]}>{row.name}</Text>
              <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                {row.supplierName || "-"} • {inline("Current Usage ML")} {formatQtyValue(row.currentMl)} •{" "}
                {inline("Previous Usage ML")} {formatQtyValue(row.previousMl)}
              </Text>
              <Text
                style={[
                  styles.listMeta,
                  isLight && styles.listMetaLight,
                  row.deltaCost >= 0 ? styles.liquorDeltaNegative : styles.liquorDeltaPositive,
                ]}
              >
                {inline("Delta Usage ML")} {formatSignedQtyValue(row.deltaMl)} • {inline("Delta Usage Cost")}{" "}
                {formatSignedMoneyValue(row.deltaCost)}
              </Text>
            </View>
          </View>
        ))
      )}

      <View style={[styles.divider, isLight && styles.dividerLight]} />
      <Text style={[styles.listName, isLight && styles.listNameLight]}>Item-Level Variance</Text>
      {liquorMonthlyRows.length ? (
        liquorMonthlyRows.slice(0, 40).map((row) => (
          <View key={`analytics-row-${row.itemId}`} style={styles.listRow}>
            <View style={styles.reportRowMain}>
              <Text style={[styles.listName, isLight && styles.listNameLight]}>{row.name}</Text>
              <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                {row.supplierName || "-"} • Open {formatQtyValue(row.openingUnits)} • Close{" "}
                {formatQtyValue(row.closingUnits)}
              </Text>
              <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                Variance {formatQtyValue(row.varianceUnits)} • Usage Cost {formatMoneyValue(row.actualUsageCost)}
              </Text>
            </View>
          </View>
        ))
      ) : (
        <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>No report data for selected period.</Text>
      )}

      {monthlyIntelligence ? (
        <>
          <View style={[styles.divider, isLight && styles.dividerLight]} />
          <Text style={[styles.listName, isLight && styles.listNameLight]}>Variance Intelligence</Text>
          <Text style={[styles.label, isLight && styles.labelLight]}>Top Variance Items</Text>
          {(monthlyIntelligence.topVarianceItems || []).map((row) => (
            <View key={`int-var-${row.itemId}`} style={styles.listRow}>
              <View style={styles.reportRowMain}>
                <Text style={[styles.listName, isLight && styles.listNameLight]}>{row.name}</Text>
                <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                  {row.supplierName || "-"} • Variance {formatQtyValue(row.varianceUnits)} • Usage{" "}
                  {formatMoneyValue(row.usageCost)}
                </Text>
              </View>
            </View>
          ))}
          <Text style={[styles.label, isLight && styles.labelLight]}>Cost Shock Monitor</Text>
          {(monthlyIntelligence.costShockItems || []).map((row) => (
            <View key={`int-shock-${row.itemId}`} style={styles.listRow}>
              <View style={styles.reportRowMain}>
                <Text style={[styles.listName, isLight && styles.listNameLight]}>{row.name}</Text>
                <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                  {formatMoneyValue(row.baselineCost)} to {formatMoneyValue(row.averageOverrideCost)} •{" "}
                  {(row.deltaPct * 100).toFixed(1)}%
                </Text>
                <Text
                  style={[
                    styles.listMeta,
                    isLight && styles.listMetaLight,
                    row.isShock ? styles.liquorShockText : null,
                  ]}
                >
                  {row.severity}
                </Text>
              </View>
            </View>
          ))}
        </>
      ) : null}

      {liquorYearly ? (
        <>
          <View style={[styles.divider, isLight && styles.dividerLight]} />
          <Text style={[styles.listName, isLight && styles.listNameLight]}>Yearly Control</Text>
          {liquorYearly.months.map((monthRow) => (
            <View key={`yearly-${monthRow.month}`} style={styles.listRow}>
              <View style={styles.reportRowMain}>
                <Text style={[styles.listName, isLight && styles.listNameLight]}>{monthRow.month}</Text>
                <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                  Sales {formatMoneyValue(monthRow.liquorSales)} • Usage{" "}
                  {formatMoneyValue(monthRow.actualUsageCost)} • {formatPercentValue(monthRow.actualUsageCostPercent)}
                </Text>
              </View>
            </View>
          ))}
          <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
            Total sales {formatMoneyValue(liquorYearly.totals.liquorSales)} • Total usage{" "}
            {formatMoneyValue(liquorYearly.totals.actualUsageCost)}
          </Text>
        </>
      ) : null}
    </>
  );
}
