import React, { useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Header } from "@/src/components/Header";
import { Toggle } from "@/src/components/Toggle";
import { Icon } from "@/src/components/Icon";
import { C } from "@/src/theme";

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL;

const DAYS: { key: string; label: string }[] = [
  { key: "sen", label: "Sen" },
  { key: "sel", label: "Sel" },
  { key: "rab", label: "Rab" },
  { key: "kam", label: "Kam" },
  { key: "jum", label: "Jum" },
  { key: "sab", label: "Sab" },
  { key: "min", label: "Min" },
];

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, "0");
  const m = i % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
});

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function TimePickerModal({ visible, value, onSelect, onClose }: { visible: boolean; value: string; onSelect: (t: string) => void; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.modalSheet}>
          <ScrollView>
            {TIME_OPTIONS.map((t) => (
              <Pressable key={t} testID={`time-opt-${t}`} onPress={() => onSelect(t)} style={styles.timeRow}>
                <Text style={[styles.timeRowText, t === value && { color: C.navy, fontWeight: "700" }]}>{t}</Text>
                {t === value && <Icon name="checkmark" color={C.navy} size={18} />}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function BuatUsaha() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [logoDataUri, setLogoDataUri] = useState<string | null>(null);
  const [workStart, setWorkStart] = useState("08:00");
  const [workEndEnabled, setWorkEndEnabled] = useState(true);
  const [workEnd, setWorkEnd] = useState("17:00");
  const [workDays, setWorkDays] = useState<string[]>(["sen", "sel", "rab", "kam", "jum", "sab"]);
  const [pickerFor, setPickerFor] = useState<"start" | "end" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleDay = (key: string) => {
    setWorkDays((prev) => (prev.includes(key) ? prev.filter((d) => d !== key) : [...prev, key]));
  };

  const pickLogo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError("Izin akses foto diperlukan untuk pilih logo");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setLogoUri(asset.uri);
    if (asset.base64) {
      const mime = asset.mimeType || "image/jpeg";
      setLogoDataUri(`data:${mime};base64,${asset.base64}`);
    }
  };

  const submit = async () => {
    setError(null);
    if (!name.trim()) return setError("Nama usaha wajib diisi");
    if (!address.trim()) return setError("Alamat wajib diisi");
    if (workDays.length === 0) return setError("Pilih minimal satu hari kerja");
    setSubmitting(true);
    try {
      const res = await fetch(`${BACKEND}/api/businesses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          address: address.trim(),
          logo_data_uri: logoDataUri,
          work_start: workStart,
          work_end: workEndEnabled ? workEnd : null,
          work_days: workDays,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Gagal membuat usaha, coba lagi");
        return;
      }
      router.push({
        pathname: "/konfirmasi-usaha",
        params: { name: data.name, token: data.token, employeeLimit: String(data.employee_limit) },
      });
    } catch {
      setError("Gagal terhubung ke server, cek koneksi kamu");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <Header title="Buat Usaha" />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Field label="Nama Usaha">
          <TextInput testID="input-nama-usaha" style={styles.input} value={name} onChangeText={setName} placeholder="Contoh: Warkop Sejagat" placeholderTextColor={C.textMuted} />
        </Field>

        <Field label="Alamat">
          <TextInput
            testID="input-alamat"
            style={[styles.input, styles.inputMultiline]}
            value={address}
            onChangeText={setAddress}
            placeholder="Alamat lengkap usaha"
            placeholderTextColor={C.textMuted}
            multiline
          />
        </Field>

        <Field label="Logo Usaha (opsional)">
          <Pressable testID="pick-logo" onPress={pickLogo} style={styles.logoWrap}>
            {logoUri ? (
              <Image source={{ uri: logoUri }} style={styles.logoImg} />
            ) : (
              <View style={[styles.logoImg, styles.logoPlaceholder]}>
                <Icon name="business-outline" color={C.textMuted} size={28} />
              </View>
            )}
            <View style={styles.logoCameraBadge}>
              <Icon name="camera" color="#fff" size={14} />
            </View>
          </Pressable>
        </Field>

        <Field label="Jam Masuk">
          <Pressable testID="field-jam-masuk" onPress={() => setPickerFor("start")} style={styles.input}>
            <View style={styles.timeFieldRow}>
              <Text style={styles.timeFieldText}>{workStart}</Text>
              <Icon name="chevron-expand" color={C.textMuted} size={16} />
            </View>
          </Pressable>
        </Field>

        <Field label="Jam Pulang (opsional)">
          <View style={[styles.input, styles.timeFieldRow]}>
            <Pressable testID="field-jam-pulang" onPress={() => workEndEnabled && setPickerFor("end")} disabled={!workEndEnabled} style={styles.flex1}>
              <Text style={[styles.timeFieldText, !workEndEnabled && { color: C.textMuted }]}>{workEnd}</Text>
            </Pressable>
            <Toggle testID="toggle-jam-pulang" value={workEndEnabled} onValue={setWorkEndEnabled} />
          </View>
        </Field>

        <Field label="Hari Kerja">
          <View style={styles.dayRow}>
            {DAYS.map((d) => {
              const active = workDays.includes(d.key);
              return (
                <Pressable key={d.key} testID={`day-${d.key}`} onPress={() => toggleDay(d.key)} style={[styles.dayChip, active && styles.dayChipActive]}>
                  <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>{d.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </Field>

        <Pressable testID="btn-lanjut" onPress={submit} disabled={submitting} style={({ pressed }) => [styles.submitBtn, pressed && styles.pressed]}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>LANJUT</Text>}
        </Pressable>
      </ScrollView>

      <TimePickerModal
        visible={pickerFor !== null}
        value={pickerFor === "start" ? workStart : workEnd}
        onSelect={(t) => {
          if (pickerFor === "start") setWorkStart(t);
          else setWorkEnd(t);
          setPickerFor(null);
        }}
        onClose={() => setPickerFor(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.card },
  body: { padding: 20, paddingBottom: 40 },
  field: { marginBottom: 18 },
  label: { fontSize: 12.5, color: C.textMuted, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: C.text },
  inputMultiline: { minHeight: 64, textAlignVertical: "top" },
  errorBanner: { backgroundColor: "#FDECEC", borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText: { color: C.danger, fontSize: 13 },
  logoWrap: { width: 84, height: 84 },
  logoImg: { width: 84, height: 84, borderRadius: 42 },
  logoPlaceholder: { backgroundColor: C.bg, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border },
  logoCameraBadge: { position: "absolute", right: -2, bottom: -2, width: 26, height: 26, borderRadius: 13, backgroundColor: C.navy, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" },
  timeFieldRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  timeFieldText: { fontSize: 14, color: C.text },
  flex1: { flex: 1 },
  dayRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  dayChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  dayChipActive: { backgroundColor: C.navy, borderColor: C.navy },
  dayChipText: { fontSize: 13, color: C.textMuted, fontWeight: "600" },
  dayChipTextActive: { color: "#fff" },
  submitBtn: { backgroundColor: C.navy, borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 8 },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 15, letterSpacing: 0.3 },
  pressed: { opacity: 0.85 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "60%", paddingVertical: 8 },
  timeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.bg },
  timeRowText: { fontSize: 15, color: C.text },
});
