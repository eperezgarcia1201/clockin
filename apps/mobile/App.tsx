import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const apiBase = (process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000/api").replace(
  /\/$/,
  "",
);

const devHeaders = {
  "x-dev-user-id": "dev-user",
  "x-dev-tenant-id": "dev-tenant",
  "x-dev-email": "dev@clockin.local",
  "x-dev-name": "Dev User",
};

type Employee = {
  id: string;
  name: string;
  active: boolean;
};

const actions = ["IN", "OUT", "BREAK", "LUNCH"] as const;

export default function App() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeName, setEmployeeName] = useState("");
  const [pin, setPin] = useState("");
  const [punchType, setPunchType] = useState<(typeof actions)[number]>("IN");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastPunch, setLastPunch] = useState<{
    name: string;
    type: string;
    occurredAt: Date;
  } | null>(null);

  const activeEmployees = useMemo(
    () => employees.filter((emp) => emp.active),
    [employees],
  );

  const matchedEmployee = useMemo(() => {
    const normalized = employeeName.trim().toLowerCase();
    if (!normalized) return null;
    const exact = activeEmployees.find(
      (emp) => emp.name.toLowerCase() === normalized,
    );
    if (exact) return exact;
    const partialMatches = activeEmployees.filter((emp) =>
      emp.name.toLowerCase().includes(normalized),
    );
    if (partialMatches.length === 1) return partialMatches[0];
    return null;
  }, [employeeName, activeEmployees]);

  const fetchJson = useCallback(async (path: string, options?: RequestInit) => {
    const response = await fetch(`${apiBase}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...devHeaders,
        ...(options?.headers || {}),
      },
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data?.message || data?.error || "Request failed");
    }
    return response.json();
  }, []);

  const loadEmployees = useCallback(async () => {
    try {
      const data = (await fetchJson("/employees")) as { employees: Employee[] };
      setEmployees(data.employees || []);
    } catch {
      // ignore
    }
  }, [fetchJson]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const handlePunch = async () => {
    if (!employeeName.trim()) {
      setStatus("Enter a username first.");
      return;
    }
    if (!matchedEmployee) {
      setStatus("Employee not found. Use the full name.");
      return;
    }

    setLoading(true);
    setStatus(null);
    try {
      await fetchJson(`/employee-punches/${matchedEmployee.id}`, {
        method: "POST",
        body: JSON.stringify({ type: punchType, pin: pin || undefined }),
      });
      setStatus("Punch recorded.");
      setLastPunch({
        name: matchedEmployee.name,
        type: punchType,
        occurredAt: new Date(),
      });
      setPin("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Punch failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#0b101a", "#111c2b", "#151f30"]} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.brandRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>WS</Text>
            </View>
            <View>
              <Text style={styles.title}>ClockIn</Text>
              <Text style={styles.subtitle}>Workforce Time Tracking</Text>
            </View>
          </View>
          <>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Clock Station</Text>
                <View style={styles.systemRow}>
                  <View style={styles.systemDot} />
                  <Text style={styles.systemText}>System Online</Text>
                </View>
              </View>

              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter full name"
                value={employeeName}
                onChangeText={setEmployeeName}
                autoCorrect={false}
                autoCapitalize="words"
              />
              {employeeName.trim().length > 0 && (
                <View style={styles.verifyRow}>
                  <View
                    style={[
                      styles.verifyDot,
                      matchedEmployee ? styles.verifyDotOn : styles.verifyDotOff,
                    ]}
                  />
                  <Text style={styles.verifyText}>
                    {matchedEmployee
                      ? `${matchedEmployee.name} (Verified)`
                      : "No exact match yet."}
                  </Text>
                </View>
              )}

              <Text style={styles.label}>PIN</Text>
              <View style={styles.pinRow}>
                <TextInput
                  style={[styles.input, styles.pinInput]}
                  placeholder="••••"
                  secureTextEntry
                  keyboardType="number-pad"
                  value={pin}
                  onChangeText={setPin}
                  maxLength={4}
                />
                <View style={styles.pinIcon}>
                  <Text style={styles.pinIconText}>123</Text>
                </View>
              </View>

              <Text style={styles.label}>Action</Text>
              <View style={styles.actionRow}>
                {actions.map((action) => (
                  <TouchableOpacity
                    key={action}
                    style={
                      punchType === action
                        ? styles.actionButtonActive
                        : styles.actionButton
                    }
                    onPress={() => setPunchType(action)}
                  >
                    <Text
                      style={
                        punchType === action
                          ? styles.actionTextActive
                          : styles.actionText
                      }
                    >
                      {action}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {status && <Text style={styles.statusText}>{status}</Text>}

              <TouchableOpacity
                style={[styles.button, styles.primary]}
                onPress={handlePunch}
                disabled={loading}
              >
                <Text style={styles.primaryText}>
                  {loading ? "Saving..." : "Confirm Punch →"}
                </Text>
              </TouchableOpacity>
            </View>

            {lastPunch && (
              <View style={styles.deviceCard}>
                <Text style={styles.deviceTitle}>This Device</Text>
                <View style={styles.deviceRow}>
                  <View>
                    <Text style={styles.deviceName}>{lastPunch.name}</Text>
                    <Text style={styles.deviceDate}>
                      {lastPunch.occurredAt.toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.deviceStatus}>
                    <View style={styles.devicePill}>
                      <View
                        style={[
                          styles.deviceDot,
                          lastPunch.type === "IN"
                            ? styles.deviceDotOn
                            : styles.deviceDotOff,
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
            )}
            <Text style={styles.footer}>Powered by Websys Workforce</Text>
          </>
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
    padding: 22,
    paddingBottom: 48,
    gap: 20,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#ff8a3d",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  badgeText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#f9f4ea",
  },
  subtitle: {
    color: "rgba(232, 238, 249, 0.6)",
    marginTop: 4,
    fontSize: 13,
  },
  card: {
    backgroundColor: "#f4ece2",
    borderRadius: 26,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
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
    color: "#1f1a16",
  },
  systemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  systemDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#43b36d",
  },
  systemText: {
    fontSize: 11,
    color: "#3b3b3b",
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
    backgroundColor: "#fffaf6",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: "rgba(128, 110, 88, 0.2)",
  },
  pinRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pinInput: {
    flex: 1,
  },
  pinIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#f0e6d8",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(128, 110, 88, 0.2)",
  },
  pinIconText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#5c5b56",
  },
  verifyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  verifyDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
  },
  verifyDotOn: {
    backgroundColor: "#43b36d",
  },
  verifyDotOff: {
    backgroundColor: "#c2c2c2",
  },
  verifyText: {
    fontSize: 12,
    color: "#5c5b56",
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 6,
  },
  actionButton: {
    borderWidth: 1,
    borderColor: "rgba(128, 110, 88, 0.3)",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
  },
  actionButtonActive: {
    borderWidth: 1,
    borderColor: "#ff8a3d",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: "#ff8a3d",
  },
  actionText: {
    color: "#1a1a1a",
    fontSize: 12,
  },
  actionTextActive: {
    color: "#1a1a1a",
    fontWeight: "700",
    fontSize: 12,
  },
  statusText: {
    marginTop: 10,
    color: "#5c5b56",
  },
  button: {
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  primary: {
    backgroundColor: "#ff8a3d",
  },
  primaryText: {
    fontWeight: "700",
    color: "#1a1a1a",
    fontSize: 15,
  },
  deviceCard: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  deviceTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f9f4ea",
    marginBottom: 10,
  },
  deviceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  deviceName: {
    color: "#f9f4ea",
    fontWeight: "600",
    fontSize: 15,
  },
  deviceDate: {
    color: "rgba(249, 244, 234, 0.7)",
    fontSize: 12,
    marginTop: 4,
  },
  deviceStatus: {
    alignItems: "flex-end",
  },
  devicePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  devicePillText: {
    color: "#f9f4ea",
    fontWeight: "700",
    fontSize: 11,
  },
  deviceDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  deviceDotOn: {
    backgroundColor: "#43b36d",
  },
  deviceDotOff: {
    backgroundColor: "#f97316",
  },
  deviceTime: {
    color: "rgba(249, 244, 234, 0.7)",
    fontSize: 12,
    marginTop: 6,
  },
  statusIn: {
    color: "#baf2e7",
    fontWeight: "700",
  },
  statusOut: {
    color: "#ffd0c2",
    fontWeight: "700",
  },
  footer: {
    textAlign: "center",
    color: "rgba(249, 244, 234, 0.45)",
    fontSize: 12,
    marginTop: 16,
  },
});
