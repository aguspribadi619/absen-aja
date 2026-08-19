import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Icon } from "@/src/components/Icon";
import { C } from "@/src/theme";

type Tab = "dashboard" | "absensi" | "karyawan";

const TABS: { key: Tab; label: string; icon: string; route: string }[] = [
  { key: "dashboard", label: "Dashboard", icon: "home", route: "/dashboard-owner" },
  { key: "absensi", label: "Absensi", icon: "time", route: "/absensi-owner" },
  { key: "karyawan", label: "Karyawan", icon: "people", route: "/karyawan" },
];

// Section 5 poin 12 -- mockup punya 5 tab (+ Laporan, Pengaturan), tapi itu
// belum digarap di Phase 1 (lihat keputusan "trim ke Phase 1 saja" pas poin
// 5), jadi cuma 3 tab yang beneran ada tujuannya yang ditampilin.
export function OwnerBottomNav({ active }: { active: Tab }) {
  const router = useRouter();
  return (
    <View style={styles.row}>
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            testID={`nav-${tab.key}`}
            onPress={() => !isActive && router.replace(tab.route as never)}
            style={styles.tab}
          >
            <Icon name={(isActive ? tab.icon : `${tab.icon}-outline`) as never} color={isActive ? C.navy : C.textMuted} size={22} />
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.card, paddingTop: 8 },
  tab: { flex: 1, alignItems: "center", gap: 3, paddingBottom: 8 },
  label: { fontSize: 11, color: C.textMuted, fontWeight: "600" },
  labelActive: { color: C.navy },
});
