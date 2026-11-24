import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import { showSuccess } from "@/components/ui/toast";
import {
  fetchDeletedChannels,
  restoreChannelById,
} from "@/redux/channels/channels.thunks";
import type { Channel } from "@/redux/channels/channels.types";
import { useAppDispatch } from "@/store/hooks";
import { Calendar, RotateCcw, Trash2 } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type DeletedChannel = Channel & {
  deletedAt?: string;
};

const formatDate = (value?: string) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return value;
  }
};

export default function DeletedChannelsScreen() {
  const dispatch = useAppDispatch();
  const isIOS = Platform.OS === "ios";

  const [channels, setChannels] = useState<DeletedChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadDeletedChannels = useCallback(async () => {
    const data = await dispatch(fetchDeletedChannels()).unwrap();
    setChannels(data as DeletedChannel[]);
    setError(null);
  }, [dispatch]);

  useEffect(() => {
    setLoading(true);
    loadDeletedChannels()
      .catch((err: any) => {
        const message = err?.message || err?.payload || "Could not load projects";
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [loadDeletedChannels]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadDeletedChannels();
    } catch (err: any) {
      const message = err?.message || err?.payload || "Could not refresh projects";
      setError(message);
    } finally {
      setRefreshing(false);
    }
  }, [loadDeletedChannels]);

  const handleRestore = useCallback(
    (item: DeletedChannel) => {
      const projectName = item.name?.trim() || "this project";
      Alert.alert("Restore project", `Restore ${projectName}?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore",
          onPress: async () => {
            setRestoringId(item._id);
            try {
              const res = await dispatch(
                restoreChannelById({ channelId: item._id })
              ).unwrap();
              setChannels((prev) => prev.filter((c) => c._id !== item._id));
              setError(null);
              showSuccess(res?.message || "Project restored successfully");
            } catch (err: any) {
              const message =
                err?.message || err?.payload || "Could not restore project";
              setError(message);
            } finally {
              setRestoringId((current) =>
                current === item._id ? null : current
              );
            }
          },
        },
      ]);
    },
    [dispatch]
  );

  const renderProject = useCallback(
    ({ item }: { item: DeletedChannel }) => {
      const isRestoring = restoringId === item._id;
      return (
        <View className="bg-white rounded-[24px] p-4 mb-3 border border-gray-100">
          <View className="flex-row items-center">
            <View className="h-11 w-11 rounded-2xl bg-[#EEF2FF] items-center justify-center mr-3">
              <Trash2 size={18} color="#4C5FAB" />
            </View>
            <View className="flex-1 mr-2">
              <Text
                className="text-[16px] text-[#111827] font-kumbhBold"
                numberOfLines={1}
              >
                {item.name ?? "Project"}
              </Text>
              <Text className="text-xs text-[#6B7280] font-kumbh mt-0.5">
                Deleted {formatDate(item.deletedAt ?? item.updatedAt)}
              </Text>
            </View>
            {item.code ? (
              <View className="px-2.5 py-1 rounded-full bg-[#EEF2FF]">
                <Text className="text-[11px] text-primary font-kumbhBold">
                  {item.code}
                </Text>
              </View>
            ) : null}
          </View>

          {item.description ? (
            <Text
              className="text-[13px] text-[#6B7280] mt-3 font-kumbh leading-5"
              numberOfLines={3}
            >
              {item.description}
            </Text>
          ) : null}

          <View className="mt-3.5 pt-3 border-t border-gray-100 flex-row items-center justify-between">
            <View className="flex-row items-center gap-1.5">
              <Calendar size={13} color="#9CA3AF" />
              <Text className="text-xs text-[#9CA3AF] font-kumbh">
                {formatDate(item.deletedAt ?? item.updatedAt)}
              </Text>
            </View>

            <Pressable
              disabled={isRestoring}
              onPress={() => handleRestore(item)}
              className="bg-primary rounded-full px-4 py-2 min-w-[96px] flex-row items-center justify-center gap-1.5"
              style={{ opacity: isRestoring ? 0.7 : 1 }}
            >
              {isRestoring ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <RotateCcw size={13} color="#FFFFFF" />
                  <Text className="text-white text-xs font-kumbhBold">
                    Restore
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      );
    },
    [handleRestore, restoringId]
  );

  const emptyComponent = useMemo(() => {
    if (loading) return null;
    return (
      <View className="mt-4 rounded-[28px] bg-white border border-gray-100 px-6 py-12 items-center">
        <View className="h-14 w-14 rounded-2xl bg-[#EEF2FF] items-center justify-center mb-3">
          <Trash2 size={24} color="#4C5FAB" />
        </View>
        <Text className="text-center text-[#111827] font-kumbhBold text-base">
          No deleted projects
        </Text>
        <Text className="mt-1 text-center text-[#6B7280] font-kumbh text-sm leading-5">
          Deleted projects will appear here so you can restore them anytime.
        </Text>
      </View>
    );
  }, [loading]);

  return (
    <SafeAreaView
      edges={isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]}
      className="flex-1 bg-[#F5F7FB]"
    >
      <PlatformAdaptiveHeader
        title="Deleted Projects"
        description="Review deleted projects and restore when needed."
        backgroundColor="#F5F7FB"
      />

      {error ? (
        <View className="mx-4 mt-2 rounded-2xl bg-red-50 border border-red-100 px-4 py-3">
          <Text className="text-xs text-red-700 font-kumbh">{error}</Text>
        </View>
      ) : null}

      {loading && !refreshing ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" color="#4C5FAB" />
          <Text className="mt-2 text-sm text-[#6B7280] font-kumbh">
            Loading deleted projects…
          </Text>
        </View>
      ) : (
        <FlatList
          data={channels}
          keyExtractor={(item) => item._id}
          renderItem={renderProject}
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 28,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={emptyComponent}
        />
      )}
    </SafeAreaView>
  );
}
