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
        <SafeAreaView className="flex-1 bg-background">
            {/* Header */}
            <View className="px-5 pt-6 pb-2 flex-row items-center justify-between gap-4">
                <Pressable
                    onPress={() => router.back()}
                    className="w-10 h-10 rounded-full items-center justify-center"
                >
                    <ArrowLeft size={24} color="#111827" />
                </Pressable>
                <Text className="text-3xl font-kumbh text-text">
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
                    contentContainerClassName="px-5 pb-10 pt-4"
                    keyboardShouldPersistTaps="handled"
                >
                    <Field label="Name of Channel">
                        <TextInput
                            placeholder="Enter Channel Name"
                            placeholderTextColor="#9CA3AF"
                            value={name}
                            onChangeText={setName}
                            className="bg-gray-200 rounded-2xl px-4 py-4 font-kumbh text-text"
                            autoCapitalize="words"
                        />
                    </Field>

                    <Field label="Descriptions">
                        <TextInput
                            placeholder="Enter Description"
                            placeholderTextColor="#9CA3AF"
                            value={desc}
                            onChangeText={setDesc}
                            multiline
                            className="bg-gray-200 rounded-2xl px-4 py-4 min-h-[88px] font-kumbh text-text"
                        />
                    </Field>

                    <HexButton title="Save" onPress={onSave} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
