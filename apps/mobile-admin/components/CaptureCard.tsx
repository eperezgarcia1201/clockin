import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import { CaptureExpenseSection } from "./CaptureExpenseSection";
import { CaptureSalesSection } from "./CaptureSalesSection";
import type { CaptureCardProps } from "./CaptureCard.types";

export function CaptureCard({
  isLight,
  text,
  captureMode,
  onCaptureModeChange,
  salesDate,
  onSalesDateChange,
  salesFood,
  onSalesFoodChange,
  salesLiquor,
  onSalesLiquorChange,
  salesCash,
  onSalesCashChange,
  salesBatch,
  onSalesBatchChange,
  salesNotes,
  onSalesNotesChange,
  salesSaveLoading,
  onSaveSales,
  todayExpenseDate,
  salesExpenseInvoice,
  onSalesExpenseInvoiceChange,
  salesExpenseCompany,
  onSalesExpenseCompanyChange,
  salesExpenseMethod,
  onSalesExpenseMethodChange,
  salesExpenseAmount,
  onSalesExpenseAmountChange,
  salesExpenseCheckNumber,
  onSalesExpenseCheckNumberChange,
  salesExpensePayToCompany,
  onSalesExpensePayToCompanyChange,
  salesExpenseNotes,
  onSalesExpenseNotesChange,
  salesExpenseReceipt,
  salesExpenseReceiptLoading,
  onCaptureSalesExpenseReceipt,
  onRemoveSalesExpenseReceipt,
  salesExpenseSaveLoading,
  onSaveSalesExpense,
  salesActionStatus,
  inlineOrNull,
}: CaptureCardProps) {
  return (
    <View style={[styles.card, isLight && styles.cardLight]}>
      <Text style={[styles.cardTitle, isLight && styles.cardTitleLight]}>{text.captureTitle}</Text>
      <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>{text.captureSubtitle}</Text>
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[
            styles.togglePill,
            isLight && styles.togglePillLight,
            captureMode === "sales" && styles.toggleActive,
            captureMode === "sales" && isLight && styles.toggleActiveLight,
          ]}
          onPress={() => onCaptureModeChange("sales")}
        >
          <Text
            style={[
              styles.toggleText,
              isLight && styles.toggleTextLight,
              captureMode === "sales" && isLight && styles.toggleTextLightActive,
            ]}
          >
            {text.salesToggle}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.togglePill,
            isLight && styles.togglePillLight,
            captureMode === "expense" && styles.toggleActive,
            captureMode === "expense" && isLight && styles.toggleActiveLight,
          ]}
          onPress={() => onCaptureModeChange("expense")}
        >
          <Text
            style={[
              styles.toggleText,
              isLight && styles.toggleTextLight,
              captureMode === "expense" && isLight && styles.toggleTextLightActive,
            ]}
          >
            {text.expenseToggle}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.divider, isLight && styles.dividerLight]} />
      {captureMode === "sales" ? (
        <CaptureSalesSection
          isLight={isLight}
          text={text}
          salesDate={salesDate}
          onSalesDateChange={onSalesDateChange}
          salesFood={salesFood}
          onSalesFoodChange={onSalesFoodChange}
          salesLiquor={salesLiquor}
          onSalesLiquorChange={onSalesLiquorChange}
          salesCash={salesCash}
          onSalesCashChange={onSalesCashChange}
          salesBatch={salesBatch}
          onSalesBatchChange={onSalesBatchChange}
          salesNotes={salesNotes}
          onSalesNotesChange={onSalesNotesChange}
          salesSaveLoading={salesSaveLoading}
          onSaveSales={onSaveSales}
        />
      ) : (
        <CaptureExpenseSection
          isLight={isLight}
          text={text}
          todayExpenseDate={todayExpenseDate}
          salesExpenseInvoice={salesExpenseInvoice}
          onSalesExpenseInvoiceChange={onSalesExpenseInvoiceChange}
          salesExpenseCompany={salesExpenseCompany}
          onSalesExpenseCompanyChange={onSalesExpenseCompanyChange}
          salesExpenseMethod={salesExpenseMethod}
          onSalesExpenseMethodChange={onSalesExpenseMethodChange}
          salesExpenseAmount={salesExpenseAmount}
          onSalesExpenseAmountChange={onSalesExpenseAmountChange}
          salesExpenseCheckNumber={salesExpenseCheckNumber}
          onSalesExpenseCheckNumberChange={onSalesExpenseCheckNumberChange}
          salesExpensePayToCompany={salesExpensePayToCompany}
          onSalesExpensePayToCompanyChange={onSalesExpensePayToCompanyChange}
          salesExpenseNotes={salesExpenseNotes}
          onSalesExpenseNotesChange={onSalesExpenseNotesChange}
          salesExpenseReceipt={salesExpenseReceipt}
          salesExpenseReceiptLoading={salesExpenseReceiptLoading}
          onCaptureSalesExpenseReceipt={onCaptureSalesExpenseReceipt}
          onRemoveSalesExpenseReceipt={onRemoveSalesExpenseReceipt}
          salesExpenseSaveLoading={salesExpenseSaveLoading}
          onSaveSalesExpense={onSaveSalesExpense}
        />
      )}
      {salesActionStatus && (
        <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
          {inlineOrNull(salesActionStatus)}
        </Text>
      )}
    </View>
  );
}
