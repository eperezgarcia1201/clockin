import { useMemo } from "react";
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
  CompanyOrderRow,
} from "../types";

type QuantityByUnit = Record<CompanyOrderComparisonUnit, number>;

const createQuantityByUnit = (): QuantityByUnit => ({
  each: 0,
  lb: 0,
});

const addQuantityByUnit = (
  totals: QuantityByUnit,
  comparisonUnit: CompanyOrderComparisonUnit,
  quantity: number,
) => {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return totals;
  }
  totals[comparisonUnit] = Number((totals[comparisonUnit] + quantity).toFixed(2));
  return totals;
};

const formatQuantitySummaryByUnit = (totals: QuantityByUnit) => {
  const parts: string[] = [];
  if (totals.each > 0) {
    parts.push(`${Number(totals.each.toFixed(2))} each`);
  }
  if (totals.lb > 0) {
    parts.push(`${Number(totals.lb.toFixed(2))} lb`);
  }
  return parts.length ? parts.join(" + ") : "0";
};

const normalizeSupplierName = (value: string | null | undefined) =>
  typeof value === "string" ? value.trim() : "";

const buildCatalogComparisonUnitLookup = (
  suppliers: CompanyOrderCatalogSupplier[],
) => {
  const lookup = new Map<string, Map<string, CompanyOrderComparisonUnit>>();
  suppliers.forEach((supplier) => {
    const supplierName = normalizeSupplierName(supplier.supplierName);
    if (!supplierName) {
      return;
    }
    const supplierKey = supplierName.toLowerCase();
    const itemLookup = new Map<string, CompanyOrderComparisonUnit>();
    supplier.items.forEach((item) => {
      itemLookup.set(
        companyOrderItemKey(item.nameEs, item.nameEn),
        item.comparisonUnit === "lb" ? "lb" : "each",
      );
    });
    lookup.set(supplierKey, itemLookup);
  });
  return lookup;
};

