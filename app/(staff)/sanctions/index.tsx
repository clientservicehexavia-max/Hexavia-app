import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import {
    selectSanctions,
    selectSanctionsError,
    selectSanctionsLoading,
} from "@/redux/sanctions/sanctions.slice";
import { fetchSanctions } from "@/redux/sanctions/sanctions.thunks";
import { selectUser } from "@/redux/user/user.slice";
import { fetchProfile } from "@/redux/user/user.thunks";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { StatusBar } from "expo-status-bar";
import { Calendar, ShieldAlert } from "lucide-react-native";
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

type RowStatus = "Active" | "Resolved";

type SanctionItem = {
    id: string;
    date: string;
    reason: string;
    status: RowStatus;
    type: string;
};

export default function SanctionsScreen() {
    const dispatch = useAppDispatch();
    const isIOS = Platform.OS === "ios";

    const user = useAppSelector(selectUser);
    const userId = user?._id ?? null;

    const rawRows = useAppSelector(selectSanctions);
    const loading = useAppSelector(selectSanctionsLoading);
    const error = useAppSelector(selectSanctionsError) ?? null;

    const [filter, setFilter] = useState<RowStatus | "All">("All");
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        dispatch(fetchProfile());
    }, [dispatch]);

    useEffect(() => {
        if (!userId) return;
        dispatch(fetchSanctions({ userId: String(userId) }) as any);
    }, [dispatch, userId]);

    const onRefresh = useCallback(async () => {
        if (!userId) return;
        setRefreshing(true);
        try {
            await dispatch(
                fetchSanctions({ userId: String(userId) }) as any,
            ).unwrap();
        } finally {
            setRefreshing(false);
        }
    }, [dispatch, userId]);

    const userSanctions = useMemo(() => {
        if (!userId) return [];
        const sourceRows = Array.isArray(rawRows) ? rawRows : [];
        return sourceRows.filter((r: any) => {
            const uid = r?.sanctionUser?._id || r?.user?._id || r?.userId;
            return String(uid ?? "") === String(userId);
        });
    }, [rawRows, userId]);

    const data = useMemo<SanctionItem[]>(() => {
        return userSanctions
            .map((r: any) => {
                const rawDate = r?.date || r?.createdAt || "";
                const dt = new Date(rawDate);
                const date = Number.isNaN(dt.getTime())
                    ? "—"
                    : dt.toLocaleDateString(undefined, {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                      });
                const status: RowStatus = r?.isActive ? "Active" : "Resolved";

                return {
                    id: String(r?._id),
                    date,
                    reason: r?.reason ?? "—",
                    status,
                    type: String(r?.type ?? "warning").toUpperCase(),
                };
            })
            .filter((r) => (filter === "All" ? true : r.status === filter));
    }, [userSanctions, filter]);

    return (
        <SafeAreaView
            edges={
                isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]
            }
            className="flex-1 bg-white px-4"
        >
            <PlatformAdaptiveHeader title="Sanctions" />
            <StatusBar style="dark" />

            <View className="flex-row gap-2 mt-3">
                {(["All", "Active", "Resolved"] as const).map((tab) => (
                    <Pressable
                        key={tab}
                        onPress={() => setFilter(tab)}
                        className={`px-4 py-2 rounded-full border ${
                            filter === tab
                                ? "bg-primary border-primary"
                                : "bg-white border-gray-200"
                        }`}
                    >
                        <Text
                            className={`text-sm font-kumbhBold ${
                                filter === tab ? "text-white" : "text-gray-700"
                            }`}
                        >
                            {tab}
                        </Text>
                    </Pressable>
                ))}
            </View>

            {loading && userSanctions.length === 0 ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator color="#7C3AED" />
                    <Text className="mt-2 text-gray-500 font-kumbh">
                        Loading sanctions…
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={data}
                    keyExtractor={(i) => i.id}
                    contentContainerClassName="pt-4 pb-10"
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                        />
                    }
                    ItemSeparatorComponent={() => <View className="h-3" />}
                    renderItem={({ item }) => (
                        <Card>
                            <View className="flex-row items-center justify-between">
                                <ShieldBadge status={item.status} />
                                <View className="px-2 py-1 rounded-full bg-indigo-50">
                                    <Text className="font-kumbhBold text-[11px] text-indigo-700">
                                        {item.type}
                                    </Text>
                                </View>
                            </View>

                            <Divider />

                            <Row icon={<Calendar size={16} color="#6366F1" />}>
                                <Label>Date</Label>
                                <Value>{item.date}</Value>
                            </Row>

                            <Row
                                icon={<ShieldAlert size={16} color="#6366F1" />}
                            >
                                <Label>Reason</Label>
                                <Value>{item.reason}</Value>
                            </Row>
                        </Card>
                    )}
                    ListEmptyComponent={
                        <View className="px-5 py-12">
                            <Text className="text-center text-gray-500 font-kumbh">
                                {error
                                    ? `Error: ${error}`
                                    : "No sanctions found."}
                            </Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
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
    return <View className="h-px bg-gray-200 my-3" />;
}

function Row({
    icon,
    children,
}: {
    icon?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <View className="flex-row items-start gap-2 mt-2">
            <View className="mt-[2px]">{icon}</View>
            <View className="flex-1">{children}</View>
        </View>
    );
}

function Label({ children }: { children: React.ReactNode }) {
    return <Text className="text-xs text-gray-500 font-kumbh">{children}</Text>;
}

function Value({ children }: { children: React.ReactNode }) {
    return (
        <Text className="text-sm text-gray-900 font-kumbh mt-0.5">
            {children}
        </Text>
    );
}

function ShieldBadge({ status }: { status: RowStatus }) {
    const isActive = status === "Active";
    return (
        <View
            className="px-3 py-1.5 rounded-full"
            style={{
                backgroundColor: isActive ? "#FEE2E2" : "#DCFCE7",
            }}
        >
            <Text
                className="text-xs font-kumbhBold"
                style={{ color: isActive ? "#B91C1C" : "#166534" }}
            >
                {status}
            </Text>
        </View>
    );
}
