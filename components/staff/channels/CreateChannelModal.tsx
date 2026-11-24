import React, { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from "react-native";
import { X, RefreshCcw } from "lucide-react-native";
import { CustomTextInput } from "@/components/ui/CustomInput";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/store";
import {
  generateChannelCode,
  createChannel,
} from "@/redux/channels/channels.thunks";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function CreateChannelModal({ visible, onClose }: Props) {
  const dispatch = useDispatch<AppDispatch>();

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [code, setCode] = useState("#0101");
  const [isStaff, setIsStaff] = useState(true);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const doGenerateCode = async () => {
    try {
      setIsGenerating(true);
      const newCode = await dispatch(generateChannelCode()).unwrap();
      setCode(newCode);
    } catch (err) {
      console.log("Generate code failed: ", err);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (visible) {
      setName("");
      setDesc("");
      setCode("#0101");
      setIsStaff(true);
      doGenerateCode();
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      return;
    }
    try {
      setIsCreating(true);
      await dispatch(
        createChannel({
          name: name.trim(),
          description: desc.trim() ? desc.trim() : null,
          code: code.trim(),
          isStaff,
        })
      ).unwrap();

      setName("");
      setDesc("");
      setCode("#0101");
      onClose();
    } catch (err) {
      console.log("Create channel failed: ", err);
    } finally {
      setIsCreating(false);
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
              {/* Header */}
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-[19px] font-kumbhBold text-[#111827]">
                  Create Project
                </Text>
                <Pressable
                  onPress={onClose}
                  className="h-9 w-9 rounded-full bg-[#F3F4F6] items-center justify-center"
                  accessibilityLabel="Close modal"
                >
                  <X size={18} color="#111827" />
                </Pressable>
              </View>

              {/* Fields */}
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
                      Staff only channel
                    </Text>
                    <Text className="text-[11px] font-kumbh text-[#6B7280]">
                      Toggle on if this project should be restricted to staff.
                    </Text>
                  </View>
                  <Switch
                    value={isStaff}
                    onValueChange={setIsStaff}
                    trackColor={{ false: "#d1d5db", true: "#4C5FAB" }}
                    ios_backgroundColor="#d1d5db"
                  />
                </View>
              </View>

              <View className="mb-5">
                <View className="flex-row items-center justify-between mb-1.5">
                  <Text className="text-[12px] font-kumbhBold text-[#374151]">Code</Text>
                  <Pressable
                    onPress={doGenerateCode}
                    disabled={isGenerating}
                    className="flex-row items-center gap-1"
                    accessibilityLabel="Regenerate code"
                  >
                    <RefreshCcw size={15} color="#4C5FAB" />
                    <Text className="text-[#4C5FAB] font-kumbhBold text-[12px]">
                      {isGenerating ? "Generating…" : "Generate"}
                    </Text>
                  </Pressable>
                </View>
                <View className="h-12 px-4 rounded-2xl border border-gray-200 bg-[#F9FAFB] justify-center">
                  <CustomTextInput
                    value={code}
                    onChangeText={setCode}
                    placeholder="#0101"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Submit */}
              <Pressable
                onPress={handleSubmit}
                disabled={
                  isCreating || isGenerating || !name.trim() || !code.trim()
                }
                className={`h-12 rounded-2xl items-center justify-center ${
                  isCreating || isGenerating || !name.trim() || !code.trim()
                    ? "bg-[#4C5FAB]/50"
                    : "bg-[#4C5FAB]"
                }`}
              >
                <Text className="text-white font-kumbhBold">
                  {isCreating ? "Creating…" : "Create Channel"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}
