import React from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";

export type DropdownOption<T extends string = string> = {
    label: string;
    value: T;
};

type DropdownModalProps<T extends string = string> = {
    visible: boolean;
    title?: string;
    options: DropdownOption<T>[];
    selectedValue?: T;
    onClose: () => void;
    onSelect: (value: T) => void;
};

export default function DropdownModal<T extends string = string>({
    visible,
    title = "Select an option",
    options,
    selectedValue,
    onClose,
    onSelect,
}: DropdownModalProps<T>) {
    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable onPress={onClose} className="flex-1 bg-black/30">
                <View className="absolute left-5 right-5 bottom-8 rounded-2xl bg-white p-4">
                    <Text className="font-kumbhBold text-[#111827] mb-2">
                        {title}
                    </Text>

                    <FlatList
                        data={options}
                        keyExtractor={(item) => item.value}
                        ItemSeparatorComponent={() => (
                            <View
                                style={{
                                    height: 1,
                                    backgroundColor: "#EEF0F3",
                                }}
                            />
                        )}
                        renderItem={({ item }) => {
                            const active = item.value === selectedValue;
                            return (
                                <Pressable
                                    onPress={() => {
                                        onSelect(item.value);
                                        onClose();
                                    }}
                                    className="py-3 flex-row items-center justify-between"
                                >
                                    <Text
                                        className="font-kumbh"
                                        style={{
                                            color: active
                                                ? "#4C5FAB"
                                                : "#111827",
                                        }}
                                    >
                                        {item.label}
                                    </Text>
                                </Pressable>
                            );
                        }}
                    />
                </View>
            </Pressable>
        </Modal>
    );
}
