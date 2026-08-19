import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React from "react";
import { Pressable, Text, View } from "react-native";

type Props = {
    title: string;
    description?: string;
    multilineTitle?: boolean;
    onTitlePress?: () => void;
    // onBackPress: () => void;
    left?: React.ReactNode;
    right?: React.ReactNode;
    backgroundColor?: string;
};

export default function PlatformLikeHeader({
    title,
    description,
    multilineTitle = false,
    onTitlePress,
    backgroundColor,
    // onBackPress,
    left,
    right,
}: Props) {
    const router = useRouter();

    return (
        <View
            style={{
                height: 52,
                backgroundColor: backgroundColor,
            }}
        >
            <View
                className="flex-1 flex-row items-center justify-between"
                style={multilineTitle ? { alignItems: "center" } : undefined}
            >
                {left ?? (
                    <Pressable
                        // onPress={onBackPress}
                        onPress={() => router.back()}
                        hitSlop={8}
                        className="w-12 h-12 items-center justify-center"
                    >
                        <ArrowLeft size={24} color="#111827" />
                    </Pressable>
                )}

                {multilineTitle ? (
                    <Pressable
                        onPress={onTitlePress}
                        disabled={!onTitlePress}
                        hitSlop={8}
                        className="flex-1 px-2 pt-2"
                    >
                        <Text
                            className="font-kumbhBold text-[18px] text-left text-[#111827]"
                            numberOfLines={1}
                        >
                            {title}
                        </Text>
                        {description ? (
                            <Text
                                numberOfLines={1}
                                className="mt-0.5 font-kumbh text-[12px] leading-4 text-[#6B7280]"
                            >
                                {description}
                            </Text>
                        ) : null}
                    </Pressable>
                ) : (
                    <Text className="font-kumbhBold text-[18px] text-center text-[#111827] ml-1">
                        {title}
                    </Text>
                )}

                <View className="pr-1">
                    {right || <View className="w-12" />}
                </View>
            </View>
        </View>
    );
}
