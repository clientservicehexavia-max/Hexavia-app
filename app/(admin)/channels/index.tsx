import { api } from "@/api/axios";
import ChannelCard from "@/components/admin/ChannelCard";
import EditChannelModal from "@/components/admin/EditChannelModal";
import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import { showSuccess } from "@/components/ui/toast";
import { PRIMARY } from "@/constants/Colors";
import { deleteChannelById } from "@/redux/channels/channels.thunks";
import type { Channel } from "@/redux/channels/channels.types";
import { useAppDispatch } from "@/store/hooks";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import {
    Archive,
    ChevronRight,
    Plus,
    Search,
    Trash2,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const TINTS = [
    "#707fbc",
    "#60A5FA",
    "#14D699",
    "#F6A94A",
    "#9B7BF3",
    "#29C57A",
];

type AdminChannelsResponse = {
    message?: string;
    data?: Channel[];
    channels?: Channel[];
};

function hashToIndex(input: string, mod: number) {
    let h = 5381;
    for (let i = 0; i < input.length; i++) h = (h * 33) ^ input.charCodeAt(i);
    return Math.abs(h) % mod;
}

function getTint(item: { color?: string; _id?: string }, index: number) {
    if (item.color) return item.color;
    if (item._id) return TINTS[hashToIndex(item._id, TINTS.length)];
    return TINTS[index % TINTS.length];
}

export default function ChannelsIndex() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const isIOS = Platform.OS === "ios";

    const [channels, setChannels] = useState<Channel[]>([]);
    const [status, setStatus] = useState<
        "idle" | "loading" | "succeeded" | "failed"
    >("idle");
    const [error, setError] = useState<string | null>(null);

    const [query, setQuery] = useState("");
    const [refreshing, setRefreshing] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [actionTarget, setActionTarget] = useState<Channel | null>(null);
    const [editChannel, setEditChannel] = useState<Channel | null>(null);
    const [editOpen, setEditOpen] = useState(false);

    const loadChannels = useCallback(async () => {
        setStatus("loading");
        setError(null);
        try {
            const { data } = await api.get<AdminChannelsResponse>("/channel");
            const list = Array.isArray(data?.data)
                ? data.data
                : Array.isArray(data?.channels)
                  ? data.channels
                  : [];
            setChannels(list);
            setStatus("succeeded");
        } catch (err: any) {
            setChannels([]);
            setStatus("failed");
            setError(
                err?.response?.data?.message ||
                    err?.message ||
                    "Failed to load projects.",
            );
        }
    }, []);

    useEffect(() => {
        loadChannels();
    }, [loadChannels]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await loadChannels();
        } finally {
            setRefreshing(false);
        }
    }, [loadChannels]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        const sorted = [...channels].sort((a, b) => {
            const aDate = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
            const bDate = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
            return bDate - aDate;
        });

        return sorted.filter((channel) => {
            const name = (channel.name || "").toLowerCase();
            const code = (channel.code || "").toLowerCase();
            const desc = (channel.description || "").toLowerCase();
            return !q || name.includes(q) || code.includes(q) || desc.includes(q);
        });
    }, [channels, query]);

    const initialLoading = status === "loading" && channels.length === 0;

    const openActions = (channel: Channel) => {
        setActionTarget(channel);
        setSheetOpen(true);
    };

    const closeActions = () => setSheetOpen(false);

    const confirmDelete = (channelId: string, name?: string) => {
        closeActions();
        if (!channelId) return;
        Alert.alert(
            "Delete Project",
            `Are you sure you want to delete \"${name || "this project"}\"? This cannot be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        setDeletingId(channelId);
                        try {
                            await dispatch(
                                deleteChannelById({ channelId }),
                            ).unwrap();
                            await loadChannels();
                        } catch (err) {
                            // errors already toasted in thunk
                        } finally {
                            setDeletingId(null);
                        }
                    },
                },
            ],
        );
    };

    const copyCode = async (code?: string) => {
        if (!code) {
            Alert.alert("No code", "This Project has no code to copy.");
            return;
        }
        try {
            await Clipboard.setStringAsync(code);
            showSuccess("Project code copied to clipboard.");
        } catch (e) {
            Alert.alert("Error", "Failed to copy Project code.");
        }
    };

    const openCreate = () => router.push("/(admin)/channels/create");
    const openDeleted = () => router.push("/(admin)/channels/deleted");

    return (
        <SafeAreaView
            edges={isIOS ? ["left", "right"] : ["top", "left", "right"]}
            className="flex-1 bg-white"
        >
            <PlatformAdaptiveHeader
                title="Projects"
                headerLeft={() => null}
                headerRight={() => (
                    <View className="flex-row items-center gap-2 ios:mr-3">
                        <Pressable
                            onPress={openDeleted}
                            className="h-10 w-10 items-center justify-center rounded-full bg-white"
                            hitSlop={8}
                        >
                            <Trash2 size={20} color="#111827" />
                        </Pressable>
                        <Pressable
                            onPress={openCreate}
                            className="h-10 w-10 items-center justify-center rounded-full"
                            hitSlop={8}
                            style={{ backgroundColor: PRIMARY }}
                        >
                            <Plus size={20} color="#FFFFFF" />
                        </Pressable>
                    </View>
                )}
                backgroundColor="#FFFFFF"
            />

            <FlatList
                data={filtered}
                keyExtractor={(item) => item._id}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                    />
                }
                contentContainerStyle={{ paddingBottom: 24 }}
                ListHeaderComponent={
                    <View className="px-4 pb-4">
                        <View className="mt-1 rounded-[26px] bg-[#F3F4F6] px-4 py-4">
                            <View className="flex-row items-center gap-3 rounded-full bg-white px-4 py-3">
                                <Search size={20} color="#6B7280" />
                                <TextInput
                                    value={query}
                                    onChangeText={setQuery}
                                    placeholder="Search projects"
                                    placeholderTextColor="#9CA3AF"
                                    className="flex-1 font-kumbh text-[16px] text-[#111827]"
                                    returnKeyType="search"
                                    style={{ paddingVertical: 0 }}
                                />
                            </View>

                        </View>

                        <Pressable
                            onPress={openDeleted}
                            className="mt-4 flex-row items-center rounded-[18px] bg-white px-4 py-4"
                            style={{
                                borderWidth: 1,
                                borderColor: "#F3F4F6",
                            }}
                        >
                            <View className="h-11 w-11 items-center justify-center rounded-full bg-[#F4F4F5]">
                                <Archive size={20} color="#6B7280" />
                            </View>
                            <View className="flex-1 px-3">
                                <Text className="font-kumbhBold text-[17px] text-[#111827]">
                                    Archived
                                </Text>
                                <Text className="mt-1 font-kumbh text-[13px] text-gray-500">
                                    Review deleted projects and restore when
                                    needed.
                                </Text>
                            </View>
                            <ChevronRight size={18} color="#9CA3AF" />
                        </Pressable>
                    </View>
                }
                ListEmptyComponent={
                    initialLoading ? (
                        <View className="items-center justify-center py-16">
                            <ActivityIndicator />
                            <Text className="mt-2 font-kumbh text-gray-500">
                                Loading Chats...
                            </Text>
                        </View>
                    ) : (
                        <View className="px-5 py-16">
                            <Text className="text-center font-kumbh text-gray-500">
                                {status === "failed" && error
                                    ? `Error: ${error}`
                                    : "No Projects found."}
                            </Text>
                        </View>
                    )
                }
                renderItem={({ item, index }) => (
                    <ChannelCard
                        item={item}
                        tint={getTint(item, index)}
                        onPress={() => {
                            router.push({
                                pathname: "/(admin)/chats/[channelId]",
                                params: { channelId: item._id },
                            });
                        }}
                        onLongPress={() => openActions(item)}
                        onDelete={() => openActions(item)}
                        onCopyCode={() => copyCode(item.code)}
                    />
                )}
            />

            <Modal
                transparent
                visible={sheetOpen}
                animationType="fade"
                onRequestClose={closeActions}
            >
                <Pressable
                    onPress={closeActions}
                    style={{
                        flex: 1,
                        backgroundColor: "rgba(0,0,0,0.3)",
                        justifyContent: "flex-end",
                    }}
                >
                    <View
                        style={{
                            backgroundColor: "#fff",
                            padding: 16,
                            borderTopLeftRadius: 16,
                            borderTopRightRadius: 16,
                        }}
                    >
                        <Text className="mb-3 text-center font-kumbhBold text-base">
                            Chat Actions
                        </Text>
                        <Pressable
                            onPress={() => {
                                if (!actionTarget) return;
                                setEditChannel(actionTarget);
                                setEditOpen(true);
                                closeActions();
                            }}
                            disabled={!actionTarget}
                            className="py-3"
                        >
                            <Text className="text-center font-kumbh text-gray-700">
                                Edit Chat
                            </Text>
                        </Pressable>
                        <View className="h-[1px] bg-gray-200" />
                        <Pressable
                            onPress={() =>
                                actionTarget && copyCode(actionTarget.code)
                            }
                            disabled={!actionTarget}
                            className="py-3"
                        >
                            <Text className="text-center font-kumbh text-gray-700">
                                Copy Code
                            </Text>
                        </Pressable>
                        <View className="h-[1px] bg-gray-200" />
                        <Pressable
                            onPress={() =>
                                actionTarget &&
                                confirmDelete(
                                    actionTarget._id,
                                    actionTarget.name,
                                )
                            }
                            disabled={
                                !actionTarget ||
                                deletingId === actionTarget?._id
                            }
                            className="py-3"
                        >
                            <Text className="text-center font-kumbh text-red-600">
                                {deletingId === actionTarget?._id
                                    ? "Deleting..."
                                    : "Delete Chat"}
                            </Text>
                        </Pressable>
                        <View className="h-[1px] bg-gray-200" />
                        <Pressable onPress={closeActions} className="py-3">
                            <Text className="text-center font-kumbh text-gray-700">
                                Cancel
                            </Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>
            <EditChannelModal
                visible={editOpen}
                channel={editChannel}
                onClose={() => {
                    setEditOpen(false);
                    setEditChannel(null);
                    loadChannels();
                }}
            />
        </SafeAreaView>
    );
}
