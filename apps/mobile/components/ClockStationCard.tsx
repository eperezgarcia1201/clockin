import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import { actions } from "../app-config";
import { i18n } from "../i18n";

type ClockStationCardProps = {
  t: (typeof i18n)[keyof typeof i18n];
  showTipReminderTag: boolean;
  sessionEmployeeName: string | null;
  employeeName: string;
  onEmployeeNameChange: (value: string) => void;
  showEmployeeVerification: boolean;
  hasSelectedEmployee: boolean;
  verificationText: string;
  pinPlaceholder: string;
  pin: string;
  onPinChange: (value: string) => void;
  punchType: (typeof actions)[number];
  onPunchTypeChange: (value: (typeof actions)[number]) => void;
  showTipInputs: boolean;
  tipsAlert: boolean;
  pendingTipMessage: string | null;
  cashTips: string;
  onCashTipsChange: (value: string) => void;
  creditCardTips: string;
  onCreditCardTipsChange: (value: string) => void;
  tipsStatus: string | null;
  onSubmitTips: () => void;
  savingTips: boolean;
  status: string | null;
  onConfirmPunch: () => void;
  loading: boolean;
};

export function ClockStationCard({
  t,
  showTipReminderTag,
  sessionEmployeeName,
  employeeName,
  onEmployeeNameChange,
  showEmployeeVerification,
  hasSelectedEmployee,
  verificationText,
  pinPlaceholder,
  pin,
  onPinChange,
  punchType,
  onPunchTypeChange,
  showTipInputs,
  tipsAlert,
  pendingTipMessage,
  cashTips,
  onCashTipsChange,
  creditCardTips,
  onCreditCardTipsChange,
  tipsStatus,
  onSubmitTips,
  savingTips,
  status,
  onConfirmPunch,
  loading,
}: ClockStationCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{t.clockStation}</Text>
        <View style={styles.headerPills}>
          {showTipReminderTag ? (
            <View style={styles.tipReminderPill}>
              <Text style={styles.tipReminderText}>{t.tipsDueAtOut}</Text>
            </View>
          ) : null}
          <View style={styles.systemRow}>
            <View style={styles.systemDot} />
            <Text style={styles.systemText}>{t.systemOnline}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.label}>{t.username}</Text>
      {sessionEmployeeName ? (
        <View style={styles.lockedNameRow}>
          <View style={styles.lockedNameDot} />
          <Text style={styles.lockedNameText}>{sessionEmployeeName}</Text>
        </View>
      ) : (
        <TextInput
          style={styles.input}
          placeholder={t.enterFullName}
          value={employeeName}
          onChangeText={onEmployeeNameChange}
          autoCorrect={false}
          autoCapitalize="words"
        />
      )}

      {showEmployeeVerification ? (
        <View style={styles.verifyRow}>
          <View
            style={[
              styles.verifyDot,
              hasSelectedEmployee ? styles.verifyDotOn : styles.verifyDotOff,
            ]}
          />
          <Text style={styles.verifyText}>{verificationText}</Text>
        </View>
      ) : null}

      <Text style={styles.label}>{t.pin}</Text>
      <View style={styles.pinRow}>
        <TextInput
          style={[styles.input, styles.pinInput]}
          placeholder={pinPlaceholder}
          secureTextEntry
          keyboardType="number-pad"
          value={pin}
          onChangeText={onPinChange}
          maxLength={4}
          editable
        />
        <View style={styles.pinIcon}>
          <Text style={styles.pinIconText}>123</Text>
        </View>
      </View>

      <Text style={styles.label}>{t.action}</Text>
      <View style={styles.actionRow}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action}
            style={punchType === action ? styles.actionButtonActive : styles.actionButton}
            onPress={() => onPunchTypeChange(action)}
          >
            <Text
              style={punchType === action ? styles.actionTextActive : styles.actionText}
            >
              {t.actions[action]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {showTipInputs ? (
        <>
          <Text
            style={[
              styles.tipSectionTitle,
              tipsAlert ? styles.tipSectionTitleAlert : styles.tipSectionTitleOk,
            ]}
          >
            {t.tipSubmissionRequired}
          </Text>
          {pendingTipMessage ? <Text style={styles.statusText}>{pendingTipMessage}</Text> : null}
          <Text style={styles.label}>{t.cashTips}</Text>
          <TextInput
            style={styles.input}
            value={cashTips}
            onChangeText={onCashTipsChange}
            keyboardType="decimal-pad"
            inputMode="decimal"
            placeholder="0.00"
          />
          <Text style={styles.label}>{t.creditCardTips}</Text>
          <TextInput
            style={styles.input}
            value={creditCardTips}
            onChangeText={onCreditCardTipsChange}
            keyboardType="decimal-pad"
            inputMode="decimal"
            placeholder="0.00"
          />
          {tipsStatus ? (
            <Text
              style={[
                styles.statusText,
                tipsAlert ? styles.tipStatusAlert : styles.tipStatusOk,
              ]}
            >
              {tipsStatus}
            </Text>
          ) : null}
          <TouchableOpacity
            style={[
              styles.button,
              styles.tipsSubmitButton,
              tipsAlert ? styles.tipsSubmitButtonAlert : styles.tipsSubmitButtonOk,
            ]}
            onPress={onSubmitTips}
            disabled={savingTips}
          >
            <Text
              style={[
                styles.tipsSubmitButtonText,
                tipsAlert && styles.tipsSubmitButtonTextAlert,
              ]}
            >
              {savingTips ? t.savingTips : t.tapToSubmitTips}
            </Text>
          </TouchableOpacity>
        </>
      ) : null}

      {status ? <Text style={styles.statusText}>{status}</Text> : null}

      <TouchableOpacity
        style={[styles.button, styles.primary]}
        onPress={onConfirmPunch}
        disabled={loading}
      >
        <Text style={styles.primaryText}>{loading ? t.saving : t.confirmPunch}</Text>
      </TouchableOpacity>
    </View>
  );
}
