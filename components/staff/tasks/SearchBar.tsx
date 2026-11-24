import { CustomTextInput } from "@/components/ui/CustomInput";
import { Search, SlidersHorizontal, X } from "lucide-react-native";
import React, { useState } from "react";
import { Pressable, View } from "react-native";

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
    const [focused, setFocused] = useState(false);

    return (
        <View className="px-4 pt-2 pb-1">
            <View
                className={`h-14 w-full flex-row items-center rounded-2xl border bg-white px-4 ${
                    focused ? "border-primary" : "border-gray-200"
                }`}
            >
                <View className="mr-3">
                    <Search size={18} color={focused ? "#4C5FAB" : "#6B7280"} />
                </View>
                <CustomTextInput
                    value={value}
                    onChangeText={onChangeText}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    placeholder="Search for tasks"
                    className="h-full flex-1"
                    returnKeyType="search"
                />
                {value.length > 0 ? (
                    <Pressable
                        onPress={() => onChangeText("")}
                        hitSlop={8}
                        className="ml-2 h-7 w-7 rounded-full bg-[#F3F4F6] items-center justify-center"
                    >
                        <X size={14} color="#6B7280" />
                    </Pressable>
                ) : null}
                {onFilterPress ? (
                    <Pressable
                        onPress={onFilterPress}
                        className="ml-2 h-8 w-8 rounded-full items-center justify-center bg-[#F3F4F6]"
                        android_ripple={{ color: "#D1D5DB", borderless: true }}
                    >
                        <SlidersHorizontal size={16} color="#4B5563" />
                    </Pressable>
                ) : null}
            </View>
        </View>
    );
}
