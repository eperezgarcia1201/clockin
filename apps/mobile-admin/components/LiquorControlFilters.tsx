import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import type { LiquorControlCardProps } from "./LiquorControlCard.types";

export function LiquorControlFilters({
  isLight,
  inline,
  inlineOrNull,
  hasLiquorPremiumAccess,
  liquorMonth,
  onLiquorMonthChange,
  liquorYear,
  onLiquorYearChange,
  liquorTargetCostPct,
  onLiquorTargetCostPctChange,
  companyOrdersOfficeId,
  liquorLoading,
  onRefreshLiquor,
  liquorWorkspace,
  onLiquorWorkspaceChange,
  liquorStatus,
}: LiquorControlCardProps) {
  const workspaceOptions = [
    { key: "inventory" as const, label: inline("Inventory Sheet") },
    { key: "catalog" as const, label: inline("Catalog") },
    { key: "operations" as const, label: inline("Operations") },
    ...(hasLiquorPremiumAccess
      ? ([
          { key: "scans" as const, label: inline("Bottle Scan") },
          { key: "invoices" as const, label: inline("Invoice OCR") },
        ] as const)
      : []),
    { key: "analytics" as const, label: inline("Analytics") },
    { key: "activity" as const, label: inline("Activity") },
  ];

  return (
    <>
      <View style={styles.liquorFilterGrid}>
        <View style={styles.liquorFieldHalf}>
          <Text style={[styles.label, isLight && styles.labelLight]}>Month</Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={liquorMonth}
            onChangeText={onLiquorMonthChange}
            placeholder="YYYY-MM"
          />
        </View>
        <View style={styles.liquorFieldHalf}>
          <Text style={[styles.label, isLight && styles.labelLight]}>Year</Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={liquorYear}
            onChangeText={onLiquorYearChange}
            placeholder="YYYY"
          />
        </View>
        <View style={styles.liquorFieldHalf}>
          <Text style={[styles.label, isLight && styles.labelLight]}>Target Cost %</Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={liquorTargetCostPct}
            onChangeText={onLiquorTargetCostPctChange}
            keyboardType="decimal-pad"
            inputMode="decimal"
            placeholder="0.24"
          />
        </View>
        <View style={styles.liquorFieldHalf}>
          <Text style={[styles.label, isLight && styles.labelLight]}>Location</Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={companyOrdersOfficeId || ""}
            editable={false}
            placeholder="All locations"
          />
        </View>
      </View>

      <View style={styles.companyOrderExportRow}>
        <TouchableOpacity
          style={[styles.secondaryButton, isLight && styles.secondaryButtonLight]}
          disabled={liquorLoading}
          onPress={onRefreshLiquor}
        >
          <Text style={[styles.secondaryButtonText, isLight && styles.secondaryButtonTextLight]}>
            {liquorLoading ? inline("Refreshing...") : inline("Refresh Liquor")}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.toggleRow}>
        {workspaceOptions.map((option) => {
          const active = liquorWorkspace === option.key;
          return (
            <TouchableOpacity
              key={`liquor-workspace-${option.key}`}
              style={[
                styles.togglePill,
                isLight && styles.togglePillLight,
                active && (isLight ? styles.toggleActiveLight : styles.toggleActive),
              ]}
              onPress={() => onLiquorWorkspaceChange(option.key)}
            >
              <Text
                style={[
                  styles.toggleText,
                  isLight && styles.toggleTextLight,
                  active && isLight && styles.toggleTextLightActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {liquorStatus ? (
        <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
          {inlineOrNull(liquorStatus)}
        </Text>
      ) : null}
    </>
  );
}
