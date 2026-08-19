import React, { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/src/components/Icon";
import { Header } from "@/src/components/Header";
import { clearSession, getRole, SessionRole } from "@/src/utils/session";
import { C } from "@/src/theme";

export default function Akun() {
  const router = useRouter();
  const [role, setRole] = useState<SessionRole | null>(null);
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  useEffect(() => {
    (async () => setRole(await getRole()))();
  }, []);

  const gantiAkun = async () => {
    await clearSession();
    router.replace(role === "karyawan" ? "/login-karyawan" : "/login-owner");
  };

  const logout = async () => {
    await clearSession();
    setConfirmingLogout(false);
    router.replace("/");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <Header title="Akun" />

      <View style={styles.body}>
        <Text style={styles.roleLabel}>{role === "karyawan" ? "Masuk sebagai Karyawan" : "Masuk sebagai Owner"}</Text>

        <Pressable testID="btn-ganti-akun" onPress={gantiAkun} style={styles.row}>
          <View style={styles.rowIconWrap}>
            <Icon name="swap-horizontal" color={C.navy} size={20} />
          </View>
          <View style={styles.flex1}>
            <Text style={styles.rowTitle}>Ganti Akun</Text>
            <Text style={styles.rowSubtitle}>Keluar dan masuk dengan akun lain</Text>
          </View>
          <Icon name="chevron-forward" color={C.textMuted} size={18} />
        </Pressable>

        <Pressable testID="btn-logout" onPress={() => setConfirmingLogout(true)} style={styles.row}>
          <View style={[styles.rowIconWrap, styles.rowIconWrapDanger]}>
            <Icon name="log-out-outline" color={C.danger} size={20} />
          </View>
          <View style={styles.flex1}>
            <Text style={[styles.rowTitle, styles.rowTitleDanger]}>Logout</Text>
            <Text style={styles.rowSubtitle}>Keluar dari aplikasi</Text>
          </View>
          <Icon name="chevron-forward" color={C.textMuted} size={18} />
        </Pressable>
      </View>

      <Modal visible={confirmingLogout} transparent animationType="fade" onRequestClose={() => setConfirmingLogout(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setConfirmingLogout(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Logout dari aplikasi?</Text>
            <Text style={styles.modalSubtitle}>Kamu perlu login lagi buat masuk ke akun ini.</Text>
            <View style={styles.modalActions}>
              <Pressable testID="btn-batal-logout" onPress={() => setConfirmingLogout(false)} style={styles.modalBtnGhost}>
                <Text style={styles.modalBtnGhostText}>Batal</Text>
              </Pressable>
              <Pressable testID="btn-konfirmasi-logout" onPress={logout} style={styles.modalBtnDanger}>
                <Text style={styles.modalBtnDangerText}>Logout</Text>
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
  body: { padding: 20 },
  roleLabel: { fontSize: 12.5, color: C.textMuted, marginBottom: 14 },
  flex1: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 16, marginBottom: 12 },
  rowIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
  rowIconWrapDanger: { backgroundColor: "#FDECEC" },
  rowTitle: { fontSize: 14, fontWeight: "700", color: C.text, marginBottom: 2 },
  rowTitleDanger: { color: C.danger },
  rowSubtitle: { fontSize: 12, color: C.textMuted },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { width: "100%", backgroundColor: "#fff", borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 6 },
  modalSubtitle: { fontSize: 13, color: C.textMuted, marginBottom: 16 },
  modalActions: { flexDirection: "row", gap: 10 },
  modalBtnGhost: { flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: 12, borderWidth: 1, borderColor: C.border },
  modalBtnGhostText: { color: C.textMuted, fontWeight: "600", fontSize: 14 },
  modalBtnDanger: { flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: 12, backgroundColor: C.danger },
  modalBtnDangerText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
