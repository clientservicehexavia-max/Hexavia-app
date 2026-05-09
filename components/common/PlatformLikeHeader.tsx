import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React from "react";
import { Pressable, Text, View } from "react-native";

type Props = {
    title: string;
    // onBackPress: () => void;
    right?: React.ReactNode;
};

export default function PlatformLikeHeader({
    title,
    // onBackPress,
    right,
}: Props) {
    const router = useRouter();

    return (
        <View className=" px-2" style={{ height: 50 }}>
            <View className="flex-1 flex-row items-center justify-between">
                <Pressable
                    // onPress={onBackPress}
                    onPress={() => router.back()}
                    hitSlop={8}
                    className="w-12 h-12 items-center justify-center"
                >
                    <ArrowLeft size={24} color="#111827" />
                </Pressable>

                <Text className="font-kumbhBold text-[20px] text-center text-[#111827] ml-1">
                    {title}
                </Text>

                <View className="pr-1">
                    {right || <View className="w-12" />}
                </View>
            </View>
        </View>
    );
}
