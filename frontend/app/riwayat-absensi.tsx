import React, { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Header } from "@/src/components/Header";
import { authHeaders } from "@/src/utils/session";
import { formatRupiah, formatWibDayBox, formatWibHM } from "@/src/utils/date";
import { C } from "@/src/theme";

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL;

type Record = {
  id: string;
  server_timestamp: string;
  minutes_late: number;
  penalty_amount: number;
  status: "terlambat" | "tepat_waktu";
};

export default function RiwayatAbsensi() {
  const [records, setRecords] = useState<Record[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // "List sederhana, belum perlu filter bulan" (poin 13) -- balikin semua
  // record apa adanya, gak ada baris "Tidak hadir" sintetis buat hari kosong.
  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`${BACKEND}/api/attendance/me`, { headers: await authHeaders() });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Gagal memuat riwayat absensi");
        return;
      }
      setRecords(data);
    } catch {
      setError("Gagal terhubung ke server");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const totalHadir = records?.length ?? 0;
  const totalTerlambat = records?.filter((r) => r.status === "terlambat").length ?? 0;
  const totalDenda = records?.reduce((sum, r) => sum + r.penalty_amount, 0) ?? 0;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <Header title="Riwayat Absensi" />

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {records === null && !error && (
        <View style={styles.centerFill}>
          <ActivityIndicator color={C.navy} />
        </View>
      )}

      {records !== null && records.length === 0 && (
        <View style={styles.centerFill}>
          <Text style={styles.emptyText}>Belum ada riwayat absensi.</Text>
        </View>
      )}

      <FlatList
        data={records || []}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const box = formatWibDayBox(item.server_timestamp);
          const late = item.status === "terlambat";
          return (
            <View style={styles.row}>
              <View style={styles.dateBox}>
                <Text style={styles.dateNumber}>{box.day}</Text>
                <Text style={styles.dateAbbr}>{box.abbr}</Text>
              </View>
              <Text style={styles.time}>{formatWibHM(item.server_timestamp)}</Text>
              <View style={[styles.badge, late ? styles.badgeLate : styles.badgeOk]}>
                <Text style={[styles.badgeText, late ? styles.badgeTextLate : styles.badgeTextOk]}>
                  {late ? `Terlambat ${item.minutes_late} menit` : "Tepat waktu"}
                </Text>
              </View>
            </View>
          );
        }}
      />

      {records !== null && records.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.footerCol}>
            <Text style={styles.footerLabel}>Total Hadir</Text>
            <Text style={[styles.footerValue, styles.footerHadir]}>{totalHadir} hari</Text>
          </View>
          <View style={styles.footerCol}>
            <Text style={styles.footerLabel}>Terlambat</Text>
            <Text style={[styles.footerValue, styles.footerTerlambat]}>{totalTerlambat} hari</Text>
          </View>
          <View style={styles.footerCol}>
            <Text style={styles.footerLabel}>Total Denda</Text>
            <Text style={[styles.footerValue, styles.footerDenda]}>{formatRupiah(totalDenda)}</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.card },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  errorBanner: { backgroundColor: "#FDECEC", borderRadius: 10, padding: 12, marginHorizontal: 20, marginBottom: 8 },
  errorText: { color: C.danger, fontSize: 13 },
  emptyText: { color: C.textMuted, fontSize: 13, textAlign: "center" },
  list: { padding: 20, gap: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.bg },
  dateBox: { width: 46, height: 46, borderRadius: 10, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
  dateNumber: { fontSize: 16, fontWeight: "800", color: C.text, lineHeight: 19 },
  dateAbbr: { fontSize: 10.5, color: C.textMuted },
  time: { fontSize: 14, color: C.text, width: 56 },
  badge: { flex: 1, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, alignItems: "center" },
  badgeLate: { backgroundColor: "#FDECEC" },
  badgeOk: { backgroundColor: "rgba(31,169,113,0.12)" },
  badgeText: { fontSize: 12, fontWeight: "600" },
  badgeTextLate: { color: C.danger },
  badgeTextOk: { color: C.success },
  footer: { flexDirection: "row", borderTopWidth: 1, borderTopColor: C.border, paddingVertical: 16 },
  footerCol: { flex: 1, alignItems: "center" },
  footerLabel: { fontSize: 11.5, color: C.textMuted, marginBottom: 4 },
  footerValue: { fontSize: 15, fontWeight: "800" },
  footerHadir: { color: C.success },
  footerTerlambat: { color: C.warning },
  footerDenda: { color: C.danger },
});
