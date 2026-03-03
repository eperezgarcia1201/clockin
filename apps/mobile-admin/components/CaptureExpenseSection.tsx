import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import { expensePaymentMethodLabel } from "../app-helpers";
import type { ExpensePaymentMethod, ReceiptAttachment } from "../types";
import type { CaptureText } from "./CaptureCard.types";

type CaptureExpenseSectionProps = {
  isLight: boolean;
  text: CaptureText;
  todayExpenseDate: string;
  salesExpenseInvoice: string;
  onSalesExpenseInvoiceChange: (value: string) => void;
  salesExpenseCompany: string;
  onSalesExpenseCompanyChange: (value: string) => void;
  salesExpenseMethod: ExpensePaymentMethod;
  onSalesExpenseMethodChange: (method: ExpensePaymentMethod) => void;
  salesExpenseAmount: string;
  onSalesExpenseAmountChange: (value: string) => void;
  salesExpenseCheckNumber: string;
  onSalesExpenseCheckNumberChange: (value: string) => void;
  salesExpensePayToCompany: string;
  onSalesExpensePayToCompanyChange: (value: string) => void;
  salesExpenseNotes: string;
  onSalesExpenseNotesChange: (value: string) => void;
  salesExpenseReceipt: ReceiptAttachment | null;
  salesExpenseReceiptLoading: boolean;
  onCaptureSalesExpenseReceipt: () => void;
  onRemoveSalesExpenseReceipt: () => void;
  salesExpenseSaveLoading: boolean;
  onSaveSalesExpense: () => void;
};

export function CaptureExpenseSection({
  isLight,
  text,
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
}: CaptureExpenseSectionProps) {
  return (
    <>
      <Text style={[styles.cardTitle, styles.reportSectionTitle, isLight && styles.cardTitleLight]}>
        {text.expenseTitle}
      </Text>
      <Text style={[styles.label, isLight && styles.labelLight]}>{text.paymentMethod}</Text>
      <View style={styles.toggleRow}>
        {(["CHECK", "DEBIT_CARD", "CASH"] as ExpensePaymentMethod[]).map((method) => (
          <TouchableOpacity
            key={`expense-method-${method}`}
            style={[
              styles.togglePill,
              isLight && styles.togglePillLight,
              salesExpenseMethod === method && styles.toggleActive,
              salesExpenseMethod === method && isLight && styles.toggleActiveLight,
            ]}
            onPress={() => onSalesExpenseMethodChange(method)}
          >
            <Text
              style={[
                styles.toggleText,
                isLight && styles.toggleTextLight,
                salesExpenseMethod === method && isLight && styles.toggleTextLightActive,
              ]}
            >
              {expensePaymentMethodLabel(method)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[styles.label, isLight && styles.labelLight]}>{text.expenseDate}</Text>
      <TextInput
        style={[styles.input, isLight && styles.inputLight]}
        value={todayExpenseDate}
        editable={false}
        selectTextOnFocus={false}
      />
      <Text style={[styles.label, isLight && styles.labelLight]}>{text.companyName}</Text>
      <TextInput
        style={[styles.input, isLight && styles.inputLight]}
        value={salesExpenseCompany}
        onChangeText={onSalesExpenseCompanyChange}
        placeholder="Vendor name"
      />
      <Text style={[styles.label, isLight && styles.labelLight]}>
        {salesExpenseMethod === "CHECK"
          ? `${text.invoiceNumber} *`
          : `${text.invoiceNumber} (${languageOptional(text.invoiceNumber)})`}
      </Text>
      <TextInput
        style={[styles.input, isLight && styles.inputLight]}
        value={salesExpenseInvoice}
        onChangeText={onSalesExpenseInvoiceChange}
        placeholder="INV-001"
      />
      <Text style={[styles.label, isLight && styles.labelLight]}>
        {salesExpenseMethod === "CHECK"
          ? text.checkTotal
          : salesExpenseMethod === "DEBIT_CARD"
            ? text.debitTotal
            : text.cashTotal}
      </Text>
      <TextInput
        style={[styles.input, isLight && styles.inputLight]}
        value={salesExpenseAmount}
        onChangeText={onSalesExpenseAmountChange}
        keyboardType="decimal-pad"
      />
      {salesExpenseMethod === "CHECK" && (
        <>
          <Text style={[styles.label, isLight && styles.labelLight]}>{text.checkNumber}</Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={salesExpenseCheckNumber}
            onChangeText={onSalesExpenseCheckNumberChange}
            placeholder="CHK-1002"
          />
          <Text style={[styles.label, isLight && styles.labelLight]}>{text.payToCompany}</Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={salesExpensePayToCompany}
            onChangeText={onSalesExpensePayToCompanyChange}
            placeholder="Company receiving payment"
          />
        </>
      )}
      <Text style={[styles.label, isLight && styles.labelLight]}>{text.notesOptional}</Text>
      <TextInput
        style={[styles.input, isLight && styles.inputLight]}
        value={salesExpenseNotes}
        onChangeText={onSalesExpenseNotesChange}
        placeholder="Expense notes"
      />
      <Text style={[styles.label, isLight && styles.labelLight]}>{text.receiptPhoto}</Text>
      <View style={styles.rowActions}>
        <TouchableOpacity
          style={[
            styles.secondaryButton,
            isLight && styles.secondaryButtonLight,
            styles.actionButtonCompact,
            salesExpenseReceiptLoading && styles.inlineButtonDisabled,
          ]}
          onPress={onCaptureSalesExpenseReceipt}
          disabled={salesExpenseReceiptLoading}
        >
          <Text style={[styles.secondaryButtonText, isLight && styles.secondaryButtonTextLight]}>
            {salesExpenseReceiptLoading
              ? text.openingCamera
              : salesExpenseReceipt
                ? text.retakePhoto
                : text.takePhoto}
          </Text>
        </TouchableOpacity>
        {salesExpenseReceipt ? (
          <TouchableOpacity
            style={[styles.secondaryButton, styles.secondaryButtonDanger, styles.actionButtonCompact]}
            onPress={onRemoveSalesExpenseReceipt}
          >
            <Text style={[styles.secondaryButtonText, styles.secondaryButtonDangerText]}>
              {text.removePhoto}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {salesExpenseReceipt ? (
        <Text style={[styles.helperText, isLight && styles.helperTextLight]}>
          {text.attached} {salesExpenseReceipt.fileName}
        </Text>
      ) : (
        <Text style={[styles.helperText, isLight && styles.helperTextLight]}>{text.noPhoto}</Text>
      )}
      <TouchableOpacity
        style={[
          styles.button,
          styles.capturePrimaryActionButton,
          styles.captureExpenseActionButton,
          isLight && styles.capturePrimaryActionButtonLight,
          salesExpenseSaveLoading && styles.inlineButtonDisabled,
        ]}
        onPress={onSaveSalesExpense}
        disabled={salesExpenseSaveLoading}
      >
        <Text style={styles.capturePrimaryActionText}>
          {salesExpenseSaveLoading ? text.saving : `${text.saveDailyExpense}  →`}
        </Text>
      </TouchableOpacity>
    </>
  );
}

const languageOptional = (label: string) =>
  label.toLowerCase().includes("factura") ? "opcional" : "optional";
