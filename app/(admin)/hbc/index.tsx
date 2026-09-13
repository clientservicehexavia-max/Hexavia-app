import Tile from "@/components/admin/Tile";
import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import { useRouter } from "expo-router";
import { UsersRound } from "lucide-react-native";
import React from "react";
import { Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HbcHomeScreen() {
    const isIOS = Platform.OS === "ios";
    const router = useRouter();

    return (
        <SafeAreaView
            edges={
                isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]
            }
            className="flex-1 bg-white"
        >
            <PlatformAdaptiveHeader title="HBC" />
            <ScrollView className="flex-1 px-4 pb-8 mt-3">
                <View className="flex-row gap-2">
                    <Tile
                        title="Members"
                        icon={<UsersRound size={22} color="white" />}
                        onPress={() => router.push("/(admin)/hbc-members")}
                    />
                    <View className="flex-1" />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
