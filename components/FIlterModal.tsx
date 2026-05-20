import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { Modal, Platform, Pressable, Switch, Text, View } from "react-native";

const PRIMARY = "#4C5FAB";

export type Filters = {
    department:
        | "All"
        | "PR"
        | "Marketing"
        | "Engineering"
        | "Finance"
        | "General";
    unreadOnly: boolean;
    sortBy: "name" | "members";
};

type Props = {
    visible: boolean;
    onClose: () => void;
    value: Filters;
    onChange: (next: Filters) => void;
};

export default function FilterModal({
    visible,
    onClose,
    value,
    onChange,
}: Props) {
    const set = <K extends keyof Filters>(k: K, v: Filters[K]) =>
        onChange({ ...value, [k]: v });

    const handleReset = () =>
        onChange({ department: "All", unreadOnly: false, sortBy: "name" });

    const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
        title,
        children,
    }) => (
        <View className="mb-5">
            <Text className="mb-2 text-gray-700 font-kumbhBold">{title}</Text>
            <View className="bg-gray-50 rounded-2xl p-3">{children}</View>
        </View>
    );

    const Chip: React.FC<{
        active: boolean;
        onPress: () => void;
        children: React.ReactNode;
    }> = ({ active, onPress, children }) => (
        <Pressable
            onPress={onPress}
            className={`px-4 h-10 rounded-full items-center justify-center mr-2 mb-2 ${
                active ? "bg-gray-900" : "bg-white"
            }`}
            style={{
                borderWidth: 1,
                borderColor: active ? "#111827" : "#E5E7EB",
                shadowOpacity: active ? 0.12 : 0,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 2 },
                elevation: active ? 2 : 0,
            }}
        >
            <Text
                className={`font-kumbh ${
                    active ? "text-white" : "text-gray-800"
                }`}
            >
                {children}
            </Text>
        </Pressable>
    );

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            {/* Backdrop */}
            <Pressable
                onPress={onClose}
                className="flex-1 bg-black/40"
                style={{
                    paddingTop: Platform.select({ ios: 80, android: 40 }),
                }}
            >
                {/* Sheet */}
                <Pressable
                    onPress={(e: any) => e?.stopPropagation?.()}
                    className="mt-auto bg-white rounded-t-3xl px-4 pt-3 pb-5"
                    style={{
                        shadowColor: "#000",
                        shadowOpacity: 0.15,
                        shadowRadius: 12,
                        shadowOffset: { width: 0, height: -2 },
                        elevation: 10,
                    }}
                >
                    {/* Drag handle */}
                    <View className="items-center mb-3">
                        <View className="w-12 h-1.5 rounded-full bg-gray-300" />
                    </View>

                    {/* Header */}
                    <View className="flex-row items-center justify-between mb-4">
                        <View className="flex-row items-center">
                            <Text className="text-xl font-kumbhBold text-gray-900">
                                Filters
                            </Text>
                            {(value.department !== "All" ? 1 : 0) +
                                (value.unreadOnly ? 1 : 0) +
                                (value.sortBy !== "name" ? 1 : 0) >
                                0 && (
                                <View className="ml-2 px-2 py-0.5 rounded-full bg-gray-100">
                                    <Text className="text-xs font-kumbh text-gray-700">
                                        {(value.department !== "All" ? 1 : 0) +
                                            (value.unreadOnly ? 1 : 0) +
                                            (value.sortBy !== "name"
                                                ? 1
                                                : 0)}{" "}
                                        active
                                    </Text>
                                </View>
                            )}
                        </View>

                        <View className="flex-row items-center">
                            <Pressable
                                onPress={handleReset}
                                className="mr-2 px-2 py-1 rounded-lg"
                            >
                                <Text
                                    className="text-[13px] font-kumbhBold"
                                    style={{ color: PRIMARY }}
                                >
                                    Reset
                                </Text>
                            </Pressable>
                            <Pressable
                                className="h-9 w-9 items-center justify-center rounded-full"
                                onPress={onClose}
                            >
                                <Ionicons
                                    name="close"
                                    size={20}
                                    color="#111827"
                                />
                            </Pressable>
                        </View>
                    </View>

                    {/* Sections */}
                    <Section title="Department">
                        <View className="flex-row flex-wrap">
                            {(
                                [
                                    "All",
                                    "PR",
                                    "Marketing",
                                    "Engineering",
                                    "Finance",
                                    "General",
                                ] as const
                            ).map((d) => (
                                <Chip
                                    key={d}
                                    active={value.department === d}
                                    onPress={() => set("department", d)}
                                >
                                    {d}
                                </Chip>
                            ))}
                        </View>
                    </Section>

                    <Section title="Sort">
                        <View className="flex-row flex-wrap">
                            <Chip
                                active={value.sortBy === "name"}
                                onPress={() => set("sortBy", "name")}
                            >
                                Name (A–Z)
                            </Chip>
                            <Chip
                                active={value.sortBy === "members"}
                                onPress={() => set("sortBy", "members")}
                            >
                                Members
                            </Chip>
                        </View>
                    </Section>

                    <Section title="Unread">
                        <View className="flex-row items-center justify-between">
                            <Text className="font-kumbh text-gray-800">
                                Show only unread
                            </Text>
                            <Switch
                                value={value.unreadOnly}
                                onValueChange={(v) => set("unreadOnly", v)}
                                trackColor={{ false: "#D1D5DB", true: PRIMARY }}
                                thumbColor="#fff"
                            />
                        </View>
                    </Section>

                    {/* Footer buttons */}
                    <View className="flex-row mt-2">
                        <Pressable
                            onPress={onClose}
                            className="flex-1 h-12 rounded-2xl items-center justify-center mr-3 bg-white"
                            style={{ borderWidth: 1, borderColor: PRIMARY }}
                        >
                            <Text
                                className="font-kumbhBold"
                                style={{ color: PRIMARY }}
                            >
                                Cancel
                            </Text>
                        </Pressable>
                        <Pressable
                            onPress={onClose}
                            className="flex-1 h-12 rounded-2xl items-center justify-center"
                            style={{ backgroundColor: PRIMARY }}
                        >
                            <Text className="text-white font-kumbhBold">
                                Apply
                            </Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}
