import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Header } from "@/src/components/Header";
import { authHeaders } from "@/src/utils/session";
import { C } from "@/src/theme";

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL;

type Business = {
  name: string;
  address: string;
  logo_data_uri: string | null;
  token: string;
};

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// Read-only -- Poin 3 dari feedback tes device: sebelumnya gak ada cara sama
// sekali buat owner lihat lagi Token Usaha setelah "Usaha berhasil dibuat".
// Edit dari sini SENGAJA belum ada, itu scope Pengaturan (Phase 2).
export default function ProfilUsaha() {
  const [biz, setBiz] = useState<Business | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${BACKEND}/api/businesses/me`, { headers: await authHeaders() });
        const data = await res.json();
        if (!res.ok) {
          setError(data.detail || "Gagal memuat data usaha");
          return;
        }
        setBiz(data);
      } catch {
        setError("Gagal terhubung ke server");
      }
    })();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <Header title="Profil Usaha" />

      {error && (
        <View style={styles.centerFill}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!error && !biz && (
        <View style={styles.centerFill}>
          <ActivityIndicator color={C.navy} />
        </View>
      )}

      {biz && (
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.card}>
            <View style={styles.bizRow}>
              {biz.logo_data_uri ? (
                <Image source={{ uri: biz.logo_data_uri }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarInitials}>{initials(biz.name)}</Text>
                </View>
              )}
              <View style={styles.bizText}>
                <Text style={styles.bizName}>{biz.name}</Text>
                <Text style={styles.bizAddress}>{biz.address}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.card, styles.centerCard]}>
            <Text style={styles.cardLabel}>TOKEN USAHA</Text>
            <Text testID="txt-token-usaha" style={styles.token}>{biz.token}</Text>
            <Text style={styles.hint}>Dipakai karyawan buat login. Bagikan ke karyawan baru.</Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.card },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  errorText: { color: C.danger, fontSize: 14, textAlign: "center" },
  body: { padding: 20 },
  card: { width: "100%", borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 16, marginBottom: 14 },
  centerCard: { alignItems: "center" },
  bizRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: { backgroundColor: C.navyDark, alignItems: "center", justifyContent: "center" },
  avatarInitials: { color: "#fff", fontWeight: "700", fontSize: 15 },
  bizText: { flex: 1 },
  bizName: { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 2 },
  bizAddress: { fontSize: 12.5, color: C.textMuted, lineHeight: 17 },
  cardLabel: { fontSize: 11, color: C.textMuted, letterSpacing: 0.5, marginBottom: 6 },
  token: { fontSize: 26, fontWeight: "800", color: C.text, letterSpacing: 1.5, marginBottom: 8 },
  hint: { fontSize: 12, color: C.textMuted, textAlign: "center" },
});
