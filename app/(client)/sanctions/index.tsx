// app/(clients)/sanctions/index.tsx
import React, { useMemo } from "react";
import { View, Text } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams } from "expo-router";
import BackHeader from "@/components/BackHeader";
import { useAppSelector } from "@/store/hooks";

import { selectUser } from "@/redux/user/user.slice";
import {
  selectChannelIdByCode,
} from "@/redux/channels/channels.slice";
import { makeSelectDefaultChannelId } from "@/redux/channels/channels.selectors";

import ClientChannelSanctions from "./ClientChannelSanctions";

export default function ClientSanctionsIndex() {
  const params = useLocalSearchParams<{ channelId?: string; code?: string }>();

  const urlChannelId = (params?.channelId && String(params.channelId)) || null;

  const codeFromUrl = (params?.code && String(params.code)) || null;
  const channelIdFromCode = useAppSelector(
    codeFromUrl ? selectChannelIdByCode(codeFromUrl) : () => null
  );

  const user = useAppSelector(selectUser);
  const defaultChannelIdSelector = useMemo(
    () => makeSelectDefaultChannelId(user?._id ?? null, "recent"),
    [user?._id]
  );
  const fallbackChannelId = useAppSelector(defaultChannelIdSelector);

  const clientChannelId = urlChannelId || channelIdFromCode || fallbackChannelId || null;

  return (
    <View className="flex-1 bg-[#F5F7FB]">
      <StatusBar style="dark" />
      <BackHeader title="Sanctions" />

      {!clientChannelId ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-gray-600 text-center font-kumbh">
            No channel selected for this client. Provide a{" "}
            <Text className="font-kumbhBold">channelId</Text> or{" "}
            <Text className="font-kumbhBold">code</Text> in the URL, or join a channel.
          </Text>
        </View>
      ) : (
        <ClientChannelSanctions channelId={clientChannelId} />
      )}
    </View>
  );
}
