import { liquorMovementTypes } from "../app-helpers";
import {
  formatMoneyValue,
  formatPercentValue,
  formatQtyValue,
} from "../liquor-control-view-helpers";
import { LiquorActivitySection } from "./LiquorActivitySection";
import { LiquorAnalyticsSection } from "./LiquorAnalyticsSection";
import { LiquorCatalogSection } from "./LiquorCatalogSection";
import type { LiquorControlCardProps } from "./LiquorControlCard.types";
import { LiquorInventorySection } from "./LiquorInventorySection";
import { LiquorInvoicesSection } from "./LiquorInvoicesSection";
import { LiquorOperationsSection } from "./LiquorOperationsSection";
import { LiquorScansSection } from "./LiquorScansSection";

export function LiquorControlWorkspaceContent({
  isLight,
  inline,
  language,
  hasLiquorPremiumAccess,
  liquorWorkspace,
  viewModel,
  liquorCountDate,
  onLiquorCountDateChange,
  liquorInventorySearch,
  onLiquorInventorySearchChange,
  liquorSheetDrafts,
  liquorKinds,
  liquorSavingItemId,
  liquorSavingCountItemId,
  onUpdateLiquorSheetDraft,
  onSaveLiquorCatalogRow,
  onSaveLiquorCountRow,
  onShowMoreInventoryRows,
  liquorCatalogSearch,
  onLiquorCatalogSearchChange,
  liquorKindForm,
  setLiquorKindForm,
  liquorActionLoading,
  onCreateLiquorKind,
  onDeleteLiquorKind,
  liquorCatalogAiQuery,
  onLiquorCatalogAiQueryChange,
  liquorCatalogAiLoading,
  onAssistLiquorCatalog,
  liquorCatalogAiResult,
  onApplyAiMatchToCatalogSearch,
  onJumpAiMatchToInventory,
  liquorLookupUpc,
  onLiquorLookupUpcChange,
  liquorLookupLoading,
  onLookupLiquorByUpc,
  liquorLookupResult,
  liquorCatalogForm,
  setLiquorCatalogForm,
  onCreateLiquorCatalogItem,
  onShowMoreCatalogItems,
  offices,
  liquorMovementForm,
  setLiquorMovementForm,
  onCreateLiquorMovement,
  liquorQuickCountForm,
  setLiquorQuickCountForm,
  onSaveLiquorQuickCount,
  liquorScanItemId,
  onLiquorScanItemIdChange,
  liquorScanContainerKey,
  onLiquorScanContainerKeyChange,
  liquorAnalyzingItemId,
  onAnalyzeLiquorBottleForItem,
  liquorInvoiceDate,
  onLiquorInvoiceDateChange,
  liquorInvoiceNumber,
  onLiquorInvoiceNumberChange,
  liquorInvoiceSupplier,
  onLiquorInvoiceSupplierChange,
  liquorInvoiceNotes,
  onLiquorInvoiceNotesChange,
  liquorInvoiceIncludePurchases,
  onToggleLiquorInvoiceIncludePurchases,
  onPickLiquorInvoicePhoto,
  liquorInvoiceAnalyzing,
  onAnalyzeLiquorInvoicePhoto,
  liquorInvoiceApplying,
  onApplyLiquorInvoiceRows,
  liquorInvoiceImageName,
  liquorInvoiceRows,
  liquorExportingFormat,
  onLiquorAnalyticsExport,
  liquorMonthlyMonth,
  liquorMonthlyPreviousMonth,
  liquorYearly,
}: LiquorControlCardProps) {
  if (liquorWorkspace === "inventory") {
    return (
      <LiquorInventorySection
        isLight={isLight}
        inline={inline}
        liquorCountDate={liquorCountDate}
        onLiquorCountDateChange={onLiquorCountDateChange}
        liquorInventorySearch={liquorInventorySearch}
        onLiquorInventorySearchChange={onLiquorInventorySearchChange}
        inventorySuggestions={viewModel.inventorySuggestions}
        visibleLiquorSheetRows={viewModel.visibleLiquorSheetRows}
        inventoryQuery={viewModel.inventoryQuery}
        liquorSheetDrafts={liquorSheetDrafts}
        liquorKinds={liquorKinds}
        liquorSavingItemId={liquorSavingItemId}
        liquorSavingCountItemId={liquorSavingCountItemId}
        onUpdateLiquorSheetDraft={onUpdateLiquorSheetDraft}
        formatQtyValue={formatQtyValue}
        formatMoneyValue={formatMoneyValue}
        onSaveLiquorCatalogRow={onSaveLiquorCatalogRow}
        onSaveLiquorCountRow={onSaveLiquorCountRow}
        hasMoreInventoryRows={viewModel.hasMoreInventoryRows}
        onShowMoreInventoryRows={onShowMoreInventoryRows}
        filteredLiquorSheetRowsCount={viewModel.filteredLiquorSheetRows.length}
      />
    );
  }

  if (liquorWorkspace === "catalog") {
    return (
      <LiquorCatalogSection
        isLight={isLight}
        inline={inline}
        liquorCatalogSearch={liquorCatalogSearch}
        onLiquorCatalogSearchChange={onLiquorCatalogSearchChange}
        catalogSuggestions={viewModel.catalogSuggestions}
        liquorKindForm={liquorKindForm}
        setLiquorKindForm={setLiquorKindForm}
        liquorActionLoading={liquorActionLoading}
        onCreateLiquorKind={onCreateLiquorKind}
        liquorKinds={liquorKinds}
        newKindOptions={viewModel.newKindOptions}
        selectedNewKindKey={viewModel.selectedNewKindKey}
        deleteKindOptions={viewModel.deleteKindOptions}
        selectedDeleteKindKey={viewModel.selectedDeleteKindKey}
        onDeleteLiquorKind={onDeleteLiquorKind}
        hasLiquorPremiumAccess={hasLiquorPremiumAccess}
        liquorCatalogAiQuery={liquorCatalogAiQuery}
        onLiquorCatalogAiQueryChange={onLiquorCatalogAiQueryChange}
        liquorCatalogAiLoading={liquorCatalogAiLoading}
        onAssistLiquorCatalog={onAssistLiquorCatalog}
        liquorCatalogAiResult={liquorCatalogAiResult}
        onApplyAiMatchToCatalogSearch={onApplyAiMatchToCatalogSearch}
        onJumpAiMatchToInventory={onJumpAiMatchToInventory}
        liquorLookupUpc={liquorLookupUpc}
        onLiquorLookupUpcChange={onLiquorLookupUpcChange}
        liquorLookupLoading={liquorLookupLoading}
        onLookupLiquorByUpc={onLookupLiquorByUpc}
        liquorLookupResult={liquorLookupResult}
        liquorCatalogForm={liquorCatalogForm}
        setLiquorCatalogForm={setLiquorCatalogForm}
        catalogKindOptions={viewModel.catalogKindOptions}
        onCreateLiquorCatalogItem={onCreateLiquorCatalogItem}
        visibleCatalogItems={viewModel.visibleCatalogItems}
        catalogQuery={viewModel.catalogQuery}
        formatMoneyValue={formatMoneyValue}
        hasMoreCatalogItems={viewModel.hasMoreCatalogItems}
        onShowMoreCatalogItems={onShowMoreCatalogItems}
        filteredCatalogItemsCount={viewModel.filteredCatalogItems.length}
      />
    );
  }

  if (liquorWorkspace === "operations") {
    return (
      <LiquorOperationsSection
        isLight={isLight}
        inline={inline}
        sortedCatalogItems={viewModel.sortedCatalogItems}
        offices={offices}
        liquorMovementTypes={liquorMovementTypes}
        liquorMovementForm={liquorMovementForm}
        setLiquorMovementForm={setLiquorMovementForm}
        liquorActionLoading={liquorActionLoading}
        onCreateLiquorMovement={onCreateLiquorMovement}
        liquorQuickCountForm={liquorQuickCountForm}
        setLiquorQuickCountForm={setLiquorQuickCountForm}
        formatQtyValue={formatQtyValue}
        quickCountBodegaMl={viewModel.quickCountBodegaMl}
        onSaveLiquorQuickCount={onSaveLiquorQuickCount}
      />
    );
  }

  if (liquorWorkspace === "scans") {
    return (
      <LiquorScansSection
        isLight={isLight}
        hasLiquorPremiumAccess={hasLiquorPremiumAccess}
        inline={inline}
        sortedCatalogItems={viewModel.sortedCatalogItems}
        liquorScanItemId={liquorScanItemId}
        onLiquorScanItemIdChange={onLiquorScanItemIdChange}
        liquorScanContainerKey={liquorScanContainerKey}
        onLiquorScanContainerKeyChange={onLiquorScanContainerKeyChange}
        liquorAnalyzingItemId={liquorAnalyzingItemId}
        language={language}
        onAnalyzeLiquorBottleForItem={onAnalyzeLiquorBottleForItem}
        sortedScans={viewModel.sortedScans}
        formatPercentValue={formatPercentValue}
        formatQtyValue={formatQtyValue}
      />
    );
  }

  if (liquorWorkspace === "invoices") {
    return (
      <LiquorInvoicesSection
        isLight={isLight}
        hasLiquorPremiumAccess={hasLiquorPremiumAccess}
        inline={inline}
        liquorInvoiceDate={liquorInvoiceDate}
        onLiquorInvoiceDateChange={onLiquorInvoiceDateChange}
        liquorInvoiceNumber={liquorInvoiceNumber}
        onLiquorInvoiceNumberChange={onLiquorInvoiceNumberChange}
        liquorInvoiceSupplier={liquorInvoiceSupplier}
        onLiquorInvoiceSupplierChange={onLiquorInvoiceSupplierChange}
        liquorInvoiceNotes={liquorInvoiceNotes}
        onLiquorInvoiceNotesChange={onLiquorInvoiceNotesChange}
        liquorInvoiceIncludePurchases={liquorInvoiceIncludePurchases}
        onToggleLiquorInvoiceIncludePurchases={onToggleLiquorInvoiceIncludePurchases}
        onPickLiquorInvoicePhoto={onPickLiquorInvoicePhoto}
        liquorInvoiceAnalyzing={liquorInvoiceAnalyzing}
        onAnalyzeLiquorInvoicePhoto={onAnalyzeLiquorInvoicePhoto}
        liquorInvoiceApplying={liquorInvoiceApplying}
        onApplyLiquorInvoiceRows={onApplyLiquorInvoiceRows}
        liquorInvoiceImageName={liquorInvoiceImageName}
        liquorInvoiceRows={liquorInvoiceRows}
        formatQtyValue={formatQtyValue}
        formatMoneyValue={formatMoneyValue}
      />
    );
  }

  if (liquorWorkspace === "analytics") {
    return (
      <LiquorAnalyticsSection
        isLight={isLight}
        inline={inline}
        monthlySummary={viewModel.monthlySummary}
        formatMoneyValue={formatMoneyValue}
        formatPercentValue={formatPercentValue}
        formatQtyValue={formatQtyValue}
        liquorExportingFormat={liquorExportingFormat}
        onLiquorAnalyticsExport={onLiquorAnalyticsExport}
        liquorMonthlyMonth={liquorMonthlyMonth}
        liquorMonthlyPreviousMonth={liquorMonthlyPreviousMonth}
        currentUsageMl={viewModel.currentUsageMl}
        previousUsageMl={viewModel.previousUsageMl}
        usageMlDelta={viewModel.usageMlDelta}
        currentUsageCost={viewModel.currentUsageCost}
        previousUsageCost={viewModel.previousUsageCost}
        usageCostDelta={viewModel.usageCostDelta}
        monthComparisonRows={viewModel.monthComparisonRows}
        liquorMonthlyRows={viewModel.monthlyRows}
        monthlyIntelligence={viewModel.monthlyIntelligence}
        liquorYearly={liquorYearly}
      />
    );
  }

  if (liquorWorkspace === "activity") {
    return (
      <LiquorActivitySection
        isLight={isLight}
        inline={inline}
        sortedMovements={viewModel.sortedMovements}
        sortedCounts={viewModel.sortedCounts}
        formatQtyValue={formatQtyValue}
      />
    );
  }

  return null;
}
