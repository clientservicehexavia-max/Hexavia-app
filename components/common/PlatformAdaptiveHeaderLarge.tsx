import { Stack } from "expo-router";
import React from "react";
import { Platform, Text, View } from "react-native";

type Props = {
    title: string;
    headerLarge?: boolean;
    headerRight?: (props: { tintColor?: string }) => React.ReactNode;
};

export default function PlatformAdaptiveHeaderLarge({
    title,
    headerRight,
}: Props) {
    const isIOS = Platform.OS === "ios";

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: isIOS,
                    headerBackVisible: false,
                    title,
                    headerLargeTitle: true,
                    headerShadowVisible: false,
                    headerTitleStyle: {
                        fontFamily: "KumbhSans-Bold",
                        color: "#111827",
                    },
                    // headerLargeTitleStyle: {
                    //     fontFamily: "KumbhSans-Bold",
                    //     color: "#111827",
                    // },
                    headerLeft: () => null,
                    headerRight: isIOS ? headerRight : undefined,
                }}
            />

            {!isIOS ? (
                <View className="px-2" style={{ height: 50 }}>
                    <View className="flex-1 flex-row items-center justify-between">
                        <View className="w-12" />

                        <Text className="font-kumbhBold text-[20px] text-center text-[#111827] ml-1">
                            {title}
                        </Text>

                        <View className="pr-1">
                            {headerRight ? (
                                headerRight({ tintColor: "#111827" })
                            ) : (
                                <View className="w-12" />
                            )}
                        </View>
                    </View>
                </View>
            ) : null}
        </>
    );
}
