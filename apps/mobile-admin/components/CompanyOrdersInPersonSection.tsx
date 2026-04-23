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
import type {
  CompanyOrderComparisonUnit,
  CompanyOrderInPersonSupplier,
  CompanyOrderOrderUnit,
} from "../types";

type CompanyOrdersInPersonSectionProps = {
  isLight: boolean;
  weekStartDate?: string | null;
  weekEndDate?: string | null;
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
    orderQuantityUnit: CompanyOrderOrderUnit;
    comparisonUnit: CompanyOrderComparisonUnit;
    caseSizeLb: number | null;
    purchasedWeightLb: number | null;
    unitPrice: number | null;
    companyUnitPrice: number | null;
  }>;
  getDraftValue: (
    supplierName: string,
    nameEs: string,
    nameEn: string,
  ) => {
    purchasedQuantity: string;
    purchasedWeightLb: string;
    unitPrice: string;
    companyUnitPrice: string;
  };
  getMetaLine: (
    supplierName: string,
    item: {
      nameEs: string;
      nameEn: string;
      orderedQuantity: number;
      purchasedQuantity: number;
      remainingQuantity: number;
      orderQuantityUnit: CompanyOrderOrderUnit;
      comparisonUnit: CompanyOrderComparisonUnit;
      caseSizeLb: number | null;
      purchasedWeightLb: number | null;
      unitPrice: number | null;
      companyUnitPrice: number | null;
    },
  ) => string;
  onPurchasedQuantityChange: (
    supplierName: string,
    nameEs: string,
    nameEn: string,
    value: string,
  ) => void;
  onPurchasedWeightLbChange: (
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
  onCompanyUnitPriceChange: (
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
  formatDisplayDate: (value: string | null | undefined) => string;
};

const formatOrderUnitLabel = (orderUnit: CompanyOrderOrderUnit) => {
  if (orderUnit === "case") {
    return "case";
  }
  return orderUnit;
};

const formatQuantityLabel = (
  orderUnit: CompanyOrderOrderUnit,
  comparisonUnit: CompanyOrderComparisonUnit,
) => {
  if (comparisonUnit === "lb" && orderUnit === "case") {
    return "Cases Bought";
  }
  if (orderUnit === "case") {
    return "Cases Bought";
  }
  if (comparisonUnit === "lb") {
    return "Quantity Bought";
  }
  return "Units Bought";
};

const formatWeightLabel = () => "Total Pounds";

const formatInPersonPriceLabel = (
  comparisonUnit: CompanyOrderComparisonUnit,
) => (comparisonUnit === "lb" ? "In-Person Price / lb" : "In-Person Price Each");

const formatSupplierPriceLabel = (
  comparisonUnit: CompanyOrderComparisonUnit,
) => (comparisonUnit === "lb" ? "Supplier Price / lb" : "Supplier Price Each");

const normalizeSupplierPrice = (value: number | null | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return Number(value.toFixed(2));
};

const parseInputNumber = (value: string) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return Number(parsed.toFixed(2));
};

