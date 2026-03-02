import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import { formatDisplayDate } from "../app-helpers";
import { i18n } from "../i18n";
import type { CompanyOrderRow } from "../types";

type CompanyOrdersCardRecentOrdersProps = {
  t: (typeof i18n)[keyof typeof i18n];
  companyOrderRows: CompanyOrderRow[];
  companyOrderLoading: boolean;
  onRefreshCompanyOrders: () => void;
};

export function CompanyOrdersCardRecentOrders({
  t,
  companyOrderRows,
  companyOrderLoading,
  onRefreshCompanyOrders,
}: CompanyOrdersCardRecentOrdersProps) {
  return (
    <View style={styles.companyOrderRecentSection}>
      <View style={styles.teamHeaderRow}>
        <Text style={styles.teamTitle}>{t.recentCompanyOrders}</Text>
        <TouchableOpacity
          style={[styles.tenantSwitch, companyOrderLoading && styles.teamRefreshDisabled]}
          onPress={onRefreshCompanyOrders}
          disabled={companyOrderLoading}
        >
          <Text style={styles.tenantSwitchText}>
            {companyOrderLoading ? t.refreshing : t.refresh}
          </Text>
        </TouchableOpacity>
      </View>
      {companyOrderRows.length === 0 ? (
        <Text style={styles.teamEmptyText}>{t.noCompanyOrdersYet}</Text>
      ) : (
        companyOrderRows.map((order) => (
          <View key={`company-order-${order.id}`} style={styles.teamRow}>
            <View style={styles.teamRowMain}>
              <Text style={styles.teamEmployeeName}>{order.supplierName}</Text>
              {order.orderLabel ? <Text style={styles.teamEmployeeMeta}>{order.orderLabel}</Text> : null}
              <Text style={styles.teamEmployeeMeta}>
                {formatDisplayDate(order.orderDate.slice(0, 10))} • {order.itemCount} items • {order.totalQuantity}
              </Text>
              {Array.isArray(order.contributors) && order.contributors.length > 0 ? (
                <Text style={styles.teamEmployeeMeta}>Contributors: {order.contributors.join(", ")}</Text>
              ) : null}
              {order.notes ? <Text style={styles.teamEmployeeMeta}>{order.notes}</Text> : null}
            </View>
          </View>
        ))
      )}
    </View>
  );
}
