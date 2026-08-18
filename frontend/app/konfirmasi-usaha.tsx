import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/src/components/Icon";
import { C } from "@/src/theme";

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL;

type Business = {
  id: string;
  name: string;
  address: string;
  logo_data_uri: string | null;
  token: string;
  employee_limit: number;
};

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export default function KonfirmasiUsaha() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [biz, setBiz] = useState<Business | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${BACKEND}/api/businesses/${id}`);
        const data = await res.json();
        if (!res.ok) {
          setLoadError(data.detail || "Gagal memuat data usaha");
          return;
        }
        setBiz(data);
      } catch {
        setLoadError("Gagal terhubung ke server");
      }
    })();
  }, [id]);

  const openEdit = () => {
    if (!biz) return;
    setTokenInput(biz.token);
    setTokenError(null);
    setEditing(true);
  };

  const saveToken = async () => {
    if (!biz) return;
    setTokenError(null);
    setSaving(true);
    try {
      const res = await fetch(`${BACKEND}/api/businesses/${biz.id}/token`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenInput.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTokenError(data.detail || "Gagal mengubah token");
        return;
      }
      setBiz(data);
      setEditing(false);
    } catch {
      setTokenError("Gagal terhubung ke server");
    } finally {
      setSaving(false);
    }
  };

  if (loadError) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.body}>
          <Text style={styles.errorText}>{loadError}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!biz) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.body}>
          <ActivityIndicator color={C.navy} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.body}>
        <View style={styles.checkCircle}>
          <Icon name="checkmark" color="#fff" size={36} />
        </View>
        <Text style={styles.title}>Usaha berhasil dibuat!</Text>
        <Text style={styles.subtitle}>Berikut informasi usaha Anda</Text>

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
          <Text testID="txt-token" style={styles.token}>{biz.token}</Text>
          <Pressable testID="btn-ubah-token" onPress={openEdit} style={styles.linkRow}>
            <Icon name="link" color={C.navy} size={14} />
            <Text style={styles.linkText}>Ubah Token</Text>
          </Pressable>
        </View>

        <View style={[styles.card, styles.centerCard]}>
          <Text style={styles.cardLabel}>Maksimal Karyawan</Text>
          <Text style={styles.limitValue}>
            <Text style={styles.limitNumber}>{biz.employee_limit}</Text> Karyawan
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable
          testID="btn-masuk-dashboard"
          onPress={() => router.replace("/dashboard-owner")}
          style={({ pressed }) => [styles.submitBtn, pressed && styles.pressed]}
        >
          <Text style={styles.submitBtnText}>MASUK KE DASHBOARD</Text>
        </Pressable>
      </View>

      <Modal visible={editing} transparent animationType="fade" onRequestClose={() => setEditing(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setEditing(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Ubah Token Usaha</Text>
            <TextInput
              testID="input-token-baru"
              style={styles.modalInput}
              value={tokenInput}
              onChangeText={(t) => setTokenInput(t.toUpperCase())}
              autoCapitalize="characters"
              placeholder="TOKEN01"
              placeholderTextColor={C.textMuted}
            />
            {tokenError && <Text style={styles.errorTextSmall}>{tokenError}</Text>}
            <View style={styles.modalActions}>
              <Pressable testID="btn-batal-token" onPress={() => setEditing(false)} style={styles.modalBtnGhost}>
                <Text style={styles.modalBtnGhostText}>Batal</Text>
              </Pressable>
              <Pressable testID="btn-simpan-token" onPress={saveToken} disabled={saving} style={styles.modalBtnPrimary}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalBtnPrimaryText}>Simpan</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.card },
  body: { flex: 1, alignItems: "center", padding: 24, paddingTop: 48 },
  checkCircle: { width: 76, height: 76, borderRadius: 38, backgroundColor: C.success, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  title: { fontSize: 19, fontWeight: "700", color: C.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: C.textMuted, marginBottom: 24 },
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
  token: { fontSize: 26, fontWeight: "800", color: C.text, letterSpacing: 1.5, marginBottom: 10 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  linkText: { color: C.navy, fontSize: 13, fontWeight: "600" },
  limitValue: { fontSize: 14, color: C.text },
  limitNumber: { fontSize: 20, fontWeight: "800", color: C.text },
  footer: { padding: 20 },
  submitBtn: { backgroundColor: C.navy, borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 15, letterSpacing: 0.3 },
  pressed: { opacity: 0.85 },
  errorText: { color: C.danger, fontSize: 14, textAlign: "center" },
  errorTextSmall: { color: C.danger, fontSize: 12.5, marginTop: 6 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { width: "100%", backgroundColor: "#fff", borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 12 },
  modalInput: { borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.text, letterSpacing: 1 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 16 },
  modalBtnGhost: { flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: 12, borderWidth: 1, borderColor: C.border },
  modalBtnGhostText: { color: C.textMuted, fontWeight: "600", fontSize: 14 },
  modalBtnPrimary: { flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: 12, backgroundColor: C.navy },
  modalBtnPrimaryText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
