import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { PinField } from "@/src/components/PinField";
import { Icon } from "@/src/components/Icon";
import { setKaryawanSession } from "@/src/utils/session";
import { C } from "@/src/theme";

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL;

// Belum ada di mockup -- ikutin pola Login Owner persis (card putih, judul
// center tanpa header/back-arrow, avatar bulat, label di atas input, tombol
// navy full-width). Field-nya Token Usaha + PIN, bukan dropdown pilih usaha
// (aturan keras section 9).
export default function LoginKaryawan() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [pin, setPin] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setError(null);
    if (!token.trim()) return setError("Token Usaha wajib diisi");
    if (!pin) return setError("PIN wajib diisi");
    setSubmitting(true);
    try {
      const res = await fetch(`${BACKEND}/api/employees/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim().toUpperCase(), pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Gagal masuk, coba lagi");
        return;
      }
      await setKaryawanSession(data.token, data.business.id, data.employee.id, rememberMe);
      router.dismissAll();
      router.replace("/dashboard-karyawan");
    } catch {
      setError("Gagal terhubung ke server, cek koneksi kamu");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Login Karyawan</Text>

        <View style={styles.avatarWrap}>
          <Icon name="person" color={C.navy} size={32} />
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>Token Usaha</Text>
          <TextInput
            testID="input-token"
            style={styles.input}
            value={token}
            onChangeText={(t) => setToken(t.toUpperCase())}
            placeholder="Contoh: WARKOP01"
            placeholderTextColor={C.textMuted}
            autoCapitalize="characters"
          />
          <Text style={styles.hint}>Tanya Token Usaha ke pemilik usaha kamu</Text>
        </View>

        <PinField testID="input-pin" label="PIN" value={pin} onChangeText={setPin} placeholder="PIN kamu" />

        <Pressable testID="toggle-ingat-saya" onPress={() => setRememberMe((v) => !v)} style={styles.checkboxRow}>
          <View style={[styles.checkbox, rememberMe && styles.checkboxOn]}>
            {rememberMe && <Icon name="checkmark" color="#fff" size={13} />}
          </View>
          <Text style={styles.checkboxLabel}>Ingat saya</Text>
        </Pressable>

        <Pressable testID="btn-masuk" onPress={submit} disabled={submitting} style={({ pressed }) => [styles.submitBtn, pressed && styles.pressed]}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>MASUK</Text>}
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
  field: { marginBottom: 18 },
  label: { fontSize: 12.5, color: C.textMuted, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: C.text, letterSpacing: 1 },
  hint: { fontSize: 11.5, color: C.textMuted, marginTop: 6 },
  checkboxRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 20 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  checkboxOn: { backgroundColor: C.navy, borderColor: C.navy },
  checkboxLabel: { fontSize: 13, color: C.text },
  submitBtn: { backgroundColor: C.navy, borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 15, letterSpacing: 0.3 },
  pressed: { opacity: 0.85 },
});
