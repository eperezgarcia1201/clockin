import { Text, View } from "react-native";
import { styles } from "../App.styles";
import { i18n } from "../i18n";

type LastPunchCardProps = {
  t: (typeof i18n)[keyof typeof i18n];
  lastPunch: {
    name: string;
    type: string;
    occurredAt: Date;
  };
};

export function LastPunchCard({ t, lastPunch }: LastPunchCardProps) {
  return (
    <View style={styles.deviceCard}>
      <Text style={styles.deviceTitle}>{t.thisDevice}</Text>
      <View style={styles.deviceRow}>
        <View>
          <Text style={styles.deviceName}>{lastPunch.name}</Text>
          <Text style={styles.deviceDate}>{lastPunch.occurredAt.toLocaleDateString()}</Text>
        </View>
        <View style={styles.deviceStatus}>
          <View style={styles.devicePill}>
            <View
              style={[
                styles.deviceDot,
                lastPunch.type === "IN" ? styles.deviceDotOn : styles.deviceDotOff,
              ]}
            />
            <Text style={styles.devicePillText}>{lastPunch.type}</Text>
          </View>
          <Text style={styles.deviceTime}>
            {lastPunch.occurredAt.toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })}
          </Text>
        </View>
      </View>
    </View>
  );
}
