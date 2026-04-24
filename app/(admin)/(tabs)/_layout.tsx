import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs, useRouter } from "expo-router";
import React from "react";
import { Text, View } from "react-native";

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
                paddingHorizontal: 8,
                alignItems: "center",
                backgroundColor: "transparent",
                width: 66,
            }}
        >
            <Ionicons
                name={focused ? activeName : inactiveName}
                size={22}
                color={focused ? PRIMARY : INACTIVE}
            />
            <Text
                style={{
                    marginTop: 4,
                    fontSize: 11,
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

export default function AdminTabsLayout() {
    const router = useRouter();

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
                    paddingHorizontal: 8,
                    paddingVertical: 10,
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
                name="client"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabButton
                            focused={focused}
                            label="Client"
                            activeName="people"
                            inactiveName="people-outline"
                        />
                    ),
                }}
            />

            <Tabs.Screen
                name="team"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabButton
                            focused={focused}
                            label="Team"
                            activeName="people-circle"
                            inactiveName="people-circle-outline"
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
                            activeName="folder"
                            inactiveName="folder-outline"
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
                            activeName="person"
                            inactiveName="person-outline"
                        />
                    ),
                }}
            />
        </Tabs>
    );
}
