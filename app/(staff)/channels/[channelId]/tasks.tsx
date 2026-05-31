// app/(app)/tasks/StatusScreen.tsx
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Platform,
    Pressable,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import BoardCard from "@/components/client/tasks/BoardCard";
import FabCreate from "@/components/staff/tasks/FabCreate";
import CreateTaskModal from "@/components/staff/tasks/modals/CreateTaskModal";
import TaskDetailModal from "@/components/staff/tasks/modals/TaskDetailModal";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

import {
    ChannelStatusKey,
    ChannelTask,
    makeSelectChannelTasksByChannelId,
    makeSelectChannelTasksByStatus,
    makeSelectDefaultChannelId,
    selectChannelById,
    selectStatus as selectChannelsStatus,
} from "@/redux/channels/channels.selectors";
import {
    fetchChannelById,
    fetchChannelTasks,
} from "@/redux/channels/channels.thunks";
import { selectUser } from "@/redux/user/user.slice";
import { fetchProfile } from "@/redux/user/user.thunks";

import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import { SwipeableTabView } from "@/components/ui/SwipeableTabView";
import { STATUS_META } from "@/features/staff/types";
import { formatDateLabel, getDateKey } from "@/utils/format";

const PRIMARY = "#4C5FAB";

// Tabs you want to show
const TABS: { key: ChannelStatusKey; label: string }[] = [
    { key: "not-started", label: "Not started" },
    { key: "in-progress", label: "In progress" },
    { key: "completed", label: "Completed" },
    { key: "canceled", label: "Canceled" },
];

