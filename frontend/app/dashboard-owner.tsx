import React, { useCallback, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/src/components/Icon";
import { OwnerBottomNav } from "@/src/components/OwnerBottomNav";
import { authHeaders } from "@/src/utils/session";
import { formatIndonesianDate, formatRupiah, formatWibHM, greetingByTime } from "@/src/utils/date";
import { C } from "@/src/theme";

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL;

const BANNER_SOURCE = require("@/assets/images/banner-dashboard.png");

type RecentActivity = {
  employee_id: string;
  employee_name: string;
  server_timestamp: string;
  status: "terlambat" | "tepat_waktu";
};

type Dashboard = {
  business: { name: string; owner_name?: string | null };
  hadir: number;
  terlambat: number;
  belum_absen: number;
  total_denda_hari_ini: number;
  recent_activity: RecentActivity[];
};

export default function DashboardOwner() {
  const router = useRouter();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDenda, setShowDenda] = useState(false);

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

  const greeting = greetingByTime();
  const ownerName = data.business.owner_name;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          <Image
            source={BANNER_SOURCE}
            style={styles.heroBg}
            resizeMode="cover"
          />
          <View style={styles.heroContent}>
            <View style={styles.heroTopRow}>
              <View style={styles.flex1} />
              <Pressable testID="btn-akun" onPress={() => router.push("/akun")} style={styles.bellWrap}>
                <Icon name="person-circle-outline" color={C.navy} size={22} />
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.body}>
        <Text style={styles.greeting} numberOfLines={1}>
          {greeting}{ownerName ? `, ${ownerName}` : ""}
        </Text>
        <Text style={styles.bizName} numberOfLines={1}>{data.business.name}</Text>
        <Text style={styles.date}>{formatIndonesianDate(new Date())}</Text>

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
          <Pressable testID="menu-denda" onPress={() => setShowDenda(true)} style={styles.menuTile}>
            <View style={styles.menuIconWrap}>
              <Icon name="cash" color={C.navy} size={22} />
            </View>
            <Text style={styles.menuLabel}>Denda</Text>
          </Pressable>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>Aktivitas Terbaru</Text>
          <Pressable testID="link-lihat-semua-aktivitas" onPress={() => router.replace("/absensi-owner")}>
            <Text style={styles.linkText}>Lihat Semua</Text>
          </Pressable>
        </View>

        {data.recent_activity.length === 0 ? (
          <View style={styles.emptyActivity}>
            <Text style={styles.emptyActivityText}>Belum ada karyawan yang absen hari ini.</Text>
          </View>
        ) : (
          <View style={styles.activityCard}>
            {data.recent_activity.map((item, idx) => {
              const late = item.status === "terlambat";
              return (
                <View
                  key={item.employee_id + item.server_timestamp}
                  style={[styles.activityRow, idx < data.recent_activity.length - 1 && styles.activityRowDivider]}
                >
                  <View style={[styles.activityDot, late ? styles.activityDotLate : styles.activityDotOk]} />
                  <Text style={styles.activityName} numberOfLines={1}>{item.employee_name}</Text>
                  <Text style={[styles.activityStatus, late ? styles.activityStatusLate : styles.activityStatusOk]}>
                    {late ? "Terlambat" : "Tepat waktu"}
                  </Text>
                  <Text style={styles.activityTime}>{formatWibHM(item.server_timestamp)}</Text>
                </View>
              );
            })}
          </View>
        )}
        </View>
      </ScrollView>

      <Modal visible={showDenda} transparent animationType="fade" onRequestClose={() => setShowDenda(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowDenda(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalLabel}>TOTAL DENDA HARI INI</Text>
            <Text style={styles.modalValue}>{formatRupiah(data.total_denda_hari_ini)}</Text>
            <Text style={styles.modalHint}>Pengaturan tarif & tier denda belum tersedia.</Text>
            <Pressable testID="btn-tutup-denda" onPress={() => setShowDenda(false)} style={styles.modalBtn}>
              <Text style={styles.modalBtnText}>Tutup</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <OwnerBottomNav active="dashboard" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.card },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  errorText: { color: C.danger, fontSize: 14, textAlign: "center" },
  scrollContent: { paddingBottom: 20 },
  flex1: { flex: 1 },
  hero: { width: "100%", aspectRatio: 2, overflow: "hidden", position: "relative", backgroundColor: C.bg },
  heroBg: { width: "100%", height: "100%" },
  heroContent: { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 16 },
  heroTopRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  greeting: { fontSize: 12.5, fontWeight: "700", color: C.navy, marginTop: 4, marginBottom: 2 },
  bizName: { fontSize: 19, fontWeight: "800", color: C.text, marginBottom: 3 },
  date: { fontSize: 12, color: C.textMuted, marginBottom: 4 },
  bellWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center" },
  body: { padding: 20 },
  sectionLabel: { fontSize: 13, fontWeight: "700", color: C.text, marginBottom: 10, marginTop: 4 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  linkText: { color: C.navy, fontWeight: "600", fontSize: 12.5 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  statNumber: { fontSize: 22, fontWeight: "800", marginBottom: 2 },
  statHadir: { color: C.success },
  statTerlambat: { color: C.warning },
  statBelum: { color: C.neutral },
  statLabel: { fontSize: 11.5, color: C.textMuted },
  menuGrid: { flexDirection: "row", gap: 10, marginBottom: 20 },
  menuTile: { flex: 1, alignItems: "center", gap: 8, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingVertical: 16 },
  menuIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
  menuLabel: { fontSize: 12.5, fontWeight: "600", color: C.text },
  emptyActivity: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 20, alignItems: "center" },
  emptyActivityText: { color: C.textMuted, fontSize: 13 },
  activityCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, paddingHorizontal: 16 },
  activityRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 13 },
  activityRowDivider: { borderBottomWidth: 1, borderBottomColor: C.bg },
  activityDot: { width: 8, height: 8, borderRadius: 4 },
  activityDotOk: { backgroundColor: C.success },
  activityDotLate: { backgroundColor: C.danger },
  activityName: { flex: 1, fontSize: 13.5, fontWeight: "600", color: C.text },
  activityStatus: { fontSize: 11.5, fontWeight: "600" },
  activityStatusOk: { color: C.success },
  activityStatusLate: { color: C.danger },
  activityTime: { fontSize: 12.5, color: C.textMuted, width: 44, textAlign: "right" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { width: "100%", backgroundColor: "#fff", borderRadius: 16, padding: 20, alignItems: "center" },
  modalLabel: { fontSize: 11, color: C.textMuted, letterSpacing: 0.5, marginBottom: 6 },
  modalValue: { fontSize: 26, fontWeight: "800", color: C.text, marginBottom: 8 },
  modalHint: { fontSize: 12, color: C.textMuted, textAlign: "center", marginBottom: 16 },
  modalBtn: { alignSelf: "stretch", backgroundColor: C.navy, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  modalBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
