import { AlertsCard } from "./AlertsCard";
import { CaptureCard } from "./CaptureCard";
import { CompanyOrdersCard } from "./CompanyOrdersCard";
import { LiquorControlScreen } from "./LiquorControlScreen";
import { ReportsCard } from "./ReportsCard";
import { SchedulesScreen } from "./SchedulesScreen";
type AdminContentRouterProps = { [key: string]: any };

export function renderAdminOperationsContent(props: AdminContentRouterProps) {
  if (props.screen === "capture") {
    return (
      <CaptureCard
        isLight={props.isLight}
        text={props.text}
        captureMode={props.captureMode}
        onCaptureModeChange={props.setCaptureMode}
        salesDate={props.salesDate}
        onSalesDateChange={props.setSalesDate}
        salesFood={props.salesFood}
        onSalesFoodChange={props.setSalesFood}
        salesLiquor={props.salesLiquor}
        onSalesLiquorChange={props.setSalesLiquor}
        salesCash={props.salesCash}
        onSalesCashChange={props.setSalesCash}
        salesBatch={props.salesBatch}
        onSalesBatchChange={props.setSalesBatch}
        salesNotes={props.salesNotes}
        onSalesNotesChange={props.setSalesNotes}
        salesSaveLoading={props.salesSaveLoading}
        onSaveSales={props.saveSalesReport}
        todayExpenseDate={props.todayExpenseDate}
        salesExpenseInvoice={props.salesExpenseInvoice}
        onSalesExpenseInvoiceChange={props.setSalesExpenseInvoice}
        salesExpenseCompany={props.salesExpenseCompany}
        onSalesExpenseCompanyChange={props.setSalesExpenseCompany}
        salesExpenseMethod={props.salesExpenseMethod}
        onSalesExpenseMethodChange={props.setSalesExpenseMethod}
        salesExpenseAmount={props.salesExpenseAmount}
        onSalesExpenseAmountChange={props.setSalesExpenseAmount}
        salesExpenseCheckNumber={props.salesExpenseCheckNumber}
        onSalesExpenseCheckNumberChange={props.setSalesExpenseCheckNumber}
        salesExpensePayToCompany={props.salesExpensePayToCompany}
        onSalesExpensePayToCompanyChange={props.setSalesExpensePayToCompany}
        salesExpenseNotes={props.salesExpenseNotes}
        onSalesExpenseNotesChange={props.setSalesExpenseNotes}
        salesExpenseReceipt={props.salesExpenseReceipt}
        salesExpenseReceiptLoading={props.salesExpenseReceiptLoading}
        onCaptureSalesExpenseReceipt={props.captureSalesExpenseReceipt}
        onRemoveSalesExpenseReceipt={() => props.setSalesExpenseReceipt(null)}
        salesExpenseSaveLoading={props.salesExpenseSaveLoading}
        onSaveSalesExpense={props.saveSalesExpense}
        salesActionStatus={props.salesActionStatus}
        inlineOrNull={props.inlineOrNull}
      />
    );
  }
  if (props.screen === "reports") {
    return (
      <ReportsCard
        isLight={props.isLight}
        reportTypeOrder={props.reportTypeOrder}
        reportType={props.reportType}
        onReportTypeChange={props.setReportType}
        fromDate={props.fromDate}
        onFromDateChange={props.setFromDate}
        toDate={props.toDate}
        onToDateChange={props.setToDate}
        reportEmployeeId={props.reportEmployeeId}
        onReportEmployeeIdChange={props.setReportEmployeeId}
        employees={props.employees}
        reportStatus={props.reportStatus}
        inlineOrNull={props.inlineOrNull}
        reportLoading={props.reportLoading}
        onRunReport={props.runReport}
        reportExportingFormat={props.reportExportingFormat}
        onExportReport={(format) => {
          void props.exportReport(format);
        }}
        inline={props.inline}
        language={props.language}
        reportRows={props.reportRows}
      />
    );
  }
  if (props.screen === "alerts") {
    return (
      <AlertsCard
        isLight={props.isLight}
        activeMessageEmployees={props.activeMessageEmployees}
        employeeMessageEmployeeId={props.employeeMessageEmployeeId}
        onEmployeeMessageEmployeeIdChange={props.setEmployeeMessageEmployeeId}
        employeeMessageSubject={props.employeeMessageSubject}
        onEmployeeMessageSubjectChange={props.setEmployeeMessageSubject}
        employeeMessageBody={props.employeeMessageBody}
        onEmployeeMessageBodyChange={props.setEmployeeMessageBody}
        employeeMessageSending={props.employeeMessageSending}
        onSendEmployeeMessage={() => {
          void props.sendEmployeeMessage();
        }}
        inline={props.inline}
        language={props.language}
        employeeMessageStatus={props.employeeMessageStatus}
        inlineOrNull={props.inlineOrNull}
        onRefreshAlerts={props.loadNotifications}
        alertsStatus={props.alertsStatus}
        adminNotificationStatus={props.adminNotificationStatus}
        adminNotificationSaving={props.adminNotificationSaving}
        currentAdminPushDevice={props.currentAdminPushDevice}
        tenantTimeZone={props.tenantTimeZone}
        deviceTimeZone={props.deviceTimeZone}
        canSyncTenantTimeZone={props.permissions.settings}
        onToggleNotificationPreference={props.handleToggleAdminNotificationPreference}
        onSyncTenantTimeZone={props.handleSyncTenantTimeZone}
        notifications={props.notifications}
        parseScheduleOverrideNotification={props.parseScheduleOverrideNotification}
        scheduleOverrideLoadingId={props.scheduleOverrideLoadingId}
        onScheduleOverrideDecision={props.handleScheduleOverrideDecision}
        formatDisplayDate={props.formatDisplayDate}
      />
    );
  }
  if (props.screen === "schedules") {
    return (
      <SchedulesScreen
        isLight={props.isLight}
        language={props.language}
        selectedScheduleEmployee={props.selectedScheduleEmployee}
        todayScheduleLabel={props.todayScheduleLabel}
        todayScheduleLoading={props.todayScheduleLoading}
        loadTodaySchedule={props.loadTodaySchedule}
        inline={props.inline}
        todayScheduleStatus={props.todayScheduleStatus}
        inlineOrNull={props.inlineOrNull}
        todayRoleTabs={props.todayRoleTabs}
        activeTodayRoleFilter={props.activeTodayRoleFilter}
        setTodayRoleFilter={props.setTodayRoleFilter}
        filteredTodayScheduleRows={props.filteredTodayScheduleRows}
        scheduleEmployeePickerOpen={props.scheduleEmployeePickerOpen}
        setScheduleEmployeePickerOpen={props.setScheduleEmployeePickerOpen}
        employees={props.employees}
        scheduleEmployeeSearch={props.scheduleEmployeeSearch}
        setScheduleEmployeeSearch={props.setScheduleEmployeeSearch}
        filteredScheduleEmployees={props.filteredScheduleEmployees}
        scheduleEmployeeId={props.scheduleEmployeeId}
        setScheduleEmployeeId={props.setScheduleEmployeeId}
        scheduleDays={props.scheduleDays}
        updateScheduleDay={props.updateScheduleDay}
        adjustScheduleTime={props.adjustScheduleTime}
        setScheduleMeridiem={props.setScheduleMeridiem}
        scheduleStatus={props.scheduleStatus}
        saveSchedule={props.saveSchedule}
      />
    );
  }
  if (props.screen === "companyOrders") {
    return (
      <CompanyOrdersCard
        isLight={props.isLight}
        companyOrderMode={props.companyOrderMode}
        onCompanyOrderModeChange={props.setCompanyOrderMode}
        companyOrderExportAllCompanies={props.companyOrderExportAllCompanies}
        onCompanyOrderExportAllCompaniesChange={
          props.setCompanyOrderExportAllCompanies
        }
        companyOrderExportingFormat={props.companyOrderExportingFormat}
        onExportCompanyOrders={(format, options) => {
          void props.handleCompanyOrderExport(format, options);
        }}
        inline={props.inline}
        language={props.language}
        companyOrderCatalog={props.companyOrderCatalog}
        companyOrderSupplier={props.companyOrderSupplier}
        companyOrderDrafts={props.companyOrderDrafts}
        onCompanyOrderSupplierChange={props.setCompanyOrderSupplier}
        companyOrderSearch={props.companyOrderSearch}
        onCompanyOrderSearchChange={props.setCompanyOrderSearch}
        companyOrderShowOnlyAdded={props.companyOrderShowOnlyAdded}
        onCompanyOrderShowOnlyAddedChange={props.setCompanyOrderShowOnlyAdded}
        selectedCompanyOrderSupplier={props.selectedCompanyOrderSupplier}
        visibleCompanyOrderItems={props.visibleCompanyOrderItems}
        selectedCompanySupplierDraft={props.selectedCompanySupplierDraft}
        onAddCompanyOrderItem={props.handleCompanyOrderAddItem}
        hasMoreCompanyOrderItems={props.hasMoreCompanyOrderItems}
        onShowMoreCompanyOrderItems={() =>
          props.setCompanyOrderVisibleCount((current: number) => current + 16)
        }
        selectedCompanyOrderCount={props.selectedCompanyOrderCount}
        selectedCompanyOrderTotalUnits={props.selectedCompanyOrderTotalUnits}
        companyOrderCartItems={props.companyOrderCartItems}
        onStepCompanyOrderItem={props.handleCompanyOrderStepItem}
        onRemoveCompanyOrderItem={props.handleCompanyOrderRemoveItem}
        companyOrderNotes={props.companyOrderNotes}
        onCompanyOrderNotesChange={props.setCompanyOrderNotes}
        companyOrderSaving={props.companyOrderSaving}
        onSubmitCompanyOrder={() => {
          void props.submitCompanyOrder();
        }}
        selectedCompanyOrderSupplierCount={props.selectedCompanyOrderSupplierCount}
        onRefreshCompanyOrders={() => {
          void props.loadCompanyOrders();
        }}
        companyOrderLoading={props.companyOrderLoading}
        companyOrderStatus={props.companyOrderStatus}
        inlineOrNull={props.inlineOrNull}
        lastSubmittedCompanyOrderWeekStart={
          props.lastSubmittedCompanyOrderWeekStart
        }
        companyOrderRows={props.companyOrderRows}
        formatDisplayDate={props.formatDisplayDate}
        companyOrderInPersonWeekStartDate={props.companyOrderInPersonWeekStartDate}
        companyOrderInPersonWeekEndDate={props.companyOrderInPersonWeekEndDate}
        companyOrderInPersonSuppliers={props.companyOrderInPersonSuppliers}
        companyOrderInPersonSupplier={props.companyOrderInPersonSupplier}
        onCompanyOrderInPersonSupplierChange={props.setCompanyOrderInPersonSupplier}
        companyOrderInPersonSearch={props.companyOrderInPersonSearch}
        onCompanyOrderInPersonSearchChange={props.setCompanyOrderInPersonSearch}
        companyOrderInPersonSummaryLabel={props.companyOrderInPersonSummaryLabel}
        companyOrderInPersonItems={props.companyOrderInPersonItems}
        getCompanyOrderInPersonDraftValue={props.getCompanyOrderInPersonDraftValue}
        getCompanyOrderInPersonMetaLine={props.getCompanyOrderInPersonMetaLine}
        onCompanyOrderInPersonPurchasedQuantityChange={
          props.handleCompanyOrderInPersonPurchasedQuantityChange
        }
        onCompanyOrderInPersonPurchasedWeightLbChange={
          props.handleCompanyOrderInPersonPurchasedWeightLbChange
        }
        onCompanyOrderInPersonUnitPriceChange={
          props.handleCompanyOrderInPersonUnitPriceChange
        }
        onCompanyOrderInPersonCompanyUnitPriceChange={
          props.handleCompanyOrderInPersonCompanyUnitPriceChange
        }
        onDeleteCompanyOrderInPerson={() => {
          void props.clearCompanyOrderInPerson();
        }}
        onSaveCompanyOrderInPerson={() => {
          void props.saveCompanyOrderInPerson();
        }}
        onLoadCompanyOrderInPerson={() => {
          void props.loadCompanyOrderInPerson();
        }}
        onPreviousCompanyOrderInPersonWeek={props.goToPreviousCompanyOrderInPersonWeek}
        onNextCompanyOrderInPersonWeek={props.goToNextCompanyOrderInPersonWeek}
        companyOrderInPersonLoading={props.companyOrderInPersonLoading}
        companyOrderInPersonSaving={props.companyOrderInPersonSaving}
        companyOrderInPersonStatus={props.companyOrderInPersonStatus}
      />
    );
  }
  if (props.screen === "liquorControl") {
    return (
      <LiquorControlScreen
        isLight={props.isLight}
        inline={props.inline}
        inlineOrNull={props.inlineOrNull}
        language={props.language}
        liquorInventoryEnabled={props.liquorInventoryEnabled}
        hasLiquorManagerAccess={props.hasLiquorManagerAccess}
        hasLiquorPremiumAccess={props.hasLiquorPremiumAccess}
        liquorMonth={props.liquorMonth}
        setLiquorMonth={props.setLiquorMonth}
        liquorYear={props.liquorYear}
        setLiquorYear={props.setLiquorYear}
        liquorTargetCostPct={props.liquorTargetCostPct}
        setLiquorTargetCostPct={props.setLiquorTargetCostPct}
        companyOrdersOfficeId={props.companyOrdersOfficeId}
        liquorLoading={props.liquorLoading}
        loadLiquorControlData={props.loadLiquorControlData}
        liquorWorkspace={props.liquorWorkspace}
        setLiquorWorkspace={props.setLiquorWorkspace}
        liquorStatus={props.liquorStatus}
        liquorMovements={props.liquorMovements}
        liquorCounts={props.liquorCounts}
        liquorBottleScans={props.liquorBottleScans}
        liquorMonthly={props.liquorMonthly}
        liquorMonthlyPrevious={props.liquorMonthlyPrevious}
        liquorCatalog={props.liquorCatalog}
        liquorQuickCountForm={props.liquorQuickCountForm}
        liquorSheetRows={props.liquorSheetRows}
        liquorInventorySearch={props.liquorInventorySearch}
        liquorCatalogSearch={props.liquorCatalogSearch}
        liquorInventoryVisibleCount={props.liquorInventoryVisibleCount}
        liquorCatalogVisibleCount={props.liquorCatalogVisibleCount}
        liquorCatalogForm={props.liquorCatalogForm}
        liquorKinds={props.liquorKinds}
        liquorKindForm={props.liquorKindForm}
        liquorCountDate={props.liquorCountDate}
        setLiquorCountDate={props.setLiquorCountDate}
        setLiquorInventorySearch={props.setLiquorInventorySearch}
        liquorSheetDrafts={props.liquorSheetDrafts}
        liquorSavingItemId={props.liquorSavingItemId}
        liquorSavingCountItemId={props.liquorSavingCountItemId}
        updateLiquorSheetDraft={props.updateLiquorSheetDraft}
        saveLiquorCatalogRow={props.saveLiquorCatalogRow}
        saveLiquorCountRow={props.saveLiquorCountRow}
        setLiquorInventoryVisibleCount={props.setLiquorInventoryVisibleCount}
        setLiquorCatalogSearch={props.setLiquorCatalogSearch}
        setLiquorKindForm={props.setLiquorKindForm}
        liquorActionLoading={props.liquorActionLoading}
        createLiquorKind={props.createLiquorKind}
        deleteLiquorKind={props.deleteLiquorKind}
        liquorCatalogAiQuery={props.liquorCatalogAiQuery}
        setLiquorCatalogAiQuery={props.setLiquorCatalogAiQuery}
        liquorCatalogAiLoading={props.liquorCatalogAiLoading}
        assistLiquorCatalog={props.assistLiquorCatalog}
        liquorCatalogAiResult={props.liquorCatalogAiResult}
        liquorLookupUpc={props.liquorLookupUpc}
        setLiquorLookupUpc={props.setLiquorLookupUpc}
        liquorLookupLoading={props.liquorLookupLoading}
        lookupLiquorByUpc={props.lookupLiquorByUpc}
        liquorLookupResult={props.liquorLookupResult}
        setLiquorCatalogForm={props.setLiquorCatalogForm}
        createLiquorCatalogItem={props.createLiquorCatalogItem}
        setLiquorCatalogVisibleCount={props.setLiquorCatalogVisibleCount}
        offices={props.offices}
        liquorMovementForm={props.liquorMovementForm}
        setLiquorMovementForm={props.setLiquorMovementForm}
        createLiquorMovement={props.createLiquorMovement}
        setLiquorQuickCountForm={props.setLiquorQuickCountForm}
        saveLiquorQuickCount={props.saveLiquorQuickCount}
        liquorScanItemId={props.liquorScanItemId}
        setLiquorScanItemId={props.setLiquorScanItemId}
        liquorScanContainerKey={props.liquorScanContainerKey}
        setLiquorScanContainerKey={props.setLiquorScanContainerKey}
        liquorAnalyzingItemId={props.liquorAnalyzingItemId}
        analyzeLiquorBottleForItem={props.analyzeLiquorBottleForItem}
        liquorInvoiceDate={props.liquorInvoiceDate}
        setLiquorInvoiceDate={props.setLiquorInvoiceDate}
        liquorInvoiceNumber={props.liquorInvoiceNumber}
        setLiquorInvoiceNumber={props.setLiquorInvoiceNumber}
        liquorInvoiceSupplier={props.liquorInvoiceSupplier}
        setLiquorInvoiceSupplier={props.setLiquorInvoiceSupplier}
        liquorInvoiceNotes={props.liquorInvoiceNotes}
        setLiquorInvoiceNotes={props.setLiquorInvoiceNotes}
        liquorInvoiceIncludePurchases={props.liquorInvoiceIncludePurchases}
        setLiquorInvoiceIncludePurchases={props.setLiquorInvoiceIncludePurchases}
        pickLiquorInvoicePhoto={props.pickLiquorInvoicePhoto}
        liquorInvoiceAnalyzing={props.liquorInvoiceAnalyzing}
        analyzeLiquorInvoicePhoto={props.analyzeLiquorInvoicePhoto}
        liquorInvoiceApplying={props.liquorInvoiceApplying}
        applyLiquorInvoiceRows={props.applyLiquorInvoiceRows}
        liquorInvoiceImageName={props.liquorInvoiceImageName}
        liquorInvoiceRows={props.liquorInvoiceRows}
        liquorExportingFormat={props.liquorExportingFormat}
        handleLiquorAnalyticsExport={props.handleLiquorAnalyticsExport}
        liquorYearly={props.liquorYearly}
      />
    );
  }
  return null;
}
