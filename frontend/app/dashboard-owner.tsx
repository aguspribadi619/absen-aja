import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { getActiveBusinessId } from "@/src/utils/session";
import { C } from "@/src/theme";

// Placeholder -- dibangun penuh di section 5 poin 12 (Dashboard Owner).
// Link "Kelola Karyawan" cuma sementara biar poin 6 bisa dites tanpa
// nunggu dashboard aslinya jadi; bakal diganti menu grid asli nanti.
export default function DashboardOwner() {
  const router = useRouter();
  const [businessId, setBusinessId] = useState<string | null>(null);

  useEffect(() => {
    (async () => setBusinessId(await getActiveBusinessId()))();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.body}>
        <Text style={styles.placeholder}>Dashboard Owner — segera dibangun.</Text>
        {businessId && (
          <Pressable
            testID="link-kelola-karyawan"
            onPress={() => router.push({ pathname: "/karyawan", params: { businessId } })}
            style={styles.link}
          >
            <Text style={styles.linkText}>Kelola Karyawan (sementara)</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.card },
  body: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 16 },
  placeholder: { color: C.textMuted, fontSize: 14, textAlign: "center" },
  link: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: C.border },
  linkText: { color: C.navy, fontWeight: "600", fontSize: 13 },
});
