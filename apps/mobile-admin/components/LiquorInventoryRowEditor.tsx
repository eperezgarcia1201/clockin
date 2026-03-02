import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import type { LiquorCatalogItem, LiquorSheetDraft } from "../types";

type LiquorSheetRow = {
  item: LiquorCatalogItem;
  barQuantity: number;
  bodegaQuantity: number;
  bodegaBottleCount: number;
  inventory: number;
  total: number | null;
};

type LiquorInventoryRowEditorProps = {
  row: LiquorSheetRow;
  isLight: boolean;
  inline: (value: string) => string;
  draft: LiquorSheetDraft;
  rowKindOptions: string[];
  bodegaMl: number;
  inventory: number;
  total: number | null;
  isSavingItem: boolean;
  isSavingCount: boolean;
  onUpdateLiquorSheetDraft: (
    itemId: string,
    key: keyof LiquorSheetDraft,
    value: string,
  ) => void;
  formatQtyValue: (value: number | null | undefined) => string;
  formatMoneyValue: (value: number | null | undefined) => string;
  onSaveLiquorCatalogRow: (itemId: string) => void;
  onSaveLiquorCountRow: (itemId: string) => void;
};

export function LiquorInventoryRowEditor({
  row,
  isLight,
  inline,
  draft,
  rowKindOptions,
  bodegaMl,
  inventory,
  total,
  isSavingItem,
  isSavingCount,
  onUpdateLiquorSheetDraft,
  formatQtyValue,
  formatMoneyValue,
  onSaveLiquorCatalogRow,
  onSaveLiquorCountRow,
}: LiquorInventoryRowEditorProps) {
  return (
    <View key={`liquor-row-${row.item.id}`} style={styles.liquorRowCard}>
      <View style={styles.liquorFormGrid}>
        <View style={styles.liquorFieldHalf}>
          <Text style={[styles.label, isLight && styles.labelLight]}>Company</Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={draft.supplierName}
            onChangeText={(value) => onUpdateLiquorSheetDraft(row.item.id, "supplierName", value)}
            placeholder="Supplier"
          />
        </View>
        <View style={styles.liquorFieldHalf}>
          <Text style={[styles.label, isLight && styles.labelLight]}>Liquor Name</Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={draft.name}
            onChangeText={(value) => onUpdateLiquorSheetDraft(row.item.id, "name", value)}
            placeholder="Liquor name"
          />
        </View>
        <View style={styles.liquorFieldHalf}>
          <Text style={[styles.label, isLight && styles.labelLight]}>Kind</Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={draft.brand}
            onChangeText={(value) => onUpdateLiquorSheetDraft(row.item.id, "brand", value)}
            placeholder="Kind"
          />
          {rowKindOptions.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.toggleRow}
            >
              {rowKindOptions.map((kind) => (
                <TouchableOpacity
                  key={`row-kind-${row.item.id}-${kind}`}
                  style={[styles.togglePill, isLight && styles.togglePillLight]}
                  onPress={() => onUpdateLiquorSheetDraft(row.item.id, "brand", kind)}
                >
                  <Text style={[styles.toggleText, isLight && styles.toggleTextLight]}>{kind}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : null}
        </View>
        <View style={styles.liquorFieldHalf}>
          <Text style={[styles.label, isLight && styles.labelLight]}>UPC</Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={draft.upc}
            onChangeText={(value) => onUpdateLiquorSheetDraft(row.item.id, "upc", value)}
            placeholder="UPC"
          />
        </View>
        <View style={styles.liquorFieldThird}>
          <Text style={[styles.label, isLight && styles.labelLight]}>Price</Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={draft.unitCost}
            onChangeText={(value) => onUpdateLiquorSheetDraft(row.item.id, "unitCost", value)}
            keyboardType="decimal-pad"
            inputMode="decimal"
            placeholder="0.00"
          />
        </View>
        <View style={styles.liquorFieldThird}>
          <Text style={[styles.label, isLight && styles.labelLight]}>Qty/ML</Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={draft.sizeMl}
            onChangeText={(value) => onUpdateLiquorSheetDraft(row.item.id, "sizeMl", value)}
            keyboardType="decimal-pad"
            inputMode="decimal"
            placeholder="750"
          />
        </View>
        <View style={styles.liquorFieldThird}>
          <Text style={[styles.label, isLight && styles.labelLight]}>Bar</Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={draft.barQuantity}
            onChangeText={(value) => onUpdateLiquorSheetDraft(row.item.id, "barQuantity", value)}
            keyboardType="decimal-pad"
            inputMode="decimal"
            placeholder="0"
          />
        </View>
        <View style={styles.liquorFieldThird}>
          <Text style={[styles.label, isLight && styles.labelLight]}>{inline("Bodega Bottles")}</Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={draft.bodegaBottleCount}
            onChangeText={(value) => onUpdateLiquorSheetDraft(row.item.id, "bodegaBottleCount", value)}
            keyboardType="decimal-pad"
            inputMode="decimal"
            placeholder="0"
          />
        </View>
        <View style={styles.liquorFieldThird}>
          <Text style={[styles.label, isLight && styles.labelLight]}>{inline("Bodega ML")}</Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={formatQtyValue(bodegaMl)}
            editable={false}
          />
        </View>
        <View style={styles.liquorFieldThird}>
          <Text style={[styles.label, isLight && styles.labelLight]}>Inventario</Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={formatQtyValue(inventory)}
            editable={false}
          />
        </View>
        <View style={styles.liquorFieldThird}>
          <Text style={[styles.label, isLight && styles.labelLight]}>Total</Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={formatMoneyValue(total)}
            editable={false}
          />
        </View>
      </View>
      <View style={styles.liquorActionRow}>
        <TouchableOpacity
          style={[styles.secondaryButton, isLight && styles.secondaryButtonLight]}
          disabled={isSavingItem}
          onPress={() => onSaveLiquorCatalogRow(row.item.id)}
        >
          <Text style={[styles.secondaryButtonText, isLight && styles.secondaryButtonTextLight]}>
            {isSavingItem ? inline("Saving...") : inline("Save Item")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryButton, isLight && styles.secondaryButtonLight]}
          disabled={isSavingCount}
          onPress={() => onSaveLiquorCountRow(row.item.id)}
        >
          <Text style={[styles.secondaryButtonText, isLight && styles.secondaryButtonTextLight]}>
            {isSavingCount ? inline("Saving...") : inline("Save Count")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
