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
            <Pressable onPress={onClose} className="flex-1 bg-black/40">
                <View className="absolute left-5 right-5 bottom-8 rounded-[24px] border border-gray-100 bg-white p-5">
                    <Text className="mb-3 font-kumbhBold text-base text-[#111827]">
                        {title}
                    </Text>

                    <FlatList
                        data={options}
                        keyExtractor={(item) => item.value}
                        ItemSeparatorComponent={() => (
                            <View className="h-px bg-gray-100" />
                        )}
                        renderItem={({ item }) => {
                            const active = item.value === selectedValue;
                            return (
                                <Pressable
                                    onPress={() => {
                                        onSelect(item.value);
                                        onClose();
                                    }}
                                    className={`my-0.5 flex-row items-center justify-between rounded-xl px-3 py-3 ${
                                        active ? "bg-[#EEF2FF]" : ""
                                    }`}
                                >
                                    <Text
                                        className={
                                            active
                                                ? "font-kumbhBold text-primary"
                                                : "font-kumbh text-[#111827]"
                                        }
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
