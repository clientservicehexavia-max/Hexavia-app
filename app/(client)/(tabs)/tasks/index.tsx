import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import SearchBar from "@/components/staff/tasks/SearchBar";
import TaskCard from "@/components/staff/tasks/TaskCard";
import CreateTaskModal from "@/components/staff/tasks/modals/CreateTaskModal";
import TaskDetailModal from "@/components/staff/tasks/modals/TaskDetailModal";
import { SwipeableTabView } from "@/components/ui/SwipeableTabView";
import { fromApiStatus } from "@/features/client/statusMap";
import {
    STATUS_META,
    StatusKey,
    TAB_ORDER,
    Task,
} from "@/features/staff/types";
import { selectAllChannels } from "@/redux/channels/channels.slice";
import { fetchChannels } from "@/redux/channels/channels.thunks";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { Plus } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ClientTasksScreen() {
    const dispatch = useAppDispatch();
    const projects = useAppSelector(selectAllChannels);
    const [active, setActive] = useState<StatusKey>("in-progress");
    const [query, setQuery] = useState("");
    const [showCreate, setShowCreate] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    useEffect(() => {
        dispatch(fetchChannels());
    }, [dispatch]);

    const tasks = useMemo<Task[]>(() => {
        return projects
            .flatMap((project) =>
                (project.tasks || [])
                    .filter(
                        (task) =>
                            task.visibility === "client" ||
                            task.visibility === undefined,
                    )
                    .map((task) => {
                        const status = fromApiStatus(task?.status) as StatusKey;
                        return {
                            id: String(task?._id ?? ""),
                            title: String(task?.name ?? "Untitled task"),
                            description: task?.description ?? null,
                            status,
                            channelCode: project?.code ?? "",
                            channelId: project?._id ?? undefined,
                            createdAt:
                                typeof task?.createdAt === "number"
                                    ? task.createdAt
                                    : task?.createdAt
                                      ? new Date(task.createdAt).getTime()
                                      : Date.now(),
                        } as Task;
                    }),
            )
            .filter((task) => Boolean(task.channelId));
    }, [projects]);

    const filteredTasks = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return tasks;

        return tasks.filter(
            (task) =>
                task.title.toLowerCase().includes(q) ||
                (task.description || "").toLowerCase().includes(q),
        );
    }, [tasks, query]);

    const tasksByStatus = useMemo(() => {
        return TAB_ORDER.reduce(
            (acc, key) => {
                acc[key] = filteredTasks.filter((task) => task.status === key);
                return acc;
            },
            {} as Record<StatusKey, Task[]>,
        );
    }, [filteredTasks]);

    const activeStatusColor = STATUS_META[active]?.bgColor ?? "#4C5FAB";

    return (
        <SafeAreaView
            className="flex-1 bg-white"
            edges={["top", "left", "right"]}
        >
            <PlatformAdaptiveHeader
                title="Tasks"
                headerRight={() => (
                    <Pressable
                        onPress={() => setShowCreate(true)}
                        className="h-9 w-9 items-center justify-center"
                    >
                        <Plus size={24} color="#4C5FAB" />
                    </Pressable>
                )}
                headerLeft={() => null}
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

                    return (
                        <FlatList
                            contentContainerStyle={{ paddingBottom: 140 }}
                            data={data}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <View className="px-3 mt-3">
                                    <TaskCard task={item} />
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
                        />
                    );
                }}
                tabBarProps={{
                    activeColor: activeStatusColor,
                    inactiveColor: "#6B7280",
                    tabStyle: { paddingVertical: 8 },
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
                                    fontSize: 14,
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

            {selectedTask && (
                <TaskDetailModal
                    visible={!!selectedTask}
                    onClose={() => setSelectedTask(null)}
                    task={selectedTask}
                />
            )}
        </SafeAreaView>
    );
}
