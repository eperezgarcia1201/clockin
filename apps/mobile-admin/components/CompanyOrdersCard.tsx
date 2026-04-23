import { useEffect, useMemo } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import { companyOrderItemKey, formatMoney } from "../app-helpers";
import { CompanyOrdersCartSection } from "./CompanyOrdersCartSection";
import { CompanyOrdersCatalogSection } from "./CompanyOrdersCatalogSection";
import { CompanyOrdersInPersonSection } from "./CompanyOrdersInPersonSection";
import { CompanyOrdersRecentSection } from "./CompanyOrdersRecentSection";
import type { CompanyOrdersCardProps } from "./CompanyOrdersCard.types";
import type {
  CompanyOrderCatalogSupplier,
  CompanyOrderComparisonUnit,
  CompanyOrderInPersonSupplier,
  CompanyOrderOrderUnit,
  CompanyOrderRow,
} from "../types";

type OrderQuantityByUnit = Record<CompanyOrderOrderUnit, number>;

const createOrderQuantityByUnit = (): OrderQuantityByUnit => ({
  each: 0,
  case: 0,
  lb: 0,
});

const addOrderQuantityByUnit = (
  totals: OrderQuantityByUnit,
  orderUnit: CompanyOrderOrderUnit,
  quantity: number,
) => {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return totals;
  }
  totals[orderUnit] = Number((totals[orderUnit] + quantity).toFixed(2));
  return totals;
};

const formatOrderQuantitySummaryByUnit = (totals: OrderQuantityByUnit) => {
  const parts: string[] = [];
  if (totals.each > 0) {
    parts.push(`${Number(totals.each.toFixed(2))} each`);
  }
  if (totals.case > 0) {
    const value = Number(totals.case.toFixed(2));
    parts.push(`${value} ${Math.abs(value - 1) < 0.005 ? "case" : "cases"}`);
  }
  if (totals.lb > 0) {
    parts.push(`${Number(totals.lb.toFixed(2))} lb`);
  }
  return parts.length ? parts.join(" + ") : "0";
};

const resolveOrderQuantityUnit = (
  comparisonUnit: CompanyOrderComparisonUnit,
): CompanyOrderOrderUnit => (comparisonUnit === "lb" ? "case" : "each");

const normalizeSupplierName = (value: string | null | undefined) =>
  typeof value === "string" ? value.trim() : "";

const buildCatalogComparisonUnitLookup = (
  suppliers: CompanyOrderCatalogSupplier[],
) => {
  const lookup = new Map<
    string,
    Map<
      string,
      { comparisonUnit: CompanyOrderComparisonUnit; caseSizeLb: number | null }
    >
  >();
  suppliers.forEach((supplier) => {
    const supplierName = normalizeSupplierName(supplier.supplierName);
    if (!supplierName) {
      return;
    }
    const supplierKey = supplierName.toLowerCase();
    const itemLookup = new Map<
      string,
      { comparisonUnit: CompanyOrderComparisonUnit; caseSizeLb: number | null }
    >();
    supplier.items.forEach((item) => {
      itemLookup.set(
        companyOrderItemKey(item.nameEs, item.nameEn),
        {
          comparisonUnit: item.comparisonUnit === "lb" ? "lb" : "each",
          caseSizeLb:
            typeof item.caseSizeLb === "number" && item.caseSizeLb > 0
              ? item.caseSizeLb
              : null,
        },
      );
    });
    lookup.set(supplierKey, itemLookup);
  });
  return lookup;
};

const resolveCatalogSettings = (
  lookup: Map<
    string,
    Map<
      string,
      { comparisonUnit: CompanyOrderComparisonUnit; caseSizeLb: number | null }
    >
  >,
  supplierName: string,
  nameEs: string,
  nameEn: string,
): { comparisonUnit: CompanyOrderComparisonUnit; caseSizeLb: number | null } => {
  const supplierKey = normalizeSupplierName(supplierName).toLowerCase();
  const itemKey = companyOrderItemKey(nameEs, nameEn);
  return (
    lookup.get(supplierKey)?.get(itemKey) || {
      comparisonUnit: "each",
      caseSizeLb: null,
    }
  );
};

