import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/src/components/Icon";
import { authHeaders } from "@/src/utils/session";
import { formatIndonesianDate } from "@/src/utils/date";
import { C } from "@/src/theme";

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL;

type Me = {
  employee: { name: string };
  business: { name: string; work_start: string; work_end: string | null };
};

export default function DashboardKaryawan() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [attendedToday, setAttendedToday] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const headers = await authHeaders();
      const [meRes, todayRes] = await Promise.all([
        fetch(`${BACKEND}/api/employees/me`, { headers }),
        fetch(`${BACKEND}/api/attendance/today`, { headers }),
      ]);
      const meData = await meRes.json();
      const todayData = await todayRes.json();
      if (!meRes.ok) {
        setError(meData.detail || "Gagal memuat data");
        return;
      }
      setMe(meData);
      setAttendedToday(!!todayData.attended_today);
    } catch {
      setError("Gagal terhubung ke server");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.centerFill}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!me) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.centerFill}>
          <ActivityIndicator color={C.navy} />
        </View>
      </SafeAreaView>
    );
  }

  const shiftLabel = me.business.work_end
    ? `${me.business.work_start} – ${me.business.work_end}`
    : `${me.business.work_start} (jam pulang belum diatur)`;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.flex1}>
            <Text style={styles.greeting}>Halo, {me.employee.name} 👋</Text>
            <Text style={styles.bizName}>{me.business.name}</Text>
            <Text style={styles.date}>{formatIndonesianDate(new Date())}</Text>
          </View>
          <Pressable testID="btn-akun" onPress={() => router.push("/akun")} style={styles.bellWrap}>
            <Icon name="person-circle-outline" color="#fff" size={22} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Status hari ini</Text>
          <Text style={[styles.statusText, attendedToday ? styles.statusOk : styles.statusPending]}>
            {attendedToday ? "SUDAH ABSEN" : "BELUM ABSEN"}
          </Text>
          <Pressable
            testID="btn-absen-masuk"
            disabled={attendedToday}
            onPress={() => router.push("/absen-masuk")}
            style={({ pressed }) => [styles.absenBtn, attendedToday && styles.absenBtnDone, pressed && !attendedToday && styles.pressed]}
          >
            <Icon name={attendedToday ? "checkmark-circle" : "camera"} color="#fff" size={18} />
            <Text style={styles.absenBtnText}>{attendedToday ? "SUDAH ABSEN MASUK" : "ABSEN MASUK"}</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Jadwal Kerja</Text>
          <Text style={styles.shiftValue}>{shiftLabel}</Text>
        </View>

        <Pressable testID="link-riwayat-absensi" onPress={() => router.push("/riwayat-absensi")} style={styles.listRow}>
          <View style={styles.listIconWrap}>
            <Icon name="time-outline" color={C.navy} size={20} />
          </View>
          <View style={styles.flex1}>
            <Text style={styles.listTitle}>Riwayat Absensi</Text>
            <Text style={styles.listSubtitle}>Lihat catatan absensi Anda</Text>
          </View>
          <Icon name="chevron-forward" color={C.textMuted} size={18} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.card },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  errorText: { color: C.danger, fontSize: 14, textAlign: "center" },
  header: { backgroundColor: C.navy, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 },
  headerRow: { flexDirection: "row", alignItems: "flex-start" },
  flex1: { flex: 1 },
  greeting: { fontSize: 19, fontWeight: "700", color: "#fff", marginBottom: 4 },
  bizName: { fontSize: 13, color: "#fff", opacity: 0.9, marginBottom: 2 },
  date: { fontSize: 12, color: "#fff", opacity: 0.7 },
  bellWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  body: { padding: 20, marginTop: -16 },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 18, marginBottom: 14 },
  cardLabel: { fontSize: 12.5, color: C.textMuted, marginBottom: 8 },
  statusText: { fontSize: 20, fontWeight: "800", marginBottom: 16 },
  statusPending: { color: C.danger },
  statusOk: { color: C.success },
  absenBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.navy, borderRadius: 14, paddingVertical: 14 },
  absenBtnDone: { backgroundColor: C.success },
  absenBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  pressed: { opacity: 0.85 },
  shiftValue: { fontSize: 16, fontWeight: "700", color: C.text },
  listRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 16 },
  listIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
  listTitle: { fontSize: 14, fontWeight: "700", color: C.text, marginBottom: 2 },
  listSubtitle: { fontSize: 12, color: C.textMuted },
});
