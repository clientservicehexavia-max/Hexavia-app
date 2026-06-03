import type { ReplyMeta } from "@/types/chat";
import type { Mentionable } from "@/utils/handles";
import { Mic, Paperclip, Send, X } from "lucide-react-native";
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
    isRecording,
    recordDurationMs = 0,
    onMicPress,
    onCancelRecording,
    mentionables,
}: Props) {
    const LINE_HEIGHT = 20;
    const INPUT_VERTICAL_PADDING = 10;
    const MAX_INPUT_LINES = 5;
    const MIN_INPUT_HEIGHT = LINE_HEIGHT + INPUT_VERTICAL_PADDING * 2;
    const MAX_INPUT_HEIGHT =
        MAX_INPUT_LINES * LINE_HEIGHT + INPUT_VERTICAL_PADDING * 2;
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
            .filter(
                (m) => m.name.toLowerCase().includes(q) || m.handle.includes(q),
            )
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
        const after =
            text.slice(idx).replace(/^@[^\s@]*/, "@" + m.handle) + " ";
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
        <View className="px-3 py-1.5 bg-white border-t border-gray-200">
            {/* Mention list */}
            {open && results.length ? (
                <View
                    className="mb-2 rounded-2xl bg-white border border-gray-200 shadow"
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
                <View className="mb-2 px-4 py-2 rounded-2xl bg-[#E1E4F6] flex-row items-start">
                    <View className="flex-1">
                        <Text className="text-[12px] text-gray-500 font-kumbhBold">
                            {replyTo.senderName}
                        </Text>
                        <Text
                            className="text-[12px] text-gray-700"
                            numberOfLines={2}
                        >
                            {replyTo.preview}
                        </Text>
                    </View>
                    <Pressable
                        onPress={onCancelReply}
                        className="h-6 w-6 ml-2 rounded-lg bg-white/60 items-center justify-center"
                    >
                        <X size={14} color="#111827" />
                    </Pressable>
                </View>
            ) : null}

            <View className="flex-row items-end">
                {isRecording ? (
                    <View
                        className="flex-1 rounded-[28px] border border-red-100 bg-[#FFEFEF] flex-row items-center justify-between"
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
                        className="flex-1 rounded-[28px] border border-[#E7EAF3] flex-row items-end py-1"
                        style={{
                            // minHeight: 50,
                            shadowColor: "#1F2A44",
                            shadowOffset: { width: 0, height: 10 },
                            shadowOpacity: Platform.OS === "ios" ? 0.08 : 0,
                            shadowRadius: 24,
                            // elevation: 3 ,
                            paddingHorizontal: 4,
                        }}
                    >
                        <Pressable
                            onPress={onToggleTrayAnimated}
                            className="mr-1 h-[40px] w-[40px] items-center justify-center rounded-full"
                            style={{
                                backgroundColor: trayOpen
                                    ? "#EEF2FF"
                                    : "#F5F7FB",
                                borderWidth: 1,
                                borderColor: trayOpen ? "#C7D2FE" : "#E7EAF3",
                            }}
                        >
                            <Paperclip
                                size={18}
                                color={trayOpen ? "#4C5FAB" : "#52607A"}
                            />
                        </Pressable>

                        <TextInput
                            ref={inputRef}
                            value={text}
                            onChangeText={onChange}
                            placeholder="Write a message"
                            placeholderTextColor="#9CA3AF"
                            // placeholderTextColor="#6B7280"
                            className="flex-1 text-gray-900"
                            style={{
                                fontFamily: "KumbhSans-Regular",
                                fontSize: 16,
                                lineHeight: LINE_HEIGHT,
                                minHeight: MIN_INPUT_HEIGHT,
                                maxHeight: MAX_INPUT_HEIGHT,
                                paddingVertical: INPUT_VERTICAL_PADDING,
                                paddingLeft: 6,
                                paddingRight: 8,
                            }}
                            multiline
                            scrollEnabled
                            textAlignVertical="top"
                            returnKeyType="default"
                        />
                    </View>
                )}

                <Pressable
                    onPress={handleActionPress}
                    className="ml-2 items-center justify-center self-end rounded-full"
                    style={{
                        width: 48,
                        height: 48,
                        backgroundColor: hasText ? "#4C5FAB" : "#1E8E6A",
                        borderWidth: 1,
                        borderColor: hasText ? "#4456A0" : "#187356",
                        shadowColor: hasText ? "#4C5FAB" : "#1E8E6A",
                        shadowOffset: { width: 0, height: 10 },
                        shadowOpacity: Platform.OS === "ios" ? 0.18 : 0,
                        shadowRadius: 18,
                        elevation: 4,
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
