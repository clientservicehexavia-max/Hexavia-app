import { fetchHbcMembers, type HbcMember } from "@/api/hbc";
import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import CustomTextInput from "@/components/ui/CustomInput";
import { showError } from "@/components/ui/toast";
import useDebounced from "@/hooks/useDebounced";
import { RootState } from "@/store";
import { useAppSelector } from "@/store/hooks";
import { canAccessHbcMembers } from "@/utils/roles";
import { useRouter } from "expo-router";
import { ChevronRight, Search, UsersRound, X } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    Platform,
    Pressable,
    RefreshControl,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PER_PAGE = 20;

function initialsFrom(value?: string) {
    const source = String(value ?? "").trim();
    if (!source) return "HM";
    const [a, b] = source.split(/\s+/);
    return `${a?.[0] ?? ""}${b?.[0] ?? ""}`.toUpperCase() || "HM";
}

function rowMeta(member: HbcMember) {
    const parts = [member.company, member.role, member.location]
        .map((part) => String(part ?? "").trim())
        .filter(Boolean);
    return parts.join(" • ") || "Community member";
}

export default function HbcMembersScreen() {
    const router = useRouter();
    const role = useAppSelector(
        (s: RootState) => s.auth.user?.role ?? s.user.user?.role,
    );
    const isIOS = Platform.OS === "ios";
    const canAccess = useMemo(() => canAccessHbcMembers(role), [role]);

    const [query, setQuery] = useState("");
    const debouncedQuery = useDebounced(query, 350);

    const [members, setMembers] = useState<HbcMember[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const loadPage = useCallback(
        async (nextPage: number, mode: "replace" | "append") => {
            const appendMode = mode === "append";
            if (appendMode) {
                setLoadingMore(true);
            } else {
                setLoading(true);
            }

            try {
                const result = await fetchHbcMembers({
                    page: nextPage,
                    perPage: PER_PAGE,
                });

                setHasMore(result.hasMore);
                setPage(nextPage);

                if (appendMode) {
                    setMembers((prev) => {
                        const next = [...prev];
                        const seen = new Set(prev.map((member) => member.id));
                        result.members.forEach((member) => {
                            if (!seen.has(member.id)) {
                                next.push(member);
                            }
                        });
                        return next;
                    });
                } else {
                    setMembers(result.members);
                }
            } catch (error: any) {
                const message =
                    error?.response?.data?.message ||
                    error?.message ||
                    "Failed to load HBC members.";
                showError(message);
                if (!appendMode) {
                    setMembers([]);
                }
            } finally {
                if (appendMode) {
                    setLoadingMore(false);
                } else {
                    setLoading(false);
                }
            }
        },
        [],
    );

    useEffect(() => {
        if (!canAccess) return;
        void loadPage(1, "replace");
    }, [canAccess, loadPage]);

    const filteredMembers = useMemo(() => {
        const needle = debouncedQuery.trim().toLowerCase();
        if (!needle) return members;

        return members.filter((member) => {
            const haystack = [
                member.displayName,
                member.email,
                member.phone,
                member.company,
                member.role,
                member.location,
            ]
                .map((value) => String(value ?? "").toLowerCase())
                .join(" ");

            return haystack.includes(needle);
        });
    }, [debouncedQuery, members]);

    const onRefresh = useCallback(async () => {
        if (!canAccess) return;
        setRefreshing(true);
        try {
            await loadPage(1, "replace");
        } finally {
            setRefreshing(false);
        }
    }, [canAccess, loadPage]);

    const onEndReached = useCallback(() => {
        if (!canAccess) return;
        if (loading || loadingMore || !hasMore) return;
        void loadPage(page + 1, "append");
    }, [canAccess, hasMore, loadPage, loading, loadingMore, page]);

    return (
        <SafeAreaView
            edges={
                isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]
            }
            className="flex-1 bg-[#F5F7FB]"
        >
            <PlatformAdaptiveHeader
                title="HBC Members"
                backgroundColor="#F5F7FB"
            />

            {!canAccess ? (
                <View className="flex-1 items-center justify-center px-6">
                    <View className="w-full items-center rounded-[24px] border border-gray-100 bg-white p-8">
                        <View className="mb-3 h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF2FF]">
                            <UsersRound size={22} color="#4C5FAB" />
                        </View>
                        <Text className="text-center text-base font-kumbhBold text-[#111827]">
                            Access Restricted
                        </Text>
                        <Text className="mt-1 text-center text-sm font-kumbh text-[#6B7280]">
                            You do not have access to this section.
                        </Text>
                    </View>
                </View>
            ) : (
                <>
                    <View className="px-4 pb-2 pt-3">
                        <View className="h-14 flex-row items-center rounded-2xl border border-gray-200 bg-white px-4">
                            <Search size={18} color="#9CA3AF" />
                            <CustomTextInput
                                value={query}
                                onChangeText={setQuery}
                                placeholder="Search members"
                                placeholderTextColor="#9CA3AF"
                                className="ml-2.5 flex-1 font-kumbh text-base text-[#111827]"
                                returnKeyType="search"
                            />
                            {query.length > 0 ? (
                                <Pressable
                                    onPress={() => setQuery("")}
                                    className="h-6 w-6 items-center justify-center rounded-full bg-gray-100"
                                    hitSlop={8}
                                >
                                    <X size={13} color="#6B7280" />
                                </Pressable>
                            ) : null}
                        </View>
                    </View>

                    {loading && members.length === 0 ? (
                        <View className="flex-1 items-center justify-center">
                            <ActivityIndicator color="#4C5FAB" />
                            <Text className="mt-3 text-sm font-kumbh text-[#6B7280]">
                                Loading HBC members...
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={filteredMembers}
                            keyExtractor={(item) => item.id}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{
                                paddingHorizontal: 16,
                                paddingTop: 8,
                                paddingBottom: 32,
                            }}
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshing}
                                    onRefresh={onRefresh}
                                    tintColor="#4C5FAB"
                                />
                            }
                            onEndReached={onEndReached}
                            onEndReachedThreshold={0.25}
                            renderItem={({ item }) => (
                                <Pressable
                                    onPress={() =>
                                        router.push({
                                            pathname:
                                                "/(admin)/hbc-members/[id]",
                                            params: { id: item.id },
                                        })
                                    }
                                    className="mb-3 flex-row items-center rounded-[24px] border border-gray-100 bg-white p-4 active:opacity-90"
                                >
                                    {item.avatarUrl ? (
                                        <Image
                                            source={{ uri: item.avatarUrl }}
                                            className="h-12 w-12 rounded-2xl"
                                        />
                                    ) : (
                                        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF2FF]">
                                            <Text className="text-sm font-kumbhBold text-[#4C5FAB]">
                                                {initialsFrom(item.displayName)}
                                            </Text>
                                        </View>
                                    )}

                                    <View className="ml-3.5 flex-1 pr-2">
                                        <Text
                                            className="text-[15px] font-kumbhBold text-[#111827]"
                                            numberOfLines={1}
                                        >
                                            {item.displayName}
                                        </Text>
                                        <Text
                                            className="mt-0.5 text-xs font-kumbh text-[#6B7280]"
                                            numberOfLines={2}
                                        >
                                            {rowMeta(item)}
                                        </Text>
                                    </View>

                                    <ChevronRight size={18} color="#9CA3AF" />
                                </Pressable>
                            )}
                            ListEmptyComponent={
                                <View className="items-center rounded-[24px] border border-gray-100 bg-white px-6 py-10">
                                    <View className="mb-3 h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF2FF]">
                                        <UsersRound size={22} color="#4C5FAB" />
                                    </View>
                                    <Text className="text-base font-kumbhBold text-[#111827]">
                                        {debouncedQuery.trim()
                                            ? "No matching members"
                                            : "No HBC members yet"}
                                    </Text>
                                    <Text className="mt-1 text-center text-sm font-kumbh text-[#6B7280]">
                                        {debouncedQuery.trim()
                                            ? "Try a different name, company, or location."
                                            : "Members will appear here once available."}
                                    </Text>
                                </View>
                            }
                            ListFooterComponent={
                                loadingMore ? (
                                    <View className="items-center py-4">
                                        <ActivityIndicator
                                            size="small"
                                            color="#4C5FAB"
                                        />
                                    </View>
                                ) : null
                            }
                        />
                    )}
                </>
            )}
        </SafeAreaView>
    );
}
