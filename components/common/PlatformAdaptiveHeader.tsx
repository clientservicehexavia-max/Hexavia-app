import { Stack, useRouter } from "expo-router";
import { Platform, Pressable, Text } from "react-native";

import PlatformLikeHeader from "@/components/common/PlatformLikeHeader";
import { HeaderBackButton } from "@react-navigation/elements";
import { StatusBar } from "expo-status-bar";
import React from "react";

type Props = {
    title: string;
    description?: string;
    multilineTitle?: boolean;
    onTitlePress?: () => void;
    // onBackPress: () => void;
    headerRight?: (props: { tintColor?: string }) => React.ReactNode;
    headerLeft?: (props: { tintColor?: string }) => React.ReactNode;
    backgroundColor?: string;
};

export default function PlatformAdaptiveHeader({
    title,
    description,
    multilineTitle = false,
    onTitlePress,
    // onBackPress,
    headerRight,
    headerLeft,
    backgroundColor = "#FFF",
}: Props) {
    const isIOS = Platform.OS === "ios";
    const router = useRouter();
    const headerLeftResolved = React.useMemo(() => {
        if (headerLeft) return headerLeft;
        return ({ tintColor }: { tintColor?: string }) => (
            <HeaderBackButton
                tintColor={tintColor}
                onPress={() => router.back()}
            />
        );
    }, [headerLeft, router]);

    const headerTitleComponent = React.useMemo(() => {
        if (!multilineTitle) return undefined;
        return () => (
            <Pressable
                onPress={onTitlePress}
                disabled={!onTitlePress}
                hitSlop={8}
                style={{
                    flex: 1,
                    justifyContent: "flex-end",
                    alignItems: "flex-start",
                    opacity: onTitlePress ? 1 : 1,
                    marginRight: 50,
                }}
            >
                <Text
                    numberOfLines={1}
                    style={{
                        fontFamily: "KumbhSans-Bold",
                        color: "#111827",
                        fontSize: 20,
                        textAlign: "left",
                    }}
                >
                    {title}
                </Text>
                {description ? (
                    <Text
                        numberOfLines={1}
                        style={{
                            marginTop: 2,
                            fontFamily: "KumbhSans-Regular",
                            color: "#6B7280",
                            fontSize: 12,
                            textAlign: "left",
                        }}
                    >
                        {description}
                    </Text>
                ) : null}
            </Pressable>
        );
    }, [multilineTitle, onTitlePress, title, description]);

    const headerRightResolved = React.useMemo(() => {
        return headerRight;
    }, [headerRight]);

    const options = React.useMemo(() => {
        return {
            headerShown: isIOS,
            headerStyle: { backgroundColor },
            headerBackVisible: !isIOS,
            title: multilineTitle ? undefined : title,
            headerShadowVisible: false,
            headerTitleAlign: multilineTitle ? "left" : "center",
            headerTitle: headerTitleComponent,
            headerTitleStyle: {
                fontFamily: "KumbhSans-Bold",
                color: "#111827",
                fontSize: 20,
            },
            headerLeft: headerLeftResolved,
            headerRight: headerRightResolved,
        } as const;
    }, [
        isIOS,
        backgroundColor,
        multilineTitle,
        title,
        headerTitleComponent,
        headerLeftResolved,
        headerRightResolved,
    ]);

    return (
        <>
            <Stack.Screen options={options} />

            {!isIOS ? (
                <PlatformLikeHeader
                    title={title}
                    description={description}
                    multilineTitle={multilineTitle}
                    onTitlePress={onTitlePress}
                    backgroundColor={backgroundColor}
                    left={
                        headerLeft
                            ? headerLeft({ tintColor: "#111827" })
                            : undefined
                    }
                    right={
                        headerRight
                            ? headerRight({ tintColor: "#111827" })
                            : null
                    }
                />
            ) : null}

            <StatusBar style="dark" backgroundColor={backgroundColor} />
        </>
    );
}
