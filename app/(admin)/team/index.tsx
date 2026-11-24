// app/(admin)/team/index.tsx
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useRouter } from "expo-router";
import {
    ChevronRight,
    Funnel,
    Plus,
    Search,
    ShieldAlert,
    X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
    selectAdminErrors,
    selectAdminLoading,
    selectAdminUsers,
} from "@/redux/admin/admin.slice";
import { fetchAdminUsers } from "@/redux/admin/admin.thunks";

import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import { CustomTextInput } from "@/components/ui/CustomInput";
import { PRIMARY } from "@/constants/Colors";
import { selectSanctions } from "@/redux/sanctions/sanctions.slice";
import { fetchSanctions } from "@/redux/sanctions/sanctions.thunks";

export default function TeamIndex() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const isIOS = Platform.OS === "ios";

    const team = useAppSelector(selectAdminUsers).filter(
        (u) =>
            u.role === "staff" ||
            u.role === "supervisor" ||
            u.role === "clientservice" ||
            u.role === "admin" ||
            u.role === "super-admin",
    );
    const loading = useAppSelector(selectAdminLoading);
    const error = useAppSelector(selectAdminErrors);

    const sanctions = useAppSelector(selectSanctions);
    const totalSanctions = sanctions.length;

    const [refreshing, setRefreshing] = useState(false);
    const [query, setQuery] = useState("");
    const [sortBy, setSortBy] = useState<"name" | "createdAt">("createdAt");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
    const [showFilterModal, setShowFilterModal] = useState(false);

    useEffect(() => {
        dispatch(fetchAdminUsers());
        dispatch(fetchSanctions()); // load all so we can count
    }, [dispatch]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await Promise.all([
                dispatch(fetchAdminUsers()).unwrap(),
                dispatch(fetchSanctions()).unwrap(),
            ]);
        } finally {
            setRefreshing(false);
        }
    }, [dispatch]);

    const data = useMemo(() => {
        const q = query.trim().toLowerCase();
        let list = team;

        if (q) {
            list = list.filter((u) => {
                const name = u.fullname ?? "";
                const username = u.username ?? "";
                const email = u.email ?? "";
                return (
                    name.toLowerCase().includes(q) ||
                    username.toLowerCase().includes(q) ||
                    email.toLowerCase().includes(q)
                );
            });
        }

        const toMs = (v?: string) => {
            if (!v) return 0;
            const ms = new Date(v).getTime();
            return Number.isFinite(ms) ? ms : 0;
        };

        const sorted = [...list].sort((a, b) => {
            if (sortBy === "name") {
                const an = (
                    a.fullname ||
                    a.username ||
                    a.email ||
                    ""
                ).toLowerCase();
                const bn = (
                    b.fullname ||
                    b.username ||
                    b.email ||
                    ""
                ).toLowerCase();
                return an.localeCompare(bn);
            }
            return toMs(a.createdAt) - toMs(b.createdAt);
        });

        if (sortOrder === "desc") {
            sorted.reverse();
        }

        return sorted;
    }, [team, query, sortBy, sortOrder]);

    const initialLoading = loading && data.length === 0 && !refreshing;

    return (
        <SafeAreaView
            edges={isIOS ? ["left", "right"] : ["top", "left", "right"]}
            className="flex-1 bg-[#F5F7FB]"
        >
            {/* Header */}
            <PlatformAdaptiveHeader
                title="Team"
                backgroundColor="#F5F7FB"
                headerRight={({ tintColor }) => (
                    <View className="flex-row items-center gap-2 ios:mr-3">
                        <Pressable
                            onPress={() => setShowFilterModal(true)}
                            className="w-10 h-10 rounded-full items-center justify-center bg-white border border-gray-200"
                            hitSlop={8}
                        >
                            <Funnel size={18} color={tintColor ?? "#111827"} />
                        </Pressable>
                        <Pressable
                            onPress={() => router.push("/(admin)/team/create")}
                            className="w-10 h-10 rounded-full items-center justify-center"
                            hitSlop={8}
                            style={{
                                backgroundColor: PRIMARY,
                            }}
                        >
                            <Plus size={20} color="#FFFFFF" />
                        </Pressable>
                    </View>
                )}
                headerLeft={() => null}
            />

            <FlatList
                data={data}
                keyExtractor={(i) => i._id}
                contentContainerClassName="pb-12 px-4 pt-2"
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                    />
                }
                ListHeaderComponent={
                    <View className="mb-3">
                        {/* Search */}
                        <View className="h-14 w-full flex-row items-center rounded-2xl border border-gray-200 bg-white px-4">
                            <View className="mr-3">
                                <Search size={18} color="#6B7280" />
                            </View>
                            <CustomTextInput
                                value={query}
                                onChangeText={setQuery}
                                placeholder="Search name, username, email"
                                className="h-full flex-1"
                                returnKeyType="search"
                            />
                            {query.length > 0 ? (
                                <Pressable
                                    onPress={() => setQuery("")}
                                    hitSlop={8}
                                    className="ml-2 h-7 w-7 rounded-full bg-[#F3F4F6] items-center justify-center"
                                >
                                    <X size={14} color="#6B7280" />
                                </Pressable>
                            ) : null}
                        </View>

                        {/* Sanction Grid Card */}
                        <Pressable
                            onPress={() =>
                                router.push("/(admin)/team/sanctions")
                            }
                            className="mt-3 rounded-[24px] flex-row justify-between items-center bg-white p-4 border border-gray-100"
                        >
                            <View className="flex-row items-center flex-1 mr-3">
                                <View className="h-12 w-12 rounded-2xl bg-[#EEF2FF] items-center justify-center mr-3.5">
                                    <ShieldAlert size={22} color="#4C5FAB" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-[16px] font-kumbhBold text-[#111827]">
                                        Sanction Grid
                                    </Text>
                                    <Text className="mt-0.5 text-[13px] text-[#6B7280] font-kumbh">
                                        {totalSanctions} recorded{" "}
                                        {totalSanctions === 1
                                            ? "sanction"
                                            : "sanctions"}
                                    </Text>
                                </View>
                            </View>
                            <View className="h-9 w-9 rounded-full bg-[#F5F7FB] items-center justify-center">
                                <ChevronRight size={18} color="#4C5FAB" />
                            </View>
                        </Pressable>

                        <View className="mt-5 mb-1 flex-row items-center justify-between px-1">
                            <Text className="text-xs font-kumbhBold uppercase tracking-wider text-[#6B7280]">
                                Members ({data.length})
                            </Text>
                            <Text className="text-xs font-kumbh text-[#9CA3AF]">
                                {sortBy === "name" ? "Name" : "Joined"} •{" "}
                                {sortOrder === "asc" ? "Asc" : "Desc"}
                            </Text>
                        </View>
                    </View>
                }
                ItemSeparatorComponent={() => <View className="h-3" />}
                renderItem={({ item }) => {
                    const displayName =
                        item.fullname || item.username || item.email || "Member";
                    const secondaryLine =
                        item.email ||
                        (item.username ? `@${item.username}` : "—");
                    const avatarUri = getAvatarUri(item);
                    const isSuspended = Boolean(item.suspended);

                    return (
                        <Pressable
                            onPress={() =>
                                router.push({
                                    pathname: "/(admin)/team/[id]",
                                    params: { id: item._id },
                                })
                            }
                            className="rounded-[24px] bg-white border border-gray-100 p-4"
                        >
                            <View className="flex-row items-center">
                                <TeamAvatar
                                    uri={avatarUri}
                                    name={displayName}
                                />

                                <View className="flex-1 mr-2">
                                    <Text
                                        className="text-[16px] font-kumbhBold text-[#111827]"
                                        numberOfLines={1}
                                    >
                                        {displayName}
                                    </Text>
                                    <Text
                                        className="text-[13px] font-kumbh text-[#6B7280] mt-0.5"
                                        numberOfLines={1}
                                    >
                                        {secondaryLine}
                                    </Text>
                                </View>

                                <View
                                    className={`px-2.5 py-1 rounded-full border ${
                                        isSuspended
                                            ? "bg-red-50 border-red-100"
                                            : "bg-emerald-50 border-emerald-100"
                                    }`}
                                >
                                    <Text
                                        className={`font-kumbhBold text-[11px] ${
                                            isSuspended
                                                ? "text-red-700"
                                                : "text-emerald-700"
                                        }`}
                                    >
                                        {isSuspended ? "Suspended" : "Active"}
                                    </Text>
                                </View>
                            </View>

                            <View className="mt-3.5 pt-3 border-t border-gray-100 flex-row items-center justify-between">
                                <View className="flex-row items-center gap-2 flex-1 mr-2">
                                    <View className="px-2.5 py-1 rounded-full bg-[#EEF2FF]">
                                        <Text className="font-kumbhBold text-[11px] text-primary">
                                            {formatRole(item.role)}
                                        </Text>
                                    </View>
                                    {item.username ? (
                                        <Text
                                            className="font-kumbh text-[12px] text-[#6B7280]"
                                            numberOfLines={1}
                                        >
                                            @{item.username}
                                        </Text>
                                    ) : null}
                                </View>

                                <View className="flex-row items-center gap-1">
                                    <Text className="font-kumbh text-[12px] text-[#6B7280]">
                                        {formatDate(item.createdAt)}
                                    </Text>
                                    <ChevronRight size={16} color="#9CA3AF" />
                                </View>
                            </View>
                        </Pressable>
                    );
                }}
                ListEmptyComponent={
                    initialLoading ? (
                        <View className="items-center justify-center py-16">
                            <ActivityIndicator color={PRIMARY} />
                            <Text className="mt-2 text-[#6B7280] font-kumbh">
                                Loading team members…
                            </Text>
                        </View>
                    ) : !loading ? (
                        <View className="mt-2 rounded-[24px] bg-white border border-gray-100 px-5 py-12">
                            <Text className="text-center text-[#6B7280] font-kumbh">
                                {error
                                    ? `Error: ${error}`
                                    : "No team members found."}
                            </Text>
                        </View>
                    ) : null
                }
            />

            <Modal
                transparent
                visible={showFilterModal}
                animationType="slide"
                onRequestClose={() => setShowFilterModal(false)}
            >
                <Pressable
                    onPress={() => setShowFilterModal(false)}
                    className="flex-1 bg-black/40"
                >
                    <Pressable
                        onPress={(e: any) => e?.stopPropagation?.()}
                        className="mt-auto rounded-t-[28px] bg-white px-5 pb-8 pt-3"
                    >
                        <View className="w-10 h-1 bg-gray-200 rounded-full self-center mb-4" />
                        <View className="mb-4 flex-row items-center justify-between">
                            <Text className="text-[19px] font-kumbhBold text-[#111827]">
                                Filters
                            </Text>
                            <Pressable
                                onPress={() => setShowFilterModal(false)}
                                className="h-9 w-9 items-center justify-center rounded-full bg-[#F3F4F6]"
                            >
                                <X size={18} color="#111827" />
                            </Pressable>
                        </View>

                        <View className="mb-4">
                            <Text className="mb-2 text-[13px] text-[#374151] font-kumbhBold">
                                Sort by
                            </Text>
                            <View className="flex-row flex-wrap gap-2">
                                {(["name", "createdAt"] as const).map(
                                    (value) => {
                                        const active = sortBy === value;
                                        return (
                                            <Pressable
                                                key={value}
                                                onPress={() => setSortBy(value)}
                                                className={`rounded-full px-4 py-2 border ${
                                                    active
                                                        ? "bg-primary border-primary"
                                                        : "bg-[#F9FAFB] border-gray-200"
                                                }`}
                                            >
                                                <Text
                                                    className={`font-kumbhBold text-[13px] ${
                                                        active
                                                            ? "text-white"
                                                            : "text-[#374151]"
                                                    }`}
                                                >
                                                    {value === "name"
                                                        ? "Name"
                                                        : "Joined date"}
                                                </Text>
                                            </Pressable>
                                        );
                                    },
                                )}
                            </View>
                        </View>

                        <View>
                            <Text className="mb-2 text-[13px] text-[#374151] font-kumbhBold">
                                Order
                            </Text>
                            <View className="flex-row flex-wrap gap-2">
                                {(["asc", "desc"] as const).map((value) => {
                                    const active = sortOrder === value;
                                    return (
                                        <Pressable
                                            key={value}
                                            onPress={() => setSortOrder(value)}
                                            className={`rounded-full px-4 py-2 border ${
                                                active
                                                    ? "bg-primary border-primary"
                                                    : "bg-[#F9FAFB] border-gray-200"
                                            }`}
                                        >
                                            <Text
                                                className={`font-kumbhBold text-[13px] ${
                                                    active
                                                        ? "text-white"
                                                        : "text-[#374151]"
                                                }`}
                                            >
                                                {value === "asc"
                                                    ? "Ascending"
                                                    : "Descending"}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}

function getAvatarUri(item: Record<string, unknown>) {
    const raw =
        item.profilePicture ?? item.avatar ?? item.avatarUrl ?? item.photoUrl;
    if (typeof raw !== "string") return undefined;
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

function TeamAvatar({ uri, name }: { uri?: string; name: string }) {
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        setFailed(false);
    }, [uri]);

    if (uri && !failed) {
        return (
            <Image
                source={{ uri }}
                onError={() => setFailed(true)}
                className="h-11 w-11 rounded-full mr-3 bg-[#EEF2FF]"
                resizeMode="cover"
            />
        );
    }

    return (
        <View className="h-11 w-11 rounded-full bg-[#EEF2FF] items-center justify-center mr-3">
            <Text className="font-kumbhBold text-[14px] text-primary">
                {getInitials(name)}
            </Text>
        </View>
    );
}

function getInitials(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
function formatDate(d?: string) {
    if (!d) return "—";
    try {
        const dt = new Date(d);
        return dt.toLocaleDateString();
    } catch {
        return d;
    }
}

function formatRole(r?: string) {
    if (!r) return "—";
    // Replace separators with spaces, then Title Case each word
    const cleaned = r.replace(/[-_]+/g, " ");
    return cleaned
        .split(" ")
        .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
        .join(" ");
}
