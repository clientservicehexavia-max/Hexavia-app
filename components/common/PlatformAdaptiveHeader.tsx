import { Stack, useRouter } from "expo-router";
import { Platform } from "react-native";

import PlatformLikeHeader from "@/components/common/PlatformLikeHeader";
import { HeaderBackButton } from "@react-navigation/elements";
import React from "react";

type Props = {
    title: string;
    // onBackPress: () => void;
    headerRight?: (props: { tintColor?: string }) => React.ReactNode;
    headerLeft?: (props: { tintColor?: string }) => React.ReactNode;
};

export default function PlatformAdaptiveHeader({
    title,
    // onBackPress,
    headerRight,
    headerLeft,
}: Props) {
    const isIOS = Platform.OS === "ios";
    const router = useRouter();

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: isIOS,
                    headerBackVisible: !isIOS,
                    title,
                    headerShadowVisible: false,
                    // headerStyle: { backgroundColor: "transparent" },
                    headerTitleStyle: {
                        fontFamily: "KumbhSans-Bold",
                        color: "#111827",
                        fontSize: 20,
                    },
                    headerLeft: headerLeft
                        ? headerLeft
                        : ({ tintColor }) => (
                              <HeaderBackButton
                                  tintColor={tintColor}
                                  //   onPress={onBackPress}
                                  onPress={() => router.back()}
                              />
                          ),
                    headerRight: isIOS ? headerRight : undefined,
                }}
            />

            {!isIOS ? (
                <PlatformLikeHeader
                    title={title}
                    // onBackPress={onBackPress}
                    right={
                        headerRight
                            ? headerRight({ tintColor: "#111827" })
                            : null
                    }
                />
            ) : null}
        </>
    );
}
