import React from "react";
import { Pressable, Text, View } from "react-native";

export default function FilterChip({
  label,
  onPress,
}: {
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2"
    >
      <Text className="font-kumbh text-sm text-[#111827]">{label}</Text>
      <View className="h-4 w-4 rounded-full border border-primary bg-[#EEF2FF]" />
    </Pressable>
  );
}
