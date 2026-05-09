import DateTimePicker from "@react-native-community/datetimepicker";
import React from "react";
import { Modal, Platform, Pressable, Text, View } from "react-native";

type IOSDatePickerModalProps = {
    visible: boolean;
    value: Date;
    onCancel: () => void;
    onDone: () => void;
    onDateChange: (date: Date) => void;
};

export default function DatePickerModal({
    visible,
    value,
    onCancel,
    onDone,
    onDateChange,
}: IOSDatePickerModalProps) {
    if (!visible) return null;

    if (Platform.OS !== "ios") {
        return (
            <DateTimePicker
                value={value}
                mode="date"
                display="default"
                onChange={(e, d) => {
                    if (!d || e?.type === "dismissed") {
                        onCancel();
                        return;
                    }
                    onDateChange(d);
                    onDone();
                }}
            />
        );
    }

    return (
        <Modal
            transparent
            visible={visible}
            animationType="slide"
            onRequestClose={onCancel}
        >
            <Pressable
                className="flex-1 justify-end bg-black/40"
                onPress={onCancel}
            >
                <Pressable
                    className="rounded-t-2xl bg-white px-4 pb-5 pt-2"
                    onPress={() => null}
                >
                    <View className="mx-auto h-1.5 w-12 rounded-full bg-[#D1D5DB]" />
                    <View className="mt-1 flex-row justify-between">
                        <Pressable onPress={onCancel}>
                            <Text className="text-xl">Cancel</Text>
                        </Pressable>

                        <Pressable onPress={onDone}>
                            <Text className="text-xl text-[#4C5FAB]">Done</Text>
                        </Pressable>
                    </View>
                    <View className="flex-row justify-center">
                        <DateTimePicker
                            value={value}
                            mode="date"
                            display="spinner"
                            textColor="black"
                            style={{ backgroundColor: "transparent" }}
                            onChange={(e, d) => {
                                if (!d || e?.type === "dismissed") {
                                    onCancel();
                                    return;
                                }
                                onDateChange(d);
                            }}
                        />
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}
