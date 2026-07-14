import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { Platform, Text, View } from "react-native";

import { selectFirstChannelId } from "@/redux/channels/channels.selectors";
import { fetchChannels } from "@/redux/channels/channels.thunks";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PRIMARY = "#4C5FAB";
const INACTIVE = "#9CA3AF";

function TabButton({
    focused,
    label,
    activeName,
    inactiveName,
}: {
    focused: boolean;
    label: string;
    activeName: React.ComponentProps<typeof Ionicons>["name"];
    inactiveName: React.ComponentProps<typeof Ionicons>["name"];
}) {
    return (
        <View
            className="rounded-xl"
            style={{
                paddingVertical: 6,
                paddingHorizontal: 12,
                alignItems: "center",
                backgroundColor: "transparent",
                width: 75,
            }}
        >
            <Ionicons
                name={focused ? activeName : inactiveName}
                size={24}
                color={focused ? PRIMARY : INACTIVE}
            />
            <Text
                style={{
                    marginTop: 4,
                    fontSize: 12,
                    fontFamily: focused
                        ? "KumbhSans-Bold"
                        : "KumbhSans-Regular",
                    fontWeight: "500",
                    color: focused ? PRIMARY : INACTIVE,
                }}
            >
                {label}
            </Text>
        </View>
    );
}

export default function StaffTabsLayout() {
    const inset = useSafeAreaInsets();
    const router = useRouter();
    const dispatch = useAppDispatch();

    // ✅ make sure channels exist so "first id" is not null
    useEffect(() => {
        dispatch(fetchChannels());
    }, [dispatch]);

    const firstChannelId = useAppSelector(selectFirstChannelId);

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarShowLabel: false,
                tabBarActiveTintColor: PRIMARY,
                tabBarInactiveTintColor: INACTIVE,
                tabBarStyle: {
                    height:
                        Platform.OS === "android" && inset.bottom !== 0
                            ? 49 + inset.bottom
                            : Platform.OS === "ios"
                              ? 83
                              : 75,
                    backgroundColor: "#F3F4F6",
                    borderTopWidth: 1,
                    paddingHorizontal: 8,
                    // paddingVertical: 10,
                    // paddingTop: 6,
                    borderTopColor: "#eee",
                },
                tabBarItemStyle: { paddingVertical: 4 },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabButton
                            focused={focused}
                            label="Home"
                            activeName="home"
                            inactiveName="home-outline"
                        />
                    ),
                }}
            />

            <Tabs.Screen
                name="tasks/index"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabButton
                            focused={focused}
                            label="Task"
                            activeName="clipboard"
                            inactiveName="clipboard-outline"
                        />
                    ),
                }}
            />

            <Tabs.Screen
                name="chats/[channelId]"
                listeners={{
                    tabPress: (e) => {
                        if (!firstChannelId) return;
                        e.preventDefault();
                        router.push({
                            pathname: "/(staff)/(tabs)/chats/[channelId]",
                            params: { channelId: firstChannelId },
                        });
                    },
                }}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabButton
                            focused={focused}
                            label="Chat"
                            activeName="chatbubble"
                            inactiveName="chatbubble-outline"
                        />
                    ),
                }}
            />

            <Tabs.Screen
                name="profile/index"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabButton
                            focused={focused}
                            label="Profile"
                            activeName="person"
                            inactiveName="person-outline"
                        />
                    ),
                }}
            />
        </Tabs>
    );
}
