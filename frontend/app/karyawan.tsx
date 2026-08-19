import React, { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Header } from "@/src/components/Header";
import { Icon } from "@/src/components/Icon";
import { OwnerBottomNav } from "@/src/components/OwnerBottomNav";
import { authHeaders } from "@/src/utils/session";
import { C } from "@/src/theme";

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL;

type Employee = { id: string; name: string; is_active: boolean };

export default function Karyawan() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // business_id datang dari sesi (Authorization header), bukan dari client --
  // lihat backend/CONVENTIONS.md.
  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`${BACKEND}/api/employees`, { headers: await authHeaders() });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Gagal memuat data karyawan");
        return;
      }
      setEmployees(data);
    } catch {
      setError("Gagal terhubung ke server");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <Header title="Karyawan" />
      <View style={styles.body}>
        <Pressable
          testID="btn-tambah-karyawan"
          onPress={() => router.push("/tambah-karyawan")}
          style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
        >
          <Icon name="add" color="#fff" size={18} />
          <Text style={styles.addBtnText}>Tambah Karyawan</Text>
        </Pressable>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {employees === null && !error && (
          <View style={styles.centerFill}>
            <ActivityIndicator color={C.navy} />
          </View>
        )}

        {employees !== null && employees.length === 0 && (
          <View style={styles.centerFill}>
            <Text style={styles.emptyText}>Belum ada karyawan. Tambah karyawan pertama kamu.</Text>
          </View>
        )}

        <FlatList
          data={employees || []}
          keyExtractor={(e) => e.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.avatar}>
                <Icon name="person" color={C.navy} size={18} />
              </View>
              <Text style={styles.rowName}>{item.name}</Text>
              <View style={[styles.badge, item.is_active ? styles.badgeActive : styles.badgeInactive]}>
                <Text style={[styles.badgeText, item.is_active ? styles.badgeTextActive : styles.badgeTextInactive]}>
                  {item.is_active ? "Aktif" : "Nonaktif"}
                </Text>
              </View>
            </View>
          )}
        />
      </View>
      <OwnerBottomNav active="karyawan" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.card },
  body: { flex: 1, padding: 20 },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.navy, borderRadius: 14, paddingVertical: 14, marginBottom: 16 },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  pressed: { opacity: 0.85 },
  errorBanner: { backgroundColor: "#FDECEC", borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText: { color: C.danger, fontSize: 13 },
  centerFill: { paddingVertical: 40, alignItems: "center" },
  emptyText: { color: C.textMuted, fontSize: 13, textAlign: "center" },
  list: { gap: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 12 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
  rowName: { flex: 1, fontSize: 14, fontWeight: "600", color: C.text },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeActive: { backgroundColor: "rgba(31,169,113,0.12)" },
  badgeInactive: { backgroundColor: "rgba(138,147,166,0.12)" },
  badgeText: { fontSize: 11.5, fontWeight: "700" },
  badgeTextActive: { color: C.success },
  badgeTextInactive: { color: C.neutral },
});
