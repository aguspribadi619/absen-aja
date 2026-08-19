import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/src/components/Icon";
import { OwnerBottomNav } from "@/src/components/OwnerBottomNav";
import { authHeaders } from "@/src/utils/session";
import { formatIndonesianDate, formatRupiah } from "@/src/utils/date";
import { C } from "@/src/theme";

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL;

type Dashboard = {
  business: { name: string };
  hadir: number;
  terlambat: number;
  belum_absen: number;
  total_denda_hari_ini: number;
};

export default function DashboardOwner() {
  const router = useRouter();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`${BACKEND}/api/dashboard/owner`, { headers: await authHeaders() });
      const json = await res.json();
      if (!res.ok) {
        setError(json.detail || "Gagal memuat data");
        return;
      }
      setData(json);
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

  if (!data) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.centerFill}>
          <ActivityIndicator color={C.navy} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.flex1}>
            <Text style={styles.bizName}>{data.business.name}</Text>
            <Text style={styles.date}>{formatIndonesianDate(new Date())}</Text>
          </View>
          <Pressable testID="btn-akun" onPress={() => router.push("/akun")} style={styles.bellWrap}>
            <Icon name="person-circle-outline" color="#fff" size={22} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.sectionLabel}>Hari Ini</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, styles.statHadir]}>{data.hadir}</Text>
            <Text style={styles.statLabel}>Hadir</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, styles.statTerlambat]}>{data.terlambat}</Text>
            <Text style={styles.statLabel}>Terlambat</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, styles.statBelum]}>{data.belum_absen}</Text>
            <Text style={styles.statLabel}>Belum Absen</Text>
          </View>
        </View>

        <View style={styles.dendaCard}>
          <Text style={styles.dendaLabel}>Total Denda Hari Ini</Text>
          <Text style={styles.dendaValue}>{formatRupiah(data.total_denda_hari_ini)}</Text>
        </View>

        <Text style={styles.sectionLabel}>Menu</Text>
        <View style={styles.menuGrid}>
          <Pressable testID="menu-karyawan" onPress={() => router.replace("/karyawan")} style={styles.menuTile}>
            <View style={styles.menuIconWrap}>
              <Icon name="people" color={C.navy} size={22} />
            </View>
            <Text style={styles.menuLabel}>Karyawan</Text>
          </Pressable>
          <Pressable testID="menu-absensi" onPress={() => router.replace("/absensi-owner")} style={styles.menuTile}>
            <View style={styles.menuIconWrap}>
              <Icon name="time" color={C.navy} size={22} />
            </View>
            <Text style={styles.menuLabel}>Absensi</Text>
          </Pressable>
        </View>

        <Pressable testID="link-profil-usaha" onPress={() => router.push("/profil-usaha")} style={styles.listRow}>
          <View style={styles.listIconWrap}>
            <Icon name="business-outline" color={C.navy} size={20} />
          </View>
          <View style={styles.flex1}>
            <Text style={styles.listTitle}>Profil Usaha</Text>
            <Text style={styles.listSubtitle}>Lihat nama, alamat, & Token Usaha</Text>
          </View>
          <Icon name="chevron-forward" color={C.textMuted} size={18} />
        </Pressable>
      </ScrollView>

      <OwnerBottomNav active="dashboard" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.card },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  errorText: { color: C.danger, fontSize: 14, textAlign: "center" },
  header: { backgroundColor: C.navy, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 },
  headerRow: { flexDirection: "row", alignItems: "flex-start" },
  flex1: { flex: 1 },
  bizName: { fontSize: 19, fontWeight: "700", color: "#fff", marginBottom: 4 },
  date: { fontSize: 12, color: "#fff", opacity: 0.75 },
  bellWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  body: { padding: 20, marginTop: -12 },
  sectionLabel: { fontSize: 13, fontWeight: "700", color: C.text, marginBottom: 10, marginTop: 4 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  statBox: { flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  statNumber: { fontSize: 22, fontWeight: "800", marginBottom: 2 },
  statHadir: { color: C.success },
  statTerlambat: { color: C.warning },
  statBelum: { color: C.neutral },
  statLabel: { fontSize: 11.5, color: C.textMuted },
  dendaCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 16, marginBottom: 20 },
  dendaLabel: { fontSize: 12, color: C.textMuted, marginBottom: 4 },
  dendaValue: { fontSize: 20, fontWeight: "800", color: C.text },
  menuGrid: { flexDirection: "row", gap: 12, marginBottom: 14 },
  menuTile: { flex: 1, alignItems: "center", gap: 8, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingVertical: 16 },
  menuIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
  menuLabel: { fontSize: 12.5, fontWeight: "600", color: C.text },
  listRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 16 },
  listIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
  listTitle: { fontSize: 14, fontWeight: "700", color: C.text, marginBottom: 2 },
  listSubtitle: { fontSize: 12, color: C.textMuted },
});
