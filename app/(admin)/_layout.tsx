import AuthGate from "@/components/AuthGate";
import { RootState } from "@/store";
import { useAppSelector } from "@/store/hooks";
import {
    canAccessFinanceManagement,
    canAccessTeamManagement,
} from "@/utils/roles";
import { Stack, router, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { View } from "react-native";

export default function AdminLayout() {
    const role = useAppSelector((s: RootState) => s.auth.user?.role);
    const pathname = usePathname();

    useEffect(() => {
        const currentPath = String(pathname || "");
        const hasAdminSegment = currentPath.includes("/(admin)");
        if (!hasAdminSegment) return;

        const isTeamRoute = currentPath.includes("/team");
        const isFinanceRoute = currentPath.includes("/finance");

        if (isTeamRoute && !canAccessTeamManagement(role)) {
            router.replace("/(admin)/(tabs)");
            return;
        }

        if (isFinanceRoute && !canAccessFinanceManagement(role)) {
            router.replace("/(admin)/(tabs)");
        }
    }, [pathname, role]);

    return (
        <>
            <StatusBar style="dark" />
            <AuthGate>
                <View style={{ flex: 1 }}>
                    <Stack
                        screenOptions={{
                            headerShown: false,
                            contentStyle: { backgroundColor: "#F3F4F6" }, // tailwind background
                            animation: "ios_from_right",
                        }}
                    />
                </View>
            </AuthGate>
        </>
    );
}
