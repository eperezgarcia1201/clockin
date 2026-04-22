import {
  InputAccessoryView,
  Keyboard,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { styles } from "../App.styles";
import {
  companyOrderItemKey,
  normalizeCompanyOrderItemNames,
} from "../app-helpers";
import type { CompanyOrderInPersonSupplier } from "../types";

type CompanyOrdersInPersonSectionProps = {
  isLight: boolean;
  weekStartDate: string;
  weekEndDate: string;
  suppliers: CompanyOrderInPersonSupplier[];
  supplierName: string;
  onSupplierChange: (value: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  summaryLabel: string;
  items: Array<{
    supplierName: string;
    nameEs: string;
    nameEn: string;
    orderedQuantity: number;
    purchasedQuantity: number;
    remainingQuantity: number;
    unitPrice: number | null;
  }>;
  getDraftValue: (
    supplierName: string,
    nameEs: string,
    nameEn: string,
  ) => { purchasedQuantity: string; unitPrice: string };
  getMetaLine: (
    supplierName: string,
    item: {
      nameEs: string;
      nameEn: string;
      orderedQuantity: number;
      purchasedQuantity: number;
      remainingQuantity: number;
      unitPrice: number | null;
    },
  ) => string;
  onPurchasedQuantityChange: (
    supplierName: string,
    nameEs: string,
    nameEn: string,
    value: string,
  ) => void;
  onUnitPriceChange: (
    supplierName: string,
    nameEs: string,
    nameEn: string,
    value: string,
  ) => void;
  onSave: () => void;
  onRefresh: () => void;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  loading: boolean;
  saving: boolean;
  status: string | null;
  formatDisplayDate: (value: string) => string;
};

export function CompanyOrdersInPersonSection({
  isLight,
  weekStartDate,
  weekEndDate,
  suppliers,
  supplierName,
  onSupplierChange,
  search,
  onSearchChange,
  summaryLabel,
  items,
  getDraftValue,
  getMetaLine,
  onPurchasedQuantityChange,
  onUnitPriceChange,
  onSave,
  onRefresh,
  onPreviousWeek,
  onNextWeek,
  loading,
  saving,
  status,
  formatDisplayDate,
}: CompanyOrdersInPersonSectionProps) {
  const inputAccessoryViewID =
    Platform.OS === "ios" ? "company-order-in-person-accessory" : undefined;
  const normalizedSearch = typeof search === "string" ? search.trim() : "";

  return (
    <>
      <View style={styles.companyOrderExportRow}>
        <TouchableOpacity
          style={[styles.secondaryButton, isLight && styles.secondaryButtonLight]}
          onPress={onPreviousWeek}
          disabled={loading || saving}
        >
          <Text style={[styles.secondaryButtonText, isLight && styles.secondaryButtonTextLight]}>
            Prev Week
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryButton, isLight && styles.secondaryButtonLight]}
          onPress={onRefresh}
          disabled={loading || saving}
        >
          <Text style={[styles.secondaryButtonText, isLight && styles.secondaryButtonTextLight]}>
            {loading ? "Refreshing..." : "Refresh"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryButton, isLight && styles.secondaryButtonLight]}
          onPress={onNextWeek}
          disabled={loading || saving}
        >
          <Text style={[styles.secondaryButtonText, isLight && styles.secondaryButtonTextLight]}>
            Next Week
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
        Week {formatDisplayDate(weekStartDate)}
        {weekEndDate ? ` - ${formatDisplayDate(weekEndDate)}` : ""}
      </Text>
      <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>{summaryLabel}</Text>
      <View style={styles.companyOrderExportRow}>
        <TouchableOpacity
          style={[
            styles.button,
            styles.primary,
            { minWidth: 180, paddingHorizontal: 16, alignSelf: "flex-start" },
            saving && styles.inlineButtonDisabled,
          ]}
          onPress={onSave}
          disabled={saving}
        >
          <Text style={[styles.primaryText, isLight && styles.primaryTextLight]}>
            {saving ? "Saving..." : "Save Changes"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryButton, isLight && styles.secondaryButtonLight]}
          onPress={() => Keyboard.dismiss()}
        >
          <Text style={[styles.secondaryButtonText, isLight && styles.secondaryButtonTextLight]}>
            Done Editing
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.label, isLight && styles.labelLight]}>Supplier</Text>
      <View style={styles.toggleRow}>
        {suppliers.map((supplier) => {
          const normalizedSupplierName =
            typeof supplier.supplierName === "string" &&
            supplier.supplierName.trim()
              ? supplier.supplierName.trim()
              : "Unknown Supplier";
          const isActive = normalizedSupplierName === supplierName;
          return (
            <TouchableOpacity
              key={`in-person-supplier-${normalizedSupplierName}`}
              style={[
                styles.togglePill,
                isLight && styles.togglePillLight,
                isActive && styles.toggleActive,
                isActive && isLight && styles.toggleActiveLight,
              ]}
              onPress={() => onSupplierChange(normalizedSupplierName)}
            >
              <Text
                style={[
                  styles.toggleText,
                  isLight && styles.toggleTextLight,
                  isActive && isLight && styles.toggleTextLightActive,
                ]}
              >
                {normalizedSupplierName}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={[styles.label, isLight && styles.labelLight]}>Search Item</Text>
      <TextInput
        style={[styles.input, isLight && styles.inputLight]}
        value={typeof search === "string" ? search : ""}
        onChangeText={onSearchChange}
        placeholder="Search supplier or item"
      />
      <View style={styles.companyOrderItemsWrap}>
        {items.length === 0 ? (
          <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
            No weekly company-order items found for this view.
          </Text>
        ) : (
          items.map((item) => {
            const normalizedNames = normalizeCompanyOrderItemNames(
              item.nameEs,
              item.nameEn,
            );
            const normalizedSupplierName =
              typeof item.supplierName === "string" && item.supplierName.trim()
                ? item.supplierName.trim()
                : "Unknown Supplier";
            const draft = getDraftValue(
              normalizedSupplierName,
              normalizedNames.nameEs,
              normalizedNames.nameEn,
            );
            return (
              <View
                key={`in-person-item-${normalizedSupplierName}-${companyOrderItemKey(normalizedNames.nameEs, normalizedNames.nameEn)}`}
                style={styles.companyOrderCartRow}
              >
                <View style={styles.reportRowMain}>
                  <Text style={[styles.listName, isLight && styles.listNameLight]}>
                    {normalizedNames.nameEs}
                  </Text>
                  <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                    {normalizedNames.nameEn}
                  </Text>
                  {normalizedSearch ? (
                    <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                      Supplier: {normalizedSupplierName}
                    </Text>
                  ) : null}
                  <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                    {getMetaLine(normalizedSupplierName, {
                      ...item,
                      nameEs: normalizedNames.nameEs,
                      nameEn: normalizedNames.nameEn,
                    })}
                  </Text>
                </View>
                <View style={styles.companyOrderCartActions}>
                  <TextInput
                    style={[styles.companyOrderQtyInput, isLight && styles.inputLight]}
                    value={draft.purchasedQuantity}
                    onChangeText={(value) =>
                      onPurchasedQuantityChange(
                        normalizedSupplierName,
                        normalizedNames.nameEs,
                        normalizedNames.nameEn,
                        value,
                      )
                    }
                    keyboardType="decimal-pad"
                    inputAccessoryViewID={inputAccessoryViewID}
                    placeholder="Bought"
                    placeholderTextColor={isLight ? "#94a3b8" : "#64748b"}
                  />
                  <TextInput
                    style={[styles.companyOrderQtyInput, isLight && styles.inputLight]}
                    value={draft.unitPrice}
                    onChangeText={(value) =>
                      onUnitPriceChange(
                        normalizedSupplierName,
                        normalizedNames.nameEs,
                        normalizedNames.nameEn,
                        value,
                      )
                    }
                    keyboardType="decimal-pad"
                    inputAccessoryViewID={inputAccessoryViewID}
                    placeholder="Price"
                    placeholderTextColor={isLight ? "#94a3b8" : "#64748b"}
                  />
                </View>
              </View>
            );
          })
        )}
      </View>
      <TouchableOpacity
        style={[styles.button, styles.primary, saving && styles.inlineButtonDisabled]}
        onPress={onSave}
        disabled={saving}
      >
        <Text style={[styles.primaryText, isLight && styles.primaryTextLight]}>
          {saving ? "Saving..." : "Save In Person Shopping"}
        </Text>
      </TouchableOpacity>
      {status ? (
        <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
          {status}
        </Text>
      ) : null}
      {Platform.OS === "ios" ? (
        <InputAccessoryView nativeID="company-order-in-person-accessory">
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 14,
              paddingVertical: 10,
              backgroundColor: isLight ? "#f8fafc" : "#0f172a",
              borderTopWidth: 1,
              borderTopColor: isLight
                ? "rgba(15, 23, 42, 0.1)"
                : "rgba(148, 163, 184, 0.18)",
            }}
          >
            <TouchableOpacity
              style={[styles.secondaryButton, isLight && styles.secondaryButtonLight, { marginTop: 0 }]}
              onPress={() => Keyboard.dismiss()}
            >
              <Text
                style={[
                  styles.secondaryButtonText,
                  isLight && styles.secondaryButtonTextLight,
                ]}
              >
                Done
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.primary,
                { marginTop: 0, minWidth: 132, paddingHorizontal: 16 },
                saving && styles.inlineButtonDisabled,
              ]}
              onPress={onSave}
              disabled={saving}
            >
              <Text style={[styles.primaryText, isLight && styles.primaryTextLight]}>
                {saving ? "Saving..." : "Save"}
              </Text>
            </TouchableOpacity>
          </View>
        </InputAccessoryView>
      ) : null}
    </>
  );
}
