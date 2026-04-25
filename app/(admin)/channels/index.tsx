// app/(admin)/channels/index.tsx  (or wherever this file lives)
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import {
    /* MoreVertical, */ Copy,
    Plus,
    Search,
    Trash2,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator, // <- kept for commented block
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

import { api } from "@/api/axios";
import ChannelCard from "@/components/admin/ChannelCard";
import EditChannelModal from "@/components/admin/EditChannelModal";
import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import { showSuccess } from "@/components/ui/toast";
import { PRIMARY } from "@/constants/Colors";
import { deleteChannelById } from "@/redux/channels/channels.thunks";
import type { Channel } from "@/redux/channels/channels.types";
import { useAppDispatch } from "@/store/hooks";
import clsx from "clsx";

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
        if (!q) return channels;
        return channels.filter((c) => {
            const name = (c.name || "").toLowerCase();
            const code = (c.code || "").toLowerCase();
            const desc = (c.description || "").toLowerCase();
            return name.includes(q) || code.includes(q) || desc.includes(q);
        });
    }, [channels, query]);

    const initialLoading = status === "loading" && channels.length === 0;

    const copyCode = async (code?: string) => {
        if (!code) {
            Alert.alert("No code", "This Project has no code to copy.");
            return;
        }
        try {
            await Clipboard.setStringAsync(code);
            // Alert.alert("Copied", "Project code copied to clipboard.");
            showSuccess("Project code copied to clipboard.");
        } catch (e) {
            Alert.alert("Error", "Failed to copy Project code.");
        }
    };

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
            `Are you sure you want to delete "${name || "this project"}"? This cannot be undone.`,
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

    return (
        <SafeAreaView
            edges={isIOS ? ["left", "right"] : ["top", "left", "right"]}
            className="flex-1 bg-white px-2"
        >
            {/* Header */}
            <PlatformAdaptiveHeader
                title="Projects"
                headerRight={({ tintColor }) => (
                    <View className="flex-row items-center gap-2 pr-1">
                        <Pressable
                            onPress={() =>
                                router.push("/(admin)/channels/create")
                            }
                            className="w-10 h-10 rounded-full items-center justify-center"
                            hitSlop={8}
                            style={{
                                backgroundColor: PRIMARY,
                            }}
                        >
                            <Plus size={20} color="white" />
                        </Pressable>
                        <Pressable
                            onPress={() =>
                                router.push("/(admin)/channels/deleted")
                            }
                            className="w-10 h-10 items-center justify-center"
                            hitSlop={8}
                        >
                            <Trash2 size={20} color={tintColor ?? "#111827"} />
                        </Pressable>
                    </View>
                )}
                headerLeft={() => null}
            />

            {/* Search */}
            <View className="my-3 flex-row items-center rounded-full bg-gray-200 ios:h-14 android:h-12 px-4 gap-2">
                <Search size={20} color="#6B7280" />
                <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search for Projects"
                    placeholderTextColor="#9CA3AF"
                    className={clsx(
                        "flex-1 px-1 ios:h-12 font-kumbh text-text android:text-base ios:text-lg text-start",
                        query.length === 0 ? "ios:pb-0" : "ios:pb-3",
                    )}
                    style={{
                        textAlignVertical: "center",
                    }}
                    returnKeyType="search"
                />
            </View>

            {/* Content */}
            {initialLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator />
                    <Text className="mt-2 text-gray-500 font-kumbh">
                        Loading Projects...
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(item) => item._id}
                    numColumns={2}
                    columnWrapperStyle={{ gap: 5 }}
                    contentContainerStyle={{ paddingBottom: 24, gap: 5 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                        />
                    }
                    renderItem={({ item, index }) => (
                        <View style={{ flex: 1, position: "relative" }}>
                            <ChannelCard
                                title={item.name ?? ""}
                                code={item.code ?? ""}
                                description={item.description ?? undefined}
                                tint={getTint(item, index)}
                                onPress={() => {
                                    router.push({
                                        pathname: "/(admin)/chats/[channelId]",
                                        params: { channelId: item._id },
                                    });
                                }}
                                onLongPress={() => openActions(item)}
                            />

                            {/* Copy icon (replaces ellipsis). No background behind it. */}
                            <Pressable
                                onPress={() => copyCode(item.code)}
                                style={{
                                    position: "absolute",
                                    top: 6,
                                    right: 6,
                                    width: 32,
                                    height: 32,
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                                hitSlop={8}
                            >
                                <Copy size={12} color="#ffffff" />
                            </Pressable>

                            {/* ===== Channel Actions button (commented out) =====
              <Pressable
                onPress={() => openMenu(item._id)}
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(0,0,0,0.2)",
                }}
              >
                <MoreVertical size={18} color="#fff" />
              </Pressable>
              =================================================== */}
                        </View>
                    )}
                    ListEmptyComponent={
                        <View className="px-5 py-16">
                            <Text className="text-center text-gray-500 font-kumbh">
                                {status === "failed" && error
                                    ? `Error: ${error}`
                                    : "No Projects found."}
                            </Text>
                        </View>
                    }
                />
            )}

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
                        <Text className="text-center font-kumbhBold text-base mb-3">
                            Project Actions
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
                                Edit Project
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
                                    : "Delete Project"}
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
