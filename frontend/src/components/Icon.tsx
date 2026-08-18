import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { C } from "@/src/theme";

export function Icon({ name, color = C.navy, size = 20 }: { name: keyof typeof Ionicons.glyphMap; color?: string; size?: number }) {
  return <Ionicons name={name} color={color} size={size} />;
}
