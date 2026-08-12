import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { Pressable, TextInput, View } from "react-native";

type Props = {
    value: string;
    onChangeText: (t: string) => void;
    onFilterPress?: () => void;
};

export default function SearchBar({
    value,
    onChangeText,
    onFilterPress,
}: Props) {
    return (
        <View className="px-3 py-2 mb-2">
            <View className="flex-row items-center rounded-full bg-[#F1F3F5] px-4 py-3">
                <Ionicons name="search" size={18} color="#6B7280" />
                <TextInput
                    value={value}
                    onChangeText={onChangeText}
                    placeholder="Search for tasks"
                    placeholderTextColor="#9CA3AF"
                    className="ml-3 flex-1 text-[#111827] font-kumbh"
                />
                {onFilterPress ? (
                    <Pressable
                        onPress={onFilterPress}
                        android_ripple={{ color: "#D1D5DB", borderless: true }}
                    >
                        <Ionicons
                            name="options-outline"
                            size={22}
                            color="#6B7280"
                        />
                    </Pressable>
                ) : null}
            </View>
        </View>
    );
}
