// app/(admin)/team/index.tsx
import OptionSheet from "@/components/common/OptionSheet";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useRouter } from "expo-router";
import {
    ArrowRight,
    ChevronDown,
    ChevronRight,
    Plus,
    Search,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Platform,
    Pressable,
    RefreshControl,
    Text,
    TextInput,
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
    const [showSortSheet, setShowSortSheet] = useState(false);
    const [showOrderSheet, setShowOrderSheet] = useState(false);

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

    return (
        <SafeAreaView
            edges={isIOS ? ["left", "right"] : ["top", "left", "right"]}
            className="flex-1 bg-white"
        >
            {/* Header */}
            <PlatformAdaptiveHeader
                title="Team"
                headerRight={({ tintColor }) => (
                    <Pressable
                        onPress={() => router.push("/(admin)/team/create")}
                        className="w-10 h-10 rounded-full items-center justify-center ios:mr-3"
                        hitSlop={8}
                        style={{
                            backgroundColor: PRIMARY,
                        }}
                    >
                        <Plus size={20} color="white" />
                    </Pressable>
                )}
                headerLeft={() => null}
            />

            {/* Sanction Grid Card */}
            <Pressable
                onPress={() => router.push("/(admin)/team/sanctions")}
                className="my-3 mx-4 rounded-xl flex-row justify-between items-center bg-primary-50 p-4 border border-primary-100"
            >
                <View>
                    <Text className="text-2xl font-kumbh text-text">
                        Sanction Grid
                    </Text>
                    <Text className="mt-1 text-gray-600 font-kumbh">
                        Total : {totalSanctions}
                    </Text>
                </View>
                <ChevronRight />
            </Pressable>

            {/* Search + Filters */}
            <View className="px-4">
                <View className="flex-row items-center rounded-xl bg-gray-200 ios:py-2 android:py-0.5 px-4">
                    <Search size={18} color="#6B7280" />
                    <TextInput
                        value={query}
                        onChangeText={setQuery}
                        placeholder="Search name, username, email"
                        placeholderTextColor="#9CA3AF"
                        className="flex-1 px-2 py-3 font-kumbh text-text"
                        returnKeyType="search"
                    />
                </View>

                <View className="mt-3 flex-row gap-3">
                    <Pressable
                        onPress={() => setShowSortSheet(true)}
                        className="flex-1 rounded-xl px-4 ios:py-4 android:py-3 bg-gray-200 flex-row items-center justify-between"
                    >
                        <Text className="text-gray-700 font-kumbh">
                            {sortBy === "name" ? "Sort: Name" : "Sort: Joined"}
                        </Text>
                        <ChevronDown size={18} color="#111827" />
                    </Pressable>

                    <Pressable
                        onPress={() => setShowOrderSheet(true)}
                        className="flex-1 rounded-xl px-4 ios:py-4 android:py-3 bg-gray-200 flex-row items-center justify-between"
                    >
                        <Text className="text-gray-700 font-kumbh">
                            {sortOrder === "asc" ? "Order: Asc" : "Order: Desc"}
                        </Text>
                        <ChevronDown size={18} color="#111827" />
                    </Pressable>
                </View>
            </View>

            {/* Staff list */}
            {loading && data.length === 0 ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator />
                    <Text className="mt-2 text-gray-500 font-kumbh">
                        Loading team members…
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={data}
                    keyExtractor={(i) => i._id}
                    contentContainerClassName="pt-6 pb-12 px-4"
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                        />
                    }
                    ItemSeparatorComponent={() => (
                        <View className="h-[1px] bg-gray-200 my-4" />
                    )}
                    renderItem={({ item }) => (
                        <View>
                            <Text className="text-lg font-kumbhBold text-text">
                                {item.fullname || item.username || item.email}
                            </Text>
                            <Row label="Email" value={item.email ?? "—"} />
                            <Row
                                label="Username"
                                value={item.username ?? "—"}
                            />
                            <Row label="Role" value={formatRole(item.role)} />
                            <Row
                                label="Status"
                                value={item.suspended ? "Suspended" : "Active"}
                            />
                            <Row
                                label="Joined"
                                value={formatDate(item.createdAt)}
                            />

                            <Pressable
                                onPress={() =>
                                    router.push({
                                        pathname: "/(admin)/team/[id]",
                                        params: { id: item._id },
                                    })
                                }
                                className="mt-2 flex-row items-center justify-between"
                            >
                                <Text className="text-base text-gray-700 font-kumbh">
                                    View details
                                </Text>
                                <ArrowRight size={20} color="#111827" />
                            </Pressable>
                        </View>
                    )}
                    ListEmptyComponent={
                        <View className="px-5 py-16">
                            <Text className="text-center text-gray-500 font-kumbh">
                                {error
                                    ? `Error: ${error}`
                                    : "No team members found."}
                            </Text>
                        </View>
                    }
                />
            )}

            <OptionSheet
                visible={showSortSheet}
                onClose={() => setShowSortSheet(false)}
                title="Sort team by"
                selectedValue={sortBy}
                onSelect={(v) => setSortBy(v as "name" | "createdAt")}
                options={[
                    { label: "Name", value: "name" },
                    { label: "Joined date", value: "createdAt" },
                ]}
            />

            <OptionSheet
                visible={showOrderSheet}
                onClose={() => setShowOrderSheet(false)}
                title="Sort order"
                selectedValue={sortOrder}
                onSelect={(v) => setSortOrder(v as "asc" | "desc")}
                options={[
                    { label: "Ascending", value: "asc" },
                    { label: "Descending", value: "desc" },
                ]}
            />
        </SafeAreaView>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <View className="flex-row items-center justify-between py-1">
            <Text className="text-base text-gray-700 font-kumbh">{label}</Text>
            <Text
                className="text-base text-text font-kumbhBold max-w-[60%] text-right"
                numberOfLines={1}
            >
                {value}
            </Text>
        </View>
    );
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
