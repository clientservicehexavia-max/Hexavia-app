import { Plus } from "lucide-react-native";
import React from "react";
import { Pressable, Text, View } from "react-native";

type Props = {
    width: number;
    gap: number;
    onPress: () => void;
};

export default function CreateChannelCard({ width, gap, onPress }: Props) {
    const CARD_HEIGHT = 130;
    const REDUCED_WIDTH = width * 0.6;

    return (
        <Pressable
            onPress={onPress}
            style={{
                width: REDUCED_WIDTH,
                marginRight: gap,
                height: CARD_HEIGHT,
            }}
            testID="create-channel-card"
        >
            <View className="flex-1 rounded-2xl bg-white border border-dashed border-primary/40 p-4 justify-between">
                <View className="flex-row items-center gap-2">
                    <View className="h-7 w-7 rounded-lg bg-primary/10 items-center justify-center">
                        <Plus size={15} color="#4C5FAB" />
                    </View>
                    <Text className="font-kumbhBold text-sm text-primary">
                        New Project
                    </Text>
                </View>

                <Text className="font-kumbh text-[11px] text-gray-400 leading-4">
                    Start a space for your team to plan and chat.
                </Text>
            </View>
        </Pressable>
    );
}