const formatSavingsValue = (value: number) => {
  if (Math.abs(value) < 0.005) {
    return "$0.00";
  }
  return value > 0 ? `+${formatMoney(value)}` : `-${formatMoney(Math.abs(value))}`;
};

const buildWeekEndDate = (weekStartDate?: string | null) => {
  const value = typeof weekStartDate === "string" ? weekStartDate.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return "";
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  parsed.setUTCDate(parsed.getUTCDate() + 6);
  return parsed.toISOString().slice(0, 10);
};

const buildExportSupplierOptions = ({
  activeMode,
  companyOrderCatalog,
  companyOrderRows,
  companyOrderInPersonSuppliers,
  exportWeekStartDate,
}: {
  activeMode: "orders" | "inPerson";
  companyOrderCatalog: CompanyOrderCatalogSupplier[];
  companyOrderRows: CompanyOrderRow[];
  companyOrderInPersonSuppliers: CompanyOrderInPersonSupplier[];
  exportWeekStartDate: string;
}) => {
  const seen = new Set<string>();
  const options: string[] = [];

  const addOption = (value: string | null | undefined) => {
    const supplierName = normalizeSupplierName(value);
    if (!supplierName) {
      return;
    }
    const key = supplierName.toLowerCase();
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    options.push(supplierName);
  };

  if (activeMode === "inPerson") {
    companyOrderInPersonSuppliers.forEach((supplier) =>
      addOption(supplier.supplierName),
    );
  } else {
    companyOrderCatalog.forEach((supplier) => addOption(supplier.supplierName));
  }

  companyOrderRows.forEach((order) => {
    if (
      !exportWeekStartDate ||
      !order.weekStartDate ||
      order.weekStartDate === exportWeekStartDate
    ) {
      addOption(order.supplierName);
    }
  });

  companyOrderInPersonSuppliers.forEach((supplier) =>
    addOption(supplier.supplierName),
  );

  return options;
};

const buildScopedRows = ({
  supplierName,
  rows,
}: {
  supplierName: string;
  rows: CompanyOrderRow[];
}) => {
  if (!supplierName) {
    return rows;
  }
  const normalizedSupplier = supplierName.toLowerCase();
  return rows.filter(
    (order) =>
      normalizeSupplierName(order.supplierName).toLowerCase() === normalizedSupplier,
  );
};

const buildScopedInPersonSuppliers = ({
  supplierName,
  suppliers,
  activeMode,
  companyOrderInPersonWeekStartDate,
  exportWeekStartDate,
}: {
  supplierName: string;
  suppliers: CompanyOrderInPersonSupplier[];
  activeMode: "orders" | "inPerson";
  companyOrderInPersonWeekStartDate: string | null | undefined;
  exportWeekStartDate: string;
}) => {
  const shouldUseCurrentInPersonWeek =
    activeMode === "inPerson" ||
    !companyOrderInPersonWeekStartDate ||
    !exportWeekStartDate ||
    companyOrderInPersonWeekStartDate === exportWeekStartDate;

  if (!shouldUseCurrentInPersonWeek) {
    return [];
  }

  if (!supplierName) {
    return suppliers;
  }

  const normalizedSupplier = supplierName.toLowerCase();
  return suppliers.filter(
    (supplier) =>
      normalizeSupplierName(supplier.supplierName).toLowerCase() ===
      normalizedSupplier,
  );
};