export default function StatusScreen() {
    type TaskListItem =
        | { type: "date"; key: string; ts: number }
        | { type: "task"; key: string; task: ChannelTask };
    const params = useLocalSearchParams<{
        status?: ChannelStatusKey;
        channelId?: string;
    }>();
    const statusKey: ChannelStatusKey =
        (params.status as ChannelStatusKey) || "in-progress";
    const paramChannelId = (params.channelId as string) || null;
    const isIOS = Platform.OS === "ios";
    const routes = useMemo(
        () =>
            TABS.map((tab) => ({
                key: tab.key,
                title: tab.label,
            })),
        [],
    );
    const initialTabIndex = Math.max(
        0,
        TABS.findIndex((tab) => tab.key === statusKey),
    );
    const [tabIndex, setTabIndex] = useState(initialTabIndex);

    const dispatch = useAppDispatch();

    // ensure we have user (for default channel calculation)
    const user = useAppSelector(selectUser);
    useEffect(() => {
        if (!user?._id) dispatch(fetchProfile());
    }, [dispatch, user?._id]);

    const defaultChannelId = useAppSelector(
        makeSelectDefaultChannelId(user?._id ?? null, "recent"),
    );
    const channelId = paramChannelId || defaultChannelId || null;

    // fetch the chosen channel when id becomes known
    useEffect(() => {
        if (!channelId) return;
        dispatch(fetchChannelById(String(channelId)));
        dispatch(fetchChannelTasks(String(channelId)));
    }, [dispatch, channelId]);

    const channelsStatus = useAppSelector(selectChannelsStatus);

    // derive tasks
    const selectAllChannelTasks = useMemo(
        () => makeSelectChannelTasksByChannelId(channelId),
        [channelId],
    );
    const selectChannelTasksByStatus = useMemo(
        () => makeSelectChannelTasksByStatus(channelId, statusKey),
        [channelId, statusKey],
    );

    const allChannelTasks = useAppSelector(selectAllChannelTasks);
    // console.log("All channel tasks:", allChannelTasks);
    const list = useAppSelector(selectChannelTasksByStatus);
    const channel = useAppSelector(selectChannelById(channelId ?? ""));

    const memberLookup = useMemo(() => {
        const map = new Map<string, string>();
        const rawMembers = Array.isArray((channel as any)?.members)
            ? (channel as any).members
            : [];
        rawMembers.forEach((m: any, idx: number) => {
            const base = typeof m === "string" ? { _id: m } : (m ?? {});
            const entry = base?.user ?? base?.member ?? base ?? {};
            const profile =
                entry?._id && typeof entry._id === "object" ? entry._id : entry;
            const rawId =
                profile?._id ??
                profile?.id ??
                entry?._id ??
                entry?.id ??
                base?.userId ??
                base?.memberId ??
                base?._id ??
                base?.id ??
                (typeof m === "string" ? m : null) ??
                `member-${idx}`;
            const name =
                profile?.fullname ??
                profile?.name ??
                profile?.username ??
                profile?.email ??
                entry?.name ??
                entry?.username ??
                base?.name ??
                base?.email ??
                null;
            const id = rawId ? String(rawId) : "";
            if (id && name && !map.has(id)) map.set(id, String(name));
        });
        return map;
    }, [channel]);

    // modals
    const [showCreate, setShowCreate] = useState(false);
    const [edit, setEdit] = useState(null);

    const isLoading = channelsStatus === "loading" && !allChannelTasks.length;

    const listData = useMemo<TaskListItem[]>(() => {
        const out: TaskListItem[] = [];
        let lastDateKey: string | null = null;
        for (const task of list) {
            const ts =
                typeof task.createdAt === "number" ? task.createdAt : NaN;
            if (Number.isFinite(ts)) {
                const dateKey = getDateKey(ts);
                if (dateKey !== lastDateKey) {
                    out.push({ type: "date", key: `d-${dateKey}`, ts });
                    lastDateKey = dateKey;
                }
            }
            out.push({ type: "task", key: `t-${task.id}`, task });
        }
        return out;
    }, [list]);

    useEffect(() => {
        setTabIndex(initialTabIndex);
    }, [initialTabIndex]);

    const goTab = (key: ChannelStatusKey) => {
        router.setParams({ status: key, channelId: channelId ?? undefined });
    };

    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(async () => {
        if (!channelId) return;
        try {
            setRefreshing(true);
            await dispatch(fetchChannelById(String(channelId))).unwrap();
            await dispatch(fetchChannelTasks(String(channelId))).unwrap();
        } catch {
        } finally {
            setRefreshing(false);
        }
    }, [dispatch, channelId]);

    return (
        <SafeAreaView
            edges={
                isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]
            }
            className="flex-1 bg-[#F7F8FB]"
        >
            <StatusBar style="dark" />

            {/* Header */}
            <PlatformAdaptiveHeader title="Task Boards" />

            {/* Swipeable Tabs */}
            <SwipeableTabView
                navigationState={{ index: tabIndex, routes }}
                scrollEnabled={true}
                onIndexChange={(index) => {
                    setTabIndex(index);
                    const nextStatus = TABS[index]?.key;
                    if (nextStatus && nextStatus !== statusKey) {
                        goTab(nextStatus);
                    }
                }}
                tabBarProps={{
                    activeColor: PRIMARY,
                    inactiveColor: "#6B7280",
                    style: {
                        paddingHorizontal: 16,
                    },
                    tabStyle: {
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                    },
                }}
                renderScene={({ route }) => {
                    const activeTabIndex = TABS.findIndex(
                        (tab) => tab.key === route.key,
                    );
                    const isActive = route.key === statusKey;
                    const sceneData =
                        activeTabIndex >= 0 && route.key === statusKey
                            ? listData
                            : [];

                    return (
                        <View className="flex-1">
                            {isLoading && isActive ? (
                                <View className="flex-1 items-center justify-center px-5">
                                    <ActivityIndicator
                                        size="small"
                                        color={PRIMARY}
                                    />
                                    <Text className="mt-3 text-[#6B7280] font-kumbh">
                                        Loading tasks...
                                    </Text>
                                </View>
                            ) : (
                                <FlatList
                                    contentContainerStyle={{
                                        paddingBottom: 120,
                                        paddingTop: 12,
                                    }}
                                    data={sceneData}
                                    keyExtractor={(i) => i.key}
                                    renderItem={({ item }) => {
                                        if (item.type === "date") {
                                            return (
                                                <View className="px-5 items-center">
                                                    <View className="px-3 py-1.5 rounded-full bg-white border border-gray-100">
                                                        <Text className="text-[11px] text-gray-600 font-kumbhBold">
                                                            {formatDateLabel(
                                                                item.ts,
                                                            )}
                                                        </Text>
                                                    </View>
                                                </View>
                                            );
                                        }
                                        const task = item.task;
                                        return (
                                            <Pressable
                                                onPress={() =>
                                                    setEdit(task as any)
                                                }
                                            >
                                                <BoardCard
                                                    project={
                                                        task.channelCode || "—"
                                                    }
                                                    title={task.title}
                                                    description={
                                                        task.description || ""
                                                    }
                                                    assignees={
                                                        (task.assignees || [])
                                                            .map(
                                                                (assignee) =>
                                                                    assignee.name ??
                                                                    assignee.email ??
                                                                    (assignee.id
                                                                        ? memberLookup.get(
                                                                              assignee.id,
                                                                          )
                                                                        : null) ??
                                                                    assignee.id ??
                                                                    null,
                                                            )
                                                            .filter(
                                                                Boolean,
                                                            ) as string[]
                                                    }
                                                    statusLabel={
                                                        TABS.find(
                                                            (t) =>
                                                                t.key ===
                                                                task.status,
                                                        )?.label ?? task.status
                                                    }
                                                    cardBg={
                                                        STATUS_META[task.status]
                                                            .bgColor
                                                    }
                                                    pillBg={
                                                        STATUS_META[task.status]
                                                            .arrowBg
                                                    }
                                                />
                                            </Pressable>
                                        );
                                    }}
                                    ListEmptyComponent={
                                        <View className="px-5 mt-8">
                                            <Text className="font-kumbhBold text-[#6B7280] text-center">
                                                No tasks in this category yet.
                                            </Text>
                                        </View>
                                    }
                                    refreshing={
                                        refreshing ||
                                        (channelsStatus === "loading" &&
                                            !!allChannelTasks.length)
                                    }
                                    onRefresh={onRefresh}
                                />
                            )}
                        </View>
                    );
                }}
            />

            <FabCreate onPress={() => setShowCreate(true)} />

            {/* Modals */}
            <CreateTaskModal
                visible={showCreate}
                onClose={() => setShowCreate(false)}
                defaultChannelId={channelId}
            />
            {edit && (
                <TaskDetailModal
                    visible={!!edit}
                    onClose={() => setEdit(null)}
                    task={edit as any}
                />
            )}
        </SafeAreaView>
    );
}
