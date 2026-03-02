import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import type { LiquorCatalogItem, LiquorSheetDraft } from "../types";
import { LiquorInventoryRowEditor } from "./LiquorInventoryRowEditor";

type LiquorSheetRow = {
  item: LiquorCatalogItem;
  barQuantity: number;
  bodegaQuantity: number;
  bodegaBottleCount: number;
  inventory: number;
  total: number | null;
};

type LiquorInventorySectionProps = {
  isLight: boolean;
  inline: (value: string) => string;
  liquorCountDate: string;
  onLiquorCountDateChange: (value: string) => void;
  liquorInventorySearch: string;
  onLiquorInventorySearchChange: (value: string) => void;
  inventorySuggestions: LiquorCatalogItem[];
  visibleLiquorSheetRows: LiquorSheetRow[];
  inventoryQuery: string;
  liquorSheetDrafts: Record<string, LiquorSheetDraft>;
  liquorKinds: string[];
  liquorSavingItemId: string | null;
  liquorSavingCountItemId: string | null;
  onUpdateLiquorSheetDraft: (
    itemId: string,
    key: keyof LiquorSheetDraft,
    value: string,
  ) => void;
  formatQtyValue: (value: number | null | undefined) => string;
  formatMoneyValue: (value: number | null | undefined) => string;
  onSaveLiquorCatalogRow: (itemId: string) => void;
  onSaveLiquorCountRow: (itemId: string) => void;
  hasMoreInventoryRows: boolean;
  onShowMoreInventoryRows: () => void;
  filteredLiquorSheetRowsCount: number;
};

export function LiquorInventorySection({
  isLight,
  inline,
  liquorCountDate,
  onLiquorCountDateChange,
  liquorInventorySearch,
  onLiquorInventorySearchChange,
  inventorySuggestions,
  visibleLiquorSheetRows,
  inventoryQuery,
  liquorSheetDrafts,
  liquorKinds,
  liquorSavingItemId,
  liquorSavingCountItemId,
  onUpdateLiquorSheetDraft,
  formatQtyValue,
  formatMoneyValue,
  onSaveLiquorCatalogRow,
  onSaveLiquorCountRow,
  hasMoreInventoryRows,
  onShowMoreInventoryRows,
  filteredLiquorSheetRowsCount,
}: LiquorInventorySectionProps) {
  return (
    <View style={[styles.liquorSectionCard, isLight && styles.liquorSectionCardLight]}>
      <Text style={[styles.listName, isLight && styles.listNameLight]}>
        {inline("Inventory Sheet")}
      </Text>
      <Text style={[styles.label, isLight && styles.labelLight]}>Count Date</Text>
      <TextInput
        style={[styles.input, isLight && styles.inputLight]}
        value={liquorCountDate}
        onChangeText={onLiquorCountDateChange}
        placeholder="YYYY-MM-DD"
      />
      <Text style={[styles.label, isLight && styles.labelLight]}>
        {inline("Search Items")}
      </Text>
      <TextInput
        style={[styles.input, isLight && styles.inputLight]}
        value={liquorInventorySearch}
        onChangeText={onLiquorInventorySearchChange}
        placeholder={inline("Search by liquor, company, kind or UPC")}
      />
      {inventorySuggestions.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.toggleRow}
        >
          {inventorySuggestions.map((item) => (
            <TouchableOpacity
              key={`inventory-suggestion-${item.id}`}
              style={[styles.togglePill, isLight && styles.togglePillLight]}
              onPress={() => onLiquorInventorySearchChange(item.name)}
            >
              <Text style={[styles.toggleText, isLight && styles.toggleTextLight]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}
      {visibleLiquorSheetRows.length === 0 ? (
        <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
          {inventoryQuery ? inline("No matching liquor items.") : "No liquor items yet."}
        </Text>
      ) : (
        visibleLiquorSheetRows.map((row) => {
          const draft = liquorSheetDrafts[row.item.id] || {
            name: row.item.name || "",
            brand: row.item.brand || "",
            upc: row.item.upc || "",
            supplierName: row.item.supplierName || "",
            unitCost: String(row.item.unitCost || ""),
            sizeMl: row.item.sizeMl === null ? "" : String(row.item.sizeMl),
            barQuantity: String(row.barQuantity || ""),
            bodegaBottleCount: String(row.bodegaBottleCount || ""),
          };
          const bar = Number(draft.barQuantity || 0) || 0;
          const price = Number(draft.unitCost || 0) || 0;
          const qtyMl = Number(draft.sizeMl || 0) || 0;
          const bodegaBottleCount = Number(draft.bodegaBottleCount || 0) || 0;
          const bodegaMl =
            qtyMl > 0 ? bodegaBottleCount * qtyMl : Number(row.bodegaQuantity || 0) || 0;
          const inventory = bar + bodegaMl;
          const total = qtyMl > 0 ? (price * inventory) / qtyMl : null;
          const rowKindQuery = draft.brand.trim().toLowerCase();
          const rowKindOptions = (rowKindQuery
            ? liquorKinds.filter((kind) => kind.toLowerCase().includes(rowKindQuery))
            : liquorKinds
          ).slice(0, 8);
          const isSavingItem = liquorSavingItemId === row.item.id;
          const isSavingCount = liquorSavingCountItemId === row.item.id;
          return (
            <LiquorInventoryRowEditor
              key={`liquor-row-${row.item.id}`}
              row={row}
              isLight={isLight}
              inline={inline}
              draft={draft}
              rowKindOptions={rowKindOptions}
              bodegaMl={bodegaMl}
              inventory={inventory}
              total={total}
              isSavingItem={isSavingItem}
              isSavingCount={isSavingCount}
              onUpdateLiquorSheetDraft={onUpdateLiquorSheetDraft}
              formatQtyValue={formatQtyValue}
              formatMoneyValue={formatMoneyValue}
              onSaveLiquorCatalogRow={onSaveLiquorCatalogRow}
              onSaveLiquorCountRow={onSaveLiquorCountRow}
            />
          );
        })
      )}
      {hasMoreInventoryRows ? (
        <TouchableOpacity
          style={[styles.secondaryButton, isLight && styles.secondaryButtonLight]}
          onPress={onShowMoreInventoryRows}
        >
          <Text
            style={[
              styles.secondaryButtonText,
              isLight && styles.secondaryButtonTextLight,
            ]}
          >
            {inline("Show More")} ({visibleLiquorSheetRows.length}/
            {filteredLiquorSheetRowsCount})
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
