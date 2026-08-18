import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Header } from "@/src/components/Header";
import { C } from "@/src/theme";

// Placeholder -- dibangun penuh (styling sesuai mockup, tombol Ubah Token,
// Masuk ke Dashboard) di section 5 poin 4. Untuk sekarang cuma buat bukti
// poin 3 (Buat Usaha) beneran nyimpen ke DB & balikin token.
export default function KonfirmasiUsaha() {
  const { name, token, employeeLimit } = useLocalSearchParams<{ name: string; token: string; employeeLimit: string }>();

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <Header title="Konfirmasi Usaha" />
      <View style={styles.body}>
        <Text style={styles.ok}>Usaha "{name}" berhasil dibuat ✓</Text>
        <Text style={styles.tokenLabel}>Token Usaha</Text>
        <Text testID="txt-token" style={styles.token}>{token}</Text>
        <Text style={styles.muted}>Maksimal {employeeLimit} karyawan</Text>
        <Text style={styles.placeholder}>Layar ini masih placeholder — desain final di poin 4.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.card },
  body: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 6 },
  ok: { fontSize: 15, color: C.success, fontWeight: "700", marginBottom: 12 },
  tokenLabel: { fontSize: 12, color: C.textMuted },
  token: { fontSize: 28, fontWeight: "800", color: C.navy, letterSpacing: 2, marginBottom: 8 },
  muted: { fontSize: 13, color: C.textMuted },
  placeholder: { marginTop: 24, fontSize: 12, color: C.textMuted, textAlign: "center" },
});
