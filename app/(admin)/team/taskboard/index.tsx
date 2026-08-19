import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import { selectAdminUsers } from "@/redux/admin/admin.slice";
import { selectAllChannels } from "@/redux/channels/channels.selectors";
import {
    fetchChannelById,
    fetchChannels,
} from "@/redux/channels/channels.thunks";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useLocalSearchParams } from "expo-router";
import { RefreshCw } from "lucide-react-native";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    ActivityIndicator,
    LayoutChangeEvent,
    Pressable,
    ScrollView,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/api/axios";
import CreateTaskModal from "@/components/staff/tasks/modals/CreateTaskModal";
import TaskDetailModal from "@/components/staff/tasks/modals/TaskDetailModal";
import { fromApiStatus } from "@/features/client/statusMap";
import type { PersonalTaskApi } from "@/features/staff/personalTasks.types";
import type { Task } from "@/features/staff/types";

type ApiTask = {
    _id: string;
    name?: string;
    description?: string;
    status?: string;
    channelId?: string;
    channelCode?: string;
};

const THROTTLE_MS = 10_000;

const getAssigneeId = (item: any): string | null => {
    if (!item) return null;
    if (typeof item === "string") return item;

    const raw =
        item?._id?._id ??
        item?._id?.id ??
        item?._id ??
        item?.id ??
        item?.user?._id ??
        item?.user?.id ??
        item?.userId ??
        item?.member?._id ??
        item?.member?.id ??
        item?.memberId ??
        null;

    return raw ? String(raw) : null;
};

const isTaskAssignedToUser = (task: any, userId?: string | null): boolean => {
    if (!userId) return false;

    const assignees =
        task?.assignees ??
        task?.assignedTo ??
        task?.assignee ??
        task?.assignedUsers ??
        task?.members ??
        [];

    const list = Array.isArray(assignees) ? assignees : [assignees];
    return list.some((entry) => getAssigneeId(entry) === String(userId));
};

function normalizeCreatedAt(t: any): number {
    if (typeof t?.createdAt === "number") return t.createdAt;
    if (t?.createdAt) {
        const d = new Date(t.createdAt).getTime();
        if (!Number.isNaN(d)) return d;
    }
    if (typeof t?.updatedAt === "number") return t.updatedAt;
    if (t?.updatedAt) {
        const d = new Date(t.updatedAt).getTime();
        if (!Number.isNaN(d)) return d;
    }
    const oid = String(t?._id ?? t?.id ?? "");
    if (/^[a-f\d]{24}$/i.test(oid)) {
        const seconds = parseInt(oid.slice(0, 8), 16);
        if (!Number.isNaN(seconds)) return seconds * 1000;
    }
    return 0;
}

function byCreatedAtDescThenId(
    a: ApiTask & { ui: Task },
    b: ApiTask & { ui: Task },
) {
    const ad = a.ui.createdAt || 0;
    const bd = b.ui.createdAt || 0;
    if (bd !== ad) return bd - ad;
    return String(a._id).localeCompare(String(b._id));
}