const buildScopeSummary = ({
  supplierName,
  rows,
  inPersonSuppliers,
  comparisonUnitLookup,
}: {
  supplierName: string;
  rows: CompanyOrderRow[];
  inPersonSuppliers: CompanyOrderInPersonSupplier[];
  comparisonUnitLookup: Map<
    string,
    Map<
      string,
      { comparisonUnit: CompanyOrderComparisonUnit; caseSizeLb: number | null }
    >
  >;
}) => {
  const orderedTotals = createOrderQuantityByUnit();
  let orderCount = rows.length;
  let itemCount = 0;

  rows.forEach((order) => {
    itemCount += order.itemCount || order.items.length;
    order.items.forEach((item) => {
      const settings = resolveCatalogSettings(
        comparisonUnitLookup,
        order.supplierName,
        item.nameEs,
        item.nameEn,
      );
      addOrderQuantityByUnit(
        orderedTotals,
        resolveOrderQuantityUnit(settings.comparisonUnit),
        item.quantity,
      );
    });
  });

  let inPersonSpend = 0;
  let companySpend = 0;
  let savings = 0;
  let shoppingItemCount = 0;
  let purchasedWeightLb = 0;

  inPersonSuppliers.forEach((supplier) => {
    supplier.items.forEach((item) => {
      shoppingItemCount += 1;
      if (itemCount === 0) {
        addOrderQuantityByUnit(
          orderedTotals,
          item.orderQuantityUnit || resolveOrderQuantityUnit(item.comparisonUnit || "each"),
          item.orderedQuantity,
        );
      }

      const purchasedQuantity = Number(item.purchasedQuantity || 0);
      const comparisonQuantity =
        item.comparisonUnit === "lb"
          ? Number(item.purchasedWeightLb || 0)
          : purchasedQuantity;
      const unitPrice =
        typeof item.unitPrice === "number" ? item.unitPrice : null;
      const companyUnitPrice =
        typeof item.companyUnitPrice === "number" && item.companyUnitPrice > 0
          ? item.companyUnitPrice
          : null;

      if (comparisonQuantity > 0 && unitPrice !== null) {
        inPersonSpend = Number(
          (inPersonSpend + comparisonQuantity * unitPrice).toFixed(2),
        );
      }
      if (comparisonQuantity > 0 && companyUnitPrice !== null) {
        companySpend = Number(
          (companySpend + comparisonQuantity * companyUnitPrice).toFixed(2),
        );
      }
      if (
        comparisonQuantity > 0 &&
        unitPrice !== null &&
        companyUnitPrice !== null
      ) {
        savings = Number(
          (savings + comparisonQuantity * (companyUnitPrice - unitPrice)).toFixed(
            2,
          ),
        );
      }
      if (item.comparisonUnit === "lb") {
        purchasedWeightLb = Number(
          (purchasedWeightLb + comparisonQuantity).toFixed(2),
        );
      }
    });
  });

  return {
    supplierName,
    orderCount,
    itemCount: itemCount || shoppingItemCount,
    orderedSummary: formatOrderQuantitySummaryByUnit(orderedTotals),
    inPersonSpend,
    companySpend,
    savings,
    purchasedWeightLb,
    hasShoppingData:
      inPersonSuppliers.length > 0 &&
      (inPersonSpend > 0 || companySpend > 0 || shoppingItemCount > 0),
  };
};

