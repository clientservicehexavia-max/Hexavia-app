// app/(admin)/team/sanctions/index.tsx
import clsx from "clsx";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
    selectSanctionsUpdating,
} from "@/redux/sanctions/sanctions.slice";
import { fetchSanctions } from "@/redux/sanctions/sanctions.thunks";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

type RowStatus = "Active" | "Resolved";
type RangeKey = "24H" | "7D" | "30D" | "1Y";

function getSinceDate(range: RangeKey) {
    const now = new Date();
    const d = new Date(now);

    if (range === "24H") d.setHours(d.getHours() - 24);
    if (range === "7D") d.setDate(d.getDate() - 7);
    if (range === "30D") d.setDate(d.getDate() - 30);
    if (range === "1Y") d.setFullYear(d.getFullYear() - 1);

    return d;
}

// tries common keys your API might use
function getRowDate(row: any): Date | null {
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
    const router = useRouter();
    const dispatch = useAppDispatch();

    const isIOS = Platform.OS === "ios";
    const [range, setRange] = useState<RangeKey>("7D");

    const rawRows = useAppSelector(selectSanctions);
    const rows = Array.isArray(rawRows) ? rawRows : [];
    const loading = useAppSelector(selectSanctionsLoading);
    const updating = useAppSelector(selectSanctionsUpdating);
    const error = useAppSelector(selectSanctionsError) ?? null;

    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        dispatch(fetchSanctions() as any);
    }, [dispatch]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await dispatch(fetchSanctions() as any).unwrap();
        } finally {
            setRefreshing(false);
        }
    }, [dispatch]);

    const staffs = useMemo(() => {
        const since = getSinceDate(range);
        const dates = rows
            .map((r: any) => getRowDate(r)?.getTime())
            .filter(Boolean) as number[];

        // if (dates.length) {
        //   console.log("Newest:", new Date(Math.max(...dates)).toISOString());
        //   console.log("Oldest:", new Date(Math.min(...dates)).toISOString());
        //   console.log("Range:", range, "Since:", since.toISOString());
        // }

        const filteredRows = rows.filter((r: any) => {
            if (r?.isActive) return true; // keep active regardless of time

            const dt = getRowDate(r);
            if (!dt) return true;
            return dt >= since;
        });

        const map = new Map<string, any>();

        filteredRows.forEach((r: any) => {
            const user = r?.sanctionUser || r?.user;
            if (!user || !user._id) return;

            const id = user._id;

            if (!map.has(id)) {
                map.set(id, {
                    id,
                    name:
                        user.username ||
                        user.email ||
                        user.fullname ||
                        "Unknown",
                    sanctions: [],
                });
            }

            map.get(id).sanctions.push(r);
        });

        return Array.from(map.values()).map((staff) => ({
            ...staff,
            activeCount: staff.sanctions.filter((s: any) => s.isActive).length,
            totalCount: staff.sanctions.length,
        }));
    }, [rows, range]);

    return (
        <SafeAreaView
            edges={
                isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]
            }
            className="flex-1 bg-white px-4"
        >
            {/* Header */}
            <PlatformAdaptiveHeader title="Sanctions" />

            <View className="pt-2 pb-1">
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
                    contentContainerClassName="pt-4 pb-10"
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

function StaffCard({ item }: { item: any }) {
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
function Divider() {
    return <View className="h-px bg-gray-100 my-3" />;
}
function Row({
    children,
    icon,
}: {
    children: React.ReactNode;
    icon?: React.ReactNode;
}) {
    return (
        <View className="flex-row items-center justify-between py-1">
            <View className="flex-row items-center gap-2 flex-1">
                {icon}
                <View className="flex-row items-center flex-1">{children}</View>
            </View>
        </View>
    );
}
function Label({ children }: { children: React.ReactNode }) {
    return <Text className="text-gray-600 font-kumbh">{children}</Text>;
}
function Value({
    children,
    numberOfLines,
}: {
    children: React.ReactNode;
    numberOfLines?: number;
}) {
    return (
        <Text
            numberOfLines={numberOfLines}
            className="text-gray-900 font-kumbhBold ml-auto max-w-[60%] text-right"
        >
            {children}
        </Text>
    );
}

function ShieldBadge({ status }: { status: RowStatus }) {
    const map = {
        Active: { bg: "bg-red-50", dot: "bg-red-500", text: "text-red-700" },
        Resolved: {
            bg: "bg-green-50",
            dot: "bg-green-600",
            text: "text-green-700",
        },
    } as const;
    const s = map[status];
    return (
        <View
            className={clsx(
                "px-2 py-1 rounded-lg flex-row items-center gap-1",
                s.bg,
            )}
        >
            <View className={clsx("w-2 h-2 rounded-full", s.dot)} />
            <Text className={clsx("text-xs font-kumbhBold", s.text)}>
                {status}
            </Text>
        </View>
    );
}

function formatDate(d?: string) {
    if (!d) return "—";
    try {
        const dt = new Date(d);
        return dt.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    } catch {
        return d;
    }
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
