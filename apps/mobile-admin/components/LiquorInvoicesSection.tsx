import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import type { LiquorInvoiceExtractedRow } from "../types";

type LiquorInvoicesSectionProps = {
  isLight: boolean;
  hasLiquorPremiumAccess: boolean;
  inline: (value: string) => string;
  liquorInvoiceDate: string;
  onLiquorInvoiceDateChange: (value: string) => void;
  liquorInvoiceNumber: string;
  onLiquorInvoiceNumberChange: (value: string) => void;
  liquorInvoiceSupplier: string;
  onLiquorInvoiceSupplierChange: (value: string) => void;
  liquorInvoiceNotes: string;
  onLiquorInvoiceNotesChange: (value: string) => void;
  liquorInvoiceIncludePurchases: boolean;
  onToggleLiquorInvoiceIncludePurchases: () => void;
  onPickLiquorInvoicePhoto: () => void;
  liquorInvoiceAnalyzing: boolean;
  onAnalyzeLiquorInvoicePhoto: () => void;
  liquorInvoiceApplying: boolean;
  onApplyLiquorInvoiceRows: () => void;
  liquorInvoiceImageName: string;
  liquorInvoiceRows: LiquorInvoiceExtractedRow[];
  formatQtyValue: (value: number | null | undefined) => string;
  formatMoneyValue: (value: number | null | undefined) => string;
};

export function LiquorInvoicesSection({
  isLight,
  hasLiquorPremiumAccess,
  inline,
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
  formatQtyValue,
  formatMoneyValue,
}: LiquorInvoicesSectionProps) {
  return (
    <View style={[styles.liquorSectionCard, isLight && styles.liquorSectionCardLight]}>
      {!hasLiquorPremiumAccess ? (
        <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
          {inline("Premium liquor features are disabled for this tenant.")}
        </Text>
      ) : (
        <>
          <Text style={[styles.listName, isLight && styles.listNameLight]}>
            {inline("Invoice OCR + Cost Shock")}
          </Text>
          <Text style={[styles.label, isLight && styles.labelLight]}>
            {inline("Invoice Date")}
          </Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={liquorInvoiceDate}
            onChangeText={onLiquorInvoiceDateChange}
            placeholder="YYYY-MM-DD"
          />
          <Text style={[styles.label, isLight && styles.labelLight]}>
            {inline("Invoice #")}
          </Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={liquorInvoiceNumber}
            onChangeText={onLiquorInvoiceNumberChange}
            placeholder="INV-1001"
          />
          <Text style={[styles.label, isLight && styles.labelLight]}>
            {inline("Supplier")}
          </Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={liquorInvoiceSupplier}
            onChangeText={onLiquorInvoiceSupplierChange}
            placeholder="Supplier"
          />
          <Text style={[styles.label, isLight && styles.labelLight]}>
            {inline("Notes")}
          </Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={liquorInvoiceNotes}
            onChangeText={onLiquorInvoiceNotesChange}
            placeholder="Optional notes"
          />
          <TouchableOpacity
            style={[styles.secondaryButton, isLight && styles.secondaryButtonLight]}
            onPress={onToggleLiquorInvoiceIncludePurchases}
          >
            <Text
              style={[
                styles.secondaryButtonText,
                isLight && styles.secondaryButtonTextLight,
              ]}
            >
              {liquorInvoiceIncludePurchases ? "✓ " : "○ "}
              {inline("Create purchase movements")}
            </Text>
          </TouchableOpacity>
          <View style={styles.companyOrderExportRow}>
            <TouchableOpacity
              style={[styles.secondaryButton, isLight && styles.secondaryButtonLight]}
              onPress={onPickLiquorInvoicePhoto}
            >
              <Text
                style={[
                  styles.secondaryButtonText,
                  isLight && styles.secondaryButtonTextLight,
                ]}
              >
                {inline("Invoice Photo")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryButton, isLight && styles.secondaryButtonLight]}
              disabled={liquorInvoiceAnalyzing}
              onPress={onAnalyzeLiquorInvoicePhoto}
            >
              <Text
                style={[
                  styles.secondaryButtonText,
                  isLight && styles.secondaryButtonTextLight,
                ]}
              >
                {liquorInvoiceAnalyzing ? inline("Preparing...") : inline("Analyze Invoice")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryButton, isLight && styles.secondaryButtonLight]}
              disabled={liquorInvoiceApplying}
              onPress={onApplyLiquorInvoiceRows}
            >
              <Text
                style={[
                  styles.secondaryButtonText,
                  isLight && styles.secondaryButtonTextLight,
                ]}
              >
                {liquorInvoiceApplying ? inline("Preparing...") : inline("Apply Invoice Rows")}
              </Text>
            </TouchableOpacity>
          </View>
          {liquorInvoiceImageName ? (
            <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
              {inline("Invoice Photo")}: {liquorInvoiceImageName}
            </Text>
          ) : null}
          {liquorInvoiceRows.length === 0 ? (
            <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
              {inline("No invoice rows extracted yet.")}
            </Text>
          ) : (
            liquorInvoiceRows.slice(0, 40).map((row) => (
              <View
                key={`liquor-invoice-row-${row.rowNumber}-${row.liquorName}`}
                style={styles.listRow}
              >
                <View style={styles.reportRowMain}>
                  <Text style={[styles.listName, isLight && styles.listNameLight]}>
                    #{row.rowNumber} {row.liquorName}
                  </Text>
                  <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                    {row.company || "-"} • {row.kind || "-"} • UPC {row.upc || "-"}
                  </Text>
                  <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                    Qty {formatQtyValue(row.quantity)} • Cost {formatMoneyValue(row.unitCost)}
                  </Text>
                  <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                    {inline("Match")}: {row.matchedItemName || row.suggestedAction} •{" "}
                    {inline("Severity")}: {row.costShockSeverity}
                    {row.costShockDeltaPct !== null
                      ? ` • ${(row.costShockDeltaPct * 100).toFixed(1)}%`
                      : ""}
                  </Text>
                </View>
              </View>
            ))
          )}
        </>
      )}
    </View>
  );
}
