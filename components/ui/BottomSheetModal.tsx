import { default as React } from "react";
import { Modal, Pressable, Text, View } from "react-native";

export type BottomSheetModalProps = {
    visible: boolean;
    onRequestClose: () => void;
    children: React.ReactNode;
    showActionRow?: boolean;
    onDone?: () => void;
    animationType?: "slide" | "fade" | "none";
};

export default function BottomSheetModal({
    visible,
    onRequestClose,
    children,
    showActionRow = true,
    onDone = () => null,
    animationType = "slide",
}: BottomSheetModalProps) {
    if (!visible) return null;
    return (
        <Modal
            transparent
            visible={visible}
            animationType={animationType}
            onRequestClose={onRequestClose}
        >
            <Pressable
                className="flex-1 justify-end bg-black/40"
                onPress={onRequestClose}
            >
                <Pressable
                    className="rounded-t-2xl bg-white px-4 pb-5 pt-2"
                    onPress={() => null}
                >
                    <View className="items-center">
                        <View className="w-12 h-1.5 bg-gray-300 rounded-full" />
                    </View>
                    {showActionRow && (
                        <View className="mt-1 flex-row justify-between">
                            <Pressable onPress={onRequestClose}>
                                <Text className="text-lg">Cancel</Text>
                            </Pressable>
                            <Pressable onPress={onDone}>
                                <Text className="text-lg text-[#4C5FAB]">
                                    Done
                                </Text>
                            </Pressable>
                        </View>
                    )}
                    {children}
                </Pressable>
            </Pressable>
        </Modal>
    );
}
