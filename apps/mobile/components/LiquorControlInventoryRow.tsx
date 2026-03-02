import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import { i18n } from "../i18n";
import type { LiquorCatalogItem, LiquorSheetDraft } from "../types";

type LiquorSheetRow = {
  item: LiquorCatalogItem;
  barQuantity: number;
  bodegaQuantity: number;
  inventory: number;
  total: number | null;
};

type LiquorControlInventoryRowProps = {
  t: (typeof i18n)[keyof typeof i18n];
  row: LiquorSheetRow;
  draft: LiquorSheetDraft;
  hasLiquorPremiumAccess: boolean;
  isSavingItem: boolean;
  isSavingCount: boolean;
  isAnalyzing: boolean;
  onUpdateLiquorSheetDraft: (
    itemId: string,
    key: keyof LiquorSheetDraft,
    value: string,
  ) => void;
  onSaveLiquorCatalogRow: (itemId: string) => void;
  onSaveLiquorCountRow: (itemId: string) => void;
  onAnalyzeLiquorBottleForItem: (itemId: string) => void;
};

export function LiquorControlInventoryRow({
  t,
  row,
  draft,
  hasLiquorPremiumAccess,
  isSavingItem,
  isSavingCount,
  isAnalyzing,
  onUpdateLiquorSheetDraft,
  onSaveLiquorCatalogRow,
  onSaveLiquorCountRow,
  onAnalyzeLiquorBottleForItem,
}: LiquorControlInventoryRowProps) {
  return (
    <View key={`liquor-row-${row.item.id}`} style={styles.companyOrderItemRow}>
      <View style={styles.companyOrderItemMain}>
        <Text style={styles.teamEmployeeName}>{row.item.name}</Text>
        <Text style={styles.teamEmployeeMeta}>{row.item.brand || "Liquor item"}</Text>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
        <View style={{ width: "48%" }}>
          <Text style={styles.label}>{t.liquorCompany}</Text>
          <TextInput
            style={styles.input}
            value={draft.supplierName}
            onChangeText={(value) => onUpdateLiquorSheetDraft(row.item.id, "supplierName", value)}
            placeholder="Supplier"
            placeholderTextColor="rgba(31, 26, 22, 0.35)"
          />
        </View>
        <View style={{ width: "48%" }}>
          <Text style={styles.label}>{t.liquorPrice}</Text>
          <TextInput
            style={styles.input}
            value={draft.unitCost}
            onChangeText={(value) => onUpdateLiquorSheetDraft(row.item.id, "unitCost", value)}
            keyboardType="decimal-pad"
            inputMode="decimal"
            placeholder="0.00"
            placeholderTextColor="rgba(31, 26, 22, 0.35)"
          />
        </View>
        <View style={{ width: "30%" }}>
          <Text style={styles.label}>{t.liquorQtyMl}</Text>
          <TextInput
            style={styles.input}
            value={draft.sizeMl}
            onChangeText={(value) => onUpdateLiquorSheetDraft(row.item.id, "sizeMl", value)}
            keyboardType="decimal-pad"
            inputMode="decimal"
            placeholder="750"
            placeholderTextColor="rgba(31, 26, 22, 0.35)"
          />
        </View>
        <View style={{ width: "30%" }}>
          <Text style={styles.label}>{t.liquorBar}</Text>
          <TextInput
            style={styles.input}
            value={draft.barQuantity}
            onChangeText={(value) => onUpdateLiquorSheetDraft(row.item.id, "barQuantity", value)}
            keyboardType="decimal-pad"
            inputMode="decimal"
            placeholder="0"
            placeholderTextColor="rgba(31, 26, 22, 0.35)"
          />
        </View>
        <View style={{ width: "30%" }}>
          <Text style={styles.label}>{t.liquorBodega}</Text>
          <TextInput
            style={styles.input}
            value={draft.bodegaQuantity}
            onChangeText={(value) => onUpdateLiquorSheetDraft(row.item.id, "bodegaQuantity", value)}
            keyboardType="decimal-pad"
            inputMode="decimal"
            placeholder="0"
            placeholderTextColor="rgba(31, 26, 22, 0.35)"
          />
        </View>
        <View style={{ width: "46%" }}>
          <Text style={styles.label}>{t.liquorInventory}</Text>
          <Text style={styles.teamEmployeeMeta}>{row.inventory.toFixed(3)}</Text>
        </View>
        <View style={{ width: "46%" }}>
          <Text style={styles.label}>{t.liquorTotal}</Text>
          <Text style={styles.teamEmployeeMeta}>{row.total === null ? "-" : `$${row.total.toFixed(2)}`}</Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
        <TouchableOpacity
          style={styles.tenantSwitch}
          disabled={isSavingItem}
          onPress={() => onSaveLiquorCatalogRow(row.item.id)}
        >
          <Text style={styles.tenantSwitchText}>{isSavingItem ? t.saving : t.liquorSaveItem}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tenantSwitch}
          disabled={isSavingCount}
          onPress={() => onSaveLiquorCountRow(row.item.id)}
        >
          <Text style={styles.tenantSwitchText}>{isSavingCount ? t.saving : t.liquorSaveCount}</Text>
        </TouchableOpacity>
        {hasLiquorPremiumAccess ? (
          <TouchableOpacity
            style={styles.tenantSwitch}
            disabled={isAnalyzing}
            onPress={() => onAnalyzeLiquorBottleForItem(row.item.id)}
          >
            <Text style={styles.tenantSwitchText}>{isAnalyzing ? t.preparingDownload : t.liquorScanBottle}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}
