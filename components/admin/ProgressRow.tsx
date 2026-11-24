import React from "react";
import { View, Text } from "react-native";

export default function ProgressRow({
  label,
  percent,
}: {
  label: string;
  percent: number;
}) {
  const pct = Math.max(0, Math.min(100, percent));
  return (
    <View>
      <Text className="mb-1.5 font-kumbh text-sm text-[#111827]">{label}</Text>
      <View className="h-2.5 overflow-hidden rounded-full bg-[#EEF2FF]">
        <View
          className="h-2.5 rounded-full bg-primary"
          style={{ width: `${pct}%` }}
        />
      </View>
    </View>
  );
}
