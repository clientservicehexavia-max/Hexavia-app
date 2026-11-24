import React from "react";
import { Modal, Pressable, Text, View } from "react-native";

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View className="flex-1 justify-center items-center bg-black/40 px-5">
        <View className="w-full max-w-sm rounded-[28px] border border-gray-100 bg-white p-6">
          <Text className="font-kumbhBold text-lg text-[#111827]">{title}</Text>
          {message ? (
            <Text className="mt-2 font-kumbh text-sm leading-5 text-gray-500">
              {message}
            </Text>
          ) : null}
          <View className="mt-5 flex-row justify-end gap-2.5">
            <Pressable
              onPress={onCancel}
              className="rounded-2xl border border-gray-200 bg-[#F5F7FB] px-4 py-2.5"
            >
              <Text className="font-kumbhBold text-sm text-gray-700">
                {cancelLabel}
              </Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              className="rounded-2xl bg-[#DC2626] px-4 py-2.5"
            >
              <Text className="font-kumbhBold text-sm text-white">
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
