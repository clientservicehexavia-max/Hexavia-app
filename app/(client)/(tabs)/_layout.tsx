import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs, usePathname, useRouter, useSegments } from "expo-router";
import React, { useEffect } from "react";
import { Text, View } from "react-native";

import { fetchChannels } from "@/redux/channels/channels.thunks";
import { selectUser } from "@/redux/user/user.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

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
    const router = useRouter();
    const pathname = usePathname();
    const segments = useSegments();
    const dispatch = useAppDispatch();

    // ✅ make sure channels exist so "first id" is not null
    useEffect(() => {
        dispatch(fetchChannels());
    }, [dispatch]);

    const user = useAppSelector(selectUser);
    const linkedChannelId =
        typeof (user as any)?.linkedChannelId === "string"
            ? (user as any).linkedChannelId
            : (user as any)?.linkedChannelId?._id
              ? String((user as any).linkedChannelId._id)
              : null;
    const isChatRouteActive =
        segments.includes("chats") ||
        pathname === "/chats" ||
        pathname.startsWith("/chats/");

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarShowLabel: false,
                tabBarActiveTintColor: PRIMARY,
                tabBarInactiveTintColor: INACTIVE,
                tabBarStyle: {
                    height: 75,
                    backgroundColor: "#FFFFFF",
                    borderTopWidth: 1,
                    paddingHorizontal: 18,
                    paddingVertical: 10,
                    paddingTop: 6,
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
                name="chats/index"
                listeners={{
                    tabPress: (e) => {
                        e.preventDefault();
                        if (linkedChannelId) {
                            router.push({
                                pathname: "/(client)/(tabs)/chats/[channelId]",
                                params: { channelId: linkedChannelId },
                            });
                            return;
                        }

                        router.push("/(client)/(tabs)/chats");
                    },
                }}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabButton
                            focused={focused || isChatRouteActive}
                            label="Chat"
                            activeName="chatbubble"
                            inactiveName="chatbubble-outline"
                        />
                    ),
                }}
            />

            <Tabs.Screen name="chats/[channelId]" options={{ href: null }} />

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
