import TabButton from "@/components/ui/TabButton";
import { RootState } from "@/store";
import { useAppSelector } from "@/store/hooks";
import { canAccessTeamManagement } from "@/utils/roles";
import { Tabs } from "expo-router";
import {
    FolderKanban,
    Home,
    UserRound,
    Users,
    UsersRound,
} from "lucide-react-native";
import { default as React } from "react";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PRIMARY = "#4C5FAB";
const INACTIVE = "#9CA3AF";

export default function AdminTabsLayout() {
    const inset = useSafeAreaInsets();
    const role = useAppSelector(
        (s: RootState) => s.auth.user?.role ?? s.user.user?.role,
    );
    const showTeamTab = canAccessTeamManagement(role);

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
                        />
                    ),
                }}
            />

            <Tabs.Screen
                name="client"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabButton
                            focused={focused}
                            label="Client"
                            icon={Users}
                        />
                    ),
                }}
            />

            <Tabs.Screen
                name="team"
                options={{
                    href: showTeamTab ? undefined : null,
                    tabBarIcon: ({ focused }) => (
                        <TabButton
                            focused={focused}
                            label="Team"
                            icon={UsersRound}
                        />
                    ),
                }}
            />

            <Tabs.Screen
                name="project"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabButton
                            focused={focused}
                            label="Project"
                            icon={FolderKanban}
                        />
                    ),
                }}
            />

            <Tabs.Screen
                name="profile"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabButton
                            focused={focused}
                            label="Profile"
                            icon={UserRound}
                        />
                    ),
                }}
            />
        </Tabs>
    );
}
