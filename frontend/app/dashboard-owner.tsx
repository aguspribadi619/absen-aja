import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { C } from "@/src/theme";

// Placeholder -- dibangun penuh di section 5 poin 12 (Dashboard Owner).
export default function DashboardOwner() {
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.body}>
        <Text style={styles.placeholder}>Dashboard Owner — segera dibangun.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.card },
  body: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  placeholder: { color: C.textMuted, fontSize: 14, textAlign: "center" },
});
