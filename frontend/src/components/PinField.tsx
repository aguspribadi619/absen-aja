import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Icon } from "@/src/components/Icon";
import { C } from "@/src/theme";

export function PinField({
  label,
  value,
  onChangeText,
  placeholder,
  testID,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  testID?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <TextInput
          testID={testID}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.textMuted}
          secureTextEntry={!visible}
          autoCapitalize="none"
        />
        <Pressable testID={testID ? `${testID}-toggle` : undefined} onPress={() => setVisible((v) => !v)} style={styles.eyeBtn} hitSlop={8}>
          <Icon name={visible ? "eye-off-outline" : "eye-outline"} color={C.textMuted} size={18} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 18 },
  label: { fontSize: 12.5, color: C.textMuted, marginBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14 },
  input: { flex: 1, paddingVertical: 12, fontSize: 14, color: C.text },
  eyeBtn: { padding: 4 },
});
