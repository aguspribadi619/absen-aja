import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { C } from "@/src/theme";

// Placeholder -- dibangun penuh (overlay info + tombol Share WA/Selesai)
// di section 5 poin 11. Buat sekarang cuma bukti poin 9-10 (kamera + hitung
// keterlambatan server-side) beneran nyambung ujung ke ujung.
export default function BuktiAbsensi() {
  const { photoUri, minutesLate, penaltyAmount, status } = useLocalSearchParams<{
    photoUri: string;
    minutesLate: string;
    penaltyAmount: string;
    status: string;
  }>();

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.body}>
        {photoUri ? <Image source={{ uri: photoUri }} style={styles.photo} /> : null}
        <Text style={styles.status}>
          {status === "terlambat" ? `Terlambat ${minutesLate} menit` : "Tepat waktu"}
        </Text>
        {Number(penaltyAmount) > 0 && <Text style={styles.penalty}>Denda: Rp{penaltyAmount}</Text>}
        <Text style={styles.placeholder}>Layar ini masih placeholder — desain final di poin 11.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.card },
  body: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 },
  photo: { width: 160, height: 160, borderRadius: 16, marginBottom: 12 },
  status: { fontSize: 18, fontWeight: "700", color: C.text },
  penalty: { fontSize: 14, color: C.danger },
  placeholder: { marginTop: 24, fontSize: 12, color: C.textMuted, textAlign: "center" },
});
