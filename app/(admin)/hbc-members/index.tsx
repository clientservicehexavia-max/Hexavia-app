import { fetchHbcMembers, type HbcMember } from "@/api/hbc";
import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import { showError } from "@/components/ui/toast";
import useDebounced from "@/hooks/useDebounced";
import { RootState } from "@/store";
import { useAppSelector } from "@/store/hooks";
import { canAccessHbcMembers } from "@/utils/roles";
import { useRouter } from "expo-router";
import { ArrowRight, Search } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    Platform,
    Pressable,
    RefreshControl,
    Text,
    TextInput,
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
            edges={isIOS ? ["left", "right"] : ["top", "left", "right"]}
            className="flex-1 bg-white"
        >
            <PlatformAdaptiveHeader title="HBC Members" />

            {!canAccess ? (
                <View className="flex-1 items-center justify-center px-6">
                    <Text className="text-base text-gray-600 text-center font-kumbh">
                        You do not have access to this section.
                    </Text>
                </View>
            ) : (
                <>
                    <View className="px-4 pt-1">
                        <View className="flex-row items-center rounded-xl bg-gray-100 px-4 ios:py-2 android:py-0.5">
                            <Search size={18} color="#6B7280" />
                            <TextInput
                                value={query}
                                onChangeText={setQuery}
                                placeholder="Search members"
                                placeholderTextColor="#9CA3AF"
                                className="flex-1 px-2 py-3 font-kumbh text-text"
                                returnKeyType="search"
                            />
                        </View>
                    </View>

                    {loading && members.length === 0 ? (
                        <View className="flex-1 items-center justify-center">
                            <ActivityIndicator />
                            <Text className="mt-3 text-gray-500 font-kumbh">
                                Loading HBC members...
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={filteredMembers}
                            keyExtractor={(item) => item.id}
                            contentContainerClassName="px-4 pt-4 pb-12"
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshing}
                                    onRefresh={onRefresh}
                                />
                            }
                            onEndReached={onEndReached}
                            onEndReachedThreshold={0.25}
                            ItemSeparatorComponent={() => (
                                <View className="h-[1px] bg-gray-100 my-2" />
                            )}
                            renderItem={({ item }) => (
                                <Pressable
                                    onPress={() =>
                                        router.push({
                                            pathname:
                                                "/(admin)/hbc-members/[id]",
                                            params: { id: item.id },
                                        })
                                    }
                                    className="rounded-2xl bg-white py-3 px-1 flex-row items-center"
                                >
                                    {item.avatarUrl ? (
                                        <Image
                                            source={{ uri: item.avatarUrl }}
                                            className="w-14 h-14 rounded-full"
                                        />
                                    ) : (
                                        <View className="w-14 h-14 rounded-full bg-primary-100 items-center justify-center">
                                            <Text className="font-kumbhBold text-primary text-base">
                                                {initialsFrom(item.displayName)}
                                            </Text>
                                        </View>
                                    )}

                                    <View className="flex-1 ml-3 pr-2">
                                        <Text
                                            className="text-[17px] font-kumbhBold text-text"
                                            numberOfLines={1}
                                        >
                                            {item.displayName}
                                        </Text>
                                        <Text
                                            className="text-sm text-gray-500 mt-1 font-kumbh"
                                            numberOfLines={2}
                                        >
                                            {rowMeta(item)}
                                        </Text>
                                    </View>

                                    <ArrowRight size={20} color="#111827" />
                                </Pressable>
                            )}
                            ListEmptyComponent={
                                <View className="py-16 px-6">
                                    <Text className="text-center text-gray-500 font-kumbh">
                                        {debouncedQuery.trim()
                                            ? "No matching members found."
                                            : "No HBC members found."}
                                    </Text>
                                </View>
                            }
                            ListFooterComponent={
                                loadingMore ? (
                                    <View className="py-4 items-center">
                                        <ActivityIndicator size="small" />
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
