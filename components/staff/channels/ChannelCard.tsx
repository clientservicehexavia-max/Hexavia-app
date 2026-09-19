// components/staff/channels/ChannelCard.tsx
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { Pencil } from "lucide-react-native";

import EditChannelModal from "@/components/admin/EditChannelModal";
import type { Channel } from "@/redux/channels/channels.types";
import { selectUser } from "@/redux/user/user.slice";
import { useAppSelector } from "@/store/hooks";

type CardChannel = {
  id: string;
  name: string;
  description?: string | null;
  logo?: string | null;
  code?: string;
};

function ChannelCard({
  item,
  colorOverride,
  isMember = true,
  onJoin,
}: {
  item: CardChannel;
  colorOverride: string;
  isMember?: boolean;
  onJoin?: (code: string) => void;
}) {
  const router = useRouter();
  const user = useAppSelector(selectUser);
  const [editOpen, setEditOpen] = useState(false);

  const channelId = String(item.id ?? (item as any)?._id ?? "");
  const isStaff = user?.role === "staff";
  const channelForEdit = useMemo<Channel | null>(() => {
    if (!channelId) return null;
    return {
      _id: channelId,
      name: item.name,
      description: item.description ?? null,
      code: item.code ?? "",
      members: [],
      tasks: [],
      resources: [],
    };
  }, [channelId, item.code, item.description, item.name]);

  const handlePress = () => {
    if (!channelId) return;
    if (!isMember) {
      if (item.code && onJoin) {
        onJoin(item.code);
      }
      return;
    }
    router.push({
      pathname: "/(staff)/(tabs)/chats/[channelId]" as any,
      params: { channelId: String(channelId) },
    });
  };

  return (
    <Pressable
      onPress={handlePress}
      android_ripple={{ color: "#eee" }}
      style={{ backgroundColor: colorOverride }}
      className="mx-4 mt-4 rounded-2xl p-6 overflow-hidden"
    >
      {isStaff && isMember && channelForEdit ? (
        <Pressable
          onPress={(event) => {
            event.stopPropagation?.();
            setEditOpen(true);
          }}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: "rgba(0,0,0,0.25)",
            alignItems: "center",
            justifyContent: "center",
          }}
          hitSlop={8}
        >
          <Pencil size={16} color="#ffffff" />
        </Pressable>
      ) : null}
      <View className="flex-row">
        <View className="flex-1 pr-3">
          <Text
            className="text-white text-lg font-kumbhBold"
            numberOfLines={1}
          >
            {item.name}
          </Text>

          <View className="mt-24 flex-row items-center">
            {!!item.description && (
              <View className="flex-1 pr-3">
                <Text
                  className="text-white/90 leading-4 text-[10px] font-kumbh"
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {item.description}
                </Text>
              </View>
            )}
            <View className="flex-row items-center">
              {!!item.code && (
                <Text className="text-white/90 font-kumbh text-[12px]">
                  Project Code: {item.code.toUpperCase()}
                </Text>
              )}
            </View>
          </View>
        </View>

        {!!item.logo && (
          <View className="items-center">
            <Image
              source={{ uri: item.logo }}
              style={{
                width: 72,
                height: 72,
                borderRadius: 88,
                borderWidth: 4,
                borderColor: "white",
              }}
            />
          </View>
        )}
      </View>

      {!isMember && (
        <View className="mt-4 pt-3 border-t border-white/20 flex-row items-center justify-between">
          <Text className="text-white/80 font-kumbh text-[12px]">
            Not a member of this project
          </Text>
          <Pressable
            onPress={(event) => {
              event.stopPropagation?.();
              if (item.code && onJoin) {
                onJoin(item.code);
              }
            }}
            className="bg-white px-4 py-1.5 rounded-xl active:opacity-80 shadow-sm"
          >
            <Text className="text-gray-900 font-kumbhBold text-[13px]">
              Join
            </Text>
          </Pressable>
        </View>
      )}

      <EditChannelModal
        visible={editOpen}
        channel={channelForEdit}
        onClose={() => setEditOpen(false)}
      />
    </Pressable>
  );
}

export default React.memo(ChannelCard);
