import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Icon } from "@/src/components/Icon";
import { C } from "@/src/theme";

export function Header({ title }: { title: string }) {
  const router = useRouter();
  return (
    <View style={styles.row}>
      <Pressable testID="back-button" onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
        <Icon name="chevron-back" color={C.text} size={24} />
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.backBtn} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8, paddingVertical: 14 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 17, fontWeight: "700", color: C.text },
});
