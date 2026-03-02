import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import { i18n } from "../i18n";
import type { LiquorInvoiceExtractedRow } from "../types";

type LiquorControlInvoiceSectionProps = {
  t: (typeof i18n)[keyof typeof i18n];
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
};

export function LiquorControlInvoiceSection({
  t,
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
}: LiquorControlInvoiceSectionProps) {
  return (
    <>
      <Text style={styles.teamTitle}>{t.liquorInvoiceOcr}</Text>
      <Text style={styles.label}>{t.liquorInvoiceDate}</Text>
      <TextInput
        style={styles.input}
        value={liquorInvoiceDate}
        onChangeText={onLiquorInvoiceDateChange}
        placeholder="YYYY-MM-DD"
        placeholderTextColor="rgba(31, 26, 22, 0.35)"
      />
      <Text style={styles.label}>{t.liquorInvoiceNumber}</Text>
      <TextInput
        style={styles.input}
        value={liquorInvoiceNumber}
        onChangeText={onLiquorInvoiceNumberChange}
        placeholder="INV-1001"
        placeholderTextColor="rgba(31, 26, 22, 0.35)"
      />
      <Text style={styles.label}>{t.liquorInvoiceSupplier}</Text>
      <TextInput
        style={styles.input}
        value={liquorInvoiceSupplier}
        onChangeText={onLiquorInvoiceSupplierChange}
        placeholder="Supplier"
        placeholderTextColor="rgba(31, 26, 22, 0.35)"
      />
      <Text style={styles.label}>{t.liquorInvoiceNotes}</Text>
      <TextInput
        style={styles.input}
        value={liquorInvoiceNotes}
        onChangeText={onLiquorInvoiceNotesChange}
        placeholder="Optional notes"
        placeholderTextColor="rgba(31, 26, 22, 0.35)"
      />
      <TouchableOpacity style={styles.tenantSwitch} onPress={onToggleLiquorInvoiceIncludePurchases}>
        <Text style={styles.tenantSwitchText}>
          {liquorInvoiceIncludePurchases ? "✓ " : "○ "}
          {t.liquorInvoiceIncludePurchases}
        </Text>
      </TouchableOpacity>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
        <TouchableOpacity style={styles.tenantSwitch} onPress={onPickLiquorInvoicePhoto}>
          <Text style={styles.tenantSwitchText}>{t.liquorInvoicePhoto}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tenantSwitch}
          disabled={liquorInvoiceAnalyzing}
          onPress={onAnalyzeLiquorInvoicePhoto}
        >
          <Text style={styles.tenantSwitchText}>
            {liquorInvoiceAnalyzing ? t.preparingDownload : t.liquorInvoiceAnalyze}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tenantSwitch}
          disabled={liquorInvoiceApplying}
          onPress={onApplyLiquorInvoiceRows}
        >
          <Text style={styles.tenantSwitchText}>
            {liquorInvoiceApplying ? t.preparingDownload : t.liquorInvoiceApply}
          </Text>
        </TouchableOpacity>
      </View>
      {liquorInvoiceImageName ? (
        <Text style={styles.teamEmployeeMeta}>
          {t.liquorInvoicePhoto}: {liquorInvoiceImageName}
        </Text>
      ) : null}
      {liquorInvoiceRows.length === 0 ? (
        <Text style={styles.teamEmployeeMeta}>{t.liquorInvoiceNoRows}</Text>
      ) : (
        liquorInvoiceRows.slice(0, 12).map((row) => (
          <View key={`liquor-invoice-row-${row.rowNumber}-${row.liquorName}`} style={styles.teamRow}>
            <View style={styles.teamRowMain}>
              <Text style={styles.teamEmployeeName}>{row.liquorName}</Text>
              <Text style={styles.teamEmployeeMeta}>
                {row.company || "-"} • {row.kind || "-"} • {row.quantity === null ? "-" : row.quantity}
              </Text>
              <Text style={styles.teamEmployeeMeta}>
                {t.liquorInvoiceMatch}: {row.matchedItemName || row.suggestedAction} • {t.liquorInvoiceSeverity}:{" "}
                {row.costShockSeverity}
                {row.costShockDeltaPct !== null ? ` • ${(row.costShockDeltaPct * 100).toFixed(1)}%` : ""}
              </Text>
            </View>
          </View>
        ))
      )}
    </>
  );
}
