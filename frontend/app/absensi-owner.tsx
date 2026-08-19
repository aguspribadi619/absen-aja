import React, { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Header } from "@/src/components/Header";
import { Icon } from "@/src/components/Icon";
import { OwnerBottomNav } from "@/src/components/OwnerBottomNav";
import { authHeaders } from "@/src/utils/session";
import { formatIndonesianDate, formatWibHM } from "@/src/utils/date";
import { C } from "@/src/theme";

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL;

type AttendanceItem = {
  employee_id: string;
  employee_name: string;
  status: "terlambat" | "tepat_waktu" | "belum_absen";
  server_timestamp: string | null;
  minutes_late: number;
};

type ByDateResponse = {
  date: string;
  items: AttendanceItem[];
  hadir: number;
  terlambat: number;
  belum_absen: number;
};

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shiftDays(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + delta);
}

export default function AbsensiOwner() {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [data, setData] = useState<ByDateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dateStr = toDateStr(selectedDate);
  const isToday = dateStr === toDateStr(new Date());

  const load = useCallback(async (d: string) => {
    setError(null);
    setData(null);
    try {
      const res = await fetch(`${BACKEND}/api/attendance/by-date?date=${d}`, { headers: await authHeaders() });
      const json = await res.json();
      if (!res.ok) {
        setError(json.detail || "Gagal memuat data absensi");
        return;
      }
      setData(json);
    } catch {
      setError("Gagal terhubung ke server");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(dateStr);
    }, [load, dateStr]),
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <Header title="Absensi" />

      <View style={styles.dateNav}>
        <Pressable testID="btn-tanggal-sebelumnya" onPress={() => setSelectedDate((d) => shiftDays(d, -1))} style={styles.dateNavBtn} hitSlop={8}>
          <Icon name="chevron-back" color={C.navy} size={20} />
        </Pressable>
        <View style={styles.dateLabelWrap}>
          {isToday && <Text style={styles.dateBadge}>HARI INI</Text>}
          <Text style={styles.dateLabel}>{formatIndonesianDate(selectedDate)}</Text>
        </View>
        <Pressable
          testID="btn-tanggal-berikutnya"
          onPress={() => !isToday && setSelectedDate((d) => shiftDays(d, 1))}
          disabled={isToday}
          style={[styles.dateNavBtn, isToday && styles.dateNavBtnDisabled]}
          hitSlop={8}
        >
          <Icon name="chevron-forward" color={isToday ? C.textMuted : C.navy} size={20} />
        </Pressable>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!error && !data && (
        <View style={styles.centerFill}>
          <ActivityIndicator color={C.navy} />
        </View>
      )}

      {data && (
        <>
          <View style={styles.summaryRow}>
            <View style={styles.summaryBox}>
              <Text style={[styles.summaryNumber, styles.summaryHadir]}>{data.hadir}</Text>
              <Text style={styles.summaryLabel}>Hadir</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={[styles.summaryNumber, styles.summaryTerlambat]}>{data.terlambat}</Text>
              <Text style={styles.summaryLabel}>Terlambat</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={[styles.summaryNumber, styles.summaryBelum]}>{data.belum_absen}</Text>
              <Text style={styles.summaryLabel}>Belum Absen</Text>
            </View>
          </View>

          {data.items.length === 0 ? (
            <View style={styles.centerFill}>
              <Text style={styles.emptyText}>Belum ada karyawan.</Text>
            </View>
          ) : (
            <FlatList
              data={data.items}
              keyExtractor={(i) => i.employee_id}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => {
                const badgeStyle =
                  item.status === "terlambat" ? styles.badgeLate : item.status === "tepat_waktu" ? styles.badgeOk : styles.badgeNone;
                const badgeTextStyle =
                  item.status === "terlambat" ? styles.badgeTextLate : item.status === "tepat_waktu" ? styles.badgeTextOk : styles.badgeTextNone;
                const badgeLabel =
                  item.status === "terlambat"
                    ? `Terlambat ${item.minutes_late} menit`
                    : item.status === "tepat_waktu"
                    ? "Tepat waktu"
                    : "Belum absen";
                return (
                  <View style={styles.row}>
                    <View style={styles.avatar}>
                      <Icon name="person" color={C.navy} size={18} />
                    </View>
                    <Text style={styles.rowName} numberOfLines={1}>{item.employee_name}</Text>
                    {item.server_timestamp && <Text style={styles.rowTime}>{formatWibHM(item.server_timestamp)}</Text>}
                    <View style={[styles.badge, badgeStyle]}>
                      <Text style={[styles.badgeText, badgeTextStyle]}>{badgeLabel}</Text>
                    </View>
                  </View>
                );
              }}
            />
          )}
        </>
      )}

      <OwnerBottomNav active="absensi" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.card },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  errorBanner: { backgroundColor: "#FDECEC", borderRadius: 10, padding: 12, marginHorizontal: 20, marginBottom: 8 },
  errorText: { color: C.danger, fontSize: 13 },
  emptyText: { color: C.textMuted, fontSize: 13, textAlign: "center" },
  dateNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingBottom: 8 },
  dateNavBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: C.bg },
  dateNavBtnDisabled: { opacity: 0.5 },
  dateLabelWrap: { alignItems: "center" },
  dateBadge: { fontSize: 10, fontWeight: "700", color: C.navy, letterSpacing: 0.5, marginBottom: 2 },
  dateLabel: { fontSize: 13.5, fontWeight: "700", color: C.text },
  summaryRow: { flexDirection: "row", gap: 10, paddingHorizontal: 20, marginBottom: 14 },
  summaryBox: { flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingVertical: 12, alignItems: "center" },
  summaryNumber: { fontSize: 18, fontWeight: "800", marginBottom: 2 },
  summaryHadir: { color: C.success },
  summaryTerlambat: { color: C.warning },
  summaryBelum: { color: C.neutral },
  summaryLabel: { fontSize: 11, color: C.textMuted },
  list: { paddingHorizontal: 20, paddingBottom: 20, gap: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 12 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
  rowName: { flex: 1, fontSize: 13.5, fontWeight: "600", color: C.text },
  rowTime: { fontSize: 12.5, color: C.textMuted },
  badge: { borderRadius: 8, paddingVertical: 5, paddingHorizontal: 9 },
  badgeLate: { backgroundColor: "#FDECEC" },
  badgeOk: { backgroundColor: "rgba(31,169,113,0.12)" },
  badgeNone: { backgroundColor: "rgba(138,147,166,0.12)" },
  badgeText: { fontSize: 11, fontWeight: "600" },
  badgeTextLate: { color: C.danger },
  badgeTextOk: { color: C.success },
  badgeTextNone: { color: C.neutral },
});
