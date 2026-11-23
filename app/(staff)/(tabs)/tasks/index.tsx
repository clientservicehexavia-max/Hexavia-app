import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import SearchBar from "@/components/staff/tasks/SearchBar";
import TaskCard from "@/components/staff/tasks/TaskCard";
import CreateTaskModal from "@/components/staff/tasks/modals/CreateTaskModal";
import FilterModal, {
    FilterState,
} from "@/components/staff/tasks/modals/FIlterModal";
import { SwipeableTabView } from "@/components/ui/SwipeableTabView";
import {
    STATUS_META,
    StatusKey,
    TAB_ORDER,
    Task,
} from "@/features/staff/types";
import { selectAllPersonalTasks } from "@/redux/personalTasks/personalTasks.selectors";
import {
    deletePersonalTask,
    fetchPersonalTasks,
} from "@/redux/personalTasks/personalTasks.thunks";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { StatusBar } from "expo-status-bar";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    Alert,
    FlatList,
    Platform,
    Pressable,
    RefreshControl,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { fromApiStatus } from "@/features/client/statusMap";
import { selectAllChannels } from "@/redux/channels/channels.selectors";
import {
    fetchChannelById,
    fetchChannels,
} from "@/redux/channels/channels.thunks";
import { selectUser } from "@/redux/user/user.slice";
import { fetchProfile } from "@/redux/user/user.thunks";
import { Funnel, Plus, Trash2 } from "lucide-react-native";

// ===== stable time normalizer & comparator =====
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
    return 0; // stable fallback (never Date.now)
}

function byCreatedAtDescThenId(a: Task, b: Task) {
    const ad = a.createdAt || 0;
    const bd = b.createdAt || 0;
    if (bd !== ad) return bd - ad;
    return String(a.id).localeCompare(String(b.id));
}

// ===== per-call throttling helpers =====
const THROTTLE_MS = 10_000; // avoid per-channel refetching within 10s

const MODE_TABS: { value: FilterState["mode"]; label: string }[] = [
    { value: "all", label: "All" },
    { value: "channel", label: "Channel" },
    { value: "personal", label: "Personal" },
];

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

