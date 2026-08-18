import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Header } from "@/src/components/Header";
import { PinField } from "@/src/components/PinField";
import { authHeaders } from "@/src/utils/session";
import { C } from "@/src/theme";

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL;

// Belum ada di mockup -- ikutin pola form yang lain (card putih, label di
// atas input, tombol navy full-width). Lihat absen-aja-build-brief.md section 8.
export default function TambahKaryawan() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // business_id datang dari sesi (Authorization header), bukan dari client --
  // lihat backend/CONVENTIONS.md.
  const submit = async () => {
    setError(null);
    if (!name.trim()) return setError("Nama karyawan wajib diisi");
    if (pin.length < 4) return setError("PIN minimal 4 karakter");
    if (pin !== confirmPin) return setError("Konfirmasi PIN tidak sama");
    setSubmitting(true);
    try {
      const res = await fetch(`${BACKEND}/api/employees`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ name: name.trim(), pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Gagal menambah karyawan");
        return;
      }
      router.back();
    } catch {
      setError("Gagal terhubung ke server, cek koneksi kamu");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <Header title="Tambah Karyawan" />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>Nama Karyawan</Text>
          <TextInput
            testID="input-nama-karyawan"
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Contoh: Budi Santoso"
            placeholderTextColor={C.textMuted}
          />
        </View>

        <PinField testID="input-karyawan-pin" label="PIN" value={pin} onChangeText={setPin} placeholder="Minimal 4 karakter" />
        <PinField testID="input-karyawan-pin-confirm" label="Konfirmasi PIN" value={confirmPin} onChangeText={setConfirmPin} placeholder="Ulangi PIN" />

        <Pressable testID="btn-tambah" onPress={submit} disabled={submitting} style={({ pressed }) => [styles.submitBtn, pressed && styles.pressed]}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>TAMBAH KARYAWAN</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.card },
  body: { padding: 20, paddingBottom: 40 },
  errorBanner: { backgroundColor: "#FDECEC", borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText: { color: C.danger, fontSize: 13 },
  field: { marginBottom: 18 },
  label: { fontSize: 12.5, color: C.textMuted, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: C.text },
  submitBtn: { backgroundColor: C.navy, borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 8 },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 15, letterSpacing: 0.3 },
  pressed: { opacity: 0.85 },
});
