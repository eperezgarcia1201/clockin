import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import type { Lang } from "../copy";
import type { ReportExportFormat } from "../report-export";
import type { Employee, ReportType } from "../types";

type ReportsCardProps = {
  isLight: boolean;
  reportTypeOrder: ReportType[];
  reportType: ReportType;
  onReportTypeChange: (type: ReportType) => void;
  fromDate: string;
  onFromDateChange: (value: string) => void;
  toDate: string;
  onToDateChange: (value: string) => void;
  reportEmployeeId: string;
  onReportEmployeeIdChange: (employeeId: string) => void;
  employees: Employee[];
  reportStatus: string | null;
  inlineOrNull: (value: string | null | undefined) => string | null;
  reportLoading: boolean;
  onRunReport: () => void;
  reportExportingFormat: ReportExportFormat | null;
  onExportReport: (format: ReportExportFormat) => void;
  inline: (value: string) => string;
  language: Lang;
  reportRows: any[];
};

export function ReportsCard({
  isLight,
  reportTypeOrder,
  reportType,
  onReportTypeChange,
  fromDate,
  onFromDateChange,
  toDate,
  onToDateChange,
  reportEmployeeId,
  onReportEmployeeIdChange,
  employees,
  reportStatus,
  inlineOrNull,
  reportLoading,
  onRunReport,
  reportExportingFormat,
  onExportReport,
  inline,
  language,
  reportRows,
}: ReportsCardProps) {
  return (
    <View style={[styles.card, isLight && styles.cardLight]}>
      <Text style={[styles.cardTitle, isLight && styles.cardTitleLight]}>
        Run Reports
      </Text>
      <View style={styles.toggleRow}>
        {reportTypeOrder.map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.togglePill,
              isLight && styles.togglePillLight,
              reportType === type && styles.toggleActive,
              reportType === type && isLight && styles.toggleActiveLight,
            ]}
            onPress={() => onReportTypeChange(type)}
          >
            <Text
              style={[
                styles.toggleText,
                isLight && styles.toggleTextLight,
                reportType === type && isLight && styles.toggleTextLightActive,
              ]}
            >
              {type.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[styles.label, isLight && styles.labelLight]}>
        From (MM/DD/YYYY)
      </Text>
      <TextInput
        style={[styles.input, isLight && styles.inputLight]}
        value={fromDate}
        onChangeText={onFromDateChange}
        placeholder="MM/DD/YYYY"
      />
      <Text style={[styles.label, isLight && styles.labelLight]}>
        To (MM/DD/YYYY)
      </Text>
      <TextInput
        style={[styles.input, isLight && styles.inputLight]}
        value={toDate}
        onChangeText={onToDateChange}
        placeholder="MM/DD/YYYY"
      />

      <Text style={[styles.label, isLight && styles.labelLight]}>
        Employee Filter
      </Text>
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[
            styles.togglePill,
            isLight && styles.togglePillLight,
            !reportEmployeeId && styles.toggleActive,
            !reportEmployeeId && isLight && styles.toggleActiveLight,
          ]}
          onPress={() => onReportEmployeeIdChange("")}
        >
          <Text
            style={[
              styles.toggleText,
              isLight && styles.toggleTextLight,
              !reportEmployeeId && isLight && styles.toggleTextLightActive,
            ]}
          >
            All Employees
          </Text>
        </TouchableOpacity>
        {employees.map((employee) => (
          <TouchableOpacity
            key={`report-filter-${employee.id}`}
            style={[
              styles.togglePill,
              isLight && styles.togglePillLight,
              reportEmployeeId === employee.id && styles.toggleActive,
              reportEmployeeId === employee.id &&
                isLight &&
                styles.toggleActiveLight,
            ]}
            onPress={() => onReportEmployeeIdChange(employee.id)}
          >
            <Text
              style={[
                styles.toggleText,
                isLight && styles.toggleTextLight,
                reportEmployeeId === employee.id &&
                  isLight &&
                  styles.toggleTextLightActive,
              ]}
            >
              {employee.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {reportStatus && (
        <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
          {inlineOrNull(reportStatus)}
        </Text>
      )}
      <TouchableOpacity
        style={[
          styles.button,
          styles.primary,
          reportLoading && styles.inlineButtonDisabled,
        ]}
        onPress={onRunReport}
        disabled={reportLoading}
      >
        <Text style={[styles.primaryText, isLight && styles.primaryTextLight]}>
          {reportLoading
            ? inline("Generating...")
            : language === "es"
              ? "Generar Reporte"
              : "Generate Report"}
        </Text>
      </TouchableOpacity>
      <View style={styles.rowActions}>
        {(["pdf", "csv", "excel"] as ReportExportFormat[]).map((format) => (
          <TouchableOpacity
            key={`report-export-${format}`}
            style={[
              styles.secondaryButton,
              isLight && styles.secondaryButtonLight,
              styles.actionButtonCompact,
              reportExportingFormat === format && styles.inlineButtonDisabled,
            ]}
            onPress={() => onExportReport(format)}
            disabled={Boolean(reportExportingFormat)}
          >
            <Text
              style={[
                styles.secondaryButtonText,
                isLight && styles.secondaryButtonTextLight,
              ]}
            >
              {reportExportingFormat === format
                ? inline("Exporting...")
                : format.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={[styles.divider, isLight && styles.dividerLight]} />
      {reportRows.length === 0 ? (
        <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
          No report data loaded.
        </Text>
      ) : reportType === "audit" ? (
        reportRows.map((row: any) => (
          <View key={row.id} style={styles.listRow}>
            <View>
              <Text style={[styles.listName, isLight && styles.listNameLight]}>
                {row.employeeName}
              </Text>
              <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                {row.type}
              </Text>
            </View>
            <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
              {new Date(row.occurredAt).toLocaleString()}
            </Text>
          </View>
        ))
      ) : reportType === "tips" ? (
        reportRows.map((row: any) => (
          <View key={row.id} style={styles.listRow}>
            <View>
              <Text style={[styles.listName, isLight && styles.listNameLight]}>
                {row.name}
              </Text>
              <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                CC ${row.totalCreditCardTips?.toFixed?.(2) ?? row.totalCreditCardTips} •
                Cash ${row.totalCashTips?.toFixed?.(2) ?? row.totalCashTips}
              </Text>
            </View>
            <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
              ${row.totalTips?.toFixed?.(2) ?? row.totalTips}
            </Text>
          </View>
        ))
      ) : (
        reportRows.map((row: any) => (
          <View key={row.id} style={styles.listRow}>
            <View>
              <Text style={[styles.listName, isLight && styles.listNameLight]}>
                {row.name}
              </Text>
              <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                {row.totalHoursFormatted}
              </Text>
            </View>
            <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
              {row.totalHoursDecimal} hrs
            </Text>
          </View>
        ))
      )}
    </View>
  );
}
