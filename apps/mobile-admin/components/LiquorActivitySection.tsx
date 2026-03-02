import { Text, View } from "react-native";
import { styles } from "../App.styles";
import type { LiquorCountRow, LiquorMovementRow } from "../types";

type LiquorActivitySectionProps = {
  isLight: boolean;
  inline: (value: string) => string;
  sortedMovements: LiquorMovementRow[];
  sortedCounts: LiquorCountRow[];
  formatQtyValue: (value: number | null | undefined) => string;
};

export function LiquorActivitySection({
  isLight,
  inline,
  sortedMovements,
  sortedCounts,
  formatQtyValue,
}: LiquorActivitySectionProps) {
  return (
    <View style={[styles.liquorSectionCard, isLight && styles.liquorSectionCardLight]}>
      <Text style={[styles.listName, isLight && styles.listNameLight]}>
        Activity Feed
      </Text>
      <Text style={[styles.label, isLight && styles.labelLight]}>
        Recent Movements
      </Text>
      {sortedMovements.length === 0 ? (
        <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
          No movements yet.
        </Text>
      ) : (
        sortedMovements.slice(0, 40).map((movement) => (
          <View key={`movement-${movement.id}`} style={styles.listRow}>
            <View style={styles.reportRowMain}>
              <Text style={[styles.listName, isLight && styles.listNameLight]}>
                {movement.itemName}
              </Text>
              <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                {movement.type} • {formatQtyValue(movement.quantity)} • {movement.officeName}
              </Text>
              <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                {new Date(movement.occurredAt).toLocaleString()} • {movement.createdBy || "-"}
              </Text>
            </View>
          </View>
        ))
      )}

      <View style={[styles.divider, isLight && styles.dividerLight]} />

      <Text style={[styles.label, isLight && styles.labelLight]}>Recent Counts</Text>
      {sortedCounts.length === 0 ? (
        <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
          No counts yet.
        </Text>
      ) : (
        sortedCounts.slice(0, 40).map((count) => (
          <View key={`count-${count.id}`} style={styles.listRow}>
            <View style={styles.reportRowMain}>
              <Text style={[styles.listName, isLight && styles.listNameLight]}>
                {count.itemName || count.itemId}
              </Text>
              <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                {count.officeName || "-"} • Bar {formatQtyValue(count.barQuantity)} •{" "}
                {inline("Bodega Bottles")} {formatQtyValue(count.bodegaBottleCount)} •{" "}
                {inline("Bodega ML")} {formatQtyValue(count.bodegaQuantity)} • Qty{" "}
                {formatQtyValue(count.quantity)}
              </Text>
              <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                {count.countDate} • {count.createdBy || "-"}
              </Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
}
