import LinkProjectCodeModal from "@/components/client/LinkProjectCodeModal";
import { selectAllChannels } from "@/redux/channels/channels.slice";
import { fetchChannels } from "@/redux/channels/channels.thunks";
import { selectUser } from "@/redux/user/user.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

export default function ClientChatEntryScreen() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const user = useAppSelector(selectUser);
    const channels = useAppSelector(selectAllChannels);
    const channelsStatus = useAppSelector((state) => state.channels.status);
    const linkedChannelId =
        typeof (user as any)?.linkedChannelId === "string"
            ? (user as any).linkedChannelId
            : (user as any)?.linkedChannelId?._id
              ? String((user as any).linkedChannelId._id)
              : null;

    const [showLinkModal, setShowLinkModal] = useState(false);

    useEffect(() => {
        dispatch(fetchChannels());
    }, [dispatch]);

    const projectId = useMemo(() => {
        const projects = channels.filter((channel) => Boolean(channel.clientRole));
        const legacyProject = projects.find(
            (project) => String(project._id) === linkedChannelId,
        );
        return legacyProject?._id || projects[0]?._id || null;
    }, [channels, linkedChannelId]);

    useEffect(() => {
        if (!projectId) return;
        router.replace({
            pathname: "/(client)/(tabs)/chats/[channelId]",
            params: { channelId: projectId },
        });
    }, [projectId, router]);

    if (channelsStatus === "loading" && !projectId) {
        return (
            <View className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator color="#4C5FAB" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-white px-6 justify-center">
            <View className="rounded-3xl border border-gray-200 p-6 bg-[#F8FAFF]">
                <Text className="text-xl text-[#111827] font-kumbhBold text-center">
                    Project Not Linked
                </Text>
                <Text className="mt-2 text-sm text-gray-500 font-kumbh text-center">
                    You have not linked your project yet. Add your project code
                    to access your project chat.
                </Text>

                <Pressable
                    onPress={() => setShowLinkModal(true)}
                    className="mt-5 h-12 rounded-2xl bg-[#4C5FAB] items-center justify-center"
                >
                    <Text className="text-white font-kumbhBold">
                        Add Project Code
                    </Text>
                </Pressable>
            </View>

            <LinkProjectCodeModal
                visible={showLinkModal}
                onClose={() => setShowLinkModal(false)}
                onLinked={() => {
                    setShowLinkModal(false);
                    dispatch(fetchChannels());
                }}
            />
        </View>
    );
}
