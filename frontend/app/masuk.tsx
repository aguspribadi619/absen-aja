import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Header } from "@/src/components/Header";
import { Icon } from "@/src/components/Icon";
import { C } from "@/src/theme";

// Mockup cuma punya tombol "Sudah Punya Akun" di Splash tanpa pilihan
// Owner/Karyawan eksplisit -- layar ini nentuin mau login sebagai siapa,
// baru lanjut ke form Login Owner atau Login Karyawan masing-masing.
export default function Masuk() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <Header title="Masuk" />
      <View style={styles.body}>
        <Pressable
          testID="pilih-owner"
          onPress={() => router.push("/login-owner")}
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        >
          <View style={styles.iconWrap}>
            <Icon name="storefront-outline" color="#fff" size={22} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Saya Owner</Text>
            <Text style={styles.cardDesc}>Kelola usaha, karyawan, dan lihat semua data absensi</Text>
          </View>
          <Icon name="chevron-forward" color={C.textMuted} size={20} />
        </Pressable>

        <Pressable
          testID="pilih-karyawan"
          onPress={() => router.push("/login-karyawan")}
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        >
          <View style={styles.iconWrap}>
            <Icon name="person-outline" color="#fff" size={22} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Saya Karyawan</Text>
            <Text style={styles.cardDesc}>Absen masuk/pulang dan lihat riwayat sendiri</Text>
          </View>
          <Icon name="chevron-forward" color={C.textMuted} size={20} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.card },
  body: { padding: 20, gap: 14 },
  card: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 16 },
  iconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.navy, alignItems: "center", justifyContent: "center" },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 2 },
  cardDesc: { fontSize: 12.5, color: C.textMuted, lineHeight: 17 },
  pressed: { opacity: 0.75 },
});
