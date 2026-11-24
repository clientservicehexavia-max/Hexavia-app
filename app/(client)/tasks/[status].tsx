import Ionicons from "@expo/vector-icons/Ionicons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useState } from "react";
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
  makeSelectDefaultChannelId,
  selectStatus as selectChannelsStatus,
} from "@/redux/channels/channels.selectors";
import { selectChannelById } from "@/redux/channels/channels.slice";
import { fetchChannelById } from "@/redux/channels/channels.thunks";
import { selectUser } from "@/redux/user/user.slice";
import { fetchProfile } from "@/redux/user/user.thunks";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const PRIMARY = "#4C5FAB";

/** Single source of truth for status colors shown on the cards */
const STATUS_BGS: Record<
  StatusKey,
  { title: string; bgColor: string; arrowBg: string }
> = {
  "in-progress": {
    title: "In Progress",
    bgColor: "#F59E0B", // yellow
    arrowBg: "#D97706",
  },
  "not-started": {
    title: "Not Started",
    bgColor: "#EF4444", // red
    arrowBg: "#DC2626",
  },
  completed: {
    title: "Completed",
    bgColor: "#10B981", // green
    arrowBg: "#059669",
  },
  canceled: {
    title: "Canceled",
    bgColor: "#9CA3AF", // grey
    arrowBg: "#6B7280",
  },
};

export default function StatusScreen() {
  const params = useLocalSearchParams<{ status: StatusKey }>();
  const statusKey = (params.status || "in-progress") as StatusKey;

  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);

  useEffect(() => {
    if (!user?._id) dispatch(fetchProfile());
  }, [dispatch, user?._id]);

  const userId = user?._id ?? null;

  // pick default channel id for user
  const defaultChannelId = useAppSelector(
    makeSelectDefaultChannelId(userId, "recent")
  );

  // fetch that channel
  const channelsStatus = useAppSelector(selectChannelsStatus);
  useEffect(() => {
    if (defaultChannelId) dispatch(fetchChannelById(String(defaultChannelId)));
  }, [dispatch, defaultChannelId]);

  // read the channel + tasks
  const channel = useAppSelector(selectChannelById(defaultChannelId || "")) as
    | any
    | null;

  const rawTasks: any[] = Array.isArray(channel?.tasks) ? channel.tasks : [];

  const uiTasks: Task[] = useMemo(
    () =>
      rawTasks.map((t) => {
        const normalized = fromApiStatus(t?.status) as StatusKey;
        return {
          id: String(t?._id ?? t?.id),
          title: String(t?.name ?? t?.title ?? "Untitled task"),
          description: t?.description ?? null,
          status: normalized, // one of: in-progress | not-started | completed | canceled
          channelCode: channel?.code ?? "",
          channelId: t?.channelId ? String(t.channelId) : undefined,
          createdAt:
            typeof t?.createdAt === "number"
              ? t.createdAt
              : t?.createdAt
                ? new Date(t.createdAt).getTime()
                : Date.now(),
        };
      }),
    [rawTasks, channel?.code]
  );

  const list = useMemo(
    () => uiTasks.filter((t) => t.status === statusKey),
    [uiTasks, statusKey]
  );

  // modals
  const [showCreate, setShowCreate] = useState(false);
  const [edit, setEdit] = useState<Task | null>(null);

  const isLoading = channelsStatus === "loading" && !channel;

  // ——— enforce screen-based color/label here ———
  const screenMeta = STATUS_BGS[statusKey] ?? STATUS_BGS["in-progress"];
  const screenCardBg = screenMeta.bgColor;
  const screenStatusLabel = screenMeta.title;

  return (
    <SafeAreaView className="flex-1 bg-[#F5F7FB]">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-2 pb-3 mt-3">
        <Pressable
          onPress={() => router.push("/(client)/(tabs)/tasks")}
          className="h-10 w-10 rounded-full bg-white border border-gray-100 items-center justify-center"
        >
          <Ionicons name="chevron-back" size={20} color="#111827" />
        </Pressable>
        <Text className="font-kumbhBold text-xl text-[#111827]">
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
                // lock the card color + label to the current screen's status
                statusLabel={screenStatusLabel}
                cardBg={screenCardBg}
                // you can keep these or let BoardCard auto-pick
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

      {/* Modals */}
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
