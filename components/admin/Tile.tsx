import React from "react";
import { Pressable, Text, View } from "react-native";

export default function Tile({
    title,
    icon,
    onPress,
}: {
    title: string;
    icon: React.ReactNode;
    onPress?: () => void;
}) {
    return (
        <Pressable
            onPress={onPress}
            className="flex-1 h-32 rounded-xl bg-primary-500 active:opacity-90"
            style={{ overflow: "hidden" }}
        >
            <View className="flex-1 p-4 justify-between">
                <View className="opacity-90">{icon}</View>
                <View className="flex-row items-center justify-between">
                    <Text className="text-white text-3xl font-kumbhBold">
                        {title}
                    </Text>
                    <Text className="text-white text-2xl">↗︎</Text>
                </View>
            </View>
        </Pressable>
    );
}
