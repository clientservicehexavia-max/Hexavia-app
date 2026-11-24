import React, { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Switch,
  Text,
  View,
} from "react-native";
import { X } from "lucide-react-native";

import { CustomTextInput } from "@/components/ui/CustomInput";
import { showError } from "@/components/ui/toast";
import { updateChannel } from "@/redux/channels/channels.thunks";
import type { Channel } from "@/redux/channels/channels.types";
import { useAppDispatch } from "@/store/hooks";

type Props = {
  visible: boolean;
  channel?: Channel | null;
  onClose: () => void;
};

export default function EditChannelModal({ visible, channel, onClose }: Props) {
  const dispatch = useAppDispatch();

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [code, setCode] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const canSave = useMemo(
    () => !!channel?._id && !!name.trim(),
    [channel?._id, name]
  );

  useEffect(() => {
    if (visible) {
      setName(channel?.name ?? "");
      setDesc(channel?.description ?? "");
      setCode(channel?.code ?? "");
      setIsActive(Boolean(channel?.isActive ?? true));
    }
  }, [visible, channel]);

  const handleSubmit = async () => {
    if (!channel?._id) return;
    if (!name.trim()) {
      showError("Project name is required");
      return;
    }

    try {
      setIsSaving(true);
      await dispatch(
        updateChannel({
          channelId: channel._id,
          name: name.trim(),
          description: desc.trim() ? desc.trim() : null,
          isActive,
        })
      ).unwrap();
      onClose();
    } catch (err) {
      // errors already toasted in thunk
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <Pressable
        onPress={onClose}
        className="flex-1 bg-black/40"
        style={{ justifyContent: "center", paddingHorizontal: 20 }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="w-full"
        >
          <Pressable onPress={() => {}} className="">
            <View className="bg-white rounded-[28px] p-5 border border-gray-100">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-[19px] font-kumbhBold text-[#111827]">
                  Edit Project
                </Text>
                <Pressable
                  onPress={onClose}
                  className="h-9 w-9 rounded-full bg-[#F3F4F6] items-center justify-center"
                  accessibilityLabel="Close modal"
                >
                  <X size={18} color="#111827" />
                </Pressable>
              </View>

              <View className="mb-3">
                <Text className="text-[12px] font-kumbhBold text-[#374151] mb-1.5">
                  Name of Project
                </Text>
                <View className="h-12 px-4 rounded-2xl border border-gray-200 bg-[#F9FAFB] justify-center">
                  <CustomTextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter Name of Project"
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <View className="mb-3">
                <Text className="text-[12px] font-kumbhBold text-[#374151] mb-1.5">
                  Descriptions
                </Text>
                <View className="px-4 py-3 rounded-2xl border border-gray-200 bg-[#F9FAFB]">
                  <CustomTextInput
                    value={desc}
                    onChangeText={setDesc}
                    placeholder="Add a short description"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    style={{ minHeight: 72 }}
                  />
                </View>
              </View>

              <View className="mb-5">
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-[13px] font-kumbhBold text-[#374151] mb-0.5">
                      Active project
                    </Text>
                    <Text className="text-[11px] font-kumbh text-[#6B7280]">
                      Toggle off to deactivate this project.
                    </Text>
                  </View>
                  <Switch
                    value={isActive}
                    onValueChange={setIsActive}
                    trackColor={{ false: "#d1d5db", true: "#4C5FAB" }}
                    ios_backgroundColor="#d1d5db"
                  />
                </View>
              </View>

              <View className="mb-5">
                <Text className="text-[12px] font-kumbhBold text-[#374151] mb-1.5">
                  Code
                </Text>
                <View className="h-12 px-4 rounded-2xl border border-gray-200 bg-gray-100 justify-center">
                  <CustomTextInput
                    value={code}
                    editable={false}
                    placeholder="#0101"
                    className="text-gray-400"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <Pressable
                onPress={handleSubmit}
                disabled={isSaving || !canSave}
                className={`h-12 rounded-2xl items-center justify-center ${
                  isSaving || !canSave ? "bg-[#4C5FAB]/50" : "bg-[#4C5FAB]"
                }`}
              >
                <Text className="text-white font-kumbhBold">
                  {isSaving ? "Saving..." : "Save Changes"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}
