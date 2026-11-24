import { CustomTextInput } from "@/components/ui/CustomInput";
import { StatusKey, TAB_ORDER } from "@/features/staff/types";
import React, { useEffect, useState } from "react";
import {
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    Text,
    TouchableWithoutFeedback,
    View,
} from "react-native";

export type FilterState = {
    mode: "all" | "channel" | "personal";
    channelCode: string;
    statuses: StatusKey[];
};

export default function FilterModal({
    visible,
    initial,
    onClose,
    onApply,
}: {
    visible: boolean;
    initial: FilterState;
    onClose: () => void;
    onApply: (f: FilterState) => void;
}) {
    const [mode, setMode] = useState<FilterState["mode"]>(
        initial.mode ?? "all",
    );
    const [channelCode, setChannelCode] = useState(initial.channelCode);
    const [statuses, setStatuses] = useState<StatusKey[]>(initial.statuses);

    useEffect(() => {
        if (visible) {
            setMode(initial.mode ?? "all");
            setChannelCode(initial.channelCode ?? "");
            setStatuses(initial.statuses ?? []);
        }
    }, [visible, initial]);

    const toggle = (s: StatusKey) => {
        setStatuses((prev) =>
            prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
        );
    };

    const reset = () => {
        setMode("all");
        setChannelCode("");
        setStatuses([]);
    };

    const canEditChannelCode = mode !== "personal";

    // Build the mode options
    const modes: FilterState["mode"][] = ["all", "channel", "personal"];

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={
                    Platform.select({ ios: 70, android: 0 }) as number
                }
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View className="flex-1 bg-black/40 justify-end">
                        <View className="bg-white rounded-t-[28px] px-5 py-7">
                            <View className="w-10 h-1 bg-gray-200 rounded-full self-center mb-4" />
                            <Text className="font-kumbhBold text-[19px] text-[#111827]">
                                Filter Tasks
                            </Text>

                            {/* Mode */}
                            <Text className="font-kumbhBold text-[13px] text-[#374151] mt-4 mb-2">
                                Mode
                            </Text>
                            <View className="flex-row" style={{ gap: 8 }}>
                                {modes.map((m) => {
                                    const selected = m === mode;
                                    return (
                                        <Pressable
                                            key={m}
                                            onPress={() => setMode(m)}
                                            className={`rounded-full px-4 py-2 border ${
                                                selected
                                                    ? "bg-primary border-primary"
                                                    : "bg-[#F9FAFB] border-gray-200"
                                            }`}
                                        >
                                            <Text
                                                className={`font-kumbhBold text-[12px] ${
                                                    selected
                                                        ? "text-white"
                                                        : "text-[#374151]"
                                                }`}
                                            >
                                                {m === "all"
                                                    ? "All"
                                                    : m === "channel"
                                                      ? "Channel"
                                                      : "Personal"}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>

                            {/* Project Code (disabled for personal-only view) */}
                            <View
                                className="mt-4 rounded-2xl border border-gray-200 bg-[#F9FAFB] px-4 py-2.5"
                                style={{
                                    opacity: canEditChannelCode ? 1 : 0.5,
                                }}
                            >
                                <CustomTextInput
                                    editable={canEditChannelCode}
                                    value={channelCode}
                                    onChangeText={setChannelCode}
                                    placeholder={
                                        canEditChannelCode
                                            ? "Project Code (e.g. #5839)"
                                            : "Project Code (disabled in Personal mode)"
                                    }
                                    className="py-1"
                                />
                            </View>

                            {/* Statuses */}
                            <Text className="font-kumbhBold text-[13px] text-[#374151] mt-4 mb-2">
                                Statuses
                            </Text>
                            <View
                                className="flex-row flex-wrap"
                                style={{ gap: 8 }}
                            >
                                {TAB_ORDER.map((s) => {
                                    const selected = statuses.includes(s);
                                    return (
                                        <Pressable
                                            key={s}
                                            onPress={() => toggle(s)}
                                            className={`rounded-full px-4 py-2 border ${
                                                selected
                                                    ? "bg-primary border-primary"
                                                    : "bg-[#F9FAFB] border-gray-200"
                                            }`}
                                        >
                                            <Text
                                                className={`font-kumbhBold text-[12px] capitalize ${
                                                    selected
                                                        ? "text-white"
                                                        : "text-[#374151]"
                                                }`}
                                            >
                                                {s.replace("-", " ")}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>

                            {/* Actions */}
                            <View className="flex-row justify-between items-center mt-6">
                                <Pressable
                                    onPress={reset}
                                    className="px-3 py-2 rounded-xl bg-red-50"
                                >
                                    <Text className="font-kumbhBold text-[#EF4444]">
                                        Reset
                                    </Text>
                                </Pressable>
                                <View
                                    className="flex-row items-center"
                                    style={{ gap: 10 }}
                                >
                                    <Pressable
                                        onPress={onClose}
                                        className="px-4 py-3 rounded-2xl border border-gray-200 bg-white"
                                    >
                                        <Text className="font-kumbhBold text-[#374151]">
                                            Cancel
                                        </Text>
                                    </Pressable>
                                    <Pressable
                                        onPress={() =>
                                            onApply({
                                                mode,
                                                channelCode: channelCode.trim(),
                                                statuses,
                                            })
                                        }
                                        className="rounded-2xl px-6 py-3 bg-primary"
                                    >
                                        <Text className="font-kumbhBold text-white">
                                            Apply
                                        </Text>
                                    </Pressable>
                                </View>
                            </View>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </Modal>
    );
}
