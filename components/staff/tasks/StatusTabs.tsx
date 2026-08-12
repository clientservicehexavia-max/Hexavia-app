import { STATUS_META, StatusKey, TAB_ORDER } from "@/features/staff/types";
import React from "react";
import { Pressable, Text, View } from "react-native";

type Props = { active: StatusKey; onChange: (k: StatusKey) => void };

export default function StatusTabs({ active, onChange }: Props) {
    return (
        <View className="mt-2">
            <View className="flex-row items-center">
                {TAB_ORDER.map((key) => {
                    const isActive = key === active;
                    return (
                        <Pressable
                            key={key}
                            onPress={() => onChange(key)}
                            className="flex-1 px-1"
                        >
                            <View className="items-center py-3">
                                <Text
                                    className="font-kumbh text-[14px]"
                                    style={{
                                        color: isActive ? "#4C5FAB" : "#6B7280",
                                    }}
                                >
                                    {STATUS_META[key].title}
                                </Text>
                                <View
                                    className="mt-2 h-[3px] w-full rounded-full"
                                    style={{
                                        backgroundColor: isActive
                                            ? "#4C5FAB"
                                            : "transparent",
                                    }}
                                />
                            </View>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}
