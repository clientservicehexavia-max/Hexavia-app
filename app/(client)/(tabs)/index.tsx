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

import CustomTextInput from "@/components/ui/CustomInput";
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
            className="flex-1 bg-[#F5F7FB]"
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
                    <View className="mt-4 rounded-[24px] border border-gray-100 bg-white p-5">
                        <Text className="font-kumbhBold text-lg text-[#111827]">
                            No project connected
                        </Text>
                        <Text className="mt-2 font-kumbh text-sm leading-5 text-gray-500">
                            Enter the project code shared by Hexavia. The first
                            client to connect becomes the project owner.
                        </Text>
                        <Pressable
                            onPress={() => setShowLinkModal(true)}
                            className="mt-4 rounded-2xl bg-primary px-4 py-3.5"
                        >
                            <Text className="text-center font-kumbhBold text-white">
                                Add project code
                            </Text>
                        </Pressable>
                    </View>
                ) : (
                    <View className="mt-3 gap-4">
                        <View className="overflow-hidden rounded-[28px] bg-primary p-5">
                            <View className="absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white/10" />
                            <View className="absolute -bottom-12 -left-10 h-36 w-36 rounded-full bg-white/10" />
                            <Text className="font-kumbhBold text-xs uppercase tracking-[2px] text-white/75">
                                Project
                            </Text>
                            <Text className="mt-2 font-kumbhBold text-2xl text-white">
                                {activeProject.name}
                            </Text>
                            <Text className="mt-1 font-kumbh text-sm text-white/80">
                                Project linked and ready
                            </Text>
                        </View>

                        <View className="rounded-[24px] border border-gray-100 bg-white p-5">
                            <View className="mb-3 flex-row items-center justify-between">
                                <Text className="font-kumbh text-sm text-gray-500">
                                    Client tasks
                                </Text>
                                <Text className="font-kumbhBold text-sm text-[#111827]">
                                    {completedTasks} /{" "}
                                    {activeProjectTasks.length}
                                </Text>
                            </View>
                            <View className="h-2.5 overflow-hidden rounded-full bg-[#EEF2FF]">
                                <View
                                    className="h-full rounded-full bg-primary"
                                    style={{
                                        width: `${activeProjectTasks.length ? taskProgress : 0}%`,
                                    }}
                                />
                            </View>
                        </View>

                        {activeProjectMembers.length ? (
                            <View className="rounded-[24px] border border-gray-100 bg-white p-4">
                                <View className="mb-3 flex-row items-center justify-between">
                                    <Text className="font-kumbhBold text-xs uppercase tracking-[1.5px] text-gray-500">
                                        Members
                                    </Text>
                                    <Pressable
                                        onPress={() => {
                                            setInviteEmail("");
                                            setInviteModalOpen(true);
                                        }}
                                        className="h-9 w-9 items-center justify-center rounded-xl bg-[#EEF2FF]"
                                    >
                                        <Plus size={18} color="#4C5FAB" />
                                    </Pressable>
                                </View>
                                <View>
                                    {activeProjectMembers.map(
                                        (member: any, idx: number) => {
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
                                                    className={`flex-row items-center justify-between py-3 ${
                                                        idx <
                                                        activeProjectMembers.length -
                                                            1
                                                            ? "border-b border-gray-100"
                                                            : ""
                                                    }`}
                                                >
                                                    <View className="flex-1 pr-2">
                                                        <Text className="font-kumbhBold text-[#111827]">
                                                            {name}
                                                        </Text>
                                                        <Text className="mt-0.5 font-kumbhBold text-[11px] uppercase tracking-[0.08em] text-primary">
                                                            {isOwner
                                                                ? "Owner"
                                                                : "Member"}
                                                        </Text>
                                                    </View>

                                                    {!isOwner ? (
                                                        <Pressable
                                                            onPress={() =>
                                                                handleRemoveMember(
                                                                    member,
                                                                )
                                                            }
                                                            className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-1.5"
                                                        >
                                                            <Text className="font-kumbhBold text-[11px] text-[#B91C1C]">
                                                                Remove
                                                            </Text>
                                                        </Pressable>
                                                    ) : null}
                                                </View>
                                            );
                                        },
                                    )}
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
                <View className="flex-1 items-center justify-center bg-black/40 px-5">
                    <View className="w-full rounded-[28px] border border-gray-100 bg-white p-6">
                        <Text className="font-kumbhBold text-xl text-[#111827]">
                            Invite member
                        </Text>
                        <Text className="mt-2 font-kumbh text-sm text-gray-500">
                            Enter the email address of the person to add to this
                            project.
                        </Text>

                        <View className="mt-4 h-14 justify-center rounded-2xl border border-gray-200 bg-[#F9FAFB] px-4">
                            <CustomTextInput
                                value={inviteEmail}
                                onChangeText={setInviteEmail}
                                placeholder="name@email.com"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                className="h-full w-full"
                            />
                        </View>

                        <View className="mt-5 flex-row justify-end gap-2.5">
                            <Pressable
                                onPress={() => setInviteModalOpen(false)}
                                className="rounded-2xl border border-gray-200 bg-[#F5F7FB] px-4 py-2.5"
                            >
                                <Text className="font-kumbhBold text-gray-700">
                                    Cancel
                                </Text>
                            </Pressable>
                            <Pressable
                                onPress={handleInviteMember}
                                className="rounded-2xl bg-primary px-5 py-2.5"
                            >
                                <Text className="font-kumbhBold text-white">
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
