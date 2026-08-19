import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import LinkProjectCodeModal from "@/components/client/LinkProjectCodeModal";
import BotpressFab from "@/components/common/BotpressFab";
import { ClientHeader } from "@/components/common/UserHeader";
import SanctionCard from "@/components/staff/SanctionCard";
import TaskOverview from "@/components/staff/TaskOverviewCard";
import { selectUser } from "@/redux/user/user.slice";
import { fetchProfile } from "@/redux/user/user.thunks";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const toStr = (v: any) => (v == null ? "" : String(v));

export default function StaffHome() {
    const router = useRouter();
    const dispatch = useAppDispatch();

    const user = useAppSelector(selectUser);
    const linkedChannelId =
        typeof (user as any)?.linkedChannelId === "string"
            ? (user as any).linkedChannelId
            : (user as any)?.linkedChannelId?._id
              ? String((user as any).linkedChannelId._id)
              : null;
    const isProjectLinked = Boolean(linkedChannelId);
    const userId = toStr(user?._id);

    useEffect(() => {
        if (!user) dispatch(fetchProfile());
    }, [dispatch]);

    const [showLinkModal, setShowLinkModal] = useState(false);
    const [dismissedAutoPrompt, setDismissedAutoPrompt] = useState(false);

    useEffect(() => {
        if (!userId || isProjectLinked || dismissedAutoPrompt) return;
        setShowLinkModal(true);
    }, [userId, isProjectLinked, dismissedAutoPrompt]);

    return (
        <SafeAreaView
            className="flex-1 bg-white"
            edges={["top", "left", "right"]}
        >
            <ScrollView
                contentContainerStyle={{ paddingBottom: 32 }}
                className="px-5"
                showsVerticalScrollIndicator={false}
                directionalLockEnabled
                alwaysBounceVertical={false}
            >
                {/* Top Bar */}
                <ClientHeader />
                {/* Channels */}
                <View className="mt-6 flex-row items-center justify-between">
                    <Text className="text-3xl text-gray-900 font-kumbh">
                        Project
                    </Text>
                    {!isProjectLinked ? (
                        <Pressable
                            onPress={() => setShowLinkModal(true)}
                            className="px-3 py-2 rounded-xl bg-[#4C5FAB]"
                        >
                            <Text className="text-white font-kumbhBold text-[12px]">
                                Add Project Code
                            </Text>
                        </Pressable>
                    ) : null}
                </View>

                {isProjectLinked ? (
                    <View className="mt-3 rounded-2xl border border-[#E5E7EB] bg-[#F8FAFF] px-4 py-3">
                        <Text className="text-[#111827] font-kumbhBold">
                            Linked project
                        </Text>
                        <Text className="text-gray-500 font-kumbh mt-1">
                            Code: {(user as any)?.linkedProjectCode || "—"}
                        </Text>
                        <Pressable
                            onPress={() =>
                                router.push({
                                    pathname:
                                        "/(client)/(tabs)/chats/[channelId]",
                                    params: {
                                        channelId: String(linkedChannelId),
                                    },
                                })
                            }
                            className="mt-3 h-11 rounded-xl bg-[#4C5FAB] items-center justify-center"
                        >
                            <Text className="text-white font-kumbhBold">
                                Open Project Chat
                            </Text>
                        </Pressable>
                    </View>
                ) : (
                    <View className="mt-3 rounded-2xl border border-[#E5E7EB] bg-[#F8FAFF] px-4 py-3">
                        <Text className="text-[#111827] font-kumbhBold">
                            Project not linked
                        </Text>
                        <Text className="text-gray-500 font-kumbh mt-1">
                            Add your project code to access your project chat
                            and resources.
                        </Text>
                    </View>
                )}
                {/* Task */}
                <TaskOverview />
                {/* Sanction */}
                <SanctionCard />
            </ScrollView>

            <LinkProjectCodeModal
                visible={showLinkModal}
                onClose={() => {
                    setShowLinkModal(false);
                    setDismissedAutoPrompt(true);
                }}
                onLinked={() => {
                    setDismissedAutoPrompt(false);
                    setShowLinkModal(false);
                }}
            />
            <BotpressFab title="Hexavia Assistant" />
        </SafeAreaView>
    );
}
