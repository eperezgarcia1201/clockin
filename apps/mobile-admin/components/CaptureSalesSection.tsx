import { Text, TextInput, TouchableOpacity } from "react-native";
import { styles } from "../App.styles";
import type { CaptureText } from "./CaptureCard.types";

type CaptureSalesSectionProps = {
  isLight: boolean;
  text: CaptureText;
  salesDate: string;
  onSalesDateChange: (value: string) => void;
  salesFood: string;
  onSalesFoodChange: (value: string) => void;
  salesLiquor: string;
  onSalesLiquorChange: (value: string) => void;
  salesCash: string;
  onSalesCashChange: (value: string) => void;
  salesBatch: string;
  onSalesBatchChange: (value: string) => void;
  salesNotes: string;
  onSalesNotesChange: (value: string) => void;
  salesSaveLoading: boolean;
  onSaveSales: () => void;
};

export function CaptureSalesSection({
  isLight,
  text,
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
}: CaptureSalesSectionProps) {
  return (
    <>
      <Text style={[styles.cardTitle, styles.reportSectionTitle, isLight && styles.cardTitleLight]}>
        {text.salesTitle}
      </Text>
      <Text style={[styles.label, isLight && styles.labelLight]}>{text.salesDate}</Text>
      <TextInput
        style={[styles.input, isLight && styles.inputLight]}
        value={salesDate}
        onChangeText={onSalesDateChange}
        placeholder="MM/DD/YYYY"
      />
      <Text style={[styles.label, isLight && styles.labelLight]}>{text.foodSales}</Text>
      <TextInput
        style={[styles.input, isLight && styles.inputLight]}
        value={salesFood}
        onChangeText={onSalesFoodChange}
        keyboardType="decimal-pad"
      />
      <Text style={[styles.label, isLight && styles.labelLight]}>{text.liquorSales}</Text>
      <TextInput
        style={[styles.input, isLight && styles.inputLight]}
        value={salesLiquor}
        onChangeText={onSalesLiquorChange}
        keyboardType="decimal-pad"
      />
      <Text style={[styles.label, isLight && styles.labelLight]}>{text.cashPayments}</Text>
      <TextInput
        style={[styles.input, isLight && styles.inputLight]}
        value={salesCash}
        onChangeText={onSalesCashChange}
        keyboardType="decimal-pad"
      />
      <Text style={[styles.label, isLight && styles.labelLight]}>{text.bankBatch}</Text>
      <TextInput
        style={[styles.input, isLight && styles.inputLight]}
        value={salesBatch}
        onChangeText={onSalesBatchChange}
        placeholder="Batch reference"
      />
      <Text style={[styles.label, isLight && styles.labelLight]}>{text.notesOptional}</Text>
      <TextInput
        style={[styles.input, isLight && styles.inputLight]}
        value={salesNotes}
        onChangeText={onSalesNotesChange}
        placeholder="Manager notes"
      />
      <TouchableOpacity
        style={[
          styles.button,
          styles.capturePrimaryActionButton,
          styles.captureSalesActionButton,
          isLight && styles.capturePrimaryActionButtonLight,
          salesSaveLoading && styles.inlineButtonDisabled,
        ]}
        onPress={onSaveSales}
        disabled={salesSaveLoading}
      >
        <Text style={styles.capturePrimaryActionText}>
          {salesSaveLoading ? text.saving : `${text.saveDailySales}  →`}
        </Text>
      </TouchableOpacity>
    </>
  );
}
