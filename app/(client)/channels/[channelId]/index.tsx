import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ClientProjectDetails() {
    const { channelId } = useLocalSearchParams<{ channelId: string }>();
    const router = useRouter();

    useEffect(() => {
        if (!channelId) return;

        router.replace({
            pathname: "/(client)/(tabs)/chats/[channelId]",
            params: { channelId },
        });
    }, [channelId, router]);

    return (
        <SafeAreaView className="flex-1 items-center justify-center bg-[#F5F7FF]">
            <Text className="text-gray-500 font-kumbh">Loading project…</Text>
        </SafeAreaView>
    );
}
