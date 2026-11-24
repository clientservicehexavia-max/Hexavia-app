import type { LucideIcon } from "lucide-react-native";
import React from "react";
import { Text, View } from "react-native";

const PRIMARY = "#4C5FAB";
const INACTIVE = "#9CA3AF";

type TabButtonProps = {
    focused: boolean;
    label: string;
    icon: LucideIcon;
    width?: number;
};

export default function TabButton({
    focused,
    label,
    icon: Icon,
    width = 68,
}: TabButtonProps) {
    return (
        <View
            style={{
                width,
                paddingVertical: 3,
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <View
                className={`h-8 items-center justify-center rounded-2xl px-3.5 ${
                    focused ? "bg-[#EEF2FF]" : "bg-transparent"
                }`}
            >
                <Icon
                    size={20}
                    color={focused ? PRIMARY : INACTIVE}
                    strokeWidth={focused ? 2.25 : 1.8}
                />
            </View>
            <Text
                numberOfLines={1}
                style={{
                    marginTop: 2,
                    fontSize: 11,
                    fontFamily: focused
                        ? "KumbhSans-Bold"
                        : "KumbhSans-Regular",
                    color: focused ? PRIMARY : INACTIVE,
                }}
            >
                {label}
            </Text>
        </View>
    );
}