export function CompanyOrdersCard({
  isLight,
  companyOrderMode,
  onCompanyOrderModeChange,
  companyOrderExportAllCompanies,
  onCompanyOrderExportAllCompaniesChange,
  companyOrderExportingFormat,
  onExportCompanyOrders,
  inline,
  language,
  companyOrderCatalog,
  companyOrderSupplier,
  companyOrderDrafts,
  onCompanyOrderSupplierChange,
  companyOrderSearch,
  onCompanyOrderSearchChange,
  companyOrderShowOnlyAdded,
  onCompanyOrderShowOnlyAddedChange,
  selectedCompanyOrderSupplier,
  visibleCompanyOrderItems,
  selectedCompanySupplierDraft,
  onAddCompanyOrderItem,
  hasMoreCompanyOrderItems,
  onShowMoreCompanyOrderItems,
  selectedCompanyOrderCount,
  selectedCompanyOrderTotalUnits,
  companyOrderCartItems,
  onStepCompanyOrderItem,
  onRemoveCompanyOrderItem,
  companyOrderNotes,
  onCompanyOrderNotesChange,
  companyOrderSaving,
  onSubmitCompanyOrder,
  selectedCompanyOrderSupplierCount,
  onRefreshCompanyOrders,
  companyOrderLoading,
  companyOrderStatus,
  inlineOrNull,
  lastSubmittedCompanyOrderWeekStart,
  companyOrderRows,
  formatDisplayDate,
  companyOrderInPersonWeekStartDate,
  companyOrderInPersonWeekEndDate,
  companyOrderInPersonSuppliers,
  companyOrderInPersonSupplier,
  onCompanyOrderInPersonSupplierChange,
  companyOrderInPersonSearch,
  onCompanyOrderInPersonSearchChange,
  companyOrderInPersonSummaryLabel,
  companyOrderInPersonItems,
  getCompanyOrderInPersonDraftValue,
  getCompanyOrderInPersonMetaLine,
  onCompanyOrderInPersonPurchasedQuantityChange,
  onCompanyOrderInPersonPurchasedWeightLbChange,
  onCompanyOrderInPersonUnitPriceChange,
  onCompanyOrderInPersonCompanyUnitPriceChange,
  onSaveCompanyOrderInPerson,
  onLoadCompanyOrderInPerson,
  onPreviousCompanyOrderInPersonWeek,
  onNextCompanyOrderInPersonWeek,
  companyOrderInPersonLoading,
  companyOrderInPersonSaving,
  companyOrderInPersonStatus,
}: CompanyOrdersCardProps) {
  const activeMode = companyOrderMode === "inPerson" ? "inPerson" : "orders";

  const handleModeChange = (value: "orders" | "inPerson") => {
    if (typeof onCompanyOrderModeChange === "function") {
      onCompanyOrderModeChange(value);
    }
  };

  const selectedModeSupplier =
    activeMode === "inPerson" ? companyOrderInPersonSupplier : companyOrderSupplier;

  const exportWeekStartDate =
    (activeMode === "inPerson"
      ? companyOrderInPersonWeekStartDate
      : lastSubmittedCompanyOrderWeekStart) ||
    lastSubmittedCompanyOrderWeekStart ||
    companyOrderInPersonWeekStartDate ||
    "";

  const exportWeekEndDate =
    (activeMode === "inPerson"
      ? companyOrderInPersonWeekEndDate
      : companyOrderRows.find((row) => row.weekStartDate === exportWeekStartDate)
          ?.weekEndDate) || buildWeekEndDate(exportWeekStartDate);

  const exportWeekLabel = exportWeekStartDate
    ? `${formatDisplayDate(exportWeekStartDate)}${
        exportWeekEndDate ? ` - ${formatDisplayDate(exportWeekEndDate)}` : ""
      }`
    : inline("Latest week");

  const exportSupplierOptions = useMemo(
    () =>
      buildExportSupplierOptions({
        activeMode,
        companyOrderCatalog,
        companyOrderRows,
        companyOrderInPersonSuppliers,
        exportWeekStartDate,
      }),
    [
      activeMode,
      companyOrderCatalog,
      companyOrderInPersonSuppliers,
      companyOrderRows,
      exportWeekStartDate,
    ],
  );

  useEffect(() => {
    if (companyOrderExportAllCompanies && exportSupplierOptions.length > 0) {
      onCompanyOrderExportAllCompaniesChange(false);
    }
  }, [
    companyOrderExportAllCompanies,
    exportSupplierOptions.length,
    onCompanyOrderExportAllCompaniesChange,
  ]);

  const selectedExportSupplier =
    normalizeSupplierName(selectedModeSupplier) || exportSupplierOptions[0] || "";

  const catalogComparisonUnitLookup = useMemo(
    () => buildCatalogComparisonUnitLookup(companyOrderCatalog),
    [companyOrderCatalog],
  );

  const recentRowsForExportWeek = useMemo(() => {
    const weeklyRows = exportWeekStartDate
      ? companyOrderRows.filter(
          (order) =>
            !order.weekStartDate || order.weekStartDate === exportWeekStartDate,
        )
      : companyOrderRows;
    return weeklyRows.length ? weeklyRows : companyOrderRows;
  }, [companyOrderRows, exportWeekStartDate]);

  const exportScopedRows = useMemo(
    () =>
      buildScopedRows({
        supplierName: selectedExportSupplier,
        rows: recentRowsForExportWeek,
      }),
    [recentRowsForExportWeek, selectedExportSupplier],
  );

  const selectedScopedInPersonSuppliers = useMemo(
    () =>
      buildScopedInPersonSuppliers({
        supplierName: selectedExportSupplier,
        suppliers: companyOrderInPersonSuppliers,
        activeMode,
        companyOrderInPersonWeekStartDate,
        exportWeekStartDate,
      }),
    [
      activeMode,
      companyOrderInPersonSuppliers,
      companyOrderInPersonWeekStartDate,
      exportWeekStartDate,
      selectedExportSupplier,
    ],
  );

  const exportSummary = useMemo(
    () =>
      buildScopeSummary({
        supplierName: selectedExportSupplier,
        rows: exportScopedRows,
        inPersonSuppliers: selectedScopedInPersonSuppliers,
        comparisonUnitLookup: catalogComparisonUnitLookup,
      }),
    [
      catalogComparisonUnitLookup,
      exportScopedRows,
      selectedExportSupplier,
      selectedScopedInPersonSuppliers,
    ],
  );

  const handleSelectExportSupplier = (supplierName: string) => {
    if (companyOrderExportAllCompanies) {
      onCompanyOrderExportAllCompaniesChange(false);
    }
    if (activeMode === "inPerson") {
      onCompanyOrderInPersonSupplierChange(supplierName);
      return;
    }
    onCompanyOrderSupplierChange(supplierName);
  };

  const handleExport = (
    format: "pdf" | "csv" | "excel",
    supplierName = selectedExportSupplier,
  ) => {
    onExportCompanyOrders(format, {
      supplierName: supplierName || null,
      weekStartDate: exportWeekStartDate || null,
    });
  };

  return (
    <View style={[styles.card, isLight && styles.cardLight]}>
      <Text style={[styles.cardTitle, isLight && styles.cardTitleLight]}>
        Company Orders
      </Text>
      <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
        Supplier catalog imported from your Excel. Kitchen managers and managers can
        submit orders here.
      </Text>

      <Text style={[styles.label, isLight && styles.labelLight]}>
        {language === "es" ? "PDF individual por compañía" : "Individual Company PDF"}
      </Text>
      <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
        {language === "es"
          ? "Cada compañía se descarga en su propio PDF para revisar gasto, costo de compañía y ahorro."
          : "Each company downloads as its own PDF so you can review spend, company cost, and savings separately."}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.toggleRow}
      >
        {exportSupplierOptions.map((supplierName) => {
          const isActive =
            selectedExportSupplier.toLowerCase() === supplierName.toLowerCase();
          return (
            <TouchableOpacity
              key={`company-order-export-supplier-${supplierName}`}
              style={[
                styles.togglePill,
                isLight && styles.togglePillLight,
                isActive && styles.toggleActive,
                isActive && isLight && styles.toggleActiveLight,
              ]}
              onPress={() => handleSelectExportSupplier(supplierName)}
            >
              <Text
                style={[
                  styles.toggleText,
                  isLight && styles.toggleTextLight,
                  isActive && isLight && styles.toggleTextLightActive,
                ]}
              >
                {supplierName}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={[styles.summaryGrid, { marginTop: 4 }]}>
        <View style={[styles.summaryTile, isLight && styles.summaryTileLight]}>
          <Text style={[styles.summaryLabel, isLight && styles.summaryLabelLight]}>
            {language === "es" ? "Compañía" : "Company"}
          </Text>
          <Text style={[styles.summaryValue, isLight && styles.summaryValueLight]}>
            {selectedExportSupplier || inline("No company")}
          </Text>
          <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
            {language === "es" ? "Semana" : "Week"} {exportWeekLabel}
          </Text>
        </View>
        <View style={[styles.summaryTile, isLight && styles.summaryTileLight]}>
          <Text style={[styles.summaryLabel, isLight && styles.summaryLabelLight]}>
            {language === "es" ? "Órdenes" : "Orders"}
          </Text>
          <Text style={[styles.summaryValue, isLight && styles.summaryValueLight]}>
            {exportSummary.orderCount}
          </Text>
        </View>
        <View style={[styles.summaryTile, isLight && styles.summaryTileLight]}>
          <Text style={[styles.summaryLabel, isLight && styles.summaryLabelLight]}>
            {language === "es" ? "Artículos" : "Items"}
          </Text>
          <Text style={[styles.summaryValue, isLight && styles.summaryValueLight]}>
            {exportSummary.itemCount}
          </Text>
          <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
            {exportSummary.orderedSummary}
          </Text>
        </View>
        <View style={[styles.summaryTile, isLight && styles.summaryTileLight]}>
          <Text style={[styles.summaryLabel, isLight && styles.summaryLabelLight]}>
            {language === "es" ? "Total en persona" : "In-Person Total"}
          </Text>
          <Text style={[styles.summaryValue, isLight && styles.summaryValueLight]}>
            {exportSummary.hasShoppingData
              ? formatMoney(exportSummary.inPersonSpend)
              : "—"}
          </Text>
        </View>
        <View style={[styles.summaryTile, isLight && styles.summaryTileLight]}>
          <Text style={[styles.summaryLabel, isLight && styles.summaryLabelLight]}>
            {language === "es" ? "Total proveedor" : "Supplier Total"}
          </Text>
          <Text style={[styles.summaryValue, isLight && styles.summaryValueLight]}>
            {exportSummary.hasShoppingData
              ? formatMoney(exportSummary.companySpend)
              : "—"}
          </Text>
        </View>
        <View style={[styles.summaryTile, isLight && styles.summaryTileLight]}>
          <Text style={[styles.summaryLabel, isLight && styles.summaryLabelLight]}>
            {language === "es" ? "Ahorro / extra" : "Saved / Over"}
          </Text>
          <Text
            style={[
              styles.summaryValue,
              isLight && styles.summaryValueLight,
              exportSummary.hasShoppingData && exportSummary.savings > 0
                ? styles.liquorDeltaPositive
                : null,
              exportSummary.hasShoppingData && exportSummary.savings < 0
                ? styles.liquorDeltaNegative
                : null,
            ]}
          >
            {exportSummary.hasShoppingData
              ? formatSavingsValue(exportSummary.savings)
              : "—"}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.button,
          styles.primary,
          styles.actionButtonPrimary,
          companyOrderExportingFormat !== null && styles.inlineButtonDisabled,
        ]}
        disabled={companyOrderExportingFormat !== null || !selectedExportSupplier}
        onPress={() => handleExport("pdf")}
      >
        <Text style={[styles.primaryText, isLight && styles.primaryTextLight]}>
          {companyOrderExportingFormat === "pdf"
            ? inline("Preparing...")
            : language === "es"
              ? `Descargar PDF de ${selectedExportSupplier || "compañía"}`
              : `Download ${selectedExportSupplier || "Company"} PDF`}
        </Text>
      </TouchableOpacity>

      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[
            styles.togglePill,
            isLight && styles.togglePillLight,
            activeMode === "orders" && styles.toggleActive,
            activeMode === "orders" && isLight && styles.toggleActiveLight,
          ]}
          onPress={() => handleModeChange("orders")}
        >
          <Text
            style={[
              styles.toggleText,
              isLight && styles.toggleTextLight,
              activeMode === "orders" && isLight && styles.toggleTextLightActive,
            ]}
          >
            Company Orders
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.togglePill,
            isLight && styles.togglePillLight,
            activeMode === "inPerson" && styles.toggleActive,
            activeMode === "inPerson" && isLight && styles.toggleActiveLight,
          ]}
          onPress={() => handleModeChange("inPerson")}
        >
          <Text
            style={[
              styles.toggleText,
              isLight && styles.toggleTextLight,
              activeMode === "inPerson" &&
                isLight &&
                styles.toggleTextLightActive,
            ]}
          >
            In Person Shopping
          </Text>
        </TouchableOpacity>
      </View>

      {activeMode === "orders" ? (
        <>
          <CompanyOrdersCatalogSection
            isLight={isLight}
            companyOrderCatalog={companyOrderCatalog}
            companyOrderSupplier={companyOrderSupplier}
            companyOrderDrafts={companyOrderDrafts}
            onCompanyOrderSupplierChange={onCompanyOrderSupplierChange}
            companyOrderSearch={companyOrderSearch}
            onCompanyOrderSearchChange={onCompanyOrderSearchChange}
            companyOrderShowOnlyAdded={companyOrderShowOnlyAdded}
            onCompanyOrderShowOnlyAddedChange={onCompanyOrderShowOnlyAddedChange}
            selectedCompanyOrderSupplier={selectedCompanyOrderSupplier}
            visibleCompanyOrderItems={visibleCompanyOrderItems}
            selectedCompanySupplierDraft={selectedCompanySupplierDraft}
            onAddCompanyOrderItem={onAddCompanyOrderItem}
            hasMoreCompanyOrderItems={hasMoreCompanyOrderItems}
            onShowMoreCompanyOrderItems={onShowMoreCompanyOrderItems}
          />
          <CompanyOrdersCartSection
            isLight={isLight}
            selectedCompanyOrderCount={selectedCompanyOrderCount}
            selectedCompanyOrderTotalUnits={selectedCompanyOrderTotalUnits}
            companyOrderCartItems={companyOrderCartItems}
            onStepCompanyOrderItem={onStepCompanyOrderItem}
            onRemoveCompanyOrderItem={onRemoveCompanyOrderItem}
          />
          <Text style={[styles.label, isLight && styles.labelLight]}>Notes</Text>
          <TextInput
            style={[
              styles.input,
              styles.employeeMessageInput,
              isLight && styles.inputLight,
            ]}
            value={companyOrderNotes}
            onChangeText={onCompanyOrderNotesChange}
            placeholder="Order notes"
            multiline
          />
          <TouchableOpacity
            style={[
              styles.button,
              styles.primary,
              companyOrderSaving && styles.inlineButtonDisabled,
            ]}
            onPress={onSubmitCompanyOrder}
            disabled={companyOrderSaving}
          >
            <Text style={[styles.primaryText, isLight && styles.primaryTextLight]}>
              {companyOrderSaving
                ? inline("Submitting...")
                : language === "es"
                  ? `Enviar Orden de Empresa (${selectedCompanyOrderSupplierCount} proveedores / ${selectedCompanyOrderCount} artículos)`
                  : `Submit Company Order (${selectedCompanyOrderSupplierCount} suppliers / ${selectedCompanyOrderCount} items)`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryButton, isLight && styles.secondaryButtonLight]}
            onPress={onRefreshCompanyOrders}
          >
            <Text
              style={[
                styles.secondaryButtonText,
                isLight && styles.secondaryButtonTextLight,
              ]}
            >
              {companyOrderLoading ? inline("Refreshing...") : inline("Refresh Orders")}
            </Text>
          </TouchableOpacity>
          {companyOrderStatus ? (
            <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
              {inlineOrNull(companyOrderStatus)}
            </Text>
          ) : null}
          <CompanyOrdersRecentSection
            isLight={isLight}
            companyOrderRows={exportScopedRows}
            formatDisplayDate={formatDisplayDate}
          />
        </>
      ) : (
        <CompanyOrdersInPersonSection
          isLight={isLight}
          weekStartDate={companyOrderInPersonWeekStartDate}
          weekEndDate={companyOrderInPersonWeekEndDate}
          suppliers={companyOrderInPersonSuppliers}
          supplierName={companyOrderInPersonSupplier}
          onSupplierChange={onCompanyOrderInPersonSupplierChange}
          search={companyOrderInPersonSearch}
          onSearchChange={onCompanyOrderInPersonSearchChange}
          summaryLabel={companyOrderInPersonSummaryLabel}
          items={companyOrderInPersonItems}
          getDraftValue={getCompanyOrderInPersonDraftValue}
          getMetaLine={getCompanyOrderInPersonMetaLine}
          onPurchasedQuantityChange={onCompanyOrderInPersonPurchasedQuantityChange}
          onPurchasedWeightLbChange={onCompanyOrderInPersonPurchasedWeightLbChange}
          onUnitPriceChange={onCompanyOrderInPersonUnitPriceChange}
          onCompanyUnitPriceChange={onCompanyOrderInPersonCompanyUnitPriceChange}
          onSave={onSaveCompanyOrderInPerson}
          onRefresh={onLoadCompanyOrderInPerson}
          onPreviousWeek={onPreviousCompanyOrderInPersonWeek}
          onNextWeek={onNextCompanyOrderInPersonWeek}
          loading={companyOrderInPersonLoading}
          saving={companyOrderInPersonSaving}
          status={companyOrderInPersonStatus}
          formatDisplayDate={formatDisplayDate}
        />
      )}
    </View>
  );
}
