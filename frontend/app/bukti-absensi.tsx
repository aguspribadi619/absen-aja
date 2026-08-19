import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { Icon } from "@/src/components/Icon";
import { authHeaders } from "@/src/utils/session";
import { formatRupiah, formatWibShortDate, formatWibTime } from "@/src/utils/date";
import { C } from "@/src/theme";

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL;

type Me = {
  employee: { name: string };
  business: { name: string; work_start: string; work_end: string | null };
};

export default function BuktiAbsensi() {
  const router = useRouter();
  const { photoUri, minutesLate, penaltyAmount, status, serverTimestamp } = useLocalSearchParams<{
    photoUri: string;
    minutesLate: string;
    penaltyAmount: string;
    status: string;
    serverTimestamp: string;
  }>();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef<View>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${BACKEND}/api/employees/me`, { headers: await authHeaders() });
        const data = await res.json();
        if (!res.ok) {
          setError(data.detail || "Gagal memuat data");
          return;
        }
        setMe(data);
      } catch {
        setError("Gagal terhubung ke server");
      }
    })();
  }, []);

  const isLate = status === "terlambat" && Number(minutesLate) > 0;

  const share = async () => {
    setInfo(null);
    setSharing(true);
    try {
      const uri = await captureRef(cardRef, { format: "png", quality: 0.9 });
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        setInfo("Fitur share belum didukung di perangkat ini");
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: "image/png" });
    } catch {
      setInfo("Gagal menyiapkan gambar buat di-share");
    } finally {
      setSharing(false);
    }
  };

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
    ? `${me.business.work_start} - ${me.business.work_end}`
    : me.business.work_start;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.body}>
        <View ref={cardRef} collapsable={false} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderText}>ABSEN KARYAWAN</Text>
          </View>
          <View style={styles.cardBody}>
            <View style={styles.photoRow}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photo} />
              ) : (
                <View style={[styles.photo, styles.photoPlaceholder]}>
                  <Icon name="person" color={C.textMuted} size={32} />
                </View>
              )}
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>Nama</Text>
                <Text style={styles.infoValue}>{me.employee.name}</Text>
                <Text style={styles.infoLabel}>Usaha</Text>
                <Text style={styles.infoValue}>{me.business.name}</Text>
                <Text style={styles.infoLabel}>Jadwal Kerja</Text>
                <Text style={styles.infoValue}>{shiftLabel}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.metaRow}>
              <Icon name="calendar-outline" color={C.textMuted} size={17} />
              <Text style={styles.metaText}>{formatWibShortDate(serverTimestamp)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Icon name="time-outline" color={C.textMuted} size={17} />
              <Text style={styles.metaText}>{formatWibTime(serverTimestamp)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Icon name={isLate ? "warning" : "checkmark-circle"} color={isLate ? C.danger : C.success} size={17} />
              <Text style={[styles.statusText, isLate ? styles.statusLate : styles.statusOk]}>
                {isLate ? `TERLAMBAT ${minutesLate} MENIT` : "TEPAT WAKTU"}
              </Text>
            </View>
            {Number(penaltyAmount) > 0 && (
              <Text style={styles.penaltyText}>Denda: {formatRupiah(Number(penaltyAmount))}</Text>
            )}
          </View>
        </View>

        {info && <Text style={styles.infoBanner}>{info}</Text>}

        <Pressable testID="btn-share-wa" onPress={share} disabled={sharing} style={({ pressed }) => [styles.shareBtn, pressed && styles.pressed]}>
          {sharing ? <ActivityIndicator color="#fff" /> : (
            <>
              <Icon name="logo-whatsapp" color="#fff" size={18} />
              <Text style={styles.shareBtnText}>SHARE KE WHATSAPP</Text>
            </>
          )}
        </Pressable>

        <Pressable
          testID="btn-selesai"
          onPress={() => router.replace("/dashboard-karyawan")}
          style={({ pressed }) => [styles.doneBtn, pressed && styles.pressed]}
        >
          <Text style={styles.doneBtnText}>SELESAI</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.card },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  errorText: { color: C.danger, fontSize: 14, textAlign: "center" },
  body: { padding: 20 },
  card: { borderWidth: 1, borderColor: C.border, borderRadius: 18, overflow: "hidden", backgroundColor: C.card, marginBottom: 20 },
  cardHeader: { backgroundColor: C.navy, paddingVertical: 16, alignItems: "center" },
  cardHeaderText: { color: "#fff", fontWeight: "800", fontSize: 15, letterSpacing: 0.5 },
  cardBody: { padding: 18 },
  photoRow: { flexDirection: "row", gap: 14, marginBottom: 16 },
  photo: { width: 110, height: 110, borderRadius: 14 },
  photoPlaceholder: { backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
  infoCol: { flex: 1, justifyContent: "space-between" },
  infoLabel: { fontSize: 11, color: C.textMuted, marginBottom: 1 },
  infoValue: { fontSize: 14, fontWeight: "700", color: C.text, marginBottom: 6 },
  divider: { height: 1, backgroundColor: C.border, marginBottom: 14 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  metaText: { fontSize: 14, color: C.text },
  statusText: { fontSize: 14, fontWeight: "800" },
  statusLate: { color: C.danger },
  statusOk: { color: C.success },
  penaltyText: { fontSize: 13, color: C.danger, marginTop: -2, marginLeft: 27 },
  infoBanner: { color: C.textMuted, fontSize: 12.5, textAlign: "center", marginBottom: 12 },
  shareBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.success, borderRadius: 14, paddingVertical: 15, marginBottom: 12 },
  shareBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  doneBtn: { borderWidth: 1.5, borderColor: C.navy, borderRadius: 14, paddingVertical: 15, alignItems: "center" },
  doneBtnText: { color: C.navy, fontWeight: "700", fontSize: 14 },
  pressed: { opacity: 0.85 },
});