const formatMoney = (value: number) => `$${value.toFixed(2)}`;

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
  onPurchasedWeightLbChange,
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
  const safeSuppliers = Array.isArray(suppliers) ? suppliers : [];
  const safeItems = Array.isArray(items) ? items : [];
  const safeSummaryLabel = typeof summaryLabel === "string" ? summaryLabel : "";
  const weekStartLabel = formatDisplayDate(weekStartDate);
  const weekEndLabel = formatDisplayDate(weekEndDate);
  const weekRangeLabel = weekStartLabel
    ? `Week ${weekStartLabel}${weekEndLabel ? ` - ${weekEndLabel}` : ""}`
    : weekEndLabel
      ? `Week ${weekEndLabel}`
      : "Week not available";

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
        {weekRangeLabel}
      </Text>
      <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
        {safeSummaryLabel}
      </Text>
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
        {safeSuppliers.map((supplier) => {
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
        {safeItems.length === 0 ? (
          <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
            No weekly company-order items found for this view.
          </Text>
        ) : (
          safeItems.map((item) => {
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
            const isLbItem = item.comparisonUnit === "lb";
            const purchasedQuantityValue =
              draft.purchasedQuantity.trim().length > 0
                ? parseInputNumber(draft.purchasedQuantity) ?? 0
                : item.purchasedQuantity;
            const comparisonQuantity =
              isLbItem
                ? draft.purchasedWeightLb.trim().length > 0
                  ? parseInputNumber(draft.purchasedWeightLb) ?? 0
                  : item.purchasedWeightLb || 0
                : purchasedQuantityValue;
            const unitPriceValue =
              draft.unitPrice.trim().length > 0
                ? parseInputNumber(draft.unitPrice)
                : item.unitPrice;
            const supplierUnitPriceValue = normalizeSupplierPrice(
              item.companyUnitPrice,
            );
            const companySpend =
              supplierUnitPriceValue !== null && comparisonQuantity > 0
                ? Number(
                    (supplierUnitPriceValue * comparisonQuantity).toFixed(2),
                  )
                : null;
            const inPersonSpend =
              unitPriceValue !== null && comparisonQuantity > 0
                ? Number((unitPriceValue * comparisonQuantity).toFixed(2))
                : null;
            const savingsValue =
              companySpend !== null && inPersonSpend !== null
                ? Number((companySpend - inPersonSpend).toFixed(2))
                : null;
            const savingsLabel =
              savingsValue !== null
                ? savingsValue > 0.004
                  ? `Saved ${formatMoney(savingsValue)}`
                  : savingsValue < -0.004
                    ? `Over ${formatMoney(Math.abs(savingsValue))}`
                    : "Difference $0.00"
                : null;
            const supplierPriceLabel =
              supplierUnitPriceValue !== null
                ? item.comparisonUnit === "lb"
                  ? `${formatMoney(supplierUnitPriceValue)}/lb`
                  : `${formatMoney(supplierUnitPriceValue)} each`
                : "Set in catalog";
            const expectedWeightLb =
              isLbItem &&
              item.caseSizeLb !== null &&
              item.caseSizeLb > 0 &&
              purchasedQuantityValue > 0
                ? Number(
                    (purchasedQuantityValue * item.caseSizeLb).toFixed(2),
                  )
                : null;
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
                    Ordered by {formatOrderUnitLabel(item.orderQuantityUnit)}
                    {item.caseSizeLb ? ` • ${Number(item.caseSizeLb.toFixed(2))} lb per case` : ""}
                  </Text>
                  <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                    {getMetaLine(normalizedSupplierName, {
                      ...item,
                      nameEs: normalizedNames.nameEs,
                      nameEn: normalizedNames.nameEn,
                    })}
                  </Text>
                </View>
                <View style={styles.companyOrderInputGrid}>
                  <View style={styles.companyOrderInputField}>
                    <Text
                      style={[
                        styles.companyOrderInputLabel,
                        isLight && styles.companyOrderInputLabelLight,
                      ]}
                    >
                      {formatQuantityLabel(
                        item.orderQuantityUnit,
                        item.comparisonUnit,
                      )}
                    </Text>
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
                      placeholder="0"
                      placeholderTextColor={isLight ? "#94a3b8" : "#64748b"}
                    />
                  </View>
                  {isLbItem ? (
                    <View style={styles.companyOrderInputField}>
                      <Text
                        style={[
                          styles.companyOrderInputLabel,
                          isLight && styles.companyOrderInputLabelLight,
                        ]}
                      >
                        {formatWeightLabel()}
                      </Text>
                      <TextInput
                        style={[styles.companyOrderQtyInput, isLight && styles.inputLight]}
                        value={draft.purchasedWeightLb}
                        onChangeText={(value) =>
                          onPurchasedWeightLbChange(
                            normalizedSupplierName,
                            normalizedNames.nameEs,
                            normalizedNames.nameEn,
                            value,
                          )
                        }
                        keyboardType="decimal-pad"
                        inputAccessoryViewID={inputAccessoryViewID}
                        placeholder="0"
                        placeholderTextColor={isLight ? "#94a3b8" : "#64748b"}
                      />
                      <Text
                        style={[
                          styles.companyOrderFieldHelp,
                          isLight && styles.companyOrderFieldHelpLight,
                        ]}
                      >
                        {expectedWeightLb !== null
                          ? `Case size says about ${expectedWeightLb} lb. Enter the actual total pounds you bought.`
                          : "Enter the real total pounds for the cases you bought."}
                      </Text>
                    </View>
                  ) : null}
                  <View
                    style={[
                      styles.companyOrderInputField,
                      !isLbItem && styles.companyOrderInputFieldWide,
                    ]}
                  >
                    <Text
                      style={[
                        styles.companyOrderInputLabel,
                        isLight && styles.companyOrderInputLabelLight,
                      ]}
                    >
                      {formatInPersonPriceLabel(item.comparisonUnit)}
                    </Text>
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
                      placeholder="0.00"
                      placeholderTextColor={isLight ? "#94a3b8" : "#64748b"}
                    />
                  </View>
                  <View
                    style={[
                      styles.companyOrderInputField,
                      !isLbItem && styles.companyOrderInputFieldWide,
                    ]}
                  >
                    <Text
                      style={[
                        styles.companyOrderInputLabel,
                        isLight && styles.companyOrderInputLabelLight,
                      ]}
                    >
                      {formatSupplierPriceLabel(item.comparisonUnit)}
                    </Text>
                    <View
                      style={[
                        styles.companyOrderReadOnlyField,
                        isLight && styles.companyOrderReadOnlyFieldLight,
                      ]}
                    >
                      <Text
                        style={[
                          styles.companyOrderReadOnlyValue,
                          isLight && styles.companyOrderReadOnlyValueLight,
                        ]}
                      >
                        {supplierPriceLabel}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.companyOrderMathGrid}>
                  <View
                    style={[
                      styles.companyOrderMathCard,
                      isLight && styles.companyOrderMathCardLight,
                    ]}
                  >
                    <Text
                      style={[
                        styles.companyOrderMathLabel,
                        isLight && styles.companyOrderMathLabelLight,
                      ]}
                    >
                      In-Person Total
                    </Text>
                    <Text
                      style={[
                        styles.companyOrderMathValue,
                        isLight && styles.companyOrderMathValueLight,
                      ]}
                    >
                      {inPersonSpend !== null ? formatMoney(inPersonSpend) : "—"}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.companyOrderMathCard,
                      isLight && styles.companyOrderMathCardLight,
                    ]}
                  >
                    <Text
                      style={[
                        styles.companyOrderMathLabel,
                        isLight && styles.companyOrderMathLabelLight,
                      ]}
                    >
                      Supplier Total
                    </Text>
                    <Text
                      style={[
                        styles.companyOrderMathValue,
                        isLight && styles.companyOrderMathValueLight,
                      ]}
                    >
                      {companySpend !== null ? formatMoney(companySpend) : "—"}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.companyOrderMathCard,
                      isLight && styles.companyOrderMathCardLight,
                    ]}
                  >
                    <Text
                      style={[
                        styles.companyOrderMathLabel,
                        isLight && styles.companyOrderMathLabelLight,
                      ]}
                    >
                      {savingsValue !== null && savingsValue < -0.004
                        ? "Over"
                        : "Saved"}
                    </Text>
                    <Text
                      style={[
                        styles.companyOrderMathValue,
                        isLight && styles.companyOrderMathValueLight,
                        savingsValue !== null && savingsValue > 0.004
                          ? styles.liquorDeltaPositive
                          : null,
                        savingsValue !== null && savingsValue < -0.004
                          ? styles.liquorDeltaNegative
                          : null,
                      ]}
                    >
                      {savingsLabel
                        ? savingsLabel.replace(/^Saved |^Over /, "")
                        : "—"}
                    </Text>
                  </View>
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
