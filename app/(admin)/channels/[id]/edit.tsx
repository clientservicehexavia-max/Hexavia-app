import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Field from "@/components/admin/Field";
import { CustomTextInput } from "@/components/ui/CustomInput";
import HexButton from "@/components/ui/HexButton";

import { showError, showSuccess } from "@/components/ui/toast";
import { selectChannelById } from "@/redux/channels/channels.slice";
import { useAppSelector } from "@/store/hooks";

export default function EditChannel() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const channel = useAppSelector(selectChannelById(id as string));

    const [name, setName] = useState(channel?.name ?? "");
    const [desc, setDesc] = useState(channel?.description ?? "");

    useEffect(() => {
        if (channel) {
            setName(channel.name ?? "");
            setDesc(channel.description ?? "");
        }
    }, [channel]);

    const onSave = async () => {
        if (!name.trim()) {
            showError("Channel name is required");
            return;
        }
        // await dispatch(updateChannel({ id, name: name.trim(), description: desc.trim() || undefined }))
        showSuccess("Saved (mock)");
        router.back();
    };

    return (
        <SafeAreaView className="flex-1 bg-[#F5F7FB]">
            {/* Header */}
            <View className="px-5 pt-4 pb-3 flex-row items-center justify-between gap-4">
                <Pressable
                    onPress={() => router.back()}
                    className="w-10 h-10 rounded-full bg-white border border-gray-100 items-center justify-center"
                >
                    <ArrowLeft size={20} color="#111827" />
                </Pressable>
                <Text className="text-2xl font-kumbhBold text-[#111827]">
                    Edit Channel
                </Text>
                <View className="w-10" />
            </View>

            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.select({
                    ios: "padding",
                    android: "height",
                })}
                keyboardVerticalOffset={
                    Platform.select({ ios: 70, android: 0 }) as number
                }
            >
                <ScrollView
                    className="flex-1"
                    contentContainerClassName="px-5 pb-10 pt-3"
                    keyboardShouldPersistTaps="handled"
                >
                    <View className="rounded-[28px] bg-white border border-gray-100 p-5">
                        <Field label="Name of Channel">
                            <View className="rounded-2xl border border-gray-200 bg-[#F9FAFB] px-4 h-12 justify-center">
                                <CustomTextInput
                                    placeholder="Enter Channel Name"
                                    value={name}
                                    onChangeText={setName}
                                    className="py-3"
                                    autoCapitalize="words"
                                />
                            </View>
                        </Field>

                        <Field label="Descriptions">
                            <View className="rounded-2xl border border-gray-200 bg-[#F9FAFB] px-4 py-3">
                                <CustomTextInput
                                    placeholder="Enter Description"
                                    value={desc}
                                    onChangeText={setDesc}
                                    multiline
                                    textAlignVertical="top"
                                    className="min-h-[88px]"
                                />
                            </View>
                        </Field>

                        <View className="mt-2">
                            <HexButton title="Save" onPress={onSave} />
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
