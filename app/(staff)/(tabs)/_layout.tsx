import TabButton from "@/components/ui/TabButton";
import { selectFirstChannelId } from "@/redux/channels/channels.selectors";
import { fetchChannels } from "@/redux/channels/channels.thunks";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { Tabs, useRouter } from "expo-router";
import {
    ClipboardList,
    Home,
    MessageSquare,
    UserRound,
} from "lucide-react-native";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PRIMARY = "#4C5FAB";
const INACTIVE = "#9CA3AF";

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
                            icon={MessageSquare}
                            width={75}
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
                            icon={UserRound}
                            width={75}
                        />
                    ),
                }}
            />
        </Tabs>
    );
}
