import React, { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { shouldAutoLogin } from "@/src/utils/session";
import { C } from "@/src/theme";

export default function Splash() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    (async () => {
      const role = await shouldAutoLogin();
      if (role === "owner") {
        router.replace("/dashboard-owner");
        return;
      }
      if (role === "karyawan") {
        router.replace("/dashboard-karyawan");
        return;
      }
      setCheckingSession(false);
    })();
  }, []);

  if (checkingSession) return <View style={styles.container} />;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.top}>
        <Image source={require("@/assets/images/logo_white.png")} style={styles.logo} resizeMode="contain" />
        <Text style={styles.tagline}>Absensi Gak Pake Ribet.</Text>
      </View>

      <View style={styles.spacer} />

      <View style={styles.actions}>
        <Pressable
          testID="btn-buat-usaha"
          onPress={() => router.push("/buat-usaha")}
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
        >
          <Text style={styles.primaryBtnText}>BUAT USAHA</Text>
        </Pressable>
        <Pressable
          testID="btn-sudah-punya-akun"
          onPress={() => router.push("/masuk")}
          style={({ pressed }) => [styles.outlineBtn, pressed && styles.pressed]}
        >
          <Text style={styles.outlineBtnText}>SUDAH PUNYA AKUN</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.navy, paddingHorizontal: 24 },
  top: { alignItems: "flex-start" },
  logo: { width: 220, height: 60, marginBottom: 12 },
  tagline: { fontSize: 15, color: "#FFFFFF", opacity: 0.9 },
  spacer: { flex: 1 },
  actions: { gap: 12 },
  primaryBtn: { backgroundColor: C.accent, borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  primaryBtnText: { color: C.navyDark, fontWeight: "700", fontSize: 15, letterSpacing: 0.3 },
  outlineBtn: { borderWidth: 1.5, borderColor: "#FFFFFF", borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  outlineBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15, letterSpacing: 0.3 },
  pressed: { opacity: 0.85 },
});
