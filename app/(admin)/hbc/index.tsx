import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import { useRouter } from "expo-router";
import { ChevronRight, UsersRound } from "lucide-react-native";
import React from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HbcHomeScreen() {
    const isIOS = Platform.OS === "ios";
    const router = useRouter();

    return (
        <SafeAreaView
            edges={
                isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]
            }
            className="flex-1 bg-[#F5F7FB]"
        >
            <PlatformAdaptiveHeader title="HBC" backgroundColor="#F5F7FB" />
            <ScrollView
                className="flex-1"
                contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingTop: 12,
                    paddingBottom: 32,
                }}
                showsVerticalScrollIndicator={false}
            >
                <Pressable
                    onPress={() => router.push("/(admin)/hbc-members")}
                    className="flex-row items-center justify-between rounded-[24px] border border-gray-100 bg-white p-4 active:opacity-90"
                >
                    <View className="flex-1 flex-row items-center pr-3">
                        <View className="mr-3.5 h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF2FF]">
                            <UsersRound size={20} color="#4C5FAB" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-base font-kumbhBold text-[#111827]">
                                Members
                            </Text>
                            <Text className="mt-0.5 text-xs font-kumbh text-[#6B7280]">
                                View all HBC directory members
                            </Text>
                        </View>
                    </View>
                    <ChevronRight size={18} color="#9CA3AF" />
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    );
}
