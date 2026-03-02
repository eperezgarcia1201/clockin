import { buildLiquorControlViewModel } from "../liquor-control-view-helpers";
import { LiquorControlCard } from "./LiquorControlCard";

type LiquorControlScreenProps = {
  [key: string]: any;
};

export function LiquorControlScreen(props: LiquorControlScreenProps) {
  const liquorControlViewModel = buildLiquorControlViewModel({
    liquorMovements: props.liquorMovements,
    liquorCounts: props.liquorCounts,
    liquorBottleScans: props.liquorBottleScans,
    liquorMonthly: props.liquorMonthly,
    liquorMonthlyPrevious: props.liquorMonthlyPrevious,
    liquorCatalog: props.liquorCatalog,
    liquorQuickCountForm: props.liquorQuickCountForm,
    liquorSheetRows: props.liquorSheetRows,
    liquorInventorySearch: props.liquorInventorySearch,
    liquorCatalogSearch: props.liquorCatalogSearch,
    liquorInventoryVisibleCount: props.liquorInventoryVisibleCount,
    liquorCatalogVisibleCount: props.liquorCatalogVisibleCount,
    liquorCatalogBrandQuery: props.liquorCatalogForm.brand,
    liquorKinds: props.liquorKinds,
    liquorKindForm: props.liquorKindForm,
  });

  return (
    <LiquorControlCard
      isLight={props.isLight}
      inline={props.inline}
      inlineOrNull={props.inlineOrNull}
      language={props.language}
      liquorInventoryEnabled={props.liquorInventoryEnabled}
      hasLiquorManagerAccess={props.hasLiquorManagerAccess}
      hasLiquorPremiumAccess={props.hasLiquorPremiumAccess}
      liquorMonth={props.liquorMonth}
      onLiquorMonthChange={props.setLiquorMonth}
      liquorYear={props.liquorYear}
      onLiquorYearChange={props.setLiquorYear}
      liquorTargetCostPct={props.liquorTargetCostPct}
      onLiquorTargetCostPctChange={props.setLiquorTargetCostPct}
      companyOrdersOfficeId={props.companyOrdersOfficeId}
      liquorLoading={props.liquorLoading}
      onRefreshLiquor={() => {
        void props.loadLiquorControlData();
      }}
      liquorWorkspace={props.liquorWorkspace}
      onLiquorWorkspaceChange={props.setLiquorWorkspace}
      liquorStatus={props.liquorStatus}
      viewModel={liquorControlViewModel}
      liquorCountDate={props.liquorCountDate}
      onLiquorCountDateChange={props.setLiquorCountDate}
      liquorInventorySearch={props.liquorInventorySearch}
      onLiquorInventorySearchChange={props.setLiquorInventorySearch}
      liquorSheetDrafts={props.liquorSheetDrafts}
      liquorKinds={props.liquorKinds}
      liquorSavingItemId={props.liquorSavingItemId}
      liquorSavingCountItemId={props.liquorSavingCountItemId}
      onUpdateLiquorSheetDraft={props.updateLiquorSheetDraft}
      onSaveLiquorCatalogRow={(itemId) => {
        void props.saveLiquorCatalogRow(itemId);
      }}
      onSaveLiquorCountRow={(itemId) => {
        void props.saveLiquorCountRow(itemId);
      }}
      onShowMoreInventoryRows={() =>
        props.setLiquorInventoryVisibleCount((previous: number) => previous + 20)
      }
      liquorCatalogSearch={props.liquorCatalogSearch}
      onLiquorCatalogSearchChange={props.setLiquorCatalogSearch}
      liquorKindForm={props.liquorKindForm}
      setLiquorKindForm={props.setLiquorKindForm}
      liquorActionLoading={props.liquorActionLoading}
      onCreateLiquorKind={() => {
        void props.createLiquorKind();
      }}
      onDeleteLiquorKind={() => {
        void props.deleteLiquorKind();
      }}
      liquorCatalogAiQuery={props.liquorCatalogAiQuery}
      onLiquorCatalogAiQueryChange={props.setLiquorCatalogAiQuery}
      liquorCatalogAiLoading={props.liquorCatalogAiLoading}
      onAssistLiquorCatalog={() => {
        void props.assistLiquorCatalog();
      }}
      liquorCatalogAiResult={props.liquorCatalogAiResult}
      onApplyAiMatchToCatalogSearch={(value) => {
        props.setLiquorCatalogSearch(value);
      }}
      onJumpAiMatchToInventory={(value) => {
        props.setLiquorInventorySearch(value);
        props.setLiquorWorkspace("inventory");
      }}
      liquorLookupUpc={props.liquorLookupUpc}
      onLiquorLookupUpcChange={props.setLiquorLookupUpc}
      liquorLookupLoading={props.liquorLookupLoading}
      onLookupLiquorByUpc={() => {
        void props.lookupLiquorByUpc();
      }}
      liquorLookupResult={props.liquorLookupResult}
      liquorCatalogForm={props.liquorCatalogForm}
      setLiquorCatalogForm={props.setLiquorCatalogForm}
      onCreateLiquorCatalogItem={() => {
        void props.createLiquorCatalogItem();
      }}
      onShowMoreCatalogItems={() =>
        props.setLiquorCatalogVisibleCount((previous: number) => previous + 24)
      }
      offices={props.offices}
      liquorMovementForm={props.liquorMovementForm}
      setLiquorMovementForm={props.setLiquorMovementForm}
      onCreateLiquorMovement={() => {
        void props.createLiquorMovement();
      }}
      liquorQuickCountForm={props.liquorQuickCountForm}
      setLiquorQuickCountForm={props.setLiquorQuickCountForm}
      onSaveLiquorQuickCount={() => {
        void props.saveLiquorQuickCount();
      }}
      liquorScanItemId={props.liquorScanItemId}
      onLiquorScanItemIdChange={props.setLiquorScanItemId}
      liquorScanContainerKey={props.liquorScanContainerKey}
      onLiquorScanContainerKeyChange={props.setLiquorScanContainerKey}
      liquorAnalyzingItemId={props.liquorAnalyzingItemId}
      onAnalyzeLiquorBottleForItem={(itemId) => {
        void props.analyzeLiquorBottleForItem(itemId);
      }}
      liquorInvoiceDate={props.liquorInvoiceDate}
      onLiquorInvoiceDateChange={props.setLiquorInvoiceDate}
      liquorInvoiceNumber={props.liquorInvoiceNumber}
      onLiquorInvoiceNumberChange={props.setLiquorInvoiceNumber}
      liquorInvoiceSupplier={props.liquorInvoiceSupplier}
      onLiquorInvoiceSupplierChange={props.setLiquorInvoiceSupplier}
      liquorInvoiceNotes={props.liquorInvoiceNotes}
      onLiquorInvoiceNotesChange={props.setLiquorInvoiceNotes}
      liquorInvoiceIncludePurchases={props.liquorInvoiceIncludePurchases}
      onToggleLiquorInvoiceIncludePurchases={() =>
        props.setLiquorInvoiceIncludePurchases((previous: boolean) => !previous)
      }
      onPickLiquorInvoicePhoto={() => {
        void props.pickLiquorInvoicePhoto();
      }}
      liquorInvoiceAnalyzing={props.liquorInvoiceAnalyzing}
      onAnalyzeLiquorInvoicePhoto={() => {
        void props.analyzeLiquorInvoicePhoto();
      }}
      liquorInvoiceApplying={props.liquorInvoiceApplying}
      onApplyLiquorInvoiceRows={() => {
        void props.applyLiquorInvoiceRows();
      }}
      liquorInvoiceImageName={props.liquorInvoiceImageName}
      liquorInvoiceRows={props.liquorInvoiceRows}
      liquorExportingFormat={props.liquorExportingFormat}
      onLiquorAnalyticsExport={(formatOption) => {
        void props.handleLiquorAnalyticsExport(formatOption);
      }}
      liquorMonthlyMonth={props.liquorMonthly?.month || null}
      liquorMonthlyPreviousMonth={props.liquorMonthlyPrevious?.month || null}
      liquorYearly={props.liquorYearly}
    />
  );
}
