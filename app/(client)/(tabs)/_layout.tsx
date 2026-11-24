import TabButton from "@/components/ui/TabButton";
import { Tabs, usePathname, useRouter, useSegments } from "expo-router";
import {
    ClipboardList,
    Home,
    MessageSquare,
    UserRound,
} from "lucide-react-native";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fetchChannels } from "@/redux/channels/channels.thunks";
import { selectAllChannels } from "@/redux/channels/channels.slice";
import { selectUser } from "@/redux/user/user.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const PRIMARY = "#4C5FAB";
const INACTIVE = "#9CA3AF";

export default function StaffTabsLayout() {
    const inset = useSafeAreaInsets();
    const router = useRouter();
    const pathname = usePathname();
    const segments = useSegments();
    const dispatch = useAppDispatch();

    // ✅ make sure channels exist so "first id" is not null
    useEffect(() => {
        dispatch(fetchChannels());
    }, [dispatch]);

    const user = useAppSelector(selectUser);
    const channels = useAppSelector(selectAllChannels);
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
    const clientProjects = channels.filter((channel) => Boolean(channel.clientRole));
    const projectChatId =
        clientProjects.find((project) => String(project._id) === linkedChannelId)
            ?._id || clientProjects[0]?._id || null;

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
                            ? 52 + inset.bottom
                            : Platform.OS === "ios"
                              ? 83
                              : 75,
                    backgroundColor: "#FFFFFF",
                    borderTopWidth: 1,
                    paddingHorizontal: 8,
                    borderTopColor: "#E5E7EB",
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
                            icon={Home}
                            width={75}
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
                            icon={ClipboardList}
                            width={75}
                        />
                    ),
                }}
            />

            <Tabs.Screen
                name="chats/index"
                listeners={{
                    tabPress: (e) => {
                        e.preventDefault();
                        if (projectChatId) {
                            router.push({
                                pathname: "/(client)/(tabs)/chats/[channelId]",
                                params: { channelId: projectChatId },
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
                            icon={MessageSquare}
                            width={75}
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
                            icon={UserRound}
                            width={75}
                        />
                    ),
                }}
            />
        </Tabs>
    );
}