export default function TaskBoard() {
    const { staffId } = useLocalSearchParams<{ staffId?: string }>();
    const { width: screenWidth } = useWindowDimensions();
    const dispatch = useAppDispatch();
    const channelFetchInFlight = useRef<Set<string>>(new Set());
    const channelLastFetchedAt = useRef<Map<string, number>>(new Map());

    useEffect(() => {
        dispatch(fetchChannels());
    }, [dispatch]);

    const users = useAppSelector(selectAdminUsers);
    const staff = users.find((u) => u._id === staffId);
    const staffName =
        staff?.fullname || staff?.username || staff?.email || "Staff";

    const allChannels = useAppSelector(selectAllChannels);

    // Personal tasks assigned to this staff (admin -> personal tasks)
    const [personalTasks, setPersonalTasks] = useState<PersonalTaskApi[]>([]);

    const fetchAssignedPersonalTasks = useCallback(
        async (signal?: AbortSignal) => {
            if (!staffId) return;
            try {
                const res = await api.get(
                    `/personal-task/assigned/${staffId}`,
                    {
                        signal,
                    },
                );
                const tasks = Array.isArray(res.data)
                    ? res.data
                    : Array.isArray(res.data?.tasks)
                      ? res.data.tasks
                      : [];
                setPersonalTasks(tasks);
            } catch {
                // ignore; leave previous tasks if any
            } finally {
                // no-op
            }
        },
        [staffId],
    );

    // Ensure each channel is hydrated with tasks (like your other screens)
    useEffect(() => {
        if (!allChannels?.length) return;
        allChannels.forEach((c: any) => {
            const id = String(c?._id ?? c?.id ?? "");
            if (!id) return;

            const tasksMissing =
                !Array.isArray(c?.tasks) || c.tasks.length === 0;
            if (!tasksMissing) return;

            const now = Date.now();
            const lastAt = channelLastFetchedAt.current.get(id) ?? 0;
            const withinThrottle = now - lastAt < THROTTLE_MS;
            const inFlight = channelFetchInFlight.current.has(id);
            if (withinThrottle || inFlight) return;

            channelFetchInFlight.current.add(id);
            channelLastFetchedAt.current.set(id, now);
            dispatch(fetchChannelById(id))
                .finally(() => {
                    channelFetchInFlight.current.delete(id);
                })
                .catch(() => {});
        });
    }, [dispatch, allChannels]);

    useEffect(() => {
        if (!staffId) return;
        const controller = new AbortController();
        fetchAssignedPersonalTasks(controller.signal);
        return () => controller.abort();
    }, [fetchAssignedPersonalTasks, staffId]);

    // Build UI task objects (with channelId + channelCode)
    const { todo, doing, done, canceled } = useMemo(() => {
        const all: (ApiTask & { ui: Task })[] = [];

        for (const ch of allChannels) {
            const chId = String(ch?._id ?? "");
            const chCode = String(ch?.name ?? ch?.code ?? "");
            const list = Array.isArray((ch as any)?.tasks)
                ? (ch as any).tasks
                : [];

            for (const t of list) {
                if (!isTaskAssignedToUser(t, String(staffId ?? ""))) {
                    continue;
                }

                const rawStatus = (t.status ?? t.state ?? "")
                    .toString()
                    .toLowerCase();
                const uiStatus = fromApiStatus(rawStatus);

                const api: ApiTask = {
                    _id: String(t._id ?? t.id),
                    name: t.name ?? t.title ?? "(Untitled Task)",
                    description: t.description ?? "",
                    status: rawStatus,
                    channelId: chId,
                    channelCode: chCode,
                };

                const ui: Task = {
                    id: api._id,
                    title: api.name || "(Untitled Task)",
                    description: api.description || "",
                    status: uiStatus,
                    channelCode: chCode,
                    channelId: chId,
                    createdAt: normalizeCreatedAt(t),
                };

                all.push({ ...api, ui });
            }
        }

        for (const t of personalTasks) {
            const rawStatus = (t.status ?? "").toString().toLowerCase();
            const uiStatus = fromApiStatus(rawStatus);
            const api: ApiTask = {
                _id: String(t._id),
                name: t.name ?? "(Untitled Task)",
                description: t.description ?? "",
                status: rawStatus,
                channelId: "personal",
                channelCode: "Personal",
            };

            const ui: Task = {
                id: api._id,
                title: api.name || "(Untitled Task)",
                description: api.description || "",
                status: uiStatus,
                channelCode: "Personal",
                channelId: "personal",
                createdAt: normalizeCreatedAt(t),
            };

            all.push({ ...api, ui });
        }

        all.sort(byCreatedAtDescThenId);

        const bucket = {
            todo: [] as (ApiTask & { ui: Task })[],
            doing: [] as (ApiTask & { ui: Task })[],
            done: [] as (ApiTask & { ui: Task })[],
            canceled: [] as (ApiTask & { ui: Task })[],
        };

        for (const t of all) {
            const s = (t.status || "").toLowerCase();
            if (["done", "completed", "resolved"].includes(s))
                bucket.done.push(t);
            else if (["canceled", "cancelled", "archived"].includes(s))
                bucket.canceled.push(t);
            else if (
                [
                    "doing",
                    "in-progress",
                    "progress",
                    "active",
                    "working",
                ].includes(s)
            )
                bucket.doing.push(t);
            else bucket.todo.push(t);
        }

        return bucket;
    }, [allChannels, personalTasks, staffId]);

    // Edit modal state
    const [edit, setEdit] = useState<Task | null>(null);

    // Create-personal-for-this-staff modal
    const [showCreate, setShowCreate] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [boardHeight, setBoardHeight] = useState(0);

    const openEdit = useCallback(
        (t: ApiTask & { ui: Task }) => setEdit(t.ui),
        [],
    );
    const closeEdit = useCallback(() => setEdit(null), []);

    useEffect(() => {
        if (!showCreate && staffId) {
            fetchAssignedPersonalTasks();
        }
    }, [showCreate, staffId, fetchAssignedPersonalTasks]);

    const refreshBoard = useCallback(async () => {
        if (refreshing) return;
        setRefreshing(true);
        try {
            await dispatch(fetchChannels());

            const ids = Array.from(
                new Set(
                    (allChannels || [])
                        .map((c: any) => String(c?._id ?? c?.id ?? ""))
                        .filter(Boolean),
                ),
            );

            await Promise.all(
                ids.map(async (id) => {
                    try {
                        await dispatch(fetchChannelById(id)).unwrap();
                    } catch {
                        // best-effort refresh
                    }
                }),
            );

            await fetchAssignedPersonalTasks();
        } finally {
            setRefreshing(false);
        }
    }, [refreshing, dispatch, allChannels, fetchAssignedPersonalTasks]);

    const totalTasks =
        todo.length + doing.length + done.length + canceled.length;

    const handleBoardLayout = useCallback((e: LayoutChangeEvent) => {
        const next = Math.floor(e.nativeEvent.layout.height);
        setBoardHeight((prev) => (prev === next ? prev : next));
    }, []);

    const columnWidth = Math.round(screenWidth * 0.85);

    return (
        <SafeAreaView className="flex-1 bg-white" edges={["left", "right"]}>
            <PlatformAdaptiveHeader
                title="Task Board"
                headerRight={({ tintColor }) => (
                    <Pressable
                        onPress={() => {
                            void refreshBoard();
                        }}
                        disabled={refreshing}
                        className="w-10 h-10 rounded-full items-center justify-center mr-1"
                    >
                        {refreshing ? (
                            <ActivityIndicator
                                size="small"
                                color={tintColor ?? "#111827"}
                            />
                        ) : (
                            <RefreshCw
                                size={22}
                                color={tintColor ?? "#111827"}
                            />
                        )}
                    </Pressable>
                )}
            />

            {/* Board */}
            <View className="flex-1" onLayout={handleBoardLayout}>
                <ScrollView
                    style={{ flex: 1 }}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{
                        // flexGrow: 1,
                        // alignItems: "stretch",
                        padding: 10,
                        gap: 8,
                        // paddingBottom: 10,
                    }}
                >
                    <Column
                        title="Not Started"
                        items={todo}
                        onOpen={openEdit}
                        width={columnWidth}
                    />
                    <Column
                        title="In Progress"
                        items={doing}
                        onOpen={openEdit}
                        width={columnWidth}
                    />
                    <Column
                        title="Completed"
                        items={done}
                        onOpen={openEdit}
                        width={columnWidth}
                    />
                    <Column
                        title="Canceled"
                        items={canceled}
                        onOpen={openEdit}
                        width={columnWidth}
                    />
                </ScrollView>
            </View>

            {/* Floating Create button (admin -> personal task for this staff) */}
            <Pressable
                onPress={() => setShowCreate(true)}
                className="absolute right-5 bottom-6 rounded-full"
                style={{
                    backgroundColor: "#111827",
                    paddingHorizontal: 20,
                    paddingVertical: 13,
                    shadowColor: "#000",
                    shadowOpacity: 0.22,
                    shadowRadius: 12,
                    shadowOffset: { width: 0, height: 6 },
                    elevation: 7,
                }}
            >
                <Text className="text-white font-kumbhBold">
                    New Personal Task
                </Text>
            </Pressable>

            {/* Modals */}
            {edit && (
                <TaskDetailModal
                    visible={!!edit}
                    onClose={closeEdit}
                    task={edit}
                />
            )}

            <CreateTaskModal
                visible={showCreate}
                onClose={() => setShowCreate(false)}
                forcePersonalForUserId={String(staffId)} // lock to this staff's personal tasks
                hideModeToggle
            />
        </SafeAreaView>
    );
}

