// UploadChooser.tsx
import React from "react";
import { Modal, Pressable, Text, View } from "react-native";

export default function UploadChooser({
  visible,
  onClose,
  onPick,
  onDismiss,
  disabled = false,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (type: "image" | "doc") => void;
  onDismiss?: () => void; // ✅ add
  disabled?: boolean;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onDismiss={onDismiss} // ✅ add
    >
      <Pressable
        onPress={onClose}
        className="flex-1 bg-black/40"
      />
      <View className="absolute left-0 right-0 bottom-0 bg-white rounded-t-[28px] px-5 pt-3 pb-7">
        <View className="w-10 h-1 bg-gray-200 rounded-full self-center mb-4" />
        <Text className="text-[18px] font-kumbhBold text-[#111827] mb-3">
          Upload to channel
        </Text>

        <Pressable
          disabled={disabled}
          onPress={() => !disabled && onPick("image")}
          className="h-12 rounded-2xl bg-[#F9FAFB] border border-gray-200 px-4 justify-center mb-2.5"
          style={{ opacity: disabled ? 0.5 : 1 }}
        >
          <Text className="font-kumbhBold text-[14px] text-[#111827]">
            Pick Image
          </Text>
        </Pressable>

        <Pressable
          disabled={disabled}
          onPress={() => !disabled && onPick("doc")}
          className="h-12 rounded-2xl bg-[#F9FAFB] border border-gray-200 px-4 justify-center mb-3"
          style={{ opacity: disabled ? 0.5 : 1 }}
        >
          <Text className="font-kumbhBold text-[14px] text-[#111827]">
            Pick File (PDF, audio, etc.)
          </Text>
        </Pressable>

        <Pressable
          onPress={onClose}
          className="h-12 rounded-2xl bg-gray-100 items-center justify-center"
        >
          <Text className="font-kumbhBold text-[14px] text-[#374151]">
            Cancel
          </Text>
        </Pressable>
      </View>
    </Modal>
  );
}