export default function TaskScreen() {
    const dispatch = useAppDispatch();
    const isIOS = Platform.OS === "ios";
    const { width } = useWindowDimensions();
    const tabLabelFontSize = width < 360 ? 12 : width < 420 ? 14 : 15;
    const profileUser = useAppSelector(selectUser);
    const authUser = useAppSelector((s) => s.auth.user as any);
    const me = profileUser ?? authUser;
    // ---- call guards / refs ----
    const didInitRef = useRef(false);
    const isRefreshingRef = useRef(false);
    const fetching = useRef({
        channels: false,
        personal: false,
    });
    const fetchedPersonalOnceRef = useRef(false);
    const channelFetchInFlight = useRef<Set<string>>(new Set());
    const channelLastFetchedAt = useRef<Map<string, number>>(new Map());

    // ---- initial channels fetch (once) ----
    useEffect(() => {
        if (didInitRef.current) return;
        didInitRef.current = true;

        dispatch(fetchProfile()).catch(() => {});

        if (!fetching.current.channels) {
            fetching.current.channels = true;
            dispatch(fetchChannels())
                .finally(() => {
                    fetching.current.channels = false;
                })
                .catch(() => {});
        }
    }, [dispatch]);

    const myUserId = me?._id ?? null;

    // Load all channels, but only include tasks assigned to this user.
    const allChannels = useAppSelector(selectAllChannels);

    // Fetch channel details (tasks) when needed, with throttle & dedupe
    useEffect(() => {
        if (!Array.isArray(allChannels) || allChannels.length === 0) return;

        allChannels.forEach((c: any) => {
            const id = String(c?._id ?? c?.id ?? "");
            if (!id) return;

            const tasksMissing =
                !Array.isArray(c?.tasks) || c.tasks.length === 0;
            if (!tasksMissing) return;

            // throttle & de-dupe
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

    // Personal tasks fetch guard (runs once per session)
    useEffect(() => {
        if (fetching.current.personal) return;
        if (fetchedPersonalOnceRef.current) return;

        fetching.current.personal = true;
        dispatch(fetchPersonalTasks())
            .finally(() => {
                fetching.current.personal = false;
                fetchedPersonalOnceRef.current = true;
            })
            .catch(() => {});
    }, [dispatch]);

    // ---- UI state ----
    const [query, setQuery] = useState("");
    const [active, setActive] = useState<StatusKey>("in-progress");
    const [showCreate, setShowCreate] = useState(false);
    const [showFilter, setShowFilter] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const activeStatusColor = STATUS_META[active]?.bgColor ?? "#4C5FAB";

    const [filters, setFilters] = useState<FilterState>({
        mode: "all",
        channelCode: "",
        statuses: [],
    });

    const handleModeChange = (mode: FilterState["mode"]) => {
        setFilters((prev) => ({ ...prev, mode }));
    };

    const onRefresh = useCallback(async () => {
        if (isRefreshingRef.current) return;
        isRefreshingRef.current = true;
        setRefreshing(true);
        try {
            // refetch channels once
            if (!fetching.current.channels) {
                fetching.current.channels = true;
                await dispatch(fetchChannels()).finally(() => {
                    fetching.current.channels = false;
                });
            }

            // refetch only channels that need details, with throttle
            const ids = (allChannels || [])
                .map((c: any) => String(c?._id ?? c?.id))
                .filter(Boolean);

            await Promise.all(
                ids.map(async (id: any) => {
                    const now = Date.now();
                    const lastAt = channelLastFetchedAt.current.get(id) ?? 0;
                    const withinThrottle = now - lastAt < THROTTLE_MS;
                    const inFlight = channelFetchInFlight.current.has(id);
                    if (withinThrottle || inFlight) return;

                    channelFetchInFlight.current.add(id);
                    channelLastFetchedAt.current.set(id, now);
                    try {
                        await dispatch(fetchChannelById(id)).unwrap();
                    } catch {
                    } finally {
                        channelFetchInFlight.current.delete(id);
                    }
                }),
            );

            if (!fetching.current.personal) {
                fetching.current.personal = true;
                await dispatch(fetchPersonalTasks()).finally(() => {
                    fetching.current.personal = false;
                    fetchedPersonalOnceRef.current = true;
                });
            }
        } finally {
            setRefreshing(false);
            isRefreshingRef.current = false;
        }
    }, [dispatch, allChannels]);

    // ---- map to Task[] with stable timestamps ----
    const channelTasks: Task[] = useMemo(() => {
        if (!Array.isArray(allChannels)) return [];
        const out: Task[] = [];
        allChannels.forEach((ch: any) => {
            const code = ch?.name ?? ""; // or ch?.code
            const tasks = Array.isArray(ch?.tasks) ? ch.tasks : [];
            tasks.forEach((t: any) => {
                if (!isTaskAssignedToUser(t, myUserId)) return;
                out.push({
                    id: String(t?._id ?? t?.id),
                    title: String(t?.name ?? t?.title ?? "Untitled task"),
                    description: t?.description ?? null,
                    status: fromApiStatus(t?.status),
                    channelCode: code,
                    channelId: ch?._id
                        ? String(ch._id)
                        : ch?.id
                          ? String(ch.id)
                          : undefined,
                    createdAt: normalizeCreatedAt(t),
                });
            });
        });
        return out.sort(byCreatedAtDescThenId);
    }, [allChannels, myUserId]);

    // Personal list (empty for clients)
    const personal = useAppSelector(selectAllPersonalTasks);
    const personalTasks: Task[] = useMemo(() => {
        return personal.map((t: any) => ({
            id: t.id,
            title: t.title,
            description: t.description as any,
            status: t.status as StatusKey,
            channelCode: "personal",
            channelId: "personal",
            createdAt:
                typeof t.createdAt === "number"
                    ? t.createdAt
                    : t.createdAt
                      ? new Date(t.createdAt).getTime()
                      : 0,
        }));
    }, [personal]);

    const merged: Task[] = useMemo(() => {
        return [...channelTasks, ...personalTasks].sort(byCreatedAtDescThenId);
    }, [channelTasks, personalTasks]);

    const baseFiltered = useMemo(() => {
        const q = query.trim().toLowerCase();
        let base = merged;

        if (filters.mode === "channel")
            base = base.filter((t) => t.channelCode !== "personal");
        else if (filters.mode === "personal")
            base = base.filter((t) => t.channelCode === "personal");

        if (filters.channelCode)
            base = base.filter((t) => t.channelCode === filters.channelCode);
        if (filters.statuses.length)
            base = base.filter((t) => filters.statuses.includes(t.status));

        if (q) {
            base = base.filter(
                (t) =>
                    t.title.toLowerCase().includes(q) ||
                    (t.description || "").toLowerCase().includes(q),
            );
        }

        return base;
    }, [merged, query, filters]);

    const tasksByStatus = useMemo(() => {
        return TAB_ORDER.reduce(
            (acc, key) => {
                acc[key] = baseFiltered.filter((t) => t.status === key);
                return acc;
            },
            {} as Record<StatusKey, Task[]>,
        );
    }, [baseFiltered]);

    const confirmDelete = useCallback(
        (task: Task) => {
            if (task.channelCode !== "personal") return;

            Alert.alert(
                "Delete task?",
                "This personal task will be permanently removed.",
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Delete",
                        style: "destructive",
                        onPress: async () => {
                            try {
                                await dispatch(
                                    deletePersonalTask({ id: task.id }),
                                ).unwrap();
                            } catch (e: any) {
                                Alert.alert(
                                    "Delete failed",
                                    e?.message ||
                                        "Unable to delete task. Please try again.",
                                );
                            }
                        },
                    },
                ],
            );
        },
        [dispatch],
    );

    return (
        <SafeAreaView
            edges={isIOS ? ["left", "right"] : ["top", "left", "right"]}
            className="flex-1 bg-white"
        >
            <StatusBar style="dark" />
            <PlatformAdaptiveHeader
                title="Tasks"
                headerLeft={() => null}
                headerRight={({ tintColor }) => (
                    <View className="flex-row items-center gap-2 ios:mr-3">
                        <Pressable
                            onPress={() => setShowFilter(true)}
                            className="w-10 h-10 rounded-full items-center justify-center"
                            hitSlop={8}
                        >
                            <Funnel size={24} color={tintColor ?? "#111827"} />
                        </Pressable>
                        <Pressable
                            onPress={() => setShowCreate(true)}
                            className="w-10 h-10 rounded-full items-center justify-center"
                            hitSlop={8}
                            style={{ backgroundColor: "#4C5FAB" }}
                        >
                            <Plus size={22} color="white" />
                        </Pressable>
                    </View>
                )}
            />
            <SearchBar value={query} onChangeText={setQuery} />
            <SwipeableTabView
                navigationState={{
                    index: Math.max(0, TAB_ORDER.indexOf(active)),
                    routes: TAB_ORDER.map((key) => ({
                        key,
                        title: STATUS_META[key].title,
                    })),
                }}
                onIndexChange={(index) =>
                    setActive(TAB_ORDER[index] ?? "in-progress")
                }
                renderScene={({ route }) => {
                    const statusKey = route.key as StatusKey;
                    const data = tasksByStatus[statusKey] || [];
                    const SceneHeader = (
                        <>
                            <View
                                className="px-3 mt-4 flex-row"
                                style={{ gap: 8 }}
                            >
                                {MODE_TABS.map((tab) => {
                                    const selected = filters.mode === tab.value;
                                    return (
                                        <Pressable
                                            key={tab.value}
                                            onPress={() =>
                                                handleModeChange(tab.value)
                                            }
                                            className="rounded-full px-4 py-2"
                                            style={{
                                                backgroundColor: selected
                                                    ? "#111827"
                                                    : "#E5E7EB",
                                            }}
                                        >
                                            <Text
                                                className="font-kumbh text-[12px]"
                                                style={{
                                                    color: selected
                                                        ? "#FFFFFF"
                                                        : "#111827",
                                                }}
                                            >
                                                {tab.label}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                            {/* <View className="px-5 mt-4">
                                <View className="rounded-2xl border border-[#E5E7EB] p-5">
                                    <Text className="font-kumbh text-[#6B7280]">
                                        Showing tasks:{" "}
                                        <Text className="text-[#111827]">
                                            {STATUS_META[statusKey].title}
                                        </Text>
                                    </Text>

                                    <Text className="font-kumbh text-[12px] text-[#9CA3AF] mt-1">
                                        Tip: Use the Mode tabs to group{" "}
                                        <Text className="text-[#4C5FAB]">
                                            Channel
                                        </Text>{" "}
                                        vs{" "}
                                        <Text className="text-[#4C5FAB]">
                                            Personal
                                        </Text>{" "}
                                        tasks and filter by project code when
                                        you need to narrow the list.
                                    </Text>
                                </View>
                            </View> */}
                        </>
                    );
                    return (
                        <FlatList
                            contentContainerStyle={{ paddingBottom: 140 }}
                            data={data}
                            keyExtractor={(i) => i.id}
                            ListHeaderComponent={SceneHeader}
                            renderItem={({ item }) => (
                                <View className="px-3 mt-3">
                                    <View
                                        style={{
                                            position: "relative",
                                        }}
                                    >
                                        {item.channelCode === "personal" && (
                                            <Pressable
                                                onPress={() =>
                                                    confirmDelete(item)
                                                }
                                                hitSlop={10}
                                                style={{
                                                    position: "absolute",
                                                    right: 8,
                                                    top: 8,
                                                    zIndex: 10,
                                                    padding: 6,
                                                    borderRadius: 999,
                                                    backgroundColor: "#FEE2E2",
                                                }}
                                            >
                                                <Trash2
                                                    size={18}
                                                    color="#B91C1C"
                                                />
                                            </Pressable>
                                        )}
                                        <TaskCard task={item} />
                                    </View>
                                </View>
                            )}
                            ItemSeparatorComponent={() => (
                                <View style={{ height: 1 }} />
                            )}
                            ListEmptyComponent={
                                <View className="px-5 mt-3">
                                    <Text className="font-kumbh text-[#9CA3AF]">
                                        No tasks yet in this category.
                                    </Text>
                                </View>
                            }
                            showsVerticalScrollIndicator={false}
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshing}
                                    onRefresh={onRefresh}
                                    tintColor="#4C5FAB"
                                    colors={["#4C5FAB"]}
                                />
                            }
                        />
                    );
                }}
                tabBarProps={{
                    activeColor: activeStatusColor,
                    inactiveColor: "#6B7280",
                    tabStyle: {
                        paddingVertical: 8,
                    },
                    indicatorStyle: {
                        backgroundColor: activeStatusColor,
                    },
                    renderTabLabel: ({ route, focused, color }) => {
                        const key = route.key as StatusKey;
                        const activeLabelColor =
                            STATUS_META[key]?.bgColor ?? "#4C5FAB";

                        return (
                            <Text
                                className="font-kumbhBold"
                                style={{
                                    color: focused ? activeLabelColor : color,
                                    fontSize: tabLabelFontSize,
                                }}
                            >
                                {route.title}
                            </Text>
                        );
                    },
                }}
            />
            <CreateTaskModal
                visible={showCreate}
                onClose={() => setShowCreate(false)}
            />

            <FilterModal
                visible={showFilter}
                initial={filters}
                onClose={() => setShowFilter(false)}
                onApply={(f) => {
                    setFilters(f);
                    setShowFilter(false);
                }}
            />
        </SafeAreaView>
    );
}
