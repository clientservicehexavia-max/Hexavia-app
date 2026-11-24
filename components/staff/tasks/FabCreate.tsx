import React from "react";
import { View, Text, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

type Props = { onPress?: () => void };

export default function FabCreate({ onPress }: Props) {
  return (
    <View className="absolute right-5 bottom-8">
      <Pressable
        onPress={onPress}
        android_ripple={{ color: "#ffffff30" }}
        className="flex-row items-center rounded-full bg-primary px-5 py-3.5"
        style={{ backgroundColor: "#4C5FAB", gap: 10 }}
      >
        <View className="h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.2)" }}>
          <Ionicons name="add" size={18} color="#FFFFFF" />
        </View>
        <Text className="font-kumbhBold text-white text-[15px]">Create Task</Text>
      </Pressable>
    </View>
  );
}
