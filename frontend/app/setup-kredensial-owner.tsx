import React, { useEffect, useState } from "react";
import { ActivityIndicator, BackHandler, ScrollView, StyleSheet, Text, TextInput, View, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { PinField } from "@/src/components/PinField";
import { setOwnerSession } from "@/src/utils/session";
import { C } from "@/src/theme";

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL;

// Dipaksa diisi sebelum bisa masuk ke Dashboard -- tanpa ini owner gak akan
// pernah bisa login lagi (Buat Usaha & mockup gak punya field kredensial
// sama sekali, lihat percakapan sebelum poin 5 dikerjakan). Gak ada tombol
// back/keluar sampai berhasil disimpan.
export default function SetupKredensialOwner() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, []);

  const submit = async () => {
    setError(null);
    if (!phone.trim()) return setError("Nomor HP/Email wajib diisi");
    if (pin.length < 4) return setError("PIN minimal 4 karakter");
    if (pin !== confirmPin) return setError("Konfirmasi PIN tidak sama");
    setSubmitting(true);
    try {
      const res = await fetch(`${BACKEND}/api/businesses/${id}/owner-credentials`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Gagal menyimpan kredensial");
        return;
      }
      await setOwnerSession(data.token, data.business.id, true);
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
        <Text style={styles.title}>Amankan Akun Owner</Text>
        <Text style={styles.subtitle}>Simpan nomor HP/email & PIN supaya kamu bisa login lagi nanti</Text>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>Nomor HP / Email</Text>
          <TextInput
            testID="input-owner-phone"
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="08xxxxxxxxxx atau email"
            placeholderTextColor={C.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <PinField testID="input-owner-pin" label="PIN" value={pin} onChangeText={setPin} placeholder="Minimal 4 karakter" />
        <PinField testID="input-owner-pin-confirm" label="Konfirmasi PIN" value={confirmPin} onChangeText={setConfirmPin} placeholder="Ulangi PIN" />

        <Pressable testID="btn-simpan-kredensial" onPress={submit} disabled={submitting} style={({ pressed }) => [styles.submitBtn, pressed && styles.pressed]}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>SIMPAN & LANJUT</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.card },
  body: { padding: 24, paddingTop: 48 },
  title: { fontSize: 19, fontWeight: "700", color: C.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: C.textMuted, marginBottom: 24 },
  errorBanner: { backgroundColor: "#FDECEC", borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText: { color: C.danger, fontSize: 13 },
  field: { marginBottom: 18 },
  label: { fontSize: 12.5, color: C.textMuted, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: C.text },
  submitBtn: { backgroundColor: C.navy, borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 8 },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 15, letterSpacing: 0.3 },
  pressed: { opacity: 0.85 },
});
