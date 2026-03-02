import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import type { LiquorCatalogSectionProps } from "./LiquorCatalogSection.types";

export function LiquorCatalogListSection({
  isLight,
  inline,
  visibleCatalogItems,
  catalogQuery,
  formatMoneyValue,
  hasMoreCatalogItems,
  onShowMoreCatalogItems,
  filteredCatalogItemsCount,
}: LiquorCatalogSectionProps) {
  return (
    <>
      {visibleCatalogItems.length === 0 ? (
        <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
          {catalogQuery ? inline("No matching liquor items.") : "No liquor items yet."}
        </Text>
      ) : (
        visibleCatalogItems.map((item) => (
          <View key={`liquor-catalog-${item.id}`} style={styles.listRow}>
            <View style={styles.reportRowMain}>
              <Text style={[styles.listName, isLight && styles.listNameLight]}>{item.name}</Text>
              <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                {item.supplierName || "-"} • {item.brand || "-"} • {item.upc || "-"}
              </Text>
              <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                {item.sizeMl === null ? "-" : `${item.sizeMl} ml`} • {formatMoneyValue(item.unitCost)}
              </Text>
            </View>
          </View>
        ))
      )}

      {hasMoreCatalogItems ? (
        <TouchableOpacity
          style={[styles.secondaryButton, isLight && styles.secondaryButtonLight]}
          onPress={onShowMoreCatalogItems}
        >
          <Text style={[styles.secondaryButtonText, isLight && styles.secondaryButtonTextLight]}>
            {inline("Show More")} ({visibleCatalogItems.length}/{filteredCatalogItemsCount})
          </Text>
        </TouchableOpacity>
      ) : null}
    </>
  );
}
