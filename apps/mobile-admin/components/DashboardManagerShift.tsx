import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import type { Lang } from "../copy";

type DashboardManagerShiftProps = {
  isLight: boolean;
  sessionManagerEmployeeId: string | null;
  managerDisplayName: string;
  managerClockExempt: boolean;
  language: Lang;
  managerCurrentPunchStatus: string;
  managerPin: string;
  onManagerPinChange: (value: string) => void;
  managerCanClockOut: boolean;
  managerPunchLoading: boolean;
  onManagerSelfPunch: () => void;
  inline: (value: string) => string;
  managerActionLabel: string;
  managerPendingTipWorkDate: string | null;
  managerCashTips: string;
  onManagerCashTipsChange: (value: string) => void;
  managerCreditCardTips: string;
  onManagerCreditCardTipsChange: (value: string) => void;
  managerTipSaving: boolean;
  onSubmitManagerPendingTips: () => void;
  managerPunchStatus: string | null;
  inlineOrNull: (value: string | null | undefined) => string | null;
};

export function DashboardManagerShift({
  isLight,
  sessionManagerEmployeeId,
  managerDisplayName,
  managerClockExempt,
  language,
  managerCurrentPunchStatus,
  managerPin,
  onManagerPinChange,
  managerCanClockOut,
  managerPunchLoading,
  onManagerSelfPunch,
  inline,
  managerActionLabel,
  managerPendingTipWorkDate,
  managerCashTips,
  onManagerCashTipsChange,
  managerCreditCardTips,
  onManagerCreditCardTipsChange,
  managerTipSaving,
  onSubmitManagerPendingTips,
  managerPunchStatus,
  inlineOrNull,
}: DashboardManagerShiftProps) {
  if (!sessionManagerEmployeeId) {
    return null;
  }

  return (
    <>
      <View style={[styles.divider, isLight && styles.dividerLight]} />
      <Text style={[styles.cardTitle, isLight && styles.cardTitleLight]}>My Shift</Text>
      <View style={[styles.workingCard, isLight && styles.workingCardLight]}>
        <Text style={[styles.listName, isLight && styles.listNameLight]}>{managerDisplayName}</Text>
        {managerClockExempt ? (
          <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
            Owner privilege is active for this manager account. Clock in/out is not required.
          </Text>
        ) : (
          <>
            <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
              {language === "es" ? "Estado actual:" : "Current status:"} {managerCurrentPunchStatus}
            </Text>
            <TextInput
              style={[styles.input, styles.inputCompact]}
              placeholder="PIN (if required)"
              secureTextEntry
              keyboardType="number-pad"
              value={managerPin}
              onChangeText={(value) => onManagerPinChange(value.replace(/\D+/g, "").slice(0, 4))}
              maxLength={4}
            />
            <TouchableOpacity
              style={[
                managerCanClockOut ? styles.inlineButton : styles.inlineButtonIn,
                isLight && (managerCanClockOut ? styles.inlineButtonLight : styles.inlineButtonInLight),
                managerPunchLoading && styles.inlineButtonDisabled,
              ]}
              onPress={onManagerSelfPunch}
              disabled={managerPunchLoading}
            >
              <Text
                style={[
                  managerCanClockOut ? styles.inlineButtonText : styles.inlineButtonTextIn,
                  isLight &&
                    (managerCanClockOut ? styles.inlineButtonTextLight : styles.inlineButtonTextInLight),
                ]}
              >
                {managerPunchLoading ? inline("Working...") : inline(managerActionLabel)}
              </Text>
            </TouchableOpacity>
            {managerPendingTipWorkDate ? (
              <View style={styles.tipCard}>
                <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                  {language === "es"
                    ? `Propinas pendientes requeridas para ${managerPendingTipWorkDate}.`
                    : `Pending tips required for ${managerPendingTipWorkDate}.`}
                </Text>
                <TextInput
                  style={[styles.input, styles.inputCompact]}
                  placeholder={language === "es" ? "Propinas en efectivo" : "Cash tips"}
                  keyboardType="decimal-pad"
                  value={managerCashTips}
                  onChangeText={onManagerCashTipsChange}
                />
                <TextInput
                  style={[styles.input, styles.inputCompact]}
                  placeholder={language === "es" ? "Propinas de tarjeta" : "Credit card tips"}
                  keyboardType="decimal-pad"
                  value={managerCreditCardTips}
                  onChangeText={onManagerCreditCardTipsChange}
                />
                <TouchableOpacity
                  style={[
                    styles.inlineButtonIn,
                    isLight && styles.inlineButtonInLight,
                    managerTipSaving && styles.inlineButtonDisabled,
                  ]}
                  onPress={onSubmitManagerPendingTips}
                  disabled={managerTipSaving}
                >
                  <Text style={[styles.inlineButtonTextIn, isLight && styles.inlineButtonTextInLight]}>
                    {managerTipSaving
                      ? inline("Saving tips...")
                      : language === "es"
                        ? "Enviar Propinas Pendientes"
                        : "Submit Pending Tips"}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </>
        )}
        {managerPunchStatus ? (
          <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
            {inlineOrNull(managerPunchStatus)}
          </Text>
        ) : null}
      </View>
    </>
  );
}
