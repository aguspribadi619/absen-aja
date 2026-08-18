import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { C } from "@/src/theme";

export function Toggle({ value, onValue, testID }: { value: boolean; onValue: (v: boolean) => void; testID?: string }) {
  return (
    <Pressable testID={testID} onPress={() => onValue(!value)} style={[styles.track, value && styles.trackOn]}>
      <View style={[styles.knob, value && styles.knobOn]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: 46, height: 26, borderRadius: 13, backgroundColor: "#D7DBE3", justifyContent: "center", padding: 3 },
  trackOn: { backgroundColor: C.navy },
  knob: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff" },
  knobOn: { transform: [{ translateX: 20 }] },
});
