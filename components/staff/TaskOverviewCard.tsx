import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import React, { useEffect, useMemo } from "react";
import { FlatList, Image, Pressable, Text, View } from "react-native";

import {
    selectAllPersonalTasks,
    selectPersonalTasksStatus,
} from "@/redux/personalTasks/personalTasks.selectors";
import { fetchPersonalTasks } from "@/redux/personalTasks/personalTasks.thunks";
import { selectUser } from "@/redux/user/user.slice";
import { fetchProfile } from "@/redux/user/user.thunks";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

type UiTask = {
    id: string;
    title: string;
    description?: string | null;
    status: "in-progress" | "not-started" | "completed" | "canceled";
    channelCode?: string | null;
    createdAt: number;
};

const fromApiStatus = (s?: string | null) => {
    const v = (s ?? "").toLowerCase().replace(/_/g, "-");
    if (v === "in-progress") return "in-progress";
    if (v === "not-started" || v === "pending" || v === "todo")
        return "not-started";
    if (v === "completed" || v === "done") return "completed";
    if (v === "canceled" || v === "cancelled") return "canceled";
    return "in-progress";
};

const statusMeta = (status: UiTask["status"]) => {
    if (status === "completed") {
        return {
            label: "Completed",
            chipBg: "#DCFCE7",
            chipText: "#166534",
            dot: "#22C55E",
        };
    }
    if (status === "not-started") {
        return {
            label: "Not Started",
            chipBg: "#E5E7EB",
            chipText: "#374151",
            dot: "#9CA3AF",
        };
    }
    if (status === "canceled") {
        return {
            label: "Canceled",
            chipBg: "#FEE2E2",
            chipText: "#991B1B",
            dot: "#EF4444",
        };
    }
    return {
        label: "In Progress",
        chipBg: "#DBEAFE",
        chipText: "#1D4ED8",
        dot: "#3B82F6",
    };
};

export default function TasksOverviewCard() {
    const dispatch = useAppDispatch();
    const user = useAppSelector(selectUser);
    const personalTasks = useAppSelector(selectAllPersonalTasks);
    const personalStatus = useAppSelector(selectPersonalTasksStatus);

    useEffect(() => {
        dispatch(fetchProfile());
    }, [dispatch]);

    useEffect(() => {
        dispatch(fetchPersonalTasks());
    }, [dispatch]);

    const tasks: UiTask[] = useMemo(
        () =>
            personalTasks
                .map((t) => ({
                    id: t.id,
                    title: t.title,
                    description: t.description ?? null,
                    status: fromApiStatus(t.status) as UiTask["status"],
                    channelCode: "personal",
                    createdAt:
                        typeof t.createdAt === "number"
                            ? t.createdAt
                            : t.createdAt
                              ? new Date(t.createdAt).getTime()
                              : 0,
                }))
                .sort((a, b) => b.createdAt - a.createdAt),
        [personalTasks],
    );

    const latest = tasks.slice(0, 3);
    const loading = personalStatus === "loading" && latest.length === 0;

    const viewAllTasksPath =
        user?.role === "staff"
            ? "/(staff)/(tabs)/tasks"
            : "/(client)/(tabs)/tasks";

    return (
        <View className=" overflow-hidden rounded-3xl border border-gray-100 bg-white p-4">
            <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                    <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                        <Ionicons
                            name="checkmark-done"
                            size={18}
                            color="#4C5FAB"
                        />
                    </View>

                    <Text className="font-kumbhBold text-lg text-gray-900">
                        Tasks
                    </Text>
                </View>
                <View className="rounded-full bg-gray-100 px-3 py-1.5">
                    <Text className="font-kumbhBold text-xs text-gray-700">
                        {tasks.length}
                    </Text>
                </View>
            </View>

            {loading ? (
                <View className="items-center justify-center py-4">
                    <Image
                        source={require("@/assets/images/task.png")}
                        resizeMode="contain"
                        style={{ width: 74, height: 74, opacity: 0.9 }}
                    />
                    <Text className="mt-3 font-kumbh text-sm text-gray-500">
                        Loading personal tasks…
                    </Text>
                </View>
            ) : latest.length === 0 ? (
                <View className="items-center justify-center py-4">
                    <Image
                        source={require("@/assets/images/task.png")}
                        resizeMode="contain"
                        style={{ width: 74, height: 74, opacity: 0.85 }}
                    />
                    <Text className="mt-3 font-kumbh text-sm text-gray-500">
                        No personal task yet.
                    </Text>
                </View>
            ) : (
                <FlatList
                    className="mt-4"
                    data={latest}
                    keyExtractor={(i) => i.id}
                    scrollEnabled={false}
                    ItemSeparatorComponent={() => (
                        <View style={{ height: 10 }} />
                    )}
                    renderItem={({ item }) => {
                        const meta = statusMeta(item.status);
                        return (
                            <View className="rounded-2xl border border-gray-100 bg-[#FAFBFF] px-4 py-3.5">
                                <View className="flex-row items-start justify-between">
                                    <View className="flex-1 pr-3">
                                        <Text
                                            className="font-kumbhBold text-[15px] text-[#111827]"
                                            numberOfLines={2}
                                        >
                                            {item.title}
                                        </Text>
                                        {!!item.description && (
                                            <Text
                                                className="mt-1 font-kumbh text-[13px] text-[#6B7280]"
                                                numberOfLines={2}
                                            >
                                                {item.description}
                                            </Text>
                                        )}
                                    </View>
                                    <View
                                        className="rounded-full px-2.5 py-1"
                                        style={{ backgroundColor: meta.chipBg }}
                                    >
                                        <Text
                                            className="font-kumbhBold text-[11px]"
                                            style={{ color: meta.chipText }}
                                        >
                                            {meta.label}
                                        </Text>
                                    </View>
                                </View>

                                <View className="mt-2.5 flex-row items-center justify-between">
                                    <View className="flex-row items-center">
                                        <View
                                            className="mr-1.5 h-2 w-2 rounded-full"
                                            style={{
                                                backgroundColor: meta.dot,
                                            }}
                                        />
                                        <Text className="font-kumbh text-[12px] text-[#6B7280]">
                                            Personal
                                        </Text>
                                    </View>
                                    <Ionicons
                                        name="chevron-forward"
                                        size={16}
                                        color="#9CA3AF"
                                    />
                                </View>
                            </View>
                        );
                    }}
                    ListFooterComponent={<View style={{ height: 6 }} />}
                />
            )}

            <Pressable
                className="mt-2 w-full flex-row items-center justify-center rounded-2xl py-3.5"
                style={{ backgroundColor: "#4C5FAB" }}
                onPress={() => router.push({ pathname: viewAllTasksPath })}
            >
                <Text className="font-kumbhBold text-sm text-white">
                    View All Tasks
                </Text>
                <Ionicons
                    name="arrow-forward"
                    size={16}
                    color="#FFFFFF"
                    style={{ marginLeft: 6 }}
                />
            </Pressable>
        </View>
    );
}
