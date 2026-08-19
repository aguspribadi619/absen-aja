import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { OwnerBottomNav } from "@/src/components/OwnerBottomNav";
import { C } from "@/src/theme";

// Placeholder -- belum ada poin section 5 Phase 1 yang eksplisit nugasin
// layar ini (mockup "Laporan Absensi (Owner)" itu Phase 2 per brief section 8:
// "jangan dikerjain dulu"). Tujuan sementara tombol/tab Absensi di Dashboard
// Owner, digarap kalau diminta.
export default function AbsensiOwner() {
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.body}>
        <Text style={styles.placeholder}>Absensi (Owner) — belum digarap di Phase 1.</Text>
      </View>
      <OwnerBottomNav active="absensi" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.card },
  body: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  placeholder: { color: C.textMuted, fontSize: 14, textAlign: "center" },
});
