import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import { formatDisplayDate } from "../app-helpers";
import { i18n } from "../i18n";
import type {
  LiquorBottleScanRow,
  LiquorCatalogItem,
  LiquorInvoiceExtractedRow,
  LiquorSheetDraft,
} from "../types";
import { LiquorControlInventoryRow } from "./LiquorControlInventoryRow";
import { LiquorControlInvoiceSection } from "./LiquorControlInvoiceSection";

type LiquorSheetRow = {
  item: LiquorCatalogItem;
  barQuantity: number;
  bodegaQuantity: number;
  inventory: number;
  total: number | null;
};

type LiquorControlCardProps = {
  t: (typeof i18n)[keyof typeof i18n];
  tenantLiquorInventoryEnabled: boolean;
  sessionEmployeeIsManager: boolean;
  liquorLoading: boolean;
  onRefreshLiquorControlData: () => void;
  liquorCountDate: string;
  onLiquorCountDateChange: (value: string) => void;
  liquorScanContainerKey: string;
  onLiquorScanContainerKeyChange: (value: string) => void;
  hasLiquorPremiumAccess: boolean;
  liquorInvoiceDate: string;
  onLiquorInvoiceDateChange: (value: string) => void;
  liquorInvoiceNumber: string;
  onLiquorInvoiceNumberChange: (value: string) => void;
  liquorInvoiceSupplier: string;
  onLiquorInvoiceSupplierChange: (value: string) => void;
  liquorInvoiceNotes: string;
  onLiquorInvoiceNotesChange: (value: string) => void;
  liquorInvoiceIncludePurchases: boolean;
  onToggleLiquorInvoiceIncludePurchases: () => void;
  onPickLiquorInvoicePhoto: () => void;
  liquorInvoiceAnalyzing: boolean;
  onAnalyzeLiquorInvoicePhoto: () => void;
  liquorInvoiceApplying: boolean;
  onApplyLiquorInvoiceRows: () => void;
  liquorInvoiceImageName: string;
  liquorInvoiceRows: LiquorInvoiceExtractedRow[];
  liquorStatus: string | null;
  liquorSheetRows: LiquorSheetRow[];
  liquorSheetDrafts: Record<string, LiquorSheetDraft>;
  liquorSavingItemId: string | null;
  liquorSavingCountItemId: string | null;
  liquorAnalyzingItemId: string | null;
  onUpdateLiquorSheetDraft: (
    itemId: string,
    key: keyof LiquorSheetDraft,
    value: string,
  ) => void;
  onSaveLiquorCatalogRow: (itemId: string) => void;
  onSaveLiquorCountRow: (itemId: string) => void;
  onAnalyzeLiquorBottleForItem: (itemId: string) => void;
  liquorBottleScans: LiquorBottleScanRow[];
};

