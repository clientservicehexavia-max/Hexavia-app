import AuthGate from "@/components/AuthGate";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { View } from "react-native";

export default function AdminLayout() {
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
