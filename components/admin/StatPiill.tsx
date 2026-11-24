import React from "react";
import { View, Text } from "react-native";
import { Users } from "lucide-react-native";

export default function StatPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View className="flex-1 rounded-[20px] border border-gray-100 bg-white p-4">
      <View className="flex-row items-center gap-2">
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-[#EEF2FF]">
          <Users size={16} color="#4c5fab" />
        </View>
        <Text className="font-kumbh text-xs text-gray-500">{label}</Text>
      </View>
      <Text className="mt-2 font-kumbhBold text-sm text-[#111827]">{value}</Text>
    </View>
  );
}
