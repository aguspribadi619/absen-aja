import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import { C } from "@/src/theme";

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL;

// Placeholder root screen for Phase 1 setup: hits the backend health check so
// "project setup" is actually verified end-to-end (Expo -> FastAPI -> Mongo),
// not just "expo start boots". Gets replaced by the real Splash screen next.
export default function Index() {
  const [status, setStatus] = useState<"checking" | "ok" | "error">("checking");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${BACKEND}/api/health`);
        const data = await res.json();
        setStatus(data.status === "ok" ? "ok" : "error");
      } catch {
        setStatus("error");
      }
    })();
  }, []);

  return (
    <View style={styles.container}>
      <Image source={require("@/assets/images/logo_vivid_blue.png")} style={styles.logo} resizeMode="contain" />
      <Text style={styles.tagline}>Absensi Gak Pake Ribet.</Text>
      <View style={styles.statusRow}>
        {status === "checking" && <ActivityIndicator color={C.navy} />}
        <Text style={[styles.statusText, status === "ok" && { color: C.success }, status === "error" && { color: C.danger }]}>
          {status === "checking" && "Mengecek koneksi backend..."}
          {status === "ok" && "Backend & database terhubung ✓"}
          {status === "error" && "Gagal konek ke backend"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", padding: 24 },
  logo: { width: 240, height: 80, marginBottom: 16 },
  tagline: { fontSize: 14, color: C.textMuted, marginBottom: 32 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusText: { fontSize: 14, color: C.text },
});
