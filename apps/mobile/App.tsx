import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const recentPunches = [
  {
    name: "Alan Jimenez",
    status: "OUT",
    time: "9:05 PM",
    date: "Feb 8, 2026",
  },
  {
    name: "Cris Hernandez",
    status: "OUT",
    time: "8:18 PM",
    date: "Feb 8, 2026",
  },
  {
    name: "Delfino Maciel",
    status: "IN",
    time: "7:53 PM",
    date: "Feb 8, 2026",
  },
  {
    name: "Isabel Rosas",
    status: "IN",
    time: "6:29 PM",
    date: "Feb 8, 2026",
  },
];

export default function App() {
  return (
    <LinearGradient colors={["#0b1214", "#102328", "#1b3a3e"]} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.brandRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>CI</Text>
            </View>
            <View>
              <Text style={styles.title}>ClockIn</Text>
              <Text style={styles.subtitle}>
                Secure SSO time tracking for multi-site teams.
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Clock Station</Text>
              <Text style={styles.pill}>Downtown • Kiosk 02</Text>
            </View>

            <Text style={styles.label}>Employee</Text>
            <TextInput style={styles.input} placeholder="Choose a name" />

            <Text style={styles.label}>PIN</Text>
            <TextInput
              style={styles.input}
              placeholder="••••"
              secureTextEntry
            />

            <Text style={styles.label}>Action</Text>
            <TextInput style={styles.input} placeholder="Clock In" />

            <View style={styles.actions}>
              <TouchableOpacity style={[styles.button, styles.primary]}>
                <Text style={styles.primaryText}>Confirm Punch</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.ghost]}>
                <Text style={styles.ghostText}>Use Face ID</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.metrics}>
              <View style={styles.metricTile}>
                <Text style={styles.metricLabel}>On Shift</Text>
                <Text style={styles.metricValue}>18</Text>
              </View>
              <View style={styles.metricTile}>
                <Text style={styles.metricLabel}>Pending</Text>
                <Text style={styles.metricValue}>5</Text>
              </View>
            </View>
          </View>

          <View style={styles.list}>
            <Text style={styles.listTitle}>Recent Punches</Text>
            {recentPunches.map((item) => (
              <View key={`${item.name}-${item.time}`} style={styles.listRow}>
                <View>
                  <Text style={styles.listName}>{item.name}</Text>
                  <Text style={styles.listDate}>{item.date}</Text>
                </View>
                <View style={styles.listStatus}>
                  <Text
                    style={
                      item.status === "IN" ? styles.statusIn : styles.statusOut
                    }
                  >
                    {item.status}
                  </Text>
                  <Text style={styles.listTime}>{item.time}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
        <StatusBar style="light" />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
    gap: 20,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#ff8a3d",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#f9f4ea",
  },
  subtitle: {
    color: "rgba(249, 244, 234, 0.7)",
    marginTop: 4,
    fontSize: 13,
  },
  card: {
    backgroundColor: "#f6f1e7",
    borderRadius: 22,
    padding: 20,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  pill: {
    backgroundColor: "#efe6d6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 11,
    color: "#5c5b56",
  },
  label: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: "#5c5b56",
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#fffaf2",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: "#ded2bf",
  },
  actions: {
    marginTop: 16,
    gap: 10,
  },
  button: {
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    backgroundColor: "#ff8a3d",
  },
  ghost: {
    backgroundColor: "#fffaf2",
    borderWidth: 1,
    borderColor: "#e2d4be",
  },
  primaryText: {
    fontWeight: "700",
    color: "#1a1a1a",
  },
  ghostText: {
    color: "#1a1a1a",
  },
  metrics: {
    marginTop: 16,
    flexDirection: "row",
    gap: 12,
  },
  metricTile: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 12,
  },
  metricLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#5c5b56",
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginTop: 4,
  },
  list: {
    backgroundColor: "rgba(246, 241, 231, 0.12)",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  listTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f9f4ea",
    marginBottom: 12,
  },
  listRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.12)",
  },
  listName: {
    color: "#f9f4ea",
    fontWeight: "600",
  },
  listDate: {
    color: "rgba(249, 244, 234, 0.7)",
    fontSize: 12,
    marginTop: 2,
  },
  listStatus: {
    alignItems: "flex-end",
  },
  statusIn: {
    color: "#baf2e7",
    fontWeight: "700",
  },
  statusOut: {
    color: "#ffd0c2",
    fontWeight: "700",
  },
  listTime: {
    color: "rgba(249, 244, 234, 0.7)",
    fontSize: 12,
    marginTop: 2,
  },
});
