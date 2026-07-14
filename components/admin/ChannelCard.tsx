import { Channel } from "@/redux/channels/channels.types";
import * as Clipboard from "expo-clipboard";
import { Copy } from "lucide-react-native";
import React from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { showSuccess } from "../ui/toast";

type Props = {
    item: Channel;
    tint?: string;
    onPress?: () => void;
    onDelete?: () => void;
    onLongPress?: () => void;
    onCopyCode?: () => void;
};

export default function ChannelCard({
    item,
    tint,
    onPress,
    onDelete,
    onLongPress,
    onCopyCode,
}: Props) {
    const title = item.name ?? "";
    const code = item.code ?? "";
    const description = item.description ?? undefined;
    const memberCount = item.members?.length ?? 0;

    const initials = title
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("");

    const timestampSource = item.updatedAt ?? item.createdAt;
    const timestamp = timestampSource
        ? new Date(timestampSource)
        : undefined;

    const timeLabel = timestamp && !Number.isNaN(timestamp.getTime())
        ? new Intl.DateTimeFormat("en-US", {
              hour: "numeric",
              minute: "2-digit",
          }).format(timestamp)
        : code;

    const preview = description || `Project code: ${code}`;

    const copyCode = async (code?: string) => {
        if (!code) {
            Alert.alert("No code", "This Project has no code to copy.");
            return;
        }
        try {
            await Clipboard.setStringAsync(code);
            // Alert.alert("Copied", "Project code copied to clipboard.");
            showSuccess("Project code copied to clipboard.");
        } catch (e) {
            Alert.alert("Error", "Failed to copy Project code.");
        }
    };

    return (
        <Pressable
            onPress={onPress}
            onLongPress={onLongPress}
            className="flex-row items-center bg-white px-4 py-3"
            style={{
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: "#E5E7EB",
            }}
        >
            <View
                className="h-14 w-14 items-center justify-center rounded-full"
                style={{ backgroundColor: tint ?? "#D1D5DB" }}
            >
                <Text className="font-kumbhBold text-[16px] text-white">
                    {initials || "CH"}
                </Text>
            </View>

            <View className="flex-1 px-3">
                <View className="flex-row items-center justify-between gap-3">
                    <Text
                        className="flex-1 font-kumbhBold text-[16px] text-[#111827]"
                        numberOfLines={1}
                    >
                        {title}
                    </Text>
                </View>
                <Text
                    className="mt-1 font-kumbh text-[13px] text-gray-500"
                    numberOfLines={1}
                >
                    {preview}
                </Text>
            </View>

            <View className="items-end justify-between self-stretch py-1">
                <Text className="font-kumbh text-[11px] text-gray-500">
                    {timeLabel}
                </Text>
                <View className="mt-2 min-h-6 min-w-6 items-center justify-center rounded-full bg-[#25D366] px-2">
                    <Text
                        className="font-kumbhBold text-[11px] text-white"
                    >
                        {memberCount}
                    </Text>
                </View>
                <Pressable
                    onPress={onCopyCode ?? (() => copyCode(item.code))}
                    hitSlop={8}
                    className="mt-2 items-center justify-center"
                >
                    <Copy size={14} color="#9CA3AF" />
                </Pressable>
            </View>
        </Pressable>
    );
}
