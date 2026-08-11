import { Channel } from "@/redux/channels/channels.types";
import * as Clipboard from "expo-clipboard";
import { Copy } from "lucide-react-native";
import React, { memo, useCallback, useMemo } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { showSuccess } from "../ui/toast";

type Props = {
    item: Channel;
    tint?: string;
    onPress?: () => void;
    onDelete?: () => void;
    onLongPress?: () => void;
};

const ChannelCard = memo(function ChannelCard({
    item,
    tint,
    onPress,
    onDelete,
    onLongPress,
}: Props) {
    const title = useMemo(() => item.name ?? "", [item.name]);
    const code = useMemo(() => item.code ?? "", [item.code]);
    const description = useMemo(
        () => item.description ?? undefined,
        [item.description],
    );

    const copyCode = useCallback(async (value?: string) => {
        if (!value) {
            Alert.alert("No code", "This Project has no code to copy.");
            return;
        }
        try {
            await Clipboard.setStringAsync(value);
            showSuccess("Project code copied to clipboard.");
        } catch {
            Alert.alert("Error", "Failed to copy Project code.");
        }
    }, []);

    return (
        <Pressable
            onPress={onPress}
            onLongPress={onLongPress}
            className="flex-1 h-40 rounded-xl"
            style={{
                backgroundColor: tint ?? "#60A5FA", // blue-400 default
                overflow: "hidden",
            }}
        >
            {onDelete ? (
                <Pressable
                    onPress={onDelete}
                    style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 12,
                        backgroundColor: "rgba(0,0,0,0.35)",
                    }}
                    hitSlop={8}
                >
                    <Text className="text-white font-kumbh text-xs">
                        Delete
                    </Text>
                </Pressable>
            ) : null}

            <View className="flex-1 p-3 justify-between">
                <View className="flex-row items-center justify-between gap-5">
                    <Text
                        className="flex-1 text-white text-[12px] font-kumbhBold uppercase"
                        numberOfLines={1}
                    >
                        {title}
                    </Text>
                    <Pressable
                        onPress={() => copyCode(code)}
                        style={{
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                        hitSlop={8}
                    >
                        <Copy size={15} color="#ffffff" />
                    </Pressable>
                </View>
                <View className="flex-row items-center justify-between gap-5">
                    <Text
                        className="flex-1 text-white/90 font-kumbh text-xs"
                        numberOfLines={1}
                    >
                        {description}
                    </Text>
                    <Text className="text-white/90 font-kumbh">{code}</Text>
                </View>
            </View>
        </Pressable>
    );
});

export default ChannelCard;
