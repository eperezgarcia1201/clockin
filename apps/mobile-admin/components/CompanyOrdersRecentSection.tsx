import { Text, View } from "react-native";
import { styles } from "../App.styles";
import type { CompanyOrderRow } from "../types";

type CompanyOrdersRecentSectionProps = {
  isLight: boolean;
  companyOrderRows: CompanyOrderRow[];
  formatDisplayDate: (value: string) => string;
};

export function CompanyOrdersRecentSection({
  isLight,
  companyOrderRows,
  formatDisplayDate,
}: CompanyOrdersRecentSectionProps) {
  return (
    <>
      <View style={[styles.divider, isLight && styles.dividerLight]} />
      <Text style={[styles.listName, isLight && styles.listNameLight]}>Recent Orders</Text>
      {companyOrderRows.length === 0 ? (
        <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>No orders yet.</Text>
      ) : (
        companyOrderRows.map((order) => (
          <View key={`company-order-${order.id}`} style={styles.listRow}>
            <View style={styles.reportRowMain}>
              <Text style={[styles.listName, isLight && styles.listNameLight]}>{order.supplierName}</Text>
              {order.orderLabel ? (
                <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>{order.orderLabel}</Text>
              ) : null}
              <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                {formatDisplayDate(order.orderDate.slice(0, 10))} • {order.itemCount} items
              </Text>
              {Array.isArray(order.contributors) && order.contributors.length > 0 ? (
                <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                  Contributors: {order.contributors.join(", ")}
                </Text>
              ) : null}
              <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                Qty {order.totalQuantity} • {order.officeName || "All locations"}
              </Text>
              {order.notes ? (
                <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>{order.notes}</Text>
              ) : null}
            </View>
          </View>
        ))
      )}
    </>
  );
}
