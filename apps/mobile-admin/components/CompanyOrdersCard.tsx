import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import { CompanyOrdersCartSection } from "./CompanyOrdersCartSection";
import { CompanyOrdersCatalogSection } from "./CompanyOrdersCatalogSection";
import { CompanyOrdersInPersonSection } from "./CompanyOrdersInPersonSection";
import { CompanyOrdersRecentSection } from "./CompanyOrdersRecentSection";
import type { CompanyOrdersCardProps } from "./CompanyOrdersCard.types";

export function CompanyOrdersCard({
  isLight,
  companyOrderMode,
  onCompanyOrderModeChange,
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

  return (
    <View style={[styles.card, isLight && styles.cardLight]}>
      <Text style={[styles.cardTitle, isLight && styles.cardTitleLight]}>Company Orders</Text>
      <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
        Supplier catalog imported from your Excel. Kitchen managers and managers can submit orders here.
      </Text>
      <View style={styles.companyOrderExportRow}>
        <TouchableOpacity
          style={[styles.secondaryButton, isLight && styles.secondaryButtonLight]}
          disabled={companyOrderExportingFormat !== null}
          onPress={() => onExportCompanyOrders("pdf")}
        >
          <Text style={[styles.secondaryButtonText, isLight && styles.secondaryButtonTextLight]}>
            {companyOrderExportingFormat === "pdf"
              ? inline("Preparing...")
              : language === "es"
                ? "Descargar PDF"
                : "Download PDF"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryButton, isLight && styles.secondaryButtonLight]}
          disabled={companyOrderExportingFormat !== null}
          onPress={() => onExportCompanyOrders("csv")}
        >
          <Text style={[styles.secondaryButtonText, isLight && styles.secondaryButtonTextLight]}>
            {companyOrderExportingFormat === "csv"
              ? inline("Preparing...")
              : language === "es"
                ? "Descargar CSV"
                : "Download CSV"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryButton, isLight && styles.secondaryButtonLight]}
          disabled={companyOrderExportingFormat !== null}
          onPress={() => onExportCompanyOrders("excel")}
        >
          <Text style={[styles.secondaryButtonText, isLight && styles.secondaryButtonTextLight]}>
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
            style={[styles.input, styles.employeeMessageInput, isLight && styles.inputLight]}
            value={companyOrderNotes}
            onChangeText={onCompanyOrderNotesChange}
            placeholder="Order notes"
            multiline
          />
          <TouchableOpacity
            style={[styles.button, styles.primary, companyOrderSaving && styles.inlineButtonDisabled]}
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
            <Text style={[styles.secondaryButtonText, isLight && styles.secondaryButtonTextLight]}>
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
            companyOrderRows={companyOrderRows}
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
