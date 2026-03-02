import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import { i18n } from "../i18n";

type CompanyOrderExportButtonsProps = {
  t: (typeof i18n)[keyof typeof i18n];
  companyOrderExportingFormat: "pdf" | "csv" | "excel" | null;
  onExport: (format: "pdf" | "csv" | "excel") => void;
};

export function CompanyOrderExportButtons({
  t,
  companyOrderExportingFormat,
  onExport,
}: CompanyOrderExportButtonsProps) {
  return (
    <View style={styles.companyOrderExportRow}>
      <TouchableOpacity
        style={styles.tenantSwitch}
        disabled={companyOrderExportingFormat !== null}
        onPress={() => onExport("pdf")}
      >
        <Text style={styles.tenantSwitchText}>
          {companyOrderExportingFormat === "pdf" ? t.preparingDownload : t.downloadPdf}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.tenantSwitch}
        disabled={companyOrderExportingFormat !== null}
        onPress={() => onExport("csv")}
      >
        <Text style={styles.tenantSwitchText}>
          {companyOrderExportingFormat === "csv" ? t.preparingDownload : t.downloadCsv}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.tenantSwitch}
        disabled={companyOrderExportingFormat !== null}
        onPress={() => onExport("excel")}
      >
        <Text style={styles.tenantSwitchText}>
          {companyOrderExportingFormat === "excel"
            ? t.preparingDownload
            : t.downloadExcel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
