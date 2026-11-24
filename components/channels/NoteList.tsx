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
import type { ChannelNote } from "@/redux/channelNotes/channelNotes.types";
import { Edit3, StickyNote, X } from "lucide-react-native";

type Props = {
  notes: ChannelNote[];
  isLoading?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  onEditNote: (note: ChannelNote) => void;
  onDeleteNote: (note: ChannelNote) => void;
  onPreviewNote: (note: ChannelNote) => void;
};

export default function NoteList({
  notes,
  isLoading,
  isRefreshing,
  onRefresh,
  onEditNote,
  onDeleteNote,
  onPreviewNote,
}: Props) {
  if (isLoading && notes.length === 0) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator color="#4C5FAB" />
      </View>
    );
  }

  const renderItem: ListRenderItem<ChannelNote> = ({ item }) => (
    <Pressable
      onPress={() => onPreviewNote(item)}
      className="my-2 rounded-[24px] border border-gray-100 bg-white px-4 py-4"
    >
      <View className="flex-row items-start">
        <Text
          className="font-kumbhBold text-base text-[#111827] flex-1 pr-3"
          numberOfLines={2}
        >
          {item.title || "Untitled"}
        </Text>
        <View className="flex-row gap-2 shrink-0">
          <Pressable
            onPress={() => onEditNote(item)}
            className="h-8 w-8 rounded-full bg-[#EEF2FF] items-center justify-center"
          >
            <Edit3 size={15} color="#4C5FAB" />
          </Pressable>
          <Pressable
            onPress={() => onDeleteNote(item)}
            className="h-8 w-8 rounded-full bg-red-50 items-center justify-center"
          >
            <X size={15} color="#DC2626" />
          </Pressable>
        </View>
      </View>
      <Text className="font-kumbh text-sm text-[#6B7280] mt-2 leading-5" numberOfLines={4}>
        {item.description || "No description added."}
      </Text>
    </Pressable>
  );

  return (
    <FlatList
      style={{ flex: 1 }}
      data={notes}
      keyExtractor={(note, index) =>
        String(note._id || note.createdAt || note.title || index)
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
            <StickyNote size={24} color="#4C5FAB" />
          </View>
          <Text className="font-kumbhBold text-[#111827] text-lg">
            No notes yet
          </Text>
          <Text className="text-[13px] font-kumbh text-[#6B7280] mt-1.5 text-center">
            Capture the important details in a note.
          </Text>
        </View>
      )}
      showsVerticalScrollIndicator={false}
    />
  );
}
