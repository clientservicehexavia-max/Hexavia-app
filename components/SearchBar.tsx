import { CustomTextInput } from "@/components/ui/CustomInput";
import { Search, X } from "lucide-react-native";
import React, { useState } from "react";
import { Pressable, View } from "react-native";

export default function SearchBar({
  value,
  onChange,
  onOpenFilter,
}: {
  value: string;
  onChange: (t: string) => void;
  onOpenFilter: () => void;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View className="px-4 pt-3 pb-3">
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
          onChangeText={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search by name or enter Project Code"
          className="h-full flex-1"
          returnKeyType="search"
        />
        {value.length > 0 ? (
          <Pressable
            onPress={() => onChange("")}
            hitSlop={8}
            className="ml-2 h-7 w-7 rounded-full bg-[#F3F4F6] items-center justify-center"
          >
            <X size={14} color="#6B7280" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