function Column({
    title,
    items,
    onOpen,
    width,
}: {
    title: string;
    items: (ApiTask & { ui: Task })[];
    onOpen: (t: ApiTask & { ui: Task }) => void;
    width: number;
}) {
    const tone = getColumnTone(title);

    return (
        <View
            className="rounded-xl p-3 border"
            style={{
                width,
                alignSelf: "stretch",
                backgroundColor: tone.laneBg,
                borderColor: tone.laneBorder,
                shadowColor: "#000",
                shadowOpacity: 0.05,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 4 },
                elevation: 3,
            }}
        >
            <View className="flex-row items-center justify-between mb-1">
                <Text
                    className="text-base font-kumbhBold"
                    style={{ color: tone.titleColor }}
                >
                    {title}
                </Text>
                <View
                    className="px-2 py-[2px] rounded-full"
                    style={{ backgroundColor: tone.countBg }}
                >
                    <Text
                        className="text-[11px] font-kumbh"
                        style={{ color: tone.countText }}
                    >
                        {items.length}
                    </Text>
                </View>
            </View>

            {items.map((t) => (
                <Pressable
                    key={t._id}
                    onPress={() => onOpen(t)}
                    className="mb-3 rounded-xl border"
                    style={{
                        backgroundColor: "#FFFFFF",
                        borderColor: "#E9EDF5",
                        padding: 12,
                    }}
                >
                    {t.channelCode ? (
                        <View
                            className="self-start rounded-full px-2.5 py-1 mb-2"
                            style={{ backgroundColor: "#EEF2FF" }}
                        >
                            <Text className="font-kumbh text-[10px] text-[#3730A3]">
                                {t.channelCode}
                            </Text>
                        </View>
                    ) : null}

                    <Text
                        className="font-kumbh text-[#111827]"
                        numberOfLines={1}
                    >
                        {t.name || "(Untitled Task)"}
                    </Text>

                    {t.description ? (
                        <Text
                            className="mt-1 text-xs text-gray-600 font-kumbh"
                            numberOfLines={2}
                        >
                            {t.description}
                        </Text>
                    ) : null}

                    <Text
                        className="mt-1 text-[11px] font-kumbh"
                        style={{ color: "#6B7280" }}
                    >
                        {formatCreatedAt(t.ui.createdAt)}
                    </Text>
                </Pressable>
            ))}

            {items.length === 0 && (
                <View className="rounded-2xl border border-dashed border-[#D6DCEB] bg-white/70 p-3">
                    <Text className="text-gray-500 font-kumbh">No tasks</Text>
                </View>
            )}
        </View>
    );
}

