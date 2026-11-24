// app/(admin)/team/sanctions/index.tsx
import { clsx } from "clsx";
import { useFocusEffect, useRouter } from "expo-router";
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

import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import { PRIMARY } from "@/constants/Colors";
import {
    selectSanctions,
    selectSanctionsError,
    selectSanctionsLoading,
} from "@/redux/sanctions/sanctions.slice";
import { fetchSanctions } from "@/redux/sanctions/sanctions.thunks";
import type { ApiSanction } from "@/redux/sanctions/sanctions.type";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { ChevronRight, Plus, ShieldAlert } from "lucide-react-native";

type RangeKey = "24H" | "7D" | "30D" | "1Y";

type StaffRow = {
    id: string;
    name: string;
    avatarUri?: string;
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
    profilePicture?: string;
    avatar?: string;
    photoUrl?: string;
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
    const router = useRouter();

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
                const rawAvatar =
                    user.profilePicture ?? user.avatar ?? user.photoUrl;
                const avatarUri =
                    typeof rawAvatar === "string" && rawAvatar.trim().length > 0
                        ? rawAvatar.trim()
                        : undefined;
                map.set(id, {
                    id,
                    name:
                        user.fullname ||
                        user.username ||
                        user.name ||
                        user.email ||
                        "Unknown",
                    avatarUri,
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

    const totalInRange = useMemo(
        () => staffs.reduce((sum, s) => sum + s.totalCount, 0),
        [staffs],
    );
    const activeInRange = useMemo(
        () => staffs.reduce((sum, s) => sum + s.activeCount, 0),
        [staffs],
    );

    const initialLoading = loading && rows.length === 0 && !refreshing;

    return (
        <SafeAreaView
            edges={
                isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]
            }
            className="flex-1 bg-[#F5F7FB]"
        >
            {/* Header */}
            <PlatformAdaptiveHeader
                title="Sanctions"
                backgroundColor="#F5F7FB"
                headerRight={() => (
                    <Pressable
                        onPress={() =>
                            router.push("/(admin)/team/sanctions/create")
                        }
                        className="w-10 h-10 rounded-full items-center justify-center ios:mr-3"
                        hitSlop={8}
                        style={{ backgroundColor: PRIMARY }}
                    >
                        <Plus size={20} color="#FFFFFF" />
                    </Pressable>
                )}
            />

            <FlatList
                data={staffs}
                keyExtractor={(i) => i.id}
                contentContainerClassName="pt-2 pb-10 px-4"
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                    />
                }
                ListHeaderComponent={
                    <View className="mb-4">
                        <RangeTabs value={range} onChange={setRange} />

                        <View className="mt-3 flex-row gap-3">
                            <View className="flex-1 rounded-[24px] bg-white border border-gray-100 p-4">
                                <Text className="font-kumbh text-xs text-[#6B7280]">
                                    Total ({range})
                                </Text>
                                <Text className="mt-1 font-kumbhBold text-2xl text-[#111827]">
                                    {totalInRange}
                                </Text>
                            </View>
                            <View className="flex-1 rounded-[24px] bg-white border border-gray-100 p-4">
                                <Text className="font-kumbh text-xs text-[#6B7280]">
                                    Active
                                </Text>
                                <Text
                                    className={`mt-1 font-kumbhBold text-2xl ${
                                        activeInRange > 0
                                            ? "text-red-600"
                                            : "text-emerald-600"
                                    }`}
                                >
                                    {activeInRange}
                                </Text>
                            </View>
                            <View className="flex-1 rounded-[24px] bg-white border border-gray-100 p-4">
                                <Text className="font-kumbh text-xs text-[#6B7280]">
                                    Members
                                </Text>
                                <Text className="mt-1 font-kumbhBold text-2xl text-primary">
                                    {staffs.length}
                                </Text>
                            </View>
                        </View>

                        <Text className="mt-5 mb-1 px-1 text-xs font-kumbhBold uppercase tracking-wider text-[#6B7280]">
                            Sanctioned Staff ({staffs.length})
                        </Text>
                    </View>
                }
                ItemSeparatorComponent={() => <View className="h-3" />}
                renderItem={({ item }) => <StaffCard item={item} />}
                ListEmptyComponent={
                    initialLoading ? (
                        <View className="items-center justify-center py-16">
                            <ActivityIndicator color={PRIMARY} />
                            <Text className="mt-2 text-[#6B7280] font-kumbh">
                                Loading sanctions…
                            </Text>
                        </View>
                    ) : !loading ? (
                        <View className="rounded-[24px] bg-white border border-gray-100 px-5 py-12 items-center">
                            <View className="h-12 w-12 rounded-2xl bg-[#EEF2FF] items-center justify-center mb-3">
                                <ShieldAlert size={22} color="#4C5FAB" />
                            </View>
                            <Text className="text-center text-[#111827] font-kumbhBold text-base">
                                {error
                                    ? "Unable to load sanctions"
                                    : "No sanctions recorded"}
                            </Text>
                            <Text className="mt-1 text-center text-[#6B7280] font-kumbh text-sm">
                                {error
                                    ? error
                                    : `No staff sanctions found in the ${range} window.`}
                            </Text>
                        </View>
                    ) : null
                }
            />
        </SafeAreaView>
    );
}

/* ───────── light-themed building blocks ───────── */

function getInitials(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function StaffAvatar({ uri, name }: { uri?: string; name: string }) {
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

function StaffCard({ item }: { item: StaffRow }) {
    const router = useRouter();
    const hasActive = item.activeCount > 0;

    return (
        <Pressable
            onPress={() =>
                router.push({
                    pathname: "/(admin)/team/sanctions/[staffId]",
                    params: { staffId: item.id, name: item.name },
                } as any)
            }
            className="rounded-[24px] bg-white border border-gray-100 p-4"
        >
            <View className="flex-row items-center">
                <StaffAvatar uri={item.avatarUri} name={item.name} />
                <View className="flex-1 mr-2">
                    <Text
                        className="text-[#111827] font-kumbhBold text-[16px]"
                        numberOfLines={1}
                    >
                        {item.name}
                    </Text>
                    <Text className="text-[#6B7280] font-kumbh text-[13px] mt-0.5">
                        {item.totalCount}{" "}
                        {item.totalCount === 1 ? "sanction" : "sanctions"}
                    </Text>
                </View>

                <View className="flex-row items-center gap-2">
                    <View
                        className={`px-2.5 py-1 rounded-full border ${
                            hasActive
                                ? "bg-red-50 border-red-100"
                                : "bg-emerald-50 border-emerald-100"
                        }`}
                    >
                        <Text
                            className={`font-kumbhBold text-[11px] ${
                                hasActive ? "text-red-700" : "text-emerald-700"
                            }`}
                        >
                            {item.activeCount} active
                        </Text>
                    </View>
                    <ChevronRight size={16} color="#9CA3AF" />
                </View>
            </View>
        </Pressable>
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
                            "flex-1 py-2.5 rounded-xl items-center justify-center",
                            active ? "bg-primary" : "bg-transparent",
                        )}
                    >
                        <Text
                            className={clsx(
                                "font-kumbhBold text-xs",
                                active ? "text-white" : "text-[#6B7280]",
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
