import { STATUS_META, StatusKey } from "@/features/staff/types";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";

type Props = { status: StatusKey };

const STATUS_ICON: Record<StatusKey, keyof typeof Ionicons.glyphMap> = {
    "in-progress": "play-circle",
    "not-started": "pause-circle",
    completed: "checkmark-circle",
    canceled: "close-circle",
};

const STATUS_HINT: Record<StatusKey, string> = {
    "in-progress": "Keep momentum",
    "not-started": "Ready to begin",
    completed: "Review outcomes",
    canceled: "Needs follow-up",
};

export default function StatusCard({ status }: Props) {
    const meta = STATUS_META[status];

    return (
        <Pressable
            onPress={() =>
                router.push({
                    pathname: "/(staff)/tasks/[status]",
                    params: { status },
                })
            }
            android_ripple={{ color: "#ffffff30" }}
            className="rounded-2xl p-3"
            style={{
                backgroundColor: meta.bgColor,
                shadowColor: "#111827",
                shadowOpacity: 0.1,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 4 },
                elevation: 3,
                overflow: "hidden",
            }}
        >
            <View
                style={{
                    position: "absolute",
                    right: -28,
                    top: -28,
                    width: 88,
                    height: 88,
                    borderRadius: 999,
                    backgroundColor: "rgba(255,255,255,0.16)",
                }}
            />

            <View className="flex-row items-start justify-between">
                <View style={{ flex: 1, paddingRight: 6 }}>
                    <View
                        className="self-start rounded-full px-2.5 py-0.5"
                        style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
                    >
                        <Text className="font-kumbh text-white text-[10px] uppercase tracking-[0.4px]">
                            {status.replace("-", " ")}
                        </Text>
                    </View>

                    <Text className="font-kumbhBold text-white text-[18px] mt-2 leading-6">
                        {meta.title}
                    </Text>

                    <Text className="font-kumbh text-white/90 text-[12px] mt-0.5">
                        {STATUS_HINT[status]}
                    </Text>

                    <View className="mt-3 flex-row items-center justify-between">
                        <Text className="font-kumbhBold text-white text-[12px]">
                            View tasks
                        </Text>
                        <View
                            className="h-7 w-7 rounded-full items-center justify-center"
                            style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
                        >
                            <Ionicons
                                name="arrow-forward"
                                size={12}
                                color="#FFFFFF"
                            />
                        </View>
                    </View>
                </View>

                <View
                    className="h-9 w-9 rounded-full items-center justify-center"
                    style={{ backgroundColor: meta.arrowBg }}
                >
                    <Ionicons
                        name={STATUS_ICON[status]}
                        size={18}
                        color="#FFFFFF"
                    />
                </View>
            </View>
        </Pressable>
    );
}