function StatPill({ label, value }: { label: string; value: number }) {
    return (
        <View
            className="rounded-full px-3 py-1.5"
            style={{ backgroundColor: "#EEF2FF" }}
        >
            <Text className="font-kumbh text-[11px] text-[#334155]">
                {label}: <Text className="font-kumbhBold">{value}</Text>
            </Text>
        </View>
    );
}

function getColumnTone(title: string) {
    const key = title.toLowerCase();

    if (key.includes("not started")) {
        return {
            laneBg: "#F9FAFB",
            laneBorder: "#E5E7EB",
            titleColor: "#6B7280",
            countBg: "#E5E7EB",
            countText: "#4B5563",
        };
    }

    if (key.includes("in progress")) {
        return {
            laneBg: "#FFFBEB",
            laneBorder: "#FDE68A",
            titleColor: "#D97706",
            countBg: "#FEF3C7",
            countText: "#B45309",
        };
    }

    if (key.includes("completed")) {
        return {
            laneBg: "#ECFDF5",
            laneBorder: "#BBF7D0",
            titleColor: "#047857",
            countBg: "#D1FAE5",
            countText: "#047857",
        };
    }

    if (key.includes("canceled") || key.includes("cancelled")) {
        return {
            laneBg: "#FEF2F2",
            laneBorder: "#FECACA",
            titleColor: "#DC2626",
            countBg: "#FEE2E2",
            countText: "#DC2626",
        };
    }

    return {
        laneBg: "#FDFDFF",
        laneBorder: "#E8EBF3",
        titleColor: "#111827",
        countBg: "#EEF2FF",
        countText: "#3730A3",
    };
}

function formatCreatedAt(ms?: number) {
    if (!ms) return "Created —";
    try {
        const d = new Date(ms);
        return `Created ${d.toLocaleDateString([], {
            month: "short",
            day: "numeric",
        })} ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
    } catch {
        return "Created —";
    }
}
