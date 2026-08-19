import Ionicons from "@expo/vector-icons/Ionicons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import BoardCard from "@/components/client/tasks/BoardCard";
import FabCreate from "@/components/staff/tasks/FabCreate";
import CreateTaskModal from "@/components/staff/tasks/modals/CreateTaskModal";
import TaskDetailModal from "@/components/staff/tasks/modals/TaskDetailModal";
import { StatusKey, Task } from "@/features/staff/types";
import { fromApiStatus } from "@/features/client/statusMap";

import {
  selectAllChannels,
  selectStatus as selectChannelsStatus,
} from "@/redux/channels/channels.selectors";
import {
  fetchChannelById,
  fetchChannels,
} from "@/redux/channels/channels.thunks";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectUser } from "@/redux/user/user.slice";

const PRIMARY = "#4C5FAB";
const THROTTLE_MS = 10_000;

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
  return 0;
}

function byCreatedAtDescThenId(a: Task, b: Task) {
  const ad = a.createdAt || 0;
  const bd = b.createdAt || 0;
  if (bd !== ad) return bd - ad;
  return String(a.id).localeCompare(String(b.id));
}

const STATUS_BGS: Record<
  StatusKey,
  { title: string; bgColor: string; arrowBg: string }
> = {
  "in-progress": {
    title: "In Progress",
    bgColor: "#F59E0B",
    arrowBg: "#D97706",
  },
  "not-started": {
    title: "Not Started",
    bgColor: "#9CA3AF",
    arrowBg: "#6B7280",
  },
  completed: { title: "Completed", bgColor: "#10B981", arrowBg: "#059669" },
  canceled: { title: "Canceled", bgColor: "#EF4444", arrowBg: "#DC2626" },
};

export default function StatusScreen() {
  const params = useLocalSearchParams<{ status: StatusKey }>();
  const statusKey = (params.status || "in-progress") as StatusKey;

  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const role = user?.role || "staff";

  // 1) Ensure we have channels list
  const channelsStatus = useAppSelector(selectChannelsStatus);
  useEffect(() => {
    if (channelsStatus === "idle") dispatch(fetchChannels());
  }, [dispatch, channelsStatus]);

  // 2) Use ALL channels (same base as All Tasks screen)
  const channels = useAppSelector(selectAllChannels);

  // 3) Hydrate tasks for channels that don't have tasks yet (same as your TaskScreen)
  const inFlight = useRef<Set<string>>(new Set());
  const lastFetchedAt = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!Array.isArray(channels) || channels.length === 0) return;

    channels.forEach((c: any) => {
      const id = String(c?._id ?? c?.id ?? "");
      if (!id) return;

      const tasksMissing = !Array.isArray(c?.tasks) || c.tasks.length === 0;
      if (!tasksMissing) return;

      const now = Date.now();
      const lastAt = lastFetchedAt.current.get(id) ?? 0;
      const withinThrottle = now - lastAt < THROTTLE_MS;
      const isInFlight = inFlight.current.has(id);

      if (withinThrottle || isInFlight) return;

      inFlight.current.add(id);
      lastFetchedAt.current.set(id, now);

      dispatch(fetchChannelById(id))
        .finally(() => inFlight.current.delete(id))
        .catch(() => {});
    });
  }, [dispatch, channels]);

  // 4) Flatten tasks from all channels, normalize status, then filter by current screen status
  const allTasks: Task[] = useMemo(() => {
    if (!Array.isArray(channels)) return [];

    const out: Task[] = [];
    channels.forEach((ch: any) => {
      const channelCode = ch?.code ?? ch?.name ?? "";
      const tasks = Array.isArray(ch?.tasks) ? ch.tasks : [];
      tasks.forEach((t: any) => {
        out.push({
          id: String(t?._id ?? t?.id),
          title: String(t?.name ?? t?.title ?? "Untitled task"),
          description: t?.description ?? null,
          status: fromApiStatus(t?.status) as StatusKey,
          channelCode: channelCode,
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
  }, [channels]);

  const list = useMemo(
    () => allTasks.filter((t) => t.status === statusKey),
    [allTasks, statusKey]
  );

  // modals
  const [showCreate, setShowCreate] = useState(false);
  const [edit, setEdit] = useState<Task | null>(null);

  const isLoading = channelsStatus === "loading" && channels.length === 0;

  const screenMeta = STATUS_BGS[statusKey] ?? STATUS_BGS["in-progress"];
  const screenCardBg = screenMeta.bgColor;
  const screenStatusLabel = screenMeta.title;

  const backPath =
    role === "staff" ? "/(staff)/(tabs)/tasks" : "/(client)/(tabs)/tasks";

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />

      <View className="flex-row items-center justify-between px-4 pt-2 pb-3 mt-5">
        <Pressable
          onPress={() => router.push(backPath)}
          className="h-9 w-9 rounded-full items-center justify-center"
        >
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </Pressable>
        <Text className="font-kumbhBold text-2xl ml-3 text-[#111827]">
          Task Boards
        </Text>
        <View className="w-10" />
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" color={PRIMARY} />
          <Text className="mt-2 text-[#6B7280] font-kumbh">Loading tasks…</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{ paddingBottom: 120 }}
          data={list}
          keyExtractor={(i) => i.id}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => (
            <Pressable onPress={() => setEdit(item)}>
              <BoardCard
                project={item.channelCode || ""}
                title={item.title}
                description={item.description}
                statusLabel={screenStatusLabel}
                cardBg={screenCardBg}
                pillBg="#D1FAE5"
                pillText="#047857"
              />
            </Pressable>
          )}
          ListEmptyComponent={
            <View className="px-4">
              <Text className="font-kumbh text-center mt-4 text-[#9CA3AF]">
                No tasks in this category yet.
              </Text>
            </View>
          }
        />
      )}

      <FabCreate onPress={() => setShowCreate(true)} />

      <CreateTaskModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
      />
      {edit && (
        <TaskDetailModal
          visible={!!edit}
          onClose={() => setEdit(null)}
          task={edit}
        />
      )}
    </SafeAreaView>
  );
}
