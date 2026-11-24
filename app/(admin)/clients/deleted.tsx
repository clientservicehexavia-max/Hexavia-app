import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";

import { useAppDispatch } from "@/store/hooks";
import { showSuccess } from "@/components/ui/toast";
import {
  fetchDeletedClients,
  restoreClient,
} from "@/redux/client/client.thunks";
import type { Client } from "@/redux/client/client.types";

type DeletedClient = Client & {
  deletedAt?: string;
};

const formatMoney = (value?: number) => {
  if (typeof value !== "number" || !isFinite(value)) return "₦ 0.00";
  try {
    return (
      "₦ " +
      new Intl.NumberFormat("en-NG", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value)
    );
  } catch {
    return `₦ ${value.toFixed(2)}`;
  }
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

export default function DeletedClientsScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [clients, setClients] = useState<DeletedClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    dispatch(fetchDeletedClients())
      .unwrap()
      .then((data) => {
        setClients(data.clients ?? []);
        setError(null);
      })
      .catch((err: any) => {
        const message =
          err?.message || err?.payload?.message || "Could not load clients";
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [dispatch]);

  const handleRestore = useCallback(
    (item: DeletedClient) => {
      const clientName = item.name?.trim() || "this client";
      Alert.alert("Restore client", `Restore ${clientName}?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore",
          onPress: async () => {
            setRestoringId(item._id);
            try {
              const res = await dispatch(restoreClient(item._id)).unwrap();
              setClients((prev) => prev.filter((c) => c._id !== item._id));
              setError(null);
              showSuccess(res?.message || "Client restored successfully");
            } catch (err: any) {
              const message =
                err?.message ||
                err?.payload?.message ||
                "Could not restore client";
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

  const renderClient = useCallback(
    ({ item }: { item: DeletedClient }) => {
      const isRestoring = restoringId === item._id;
      const subtitleParts = [
        item.projectName,
        item.industry,
        item.engagement,
      ].filter(Boolean);
      return (
        <Pressable
          disabled={isRestoring}
          onPress={() =>
            router.push(
              `/(admin)/clients/deleted/${item._id}?data=${encodeURIComponent(
                JSON.stringify(item)
              )}`
            )
          }
          className="bg-white rounded-[24px] px-5 py-4 mb-3 border border-gray-100"
        >
          <Text className="text-[17px] text-[#111827] font-kumbhBold">
            {item.name ?? "Client"}
          </Text>
          {subtitleParts.length > 0 ? (
            <Text className="text-sm text-[#6B7280] mt-1 font-kumbh">
              {subtitleParts.join(" • ")}
            </Text>
          ) : null}
          <View className="flex-row items-center justify-between gap-3 mt-3">
            <View className="px-2.5 py-1 rounded-full bg-gray-100">
              <Text className="text-[11px] uppercase tracking-wide text-[#6B7280] font-kumbhBold">
                {item.status ?? "deleted"}
              </Text>
            </View>
            {item.payableAmount != null ? (
              <Text className="text-sm font-kumbhBold text-primary">
                {formatMoney(item.payableAmount)}
              </Text>
            ) : null}
          </View>
          <Text className="text-xs text-[#9CA3AF] mt-2 font-kumbh">
            Deleted {formatDate(item.deletedAt ?? item.updatedAt)}
          </Text>
          {item.email ? (
            <Text className="text-xs text-[#6B7280] mt-1 font-kumbh">
              {item.email}
            </Text>
          ) : null}
          <View className="mt-4 flex-row items-center justify-end">
            <Pressable
              disabled={isRestoring}
              onPress={(event) => {
                event.stopPropagation();
                handleRestore(item);
              }}
              className="bg-primary rounded-full px-5 py-2.5 min-w-[92px] items-center"
              style={{ opacity: isRestoring ? 0.7 : 1 }}
            >
              {isRestoring ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className="text-white text-sm font-kumbhBold">
                  Restore
                </Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      );
    },
    [handleRestore, restoringId, router]
  );

  const emptyComponent = useMemo(() => {
    if (loading) return null;
    return (
      <View className="px-5 mt-10">
        <Text className="text-center text-gray-500 font-kumbh">
          No deleted clients available right now.
        </Text>
      </View>
    );
  }, [loading]);

  return (
    <SafeAreaView className="flex-1 bg-[#F5F7FB]">
      <View className="px-5 pt-4 pb-4 bg-white border-b border-gray-100 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 rounded-full bg-[#F5F7FB] border border-gray-100 items-center justify-center"
        >
          <ArrowLeft size={20} color="#111827" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xl text-[#111827] font-kumbhBold">
            Deleted Clients
          </Text>
          <Text className="text-xs text-[#6B7280] mt-0.5 font-kumbh">
            Tap a card to view details or restore a removed client.
          </Text>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4c5fab" />
        </View>
      ) : (
        <FlatList
          data={clients}
          keyExtractor={(item) => item._id}
          renderItem={renderClient}
          className="flex-1 px-5 mt-5"
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={emptyComponent}
        />
      )}
      {error ? (
        <View className="px-5 py-3">
          <Text className="text-sm text-red-500 font-kumbh">{error}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
