import React from "react";
import { Pressable, Text, View } from "react-native";

type JoinableChannel = {
  id: string;
  name: string;
  description?: string | null;
  code?: string | null;
};

export default function JoinableChannelCard({
  item,
  onJoin,
  disabled,
}: {
  item: JoinableChannel;
  onJoin: (ch: JoinableChannel) => void;
  disabled?: boolean;
}) {
  return (
    <View className="mx-4 mt-4 rounded-[24px] p-6 bg-primary">
      <Text className="text-xl text-white font-kumbhBold" numberOfLines={1}>
        {item.name}
      </Text>
      {!!item.description && (
        <Text
          className="mt-2 text-white/80 leading-5 text-[13px] font-kumbh"
          numberOfLines={3}
        >
          {item.description}
        </Text>
      )}
      {!!item.code && (
        <View className="mt-3 self-start px-3 py-1 rounded-full bg-white/15">
          <Text className="text-white font-kumbhBold text-[12px]">
            {String(item.code).toUpperCase()}
          </Text>
        </View>
      )}

      <View className="mt-4 items-end">
        <Pressable
          onPress={() => onJoin(item)}
          disabled={disabled}
          className={`px-5 py-2.5 rounded-full ${
            disabled ? "bg-white/25" : "bg-white"
          }`}
        >
          <Text
            className={`font-kumbhBold text-[13px] ${disabled ? "text-white/70" : "text-primary"}`}
          >
            {disabled ? "Joined" : "Join"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