export function LiquorControlCard({
  t,
  tenantLiquorInventoryEnabled,
  sessionEmployeeIsManager,
  liquorLoading,
  onRefreshLiquorControlData,
  liquorCountDate,
  onLiquorCountDateChange,
  liquorScanContainerKey,
  onLiquorScanContainerKeyChange,
  hasLiquorPremiumAccess,
  liquorInvoiceDate,
  onLiquorInvoiceDateChange,
  liquorInvoiceNumber,
  onLiquorInvoiceNumberChange,
  liquorInvoiceSupplier,
  onLiquorInvoiceSupplierChange,
  liquorInvoiceNotes,
  onLiquorInvoiceNotesChange,
  liquorInvoiceIncludePurchases,
  onToggleLiquorInvoiceIncludePurchases,
  onPickLiquorInvoicePhoto,
  liquorInvoiceAnalyzing,
  onAnalyzeLiquorInvoicePhoto,
  liquorInvoiceApplying,
  onApplyLiquorInvoiceRows,
  liquorInvoiceImageName,
  liquorInvoiceRows,
  liquorStatus,
  liquorSheetRows,
  liquorSheetDrafts,
  liquorSavingItemId,
  liquorSavingCountItemId,
  liquorAnalyzingItemId,
  onUpdateLiquorSheetDraft,
  onSaveLiquorCatalogRow,
  onSaveLiquorCountRow,
  onAnalyzeLiquorBottleForItem,
  liquorBottleScans,
}: LiquorControlCardProps) {
  return (
    <>
      <Text style={styles.teamTitle}>{t.liquorControl}</Text>
      <Text style={styles.teamMeta}>{t.liquorControlHint}</Text>
      {!tenantLiquorInventoryEnabled ? (
        <Text style={[styles.statusText, styles.teamStatusText]}>
          {t.liquorFeatureDisabled}
        </Text>
      ) : !sessionEmployeeIsManager ? (
        <Text style={[styles.statusText, styles.teamStatusText]}>
          {t.liquorManagerOnly}
        </Text>
      ) : (
        <>
          <View style={styles.teamHeaderRow}>
            <TouchableOpacity
              style={[styles.tenantSwitch, liquorLoading && styles.teamRefreshDisabled]}
              onPress={onRefreshLiquorControlData}
              disabled={liquorLoading}
            >
              <Text style={styles.tenantSwitchText}>
                {liquorLoading ? t.refreshing : t.refresh}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.label}>Count Date</Text>
          <TextInput
            style={styles.input}
            value={liquorCountDate}
            onChangeText={onLiquorCountDateChange}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="rgba(31, 26, 22, 0.35)"
          />
          <Text style={styles.label}>Container Key</Text>
          <TextInput
            style={styles.input}
            value={liquorScanContainerKey}
            onChangeText={onLiquorScanContainerKeyChange}
            placeholder="bar-1 (optional)"
            placeholderTextColor="rgba(31, 26, 22, 0.35)"
          />
          {hasLiquorPremiumAccess ? (
            <LiquorControlInvoiceSection
              t={t}
              liquorInvoiceDate={liquorInvoiceDate}
              onLiquorInvoiceDateChange={onLiquorInvoiceDateChange}
              liquorInvoiceNumber={liquorInvoiceNumber}
              onLiquorInvoiceNumberChange={onLiquorInvoiceNumberChange}
              liquorInvoiceSupplier={liquorInvoiceSupplier}
              onLiquorInvoiceSupplierChange={onLiquorInvoiceSupplierChange}
              liquorInvoiceNotes={liquorInvoiceNotes}
              onLiquorInvoiceNotesChange={onLiquorInvoiceNotesChange}
              liquorInvoiceIncludePurchases={liquorInvoiceIncludePurchases}
              onToggleLiquorInvoiceIncludePurchases={onToggleLiquorInvoiceIncludePurchases}
              onPickLiquorInvoicePhoto={onPickLiquorInvoicePhoto}
              liquorInvoiceAnalyzing={liquorInvoiceAnalyzing}
              onAnalyzeLiquorInvoicePhoto={onAnalyzeLiquorInvoicePhoto}
              liquorInvoiceApplying={liquorInvoiceApplying}
              onApplyLiquorInvoiceRows={onApplyLiquorInvoiceRows}
              liquorInvoiceImageName={liquorInvoiceImageName}
              liquorInvoiceRows={liquorInvoiceRows}
            />
          ) : (
            <Text style={[styles.statusText, styles.teamStatusText]}>
              {t.liquorPremiumDisabled}
            </Text>
          )}
          {liquorStatus ? (
            <Text style={[styles.statusText, styles.teamStatusText]}>{liquorStatus}</Text>
          ) : null}
          {liquorSheetRows.length === 0 ? (
            <Text style={styles.teamEmptyText}>No liquor items yet.</Text>
          ) : (
            liquorSheetRows.map((row) => {
              const draft = liquorSheetDrafts[row.item.id] || {
                supplierName: row.item.supplierName || "",
                unitCost: String(row.item.unitCost || ""),
                sizeMl: row.item.sizeMl === null ? "" : String(row.item.sizeMl),
                barQuantity: String(row.barQuantity || ""),
                bodegaQuantity: String(row.bodegaQuantity || ""),
              };
              const isSavingItem = liquorSavingItemId === row.item.id;
              const isSavingCount = liquorSavingCountItemId === row.item.id;
              const isAnalyzing = liquorAnalyzingItemId === row.item.id;
              return (
                <LiquorControlInventoryRow
                  key={`liquor-row-${row.item.id}`}
                  t={t}
                  row={row}
                  draft={draft}
                  hasLiquorPremiumAccess={hasLiquorPremiumAccess}
                  isSavingItem={isSavingItem}
                  isSavingCount={isSavingCount}
                  isAnalyzing={isAnalyzing}
                  onUpdateLiquorSheetDraft={onUpdateLiquorSheetDraft}
                  onSaveLiquorCatalogRow={onSaveLiquorCatalogRow}
                  onSaveLiquorCountRow={onSaveLiquorCountRow}
                  onAnalyzeLiquorBottleForItem={onAnalyzeLiquorBottleForItem}
                />
              );
            })
          )}
          {hasLiquorPremiumAccess ? (
            <>
              <Text style={styles.teamTitle}>{t.liquorRecentScans}</Text>
              {liquorBottleScans.length === 0 ? (
                <Text style={styles.teamEmptyText}>{t.liquorNoScans}</Text>
              ) : (
                liquorBottleScans.slice(0, 12).map((scan) => (
                  <View key={`liquor-scan-${scan.id}`} style={styles.teamRow}>
                    <View style={styles.teamRowMain}>
                      <Text style={styles.teamEmployeeName}>{scan.itemName}</Text>
                      <Text style={styles.teamEmployeeMeta}>
                        {formatDisplayDate(scan.measuredAt.slice(0, 10))} • Fill{" "}
                        {scan.fillPercent.toFixed(1)}%
                      </Text>
                      <Text style={styles.teamEmployeeMeta}>
                        Est. ml {scan.estimatedMl === null ? "-" : scan.estimatedMl.toFixed(1)}
                        {scan.containerKey ? ` • ${scan.containerKey}` : ""}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </>
          ) : null}
        </>
      )}
    </>
  );
}
