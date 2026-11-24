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
                    className="rounded-t-[28px] border-t border-gray-100 bg-white px-5 pb-6 pt-3"
                    onPress={() => null}
                >
                    <View className="items-center pb-2">
                        <View className="h-1.5 w-11 rounded-full bg-gray-200" />
                    </View>
                    {showActionRow && (
                        <View className="mb-1 flex-row items-center justify-between border-b border-gray-100 pb-2">
                            <Pressable onPress={onRequestClose} className="py-1.5 px-1">
                                <Text className="font-kumbh text-base text-gray-500">
                                    Cancel
                                </Text>
                            </Pressable>
                            <Pressable onPress={onDone} className="py-1.5 px-1">
                                <Text className="font-kumbhBold text-base text-primary">
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
