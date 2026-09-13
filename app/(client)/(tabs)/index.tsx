import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import LinkProjectCodeModal from "@/components/client/LinkProjectCodeModal";
import { ClientHeader } from "@/components/common/UserHeader";
import { selectAllChannels } from "@/redux/channels/channels.slice";
import {
    fetchChannels,
    inviteClientProjectMember,
    removeClientProjectMember,
} from "@/redux/channels/channels.thunks";
import { fetchProfile } from "@/redux/user/user.thunks";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { Plus } from "lucide-react-native";

export default function ClientHome() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const channels = useAppSelector(selectAllChannels);
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [inviteModalOpen, setInviteModalOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [refreshing, setRefreshing] = useState(false);

    const loadProjects = useCallback(async () => {
        await Promise.all([
            dispatch(fetchProfile()),
            dispatch(fetchChannels()),
        ]);
    }, [dispatch]);

    useEffect(() => {
        void loadProjects();
    }, [loadProjects]);

    const onRefresh = useCallback(async () => {
        if (refreshing) return;
        setRefreshing(true);
        try {
            await loadProjects();
        } finally {
            setRefreshing(false);
        }
    }, [loadProjects, refreshing]);

    const projects = useMemo(
        () => channels.filter((channel) => Boolean(channel.clientRole)),
        [channels],
    );
    const activeProject = projects[0];
    const activeProjectMembers = Array.from(
        new Map(
            ((activeProject?.members || []) as any[])
                .filter((member: any) =>
                    ["project_owner", "project_member"].includes(member?.type),
                )
                .map((member: any) => [
                    String(
                        member?._id?._id ||
                            member?._id ||
                            member?.email ||
                            member?.fullname ||
                            "",
                    ),
                    member,
                ]),
        ).values(),
    ) as any[];

    const activeProjectTasks =
        activeProject?.tasks?.filter((task) => task.visibility === "client") ||
        [];

    const handleInviteMember = async () => {
        const cleanEmail = inviteEmail.trim();
        if (!activeProject || !cleanEmail) return;

        await dispatch(
            inviteClientProjectMember({
                channelId: activeProject._id,
                email: cleanEmail,
            }),
        );
        setInviteEmail("");
        setInviteModalOpen(false);
    };

    const handleRemoveMember = async (member: any) => {
        if (!activeProject) return;

        const memberId = String(
            member?._id?._id ||
                member?._id ||
                member?.userId ||
                member?.email ||
                "",
        );
        if (!memberId) return;

        const memberName =
            member?.fullname ||
            member?.name ||
            member?.email ||
            "this member";

        Alert.alert(
            "Remove member",
            `Remove ${memberName} from this project?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        await dispatch(
                            removeClientProjectMember({
                                channelId: activeProject._id,
                                userId: memberId,
                            }),
                        ).unwrap();
                        await dispatch(fetchChannels());
                    },
                },
            ],
        );
    };

    const completedTasks = activeProjectTasks.filter(
        (task) => task.status === "completed",
    ).length;
    const taskProgress = activeProjectTasks.length
        ? (completedTasks / activeProjectTasks.length) * 100
        : 0;

    return (
        <SafeAreaView
            className="flex-1 bg-white"
            edges={["top", "left", "right"]}
        >
            <ScrollView
                className="flex-1 px-4"
                contentContainerStyle={{ paddingBottom: 32 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={["#4C5FAB"]}
                        tintColor="#4C5FAB"
                    />
                }
            >
                <ClientHeader />

                {!activeProject ? (
                    <View className="mt-5 rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-sm">
                        <Text className="text-lg text-[#111827] font-kumbhBold">
                            No project connected
                        </Text>
                        <Text className="mt-2 text-gray-500 font-kumbh">
                            Enter the project code shared by Hexavia. The first
                            client to connect becomes the project owner.
                        </Text>
                        <Pressable
                            onPress={() => setShowLinkModal(true)}
                            className="mt-4 rounded-xl bg-[#4C5FAB] px-4 py-3"
                        >
                            <Text className="text-center text-white font-kumbhBold">
                                Add project code
                            </Text>
                        </Pressable>
                    </View>
                ) : (
                    <View className="mt-5 gap-5">
                        <View className="rounded-[24px] bg-[#EEF2FF] p-4">
                            <Text className="text-sm text-[#4C5FAB] font-kumbhBold uppercase tracking-[0.12em]">
                                Project
                            </Text>
                            <Text className="mt-3 text-2xl text-[#111827] font-kumbhBold">
                                {activeProject.name}
                            </Text>
                            <Text className="mt-1 text-sm text-gray-600 font-kumbh">
                                Project linked and ready
                            </Text>
                        </View>

                        <View className="rounded-[24px] border border-[#E6EBFF] bg-white p-5 shadow-sm">
                            <View className="mb-3 flex-row items-center justify-between">
                                <Text className="text-sm text-gray-500 font-kumbh">
                                    Client tasks
                                </Text>
                                <Text className="text-sm text-[#111827] font-kumbhBold">
                                    {completedTasks} /{" "}
                                    {activeProjectTasks.length}
                                </Text>
                            </View>
                            <View className="h-2 overflow-hidden rounded-full bg-[#E5E7EB]">
                                <View
                                    className="h-full rounded-full bg-[#4C5FAB]"
                                    style={{
                                        width: `${activeProjectTasks.length ? taskProgress : 0}%`,
                                    }}
                                />
                            </View>
                        </View>

                        {activeProjectMembers.length ? (
                            <View className="px-1">
                                <View className="mb-3 flex-row items-center justify-between">
                                    <Text className="text-sm uppercase tracking-[0.12em] text-[#6B7280] font-kumbhBold">
                                        Members
                                    </Text>
                                    <Pressable
                                        onPress={() => {
                                            setInviteEmail("");
                                            setInviteModalOpen(true);
                                        }}
                                        className="h-8 w-8 items-center justify-center"
                                    >
                                        <Plus size={22} color="#4C5FAB" />
                                    </Pressable>
                                </View>
                                <View className="gap-2">
                                    {activeProjectMembers.map((member: any) => {
                                        const name =
                                            member.fullname ||
                                            member.name ||
                                            "Project member";
                                        const isOwner =
                                            member.type === "project_owner";

                                        return (
                                            <View
                                                key={String(
                                                    member?._id?._id ||
                                                        member?._id ||
                                                        member?.email ||
                                                        name,
                                                )}
                                                className="flex-row items-center justify-between rounded-xl py-1"
                                            >
                                                <View className="flex-1 pr-2">
                                                    <Text className="text-[#111827] font-kumbhBold">
                                                        {name}
                                                    </Text>
                                                    <Text className="text-[11px] text-[#4C5FAB] font-kumbhBold uppercase tracking-[0.08em]">
                                                        {isOwner
                                                            ? "Owner"
                                                            : "Member"}
                                                    </Text>
                                                </View>

                                                {!isOwner ? (
                                                    <Pressable
                                                        onPress={() =>
                                                            handleRemoveMember(member)
                                                        }
                                                        className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-2 py-1"
                                                    >
                                                        <Text className="text-[11px] text-[#B91C1C] font-kumbhBold">
                                                            Remove
                                                        </Text>
                                                    </Pressable>
                                                ) : null}
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                        ) : null}
                    </View>
                )}
            </ScrollView>

            <Modal
                transparent
                visible={inviteModalOpen}
                animationType="fade"
                onRequestClose={() => setInviteModalOpen(false)}
            >
                <View className="flex-1 items-center justify-center bg-black/30 px-5">
                    <View className="w-full rounded-[24px] bg-white p-5">
                        <Text className="text-xl text-[#111827] font-kumbhBold">
                            Invite member
                        </Text>
                        <Text className="mt-2 text-sm text-gray-500 font-kumbh">
                            Enter the email address of the person to add to this
                            project.
                        </Text>

                        <TextInput
                            value={inviteEmail}
                            onChangeText={setInviteEmail}
                            placeholder="name@email.com"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            className="mt-4 rounded-xl border border-[#D9E2FF] bg-[#F8F9FF] px-3 py-3 text-gray-900 font-kumbh"
                        />

                        <View className="mt-5 flex-row justify-end gap-3">
                            <Pressable
                                onPress={() => setInviteModalOpen(false)}
                                className="rounded-xl px-4 py-2"
                            >
                                <Text className="text-[#4C5FAB] font-kumbhBold">
                                    Cancel
                                </Text>
                            </Pressable>
                            <Pressable
                                onPress={handleInviteMember}
                                className="rounded-xl bg-[#4C5FAB] px-4 py-2"
                            >
                                <Text className="text-white font-kumbhBold">
                                    Invite
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            <LinkProjectCodeModal
                visible={showLinkModal}
                onClose={() => setShowLinkModal(false)}
                onLinked={() => {
                    setShowLinkModal(false);
                    dispatch(fetchProfile());
                    dispatch(fetchChannels());
                }}
            />
        </SafeAreaView>
    );
}
