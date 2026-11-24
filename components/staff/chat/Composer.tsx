import { CustomTextInput } from "@/components/ui/CustomInput";
import type { ReplyMeta } from "@/types/chat";
import type { Mentionable } from "@/utils/handles";
import { Mic, Paperclip, Pencil, Send, X } from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  LayoutAnimation,
  Platform,
  Pressable,
  Text,
  TextInput,
  UIManager,
  View,
} from "react-native";

type Props = {
  onSend: (text: string) => void;
  value?: string;
  onChangeText?: (text: string) => void;
  onToggleTray: () => void;
  trayOpen: boolean;
  replyTo?: ReplyMeta | null;
  onCancelReply?: () => void;
  editingMessage?: { id: string; text: string } | null;
  onCancelEdit?: () => void;
  isRecording?: boolean;
  recordDurationMs?: number;
  onMicPress?: () => void;
  onCancelRecording?: () => void;
  mentionables: Mentionable[]; // ← NEW
};

export default function Composer({
  onSend,
  value,
  onChangeText,
  onToggleTray,
  trayOpen,
  replyTo,
  onCancelReply,
  editingMessage,
  onCancelEdit,
  isRecording,
  recordDurationMs = 0,
  onMicPress,
  onCancelRecording,
  mentionables,
}: Props) {
  const MAX_INPUT_HEIGHT = 112;
  const [text, setText] = useState(value ?? "");
  const [query, setQuery] = useState(""); // after "@"
  const [open, setOpen] = useState(false); // show typeahead
  const inputRef = useRef<TextInput>(null);
  const hasText = text.trim().length > 0;

  const mm = Math.floor(recordDurationMs / 60000);
  const ss = Math.floor((recordDurationMs % 60000) / 1000);
  const durText = `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;

  useEffect(() => {
    if (value === undefined) return;
    if (value !== text) setText(value);
  }, [value, text]);

  useEffect(() => {
    if (editingMessage) {
      inputRef.current?.focus();
    }
  }, [editingMessage]);

  useEffect(() => {
    if (Platform.OS === "android") {
      UIManager.setLayoutAnimationEnabledExperimental?.(true);
    }
  }, []);

  useEffect(() => {
    if (!isRecording) return;
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
  }, [isRecording]);

  // Filter mention suggestions by query
  const results = useMemo(() => {
    if (!open) return [];
    const q = query.trim().toLowerCase();
    if (!q) return mentionables.slice(0, 6);
    return mentionables
      .filter((m) => m.name.toLowerCase().includes(q) || m.handle.includes(q))
      .slice(0, 8);
  }, [open, query, mentionables]);

  // Detect an active "@..." token at the caret (end of input)
  const detectMention = (val: string) => {
    // Only look at the tail to keep it fast
    const tail = val.slice(Math.max(0, val.length - 48)); // last 48 chars
    // Matches: start or whitespace, then "@", then up to 30 non-space, non-"@" chars
    const m = tail.match(/(?:^|\s)@([^\s@]{0,30})$/);
    if (m) {
      setQuery(m[1] || "");
      setOpen(true);
    } else {
      setOpen(false);
      setQuery("");
    }
  };

  const onChange = (val: string) => {
    setText(val);
    onChangeText?.(val);
    if (!isRecording) detectMention(val);
  };

  // Insert selected mention → replaces current "@query" with "@handle "
  const insertMention = (m: Mentionable) => {
    const idx = text.lastIndexOf("@");
    if (idx < 0) return;
    // ensure we replace only the active tail token
    const before = text.slice(0, idx);
    const after = text.slice(idx).replace(/^@[^\s@]*/, "@" + m.handle) + " ";
    const combined = before + after;
    setText(combined);
    setOpen(false);
    setQuery("");
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const commit = () => {
    const val = text.trim();
    if (!val) return;
    onSend(val); // no backend change; we send plain text containing @handles
    setText("");
    // setInputHeight(MIN_INPUT_HEIGHT);
    onChangeText?.("");
    setOpen(false);
    setQuery("");
  };

  const onToggleTrayAnimated = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggleTray();
  };

  const handleActionPress = () => {
    if (isRecording) {
      onMicPress?.();
      return;
    }
    if (hasText) {
      commit();
      return;
    }
    onMicPress?.();
  };

  return (
    <View className="px-3 py-2 bg-white border-t border-gray-100">
      {/* Mention list */}
      {open && results.length ? (
        <View
          className="mb-2 rounded-2xl bg-white border border-gray-200"
          style={{ maxHeight: 220 }}
        >
          <View className="flex-row items-center justify-between px-3 py-2">
            <Text className="text-[12px] text-gray-700 font-kumbhBold">
              Mention someone
            </Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={8}>
              <X size={14} color="#6B7280" />
            </Pressable>
          </View>
          <FlatList
            data={results}
            keyExtractor={(m) => m.id}
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator
            style={{ maxHeight: 180 }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => insertMention(item)}
                className="px-3 py-2 rounded-xl flex-row items-center"
              >
                <View className="flex-1">
                  <Text className="text-[13px] text-gray-900 font-kumbhBold">
                    {item.name}
                  </Text>
                  <Text className="text-[11px] text-gray-500">
                    @{item.handle}
                  </Text>
                </View>
                <Text className="text-[12px] text-[#4C5FAB] font-kumbhBold">
                  Mention
                </Text>
              </Pressable>
            )}
          />
        </View>
      ) : null}

      {/* Reply bar */}
      {replyTo ? (
        <View className="mb-2 px-4 py-2.5 rounded-2xl bg-[#EEF2FF] border border-[#E0E7FF] flex-row items-start">
          <View className="flex-1">
            <Text className="text-[12px] text-primary font-kumbhBold">
              {replyTo.senderName}
            </Text>
            <Text
              className="text-[12px] text-[#374151] font-kumbh mt-0.5"
              numberOfLines={2}
            >
              {replyTo.preview}
            </Text>
          </View>
          <Pressable
            onPress={onCancelReply}
            className="h-6 w-6 ml-2 rounded-full bg-white items-center justify-center"
          >
            <X size={13} color="#111827" />
          </Pressable>
        </View>
      ) : null}

      {/* Edit message bar */}
      {editingMessage ? (
        <View className="mb-2 px-4 py-2.5 rounded-2xl bg-[#EEF2FF] border border-[#E0E7FF] flex-row items-center justify-between">
          <View className="flex-1 mr-2">
            <View className="flex-row items-center mb-0.5">
              <Pencil size={13} color="#4C5FAB" />
              <Text className="text-[12px] text-[#4C5FAB] font-kumbhBold ml-1.5">
                Editing message
              </Text>
            </View>
            <Text
              className="text-[12px] text-[#374151] font-kumbh"
              numberOfLines={1}
            >
              {editingMessage.text}
            </Text>
          </View>
          <Pressable
            onPress={onCancelEdit}
            className="h-6 w-6 rounded-full bg-white items-center justify-center"
            hitSlop={8}
          >
            <X size={13} color="#111827" />
          </Pressable>
        </View>
      ) : null}

      <View className="flex-row items-end">
        {isRecording ? (
          <View
            className="flex-1 rounded-[24px] border border-red-200 bg-red-50 flex-row items-center justify-between"
            style={{
              minHeight: 50,
              paddingHorizontal: 14,
            }}
          >
            <View className="flex-row items-center flex-1">
              <View className="h-2.5 w-2.5 rounded-full bg-red-500 mr-2" />
              <Text className="text-[14px] text-red-700 font-kumbhBold">
                Recording {durText}
              </Text>
            </View>
            <Pressable
              onPress={onCancelRecording}
              className="h-8 px-3 rounded-full bg-red-100 items-center justify-center"
              hitSlop={8}
            >
              <Text className="text-[12px] text-red-700 font-kumbhBold">
                Cancel
              </Text>
            </Pressable>
          </View>
        ) : (
          <View
            className="flex-1 rounded-[24px] border border-gray-200 bg-[#F9FAFB] flex-row items-end"
            style={{
              minHeight: 48,
              padding: 3,
            }}
          >
            <Pressable
              onPress={onToggleTrayAnimated}
              className="mr-1 h-11 w-11 items-center justify-center rounded-full"
              style={{
                backgroundColor: trayOpen ? "#EEF2FF" : "#FFFFFF",
                borderWidth: 1,
                borderColor: trayOpen ? "#C7D2FE" : "#E5E7EB",
              }}
            >
              <Paperclip size={18} color={trayOpen ? "#4C5FAB" : "#52607A"} />
            </Pressable>

            <View
              className="flex-1 justify-center px-2"
              style={{
                minHeight: 40,
                maxHeight: MAX_INPUT_HEIGHT,
                paddingVertical: 6,
              }}
            >
              <CustomTextInput
                ref={inputRef}
                value={text}
                onChangeText={onChange}
                placeholder={
                  editingMessage ? "Edit message..." : "Write a message"
                }
                className="w-full text-[#111827]"
                style={{
                  maxHeight: MAX_INPUT_HEIGHT - 12,
                }}
                multiline
                scrollEnabled
                returnKeyType="default"
              />
            </View>
          </View>
        )}

        <Pressable
          onPress={handleActionPress}
          className="ml-2 items-center justify-center self-end rounded-full h-12 w-12"
          style={{
            backgroundColor: hasText ? "#4C5FAB" : "#10B981",
          }}
        >
          {isRecording || hasText ? (
            <Send size={18} color="#fff" />
          ) : (
            <Mic size={18} color="#fff" />
          )}
        </Pressable>
      </View>

      {/* {trayOpen ? (
                <Text className="text-[11px] text-gray-400 mt-2 ml-1 text-center">
                    Share a photo, video, audio, or file.
                </Text>
            ) : null} */}
    </View>
  );
}
