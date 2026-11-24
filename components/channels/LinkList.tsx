import React from "react";
import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import type { ChannelLink } from "@/redux/channelLinks/channelLinks.types";
import { Copy, Edit3, Link2, X } from "lucide-react-native";

type Props = {
  links: ChannelLink[];
  isLoading?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  onOpenLink: (link: ChannelLink) => void;
  onCopyLink?: (link: ChannelLink) => void;
  onEditLink: (link: ChannelLink) => void;
  onDeleteLink: (link: ChannelLink) => void;
};

export default function LinkList({
  links,
  isLoading,
  isRefreshing,
  onRefresh,
  onOpenLink,
  onCopyLink,
  onEditLink,
  onDeleteLink,
}: Props) {
  if (isLoading && links.length === 0) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator color="#4C5FAB" />
      </View>
    );
  }

  const renderItem: ListRenderItem<ChannelLink> = ({ item }) => {
    const title = item.title?.trim() || item.url;
    const hasDescription = Boolean(item.description?.trim());

    return (
      <View className="my-2 rounded-[24px] border border-gray-100 bg-white px-4 py-4">
        <Pressable onPress={() => onOpenLink(item)}>
          <Text className="font-kumbhBold text-base text-[#111827]">{title}</Text>
          <Text
            numberOfLines={1}
            className="text-sm font-kumbh text-primary mt-0.5"
            ellipsizeMode="tail"
          >
            {item.url}
          </Text>
          {hasDescription ? (
            <Text className="text-xs font-kumbh text-[#6B7280] mt-2 leading-4" numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
        </Pressable>
        <View className="flex-row justify-end gap-2 pt-3">
          {onCopyLink ? (
            <Pressable
              onPress={() => onCopyLink(item)}
              className="h-8 w-8 rounded-full bg-[#EEF2FF] items-center justify-center"
            >
              <Copy size={15} color="#4C5FAB" />
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => onEditLink(item)}
            className="h-8 w-8 rounded-full bg-[#EEF2FF] items-center justify-center"
          >
            <Edit3 size={15} color="#4C5FAB" />
          </Pressable>
          <Pressable
            onPress={() => onDeleteLink(item)}
            className="h-8 w-8 rounded-full bg-red-50 items-center justify-center"
          >
            <X size={15} color="#DC2626" />
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <FlatList
      style={{ flex: 1 }}
      data={links}
      keyExtractor={(link, index) =>
        String(link._id || link.url || link.createdAt || index)
      }
      contentContainerStyle={{
        paddingBottom: 140,
        paddingHorizontal: 16,
        flexGrow: 1,
      }}
      renderItem={renderItem}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={Boolean(isRefreshing)} onRefresh={onRefresh} />
        ) : undefined
      }
      ListEmptyComponent={() => (
        <View className="mt-4 rounded-[28px] bg-white border border-gray-100 px-6 py-12 items-center">
          <View className="h-14 w-14 rounded-2xl bg-[#EEF2FF] items-center justify-center mb-4">
            <Link2 size={24} color="#4C5FAB" />
          </View>
          <Text className="font-kumbhBold text-[#111827] text-lg">
            No links yet
          </Text>
          <Text className="text-[13px] font-kumbh text-[#6B7280] mt-1.5 text-center">
            Add a link to get started.
          </Text>
        </View>
      )}
      showsVerticalScrollIndicator={false}
    />
  );
}
