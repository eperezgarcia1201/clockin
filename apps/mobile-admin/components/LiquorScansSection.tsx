import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import type { Lang } from "../copy";
import type { LiquorBottleScanRow, LiquorCatalogItem } from "../types";

type LiquorScansSectionProps = {
  isLight: boolean;
  hasLiquorPremiumAccess: boolean;
  inline: (value: string) => string;
  sortedCatalogItems: LiquorCatalogItem[];
  liquorScanItemId: string;
  onLiquorScanItemIdChange: (value: string) => void;
  liquorScanContainerKey: string;
  onLiquorScanContainerKeyChange: (value: string) => void;
  liquorAnalyzingItemId: string | null;
  language: Lang;
  onAnalyzeLiquorBottleForItem: (itemId: string) => void;
  sortedScans: LiquorBottleScanRow[];
  formatPercentValue: (value: number | null | undefined) => string;
  formatQtyValue: (value: number | null | undefined) => string;
};

export function LiquorScansSection({
  isLight,
  hasLiquorPremiumAccess,
  inline,
  sortedCatalogItems,
  liquorScanItemId,
  onLiquorScanItemIdChange,
  liquorScanContainerKey,
  onLiquorScanContainerKeyChange,
  liquorAnalyzingItemId,
  language,
  onAnalyzeLiquorBottleForItem,
  sortedScans,
  formatPercentValue,
  formatQtyValue,
}: LiquorScansSectionProps) {
  return (
    <View style={[styles.liquorSectionCard, isLight && styles.liquorSectionCardLight]}>
      {!hasLiquorPremiumAccess ? (
        <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
          {inline("Premium liquor features are disabled for this tenant.")}
        </Text>
      ) : (
        <>
          <Text style={[styles.listName, isLight && styles.listNameLight]}>
            {inline("AI Bottle Scan")}
          </Text>
          <Text style={[styles.label, isLight && styles.labelLight]}>Item</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.toggleRow}
          >
            {sortedCatalogItems.map((item) => (
              <TouchableOpacity
                key={`scan-item-${item.id}`}
                style={[
                  styles.togglePill,
                  isLight && styles.togglePillLight,
                  liquorScanItemId === item.id &&
                    (isLight ? styles.toggleActiveLight : styles.toggleActive),
                ]}
                onPress={() => onLiquorScanItemIdChange(item.id)}
              >
                <Text
                  style={[
                    styles.toggleText,
                    isLight && styles.toggleTextLight,
                    liquorScanItemId === item.id &&
                      isLight &&
                      styles.toggleTextLightActive,
                  ]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={[styles.label, isLight && styles.labelLight]}>
            Container Key
          </Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={liquorScanContainerKey}
            onChangeText={onLiquorScanContainerKeyChange}
            placeholder="bar-1 (optional)"
          />
          <TouchableOpacity
            style={[styles.secondaryButton, isLight && styles.secondaryButtonLight]}
            disabled={!liquorScanItemId || liquorAnalyzingItemId === liquorScanItemId}
            onPress={() => {
              if (!liquorScanItemId) {
                return;
              }
              onAnalyzeLiquorBottleForItem(liquorScanItemId);
            }}
          >
            <Text
              style={[
                styles.secondaryButtonText,
                isLight && styles.secondaryButtonTextLight,
              ]}
            >
              {liquorAnalyzingItemId === liquorScanItemId
                ? language === "es"
                  ? "Analizando..."
                  : "Analyzing..."
                : inline("Scan Bottle")}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.listName, isLight && styles.listNameLight]}>
            Bottle Scan History
          </Text>
          {sortedScans.length === 0 ? (
            <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
              No bottle scans yet.
            </Text>
          ) : (
            sortedScans.slice(0, 30).map((scan) => (
              <View key={`scan-row-${scan.id}`} style={styles.listRow}>
                <View style={styles.reportRowMain}>
                  <Text style={[styles.listName, isLight && styles.listNameLight]}>
                    {scan.itemBrand ? `${scan.itemName} (${scan.itemBrand})` : scan.itemName}
                  </Text>
                  <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                    {new Date(scan.measuredAt).toLocaleString()} • Fill{" "}
                    {formatPercentValue(scan.fillPercent)}
                  </Text>
                  <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                    Est. ml {formatQtyValue(scan.estimatedMl)} • Confidence{" "}
                    {formatPercentValue(scan.confidence)}
                    {scan.containerKey ? ` • ${scan.containerKey}` : ""}
                  </Text>
                </View>
              </View>
            ))
          )}
        </>
      )}
    </View>
  );
}
