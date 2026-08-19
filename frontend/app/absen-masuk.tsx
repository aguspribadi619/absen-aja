import React, { useRef, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/src/components/Icon";
import { authHeaders } from "@/src/utils/session";
import { C } from "@/src/theme";

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL;

// Section 9 aturan keras: foto absen wajib dari kamera langsung, gak boleh
// dari galeri -- makanya di sini cuma ada CameraView + tombol jepret, gak
// ada tombol "pilih dari galeri" sama sekali.
export default function AbsenMasuk() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<"front" | "back">("front");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  const capture = async () => {
    if (!cameraRef.current || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, base64: true });
      if (!photo?.base64) {
        setError("Gagal mengambil foto, coba lagi");
        return;
      }
      const res = await fetch(`${BACKEND}/api/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({
          photo_data_uri: `data:image/jpeg;base64,${photo.base64}`,
          client_timestamp: new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Gagal mengirim absen, coba lagi");
        return;
      }
      router.replace({
        pathname: "/bukti-absensi",
        params: {
          photoUri: photo.uri,
          minutesLate: String(data.minutes_late),
          penaltyAmount: String(data.penalty_amount),
          status: data.status,
          serverTimestamp: data.server_timestamp,
        },
      });
    } catch {
      setError("Gagal terhubung ke server, cek koneksi kamu");
    } finally {
      setSubmitting(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.permissionContainer, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <Pressable testID="btn-back-permission" onPress={() => router.back()} style={styles.backBtnAbsolute}>
          <Icon name="chevron-back" color="#fff" size={24} />
        </Pressable>
        <Icon name="camera-outline" color="#fff" size={48} />
        <Text style={styles.permissionTitle}>Izin Kamera Diperlukan</Text>
        <Text style={styles.permissionText}>
          Absen Aja butuh akses kamera buat ambil foto bukti absen kamu.
        </Text>
        {permission.canAskAgain ? (
          <Pressable testID="btn-minta-izin-kamera" onPress={requestPermission} style={styles.permissionBtn}>
            <Text style={styles.permissionBtnText}>Izinkan Akses Kamera</Text>
          </Pressable>
        ) : (
          <Pressable testID="btn-buka-setelan" onPress={() => Linking.openSettings()} style={styles.permissionBtn}>
            <Text style={styles.permissionBtnText}>Buka Setelan HP</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} />

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="btn-back" onPress={() => router.back()} style={styles.iconBtn} hitSlop={8}>
          <Icon name="chevron-back" color="#fff" size={24} />
        </Pressable>
        <Text style={styles.topTitle}>Absen Masuk</Text>
        <View style={styles.iconBtn} />
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20 }]}>
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        <Text style={styles.hint}>Pastikan wajah terlihat jelas</Text>
        <View style={styles.controlsRow}>
          <View style={styles.controlSpacer} />
          <Pressable testID="btn-capture" onPress={capture} disabled={submitting} style={styles.captureBtn}>
            {submitting ? <ActivityIndicator color={C.navy} /> : <View style={styles.captureBtnInner} />}
          </Pressable>
          <Pressable
            testID="btn-flip-camera"
            onPress={() => setFacing((f) => (f === "front" ? "back" : "front"))}
            style={styles.flipBtn}
            hitSlop={8}
          >
            <Icon name="camera-reverse-outline" color="#fff" size={22} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  permissionContainer: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center", padding: 32 },
  backBtnAbsolute: { position: "absolute", left: 12, top: 12, width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  permissionTitle: { color: "#fff", fontSize: 17, fontWeight: "700", marginTop: 16, marginBottom: 8, textAlign: "center" },
  permissionText: { color: "rgba(255,255,255,0.7)", fontSize: 13, textAlign: "center", marginBottom: 24, lineHeight: 19 },
  permissionBtn: { backgroundColor: C.navy, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28 },
  permissionBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8, paddingBottom: 8, backgroundColor: "rgba(0,0,0,0.35)" },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  topTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  bottomBar: { position: "absolute", left: 0, right: 0, bottom: 0, paddingTop: 16, paddingHorizontal: 24, backgroundColor: "rgba(0,0,0,0.35)" },
  errorBanner: { backgroundColor: "rgba(225,72,72,0.9)", borderRadius: 10, padding: 10, marginBottom: 12 },
  errorText: { color: "#fff", fontSize: 12.5, textAlign: "center" },
  hint: { color: "#fff", fontSize: 13, textAlign: "center", marginBottom: 16 },
  controlsRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  controlSpacer: { width: 48 },
  captureBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", marginHorizontal: 24 },
  captureBtnInner: { width: 60, height: 60, borderRadius: 30, borderWidth: 3, borderColor: C.navy },
  flipBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
});
