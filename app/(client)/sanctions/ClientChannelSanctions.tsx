// app/(clients)/ClientChannelSanctions.tsx
import React, { useEffect, useMemo } from "react";
import { View, Text, FlatList, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchSanctions } from "@/redux/sanctions/sanctions.thunks";
import {
  selectSanctionsLoading,
  selectSanctionsState,
} from "@/redux/sanctions/sanctions.slice";
import { makeSelectActiveSanctionsForChannelMembers } from "@/redux/sanctions/sanctions.selectors";

const PRIMARY = "#4C5FAB";

type Props = {
  channelId: string; // channel that the client belongs to
};

function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ClientChannelSanctions({ channelId }: Props) {
  const dispatch = useAppDispatch();

  // Fetch once for _all if not fetched already
  const { fetchedFor } = useAppSelector(selectSanctionsState);
  useEffect(() => {
    if (!fetchedFor["_all"]) {
      dispatch(fetchSanctions()); // no userId => fetch all
    }
  }, [dispatch, fetchedFor]);

  const loading = useAppSelector(selectSanctionsLoading);

  // Filtered rows: only active sanctions for members of this channel
  const selectRows = useMemo(
    () => makeSelectActiveSanctionsForChannelMembers(channelId),
    [channelId]
  );
  const rows = useAppSelector(selectRows);

  return (
    <View className="flex-1 bg-[#F5F7FB]">
      <StatusBar style="dark" />
      <View className="px-5 pt-4 pb-3">
        <Text className="text-lg font-kumbhBold text-[#111827]">
          Active Sanctions (Channel)
        </Text>
        <Text className="text-xs font-kumbh text-[#6B7280] mt-1">
          Showing sanctions for staff who belong to this client’s channel.
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" color={PRIMARY} />
          <Text className="mt-2 text-[#6B7280] font-kumbh text-sm">
            Loading…
          </Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(i: any) => String(i?._id)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          ListEmptyComponent={
            <View className="mt-4 rounded-[24px] bg-white border border-gray-100 p-8 items-center">
              <Text className="text-[#6B7280] font-kumbh text-center">
                No active sanctions for members of this channel.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const recipientName =
              item?.user?.fullname ??
              item?.user?.name ??
              item?.sanctionUser?.username ??
              item?.sanctionUser?.email ??
              "Unknown";

            return (
              <View className="mb-3 p-4 rounded-[24px] bg-white border border-gray-100">
                <View className="flex-row items-center justify-between mb-2">
                  <Text
                    className="text-[15px] font-kumbhBold text-[#111827] flex-1 mr-2"
                    numberOfLines={1}
                  >
                    {recipientName}
                  </Text>
                  <View
                    className="px-3 py-1 rounded-full"
                    style={{ backgroundColor: "#EEF2FF" }}
                  >
                    <Text
                      className="text-[11px] font-kumbhBold"
                      style={{ color: PRIMARY }}
                    >
                      {String(item?.type ?? "").toUpperCase() || "—"}
                    </Text>
                  </View>
                </View>

                <Text
                  className="text-[13px] font-kumbh text-[#374151] mb-2 leading-5"
                  numberOfLines={3}
                >
                  {item?.reason || "—"}
                </Text>

                <View className="flex-row items-center pt-2 border-t border-gray-100">
                  <Text className="text-[12px] font-kumbh text-[#6B7280]">
                    Created:&nbsp;
                  </Text>
                  <Text className="text-[12px] font-kumbhBold text-[#374151]">
                    {formatDate(item?.createdAt)}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
