import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import type { CompanyOrderCartItem } from "./CompanyOrdersCard.types";

type CompanyOrdersCartSectionProps = {
  isLight: boolean;
  selectedCompanyOrderCount: number;
  selectedCompanyOrderTotalUnits: number;
  companyOrderCartItems: CompanyOrderCartItem[];
  onStepCompanyOrderItem: (
    supplierName: string,
    key: string,
    direction: 1 | -1,
  ) => void;
  onRemoveCompanyOrderItem: (supplierName: string, key: string) => void;
};

export function CompanyOrdersCartSection({
  isLight,
  selectedCompanyOrderCount,
  selectedCompanyOrderTotalUnits,
  companyOrderCartItems,
  onStepCompanyOrderItem,
  onRemoveCompanyOrderItem,
}: CompanyOrdersCartSectionProps) {
  return (
    <View style={styles.companyOrderCartSection}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Text style={[styles.listName, isLight && styles.listNameLight]}>Order Summary</Text>
        <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
          {selectedCompanyOrderCount} items • Qty {selectedCompanyOrderTotalUnits}
        </Text>
      </View>
      {companyOrderCartItems.length === 0 ? (
        <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>No items added yet.</Text>
      ) : (
        companyOrderCartItems.map((item) => (
          <View key={`company-cart-${item.supplierName}-${item.key}`} style={styles.companyOrderCartRow}>
            <View style={styles.reportRowMain}>
              <Text style={[styles.listName, isLight && styles.listNameLight]}>{item.nameEs}</Text>
              <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                {item.nameEn} • {item.supplierName}
              </Text>
            </View>
            <View style={styles.companyOrderCartActions}>
              <TouchableOpacity
                style={[styles.companyOrderStepButton, isLight && styles.companyOrderStepButtonLight]}
                onPress={() => onStepCompanyOrderItem(item.supplierName, item.key, -1)}
              >
                <Text
                  style={[styles.companyOrderStepButtonText, isLight && styles.companyOrderStepButtonTextLight]}
                >
                  -
                </Text>
              </TouchableOpacity>
              <View style={[styles.companyOrderQtyBadge, isLight && styles.companyOrderQtyBadgeLight]}>
                <Text style={[styles.companyOrderQtyBadgeText, isLight && styles.companyOrderQtyBadgeTextLight]}>
                  {Number(item.quantity.toFixed(2))}
                  {item.comparisonUnit === "lb" ? " lb" : ""}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.companyOrderStepButton, isLight && styles.companyOrderStepButtonLight]}
                onPress={() => onStepCompanyOrderItem(item.supplierName, item.key, 1)}
              >
                <Text
                  style={[styles.companyOrderStepButtonText, isLight && styles.companyOrderStepButtonTextLight]}
                >
                  +
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.companyOrderRemoveButton, isLight && styles.companyOrderRemoveButtonLight]}
                onPress={() => onRemoveCompanyOrderItem(item.supplierName, item.key)}
              >
                <Text
                  style={[
                    styles.companyOrderRemoveButtonText,
                    isLight && styles.companyOrderRemoveButtonTextLight,
                  ]}
                >
                  Remove
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </View>
  );
}