const resolveComparisonUnit = (
  lookup: Map<string, Map<string, CompanyOrderComparisonUnit>>,
  supplierName: string,
  nameEs: string,
  nameEn: string,
): CompanyOrderComparisonUnit => {
  const supplierKey = normalizeSupplierName(supplierName).toLowerCase();
  const itemKey = companyOrderItemKey(nameEs, nameEn);
  return lookup.get(supplierKey)?.get(itemKey) || "each";
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
    if (!exportWeekStartDate || !order.weekStartDate || order.weekStartDate === exportWeekStartDate) {
      addOption(order.supplierName);
    }
  });
  companyOrderInPersonSuppliers.forEach((supplier) =>
    addOption(supplier.supplierName),
  );

  return options;
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

  const selectedExportSupplier = companyOrderExportAllCompanies
    ? ""
    : normalizeSupplierName(selectedModeSupplier);

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

  const exportScopedRows = useMemo(() => {
    if (!selectedExportSupplier) {
      return recentRowsForExportWeek;
    }
    return recentRowsForExportWeek.filter(
      (order) =>
        normalizeSupplierName(order.supplierName).toLowerCase() ===
        selectedExportSupplier.toLowerCase(),
    );
  }, [recentRowsForExportWeek, selectedExportSupplier]);

  const exportScopedInPersonSuppliers = useMemo(() => {
    const shouldUseCurrentInPersonWeek =
      activeMode === "inPerson" ||
      !companyOrderInPersonWeekStartDate ||
      !exportWeekStartDate ||
      companyOrderInPersonWeekStartDate === exportWeekStartDate;
    if (!shouldUseCurrentInPersonWeek) {
      return [];
    }
    if (!selectedExportSupplier) {
      return companyOrderInPersonSuppliers;
    }
    return companyOrderInPersonSuppliers.filter(
      (supplier) =>
        normalizeSupplierName(supplier.supplierName).toLowerCase() ===
        selectedExportSupplier.toLowerCase(),
    );
  }, [
    activeMode,
    companyOrderInPersonSuppliers,
    companyOrderInPersonWeekStartDate,
    exportWeekStartDate,
    selectedExportSupplier,
  ]);

  const exportSummary = useMemo(() => {
    const orderedTotals = createQuantityByUnit();
    let orderCount = exportScopedRows.length;
    let itemCount = 0;

    exportScopedRows.forEach((order) => {
      itemCount += order.itemCount || order.items.length;
      order.items.forEach((item) => {
        addQuantityByUnit(
          orderedTotals,
          resolveComparisonUnit(
            catalogComparisonUnitLookup,
            order.supplierName,
            item.nameEs,
            item.nameEn,
          ),
          item.quantity,
        );
      });
    });

    let inPersonSpend = 0;
    let companySpend = 0;
    let savings = 0;
    let shoppingItemCount = 0;

    exportScopedInPersonSuppliers.forEach((supplier) => {
      supplier.items.forEach((item) => {
        shoppingItemCount += 1;
        if (itemCount === 0) {
          addQuantityByUnit(
            orderedTotals,
            item.comparisonUnit || "each",
            item.orderedQuantity,
          );
        }

        const purchasedQuantity = Number(item.purchasedQuantity || 0);
        const unitPrice =
          typeof item.unitPrice === "number" ? item.unitPrice : null;
        const companyUnitPrice =
          typeof item.companyUnitPrice === "number"
            ? item.companyUnitPrice
            : null;

        if (purchasedQuantity > 0 && unitPrice !== null) {
          inPersonSpend = Number(
            (inPersonSpend + purchasedQuantity * unitPrice).toFixed(2),
          );
        }
        if (purchasedQuantity > 0 && companyUnitPrice !== null) {
          companySpend = Number(
            (companySpend + purchasedQuantity * companyUnitPrice).toFixed(2),
          );
        }
        if (
          purchasedQuantity > 0 &&
          unitPrice !== null &&
          companyUnitPrice !== null
        ) {
          savings = Number(
            (
              savings +
              purchasedQuantity * (companyUnitPrice - unitPrice)
            ).toFixed(2),
          );
        }
      });
    });

    return {
      orderCount,
      itemCount: itemCount || shoppingItemCount,
      orderedSummary: formatQuantitySummaryByUnit(orderedTotals),
      inPersonSpend,
      companySpend,
      savings,
      hasShoppingData:
        exportScopedInPersonSuppliers.length > 0 &&
        (inPersonSpend > 0 || companySpend > 0 || shoppingItemCount > 0),
    };
  }, [
    catalogComparisonUnitLookup,
    exportScopedInPersonSuppliers,
    exportScopedRows,
  ]);

  const summaryScopeLabel = selectedExportSupplier
    ? selectedExportSupplier
    : language === "es"
      ? "Todas las compañías"
      : "All Companies";

  const selectedCompanyReady =
    companyOrderExportAllCompanies || Boolean(selectedExportSupplier);

  const handleSelectExportSupplier = (supplierName: string) => {
    onCompanyOrderExportAllCompaniesChange(false);
    if (activeMode === "inPerson") {
      onCompanyOrderInPersonSupplierChange(supplierName);
      return;
    }
    onCompanyOrderSupplierChange(supplierName);
  };

  const handleExport = (format: "pdf" | "csv" | "excel") => {
    onExportCompanyOrders(format, {
      supplierName: companyOrderExportAllCompanies ? null : selectedExportSupplier,
      weekStartDate: exportWeekStartDate || null,
    });
  };

  return (
    <View style={[styles.card, isLight && styles.cardLight]}>
      <Text style={[styles.cardTitle, isLight && styles.cardTitleLight]}>
        Company Orders
      </Text>
      <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
        Supplier catalog imported from your Excel. Kitchen managers and managers can submit orders here.
      </Text>

      <Text style={[styles.label, isLight && styles.labelLight]}>
        {language === "es" ? "PDF por compañía" : "PDF by Company"}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.toggleRow}
      >
        <TouchableOpacity
          style={[
            styles.togglePill,
            isLight && styles.togglePillLight,
            companyOrderExportAllCompanies && styles.toggleActive,
            companyOrderExportAllCompanies && isLight && styles.toggleActiveLight,
          ]}
          onPress={() => onCompanyOrderExportAllCompaniesChange(true)}
        >
          <Text
            style={[
              styles.toggleText,
              isLight && styles.toggleTextLight,
              companyOrderExportAllCompanies &&
                isLight &&
                styles.toggleTextLightActive,
            ]}
          >
            {language === "es" ? "Todas" : "All Companies"}
          </Text>
        </TouchableOpacity>
        {exportSupplierOptions.map((supplierName) => {
          const isActive =
            !companyOrderExportAllCompanies &&
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
            {summaryScopeLabel}
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
            {language === "es" ? "En persona" : "In Person"}
          </Text>
          <Text style={[styles.summaryValue, isLight && styles.summaryValueLight]}>
            {exportSummary.hasShoppingData
              ? formatMoney(exportSummary.inPersonSpend)
              : "—"}
          </Text>
        </View>
        <View style={[styles.summaryTile, isLight && styles.summaryTileLight]}>
          <Text style={[styles.summaryLabel, isLight && styles.summaryLabelLight]}>
            {language === "es" ? "Compañía" : "Company Cost"}
          </Text>
          <Text style={[styles.summaryValue, isLight && styles.summaryValueLight]}>
            {exportSummary.hasShoppingData
              ? formatMoney(exportSummary.companySpend)
              : "—"}
          </Text>
        </View>
        <View style={[styles.summaryTile, isLight && styles.summaryTileLight]}>
          <Text style={[styles.summaryLabel, isLight && styles.summaryLabelLight]}>
            {language === "es" ? "Ahorro" : "Saved"}
          </Text>
          <Text
            style={[
              styles.summaryValue,
              isLight && styles.summaryValueLight,
              exportSummary.hasShoppingData &&
              exportSummary.savings > 0
                ? styles.liquorDeltaPositive
                : null,
              exportSummary.hasShoppingData &&
              exportSummary.savings < 0
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

      <View style={styles.companyOrderExportRow}>
        <TouchableOpacity
          style={[styles.secondaryButton, isLight && styles.secondaryButtonLight]}
          disabled={companyOrderExportingFormat !== null || !selectedCompanyReady}
          onPress={() => handleExport("pdf")}
        >
          <Text
            style={[
              styles.secondaryButtonText,
              isLight && styles.secondaryButtonTextLight,
            ]}
          >
            {companyOrderExportingFormat === "pdf"
              ? inline("Preparing...")
              : language === "es"
                ? "Descargar PDF"
                : "Download PDF"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryButton, isLight && styles.secondaryButtonLight]}
          disabled={companyOrderExportingFormat !== null || !selectedCompanyReady}
          onPress={() => handleExport("csv")}
        >
          <Text
            style={[
              styles.secondaryButtonText,
              isLight && styles.secondaryButtonTextLight,
            ]}
          >
            {companyOrderExportingFormat === "csv"
              ? inline("Preparing...")
              : language === "es"
                ? "Descargar CSV"
                : "Download CSV"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryButton, isLight && styles.secondaryButtonLight]}
          disabled={companyOrderExportingFormat !== null || !selectedCompanyReady}
          onPress={() => handleExport("excel")}
        >
          <Text
            style={[
              styles.secondaryButtonText,
              isLight && styles.secondaryButtonTextLight,
            ]}
          >
            {companyOrderExportingFormat === "excel"
              ? inline("Preparing...")
              : language === "es"
                ? "Descargar Excel"
                : "Download Excel"}
          </Text>
        </TouchableOpacity>
      </View>

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
              activeMode === "inPerson" && isLight && styles.toggleTextLightActive,
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
          {companyOrderStatus && (
            <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
              {inlineOrNull(companyOrderStatus)}
            </Text>
          )}
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
          onUnitPriceChange={onCompanyOrderInPersonUnitPriceChange}
          onCompanyUnitPriceChange={
            onCompanyOrderInPersonCompanyUnitPriceChange
          }
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
