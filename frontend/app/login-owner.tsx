import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Header } from "@/src/components/Header";
import { C } from "@/src/theme";

// Placeholder -- dibangun penuh di section 5 poin 5 (Login Owner).
export default function LoginOwner() {
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <Header title="Login Owner" />
      <View style={styles.body}>
        <Text style={styles.placeholder}>Form Login Owner — segera dibangun.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.card },
  body: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  placeholder: { color: C.textMuted, fontSize: 14, textAlign: "center" },
});
