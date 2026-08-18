import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { PinField } from "@/src/components/PinField";
import { Icon } from "@/src/components/Icon";
import { storage } from "@/src/utils/storage";
import { C } from "@/src/theme";

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL;
const SESSION_KEY = "absen_owner_business_id";

export default function LoginOwner() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [pin, setPin] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setError(null);
    setInfo(null);
    if (!identifier.trim()) return setError("Nomor HP/Email wajib diisi");
    if (!pin) return setError("PIN wajib diisi");
    setSubmitting(true);
    try {
      const res = await fetch(`${BACKEND}/api/owners/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Gagal masuk, coba lagi");
        return;
      }
      if (rememberMe) await storage.secureSet(SESSION_KEY, data.id);
      router.replace("/dashboard-owner");
    } catch {
      setError("Gagal terhubung ke server, cek koneksi kamu");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Login Owner</Text>

        <View style={styles.avatarWrap}>
          <Icon name="person" color={C.navy} size={32} />
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>Nomor HP / Email</Text>
          <TextInput
            testID="input-identifier"
            style={styles.input}
            value={identifier}
            onChangeText={setIdentifier}
            placeholder="agus@warkopsejagat.com"
            placeholderTextColor={C.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <PinField testID="input-pin" label="PIN / Password" value={pin} onChangeText={setPin} placeholder="PIN kamu" />

        <View style={styles.rowBetween}>
          <Pressable testID="toggle-ingat-saya" onPress={() => setRememberMe((v) => !v)} style={styles.checkboxRow}>
            <View style={[styles.checkbox, rememberMe && styles.checkboxOn]}>
              {rememberMe && <Icon name="checkmark" color="#fff" size={13} />}
            </View>
            <Text style={styles.checkboxLabel}>Ingat saya</Text>
          </Pressable>
          <Pressable testID="link-lupa-pin" onPress={() => setInfo("Fitur reset PIN belum tersedia. Hubungi support kalau lupa PIN.")}>
            <Text style={styles.linkText}>Lupa PIN?</Text>
          </Pressable>
        </View>

        {info && <Text style={styles.infoText}>{info}</Text>}

        <Pressable testID="btn-masuk" onPress={submit} disabled={submitting} style={({ pressed }) => [styles.submitBtn, pressed && styles.pressed]}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>MASUK</Text>}
        </Pressable>

        <Pressable testID="link-buat-usaha" onPress={() => router.push("/buat-usaha")} style={styles.footerLink}>
          <Text style={styles.footerText}>
            Belum punya akun? <Text style={styles.linkText}>Buat usaha</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.card },
  body: { padding: 24, paddingTop: 32 },
  title: { fontSize: 19, fontWeight: "700", color: C.text, textAlign: "center", marginBottom: 24 },
  avatarWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 28 },
  errorBanner: { backgroundColor: "#FDECEC", borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText: { color: C.danger, fontSize: 13 },
  infoText: { color: C.textMuted, fontSize: 12.5, marginTop: -6, marginBottom: 12 },
  field: { marginBottom: 18 },
  label: { fontSize: 12.5, color: C.textMuted, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: C.text },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  checkboxRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  checkboxOn: { backgroundColor: C.navy, borderColor: C.navy },
  checkboxLabel: { fontSize: 13, color: C.text },
  linkText: { color: C.navy, fontWeight: "600", fontSize: 13 },
  submitBtn: { backgroundColor: C.navy, borderRadius: 14, paddingVertical: 16, alignItems: "center", marginBottom: 20 },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 15, letterSpacing: 0.3 },
  pressed: { opacity: 0.85 },
  footerLink: { alignItems: "center" },
  footerText: { fontSize: 13, color: C.textMuted },
});
