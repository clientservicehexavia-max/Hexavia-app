// app/(admin)/team/sanctions/index.tsx
import { clsx } from "clsx";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Platform,
    Pressable,
    RefreshControl,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import {
    selectSanctions,
    selectSanctionsError,
    selectSanctionsLoading,
} from "@/redux/sanctions/sanctions.slice";
import { fetchSanctions } from "@/redux/sanctions/sanctions.thunks";
import type { ApiSanction } from "@/redux/sanctions/sanctions.type";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

type RangeKey = "24H" | "7D" | "30D" | "1Y";

type StaffRow = {
    id: string;
    name: string;
    sanctions: SanctionRow[];
    activeCount: number;
    totalCount: number;
};

type SanctionUser = {
    _id: string;
    fullname?: string;
    username?: string;
    email?: string;
    name?: string;
};

type SanctionRow = ApiSanction & {
    created_at?: string;
    date?: string;
    sanctionedAt?: string;
    timestamp?: string;
    sanctionUser?: SanctionUser;
    user?: SanctionUser;
};

function getSinceDate(range: RangeKey) {
    const now = new Date();
    const d = new Date(now);

    if (range === "24H") {
        d.setHours(d.getHours() - 24);
        return d;
    }

    d.setHours(0, 0, 0, 0);
    if (range === "7D") d.setDate(d.getDate() - 6);
    if (range === "30D") d.setDate(d.getDate() - 29);
    if (range === "1Y") d.setFullYear(d.getFullYear() - 1);

    return d;
}

// tries common keys your API might use
function getRowDate(row: SanctionRow): Date | null {
    const raw =
        row?.createdAt ??
        row?.created_at ??
        row?.date ??
        row?.sanctionedAt ??
        row?.timestamp ??
        null;

    if (!raw) return null;

    const dt = new Date(raw);
    return isNaN(dt.getTime()) ? null : dt;
}

export default function SanctionsView() {
    const dispatch = useAppDispatch();

    const isIOS = Platform.OS === "ios";
    const [range, setRange] = useState<RangeKey>("7D");

    const rawRows = useAppSelector(selectSanctions);
    const rows = useMemo(
        () => (Array.isArray(rawRows) ? (rawRows as SanctionRow[]) : []),
        [rawRows],
    );
    const loading = useAppSelector(selectSanctionsLoading);
    const error = useAppSelector(selectSanctionsError) ?? null;

    const [refreshing, setRefreshing] = useState(false);

    useFocusEffect(
        useCallback(() => {
            dispatch(fetchSanctions() as any);
        }, [dispatch]),
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await dispatch(fetchSanctions() as any).unwrap();
        } finally {
            setRefreshing(false);
        }
    }, [dispatch]);

    const staffs = useMemo<StaffRow[]>(() => {
        const since = getSinceDate(range);

        const filteredRows = rows.filter((r) => {
            const dt = getRowDate(r);
            if (!dt) return false;
            return dt >= since;
        });

        const map = new Map<
            string,
            Omit<StaffRow, "activeCount" | "totalCount">
        >();

        filteredRows.forEach((r) => {
            const user = r?.sanctionUser || r?.user;
            if (!user || !user._id) return;

            const id = user._id;

            if (!map.has(id)) {
                map.set(id, {
                    id,
                    name:
                        user.fullname ||
                        user.username ||
                        user.name ||
                        user.email ||
                        "Unknown",
                    sanctions: [],
                });
            }

            map.get(id)?.sanctions.push(r);
        });

        return Array.from(map.values()).map((staff) => ({
            ...staff,
            activeCount: staff.sanctions.filter((s) => s.isActive).length,
            totalCount: staff.sanctions.length,
        }));
    }, [rows, range]);

    return (
        <SafeAreaView
            edges={
                isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]
            }
            className="flex-1 bg-white"
        >
            {/* Header */}
            <PlatformAdaptiveHeader title="Sanctions" />

            <View className="pt-2 pb-1 px-4">
                <RangeTabs value={range} onChange={setRange} />
            </View>

            {/* List */}
            {loading && rows.length === 0 ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator color="#7C3AED" />
                    <Text className="mt-2 text-gray-500 font-kumbh">
                        Loading sanctions…
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={staffs}
                    keyExtractor={(i) => i.id}
                    contentContainerClassName="pt-4 pb-10 px-4"
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                        />
                    }
                    ItemSeparatorComponent={() => <View className="h-3" />}
                    renderItem={({ item }) => <StaffCard item={item} />}
                    ListEmptyComponent={
                        <View className="px-5 py-12">
                            <Text className="text-center text-gray-500 font-kumbh">
                                {error
                                    ? `Error: ${error}`
                                    : "No staffs with sanctions found."}
                            </Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

/* ───────── light-themed building blocks ───────── */

function StaffCard({ item }: { item: StaffRow }) {
    const router = useRouter();
    return (
        <Pressable
            onPress={() =>
                router.push({
                    pathname: "/(admin)/team/sanctions/[staffId]",
                    params: { staffId: item.id, name: item.name },
                } as any)
            }
        >
            <Card>
                <View className="flex-row items-center justify-between">
                    <View>
                        <Text className="text-gray-900 font-kumbhBold text-base">
                            {item.name}
                        </Text>
                        <Text className="text-gray-600 font-kumbh text-sm">
                            {item.totalCount} sanctions ({item.activeCount}{" "}
                            active)
                        </Text>
                    </View>
                </View>
            </Card>
        </Pressable>
    );
}

function Card({ children }: { children: React.ReactNode }) {
    return (
        <View className="rounded-2xl bg-white border border-gray-200 p-4 shadow-sm">
            {children}
        </View>
    );
}
function RangeTabs({
    value,
    onChange,
}: {
    value: RangeKey;
    onChange: (v: RangeKey) => void;
}) {
    const options: RangeKey[] = ["24H", "7D", "30D", "1Y"];

    return (
        <View className="flex-row bg-white border border-gray-200 rounded-2xl p-1">
            {options.map((opt) => {
                const active = opt === value;
                return (
                    <Pressable
                        key={opt}
                        onPress={() => onChange(opt)}
                        className={clsx(
                            "flex-1 py-2 rounded-xl items-center justify-center",
                            active ? "bg-gray-900" : "bg-transparent",
                        )}
                    >
                        <Text
                            className={clsx(
                                "font-kumbh text-sm",
                                active ? "text-white" : "text-gray-700",
                            )}
                        >
                            {opt}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}
