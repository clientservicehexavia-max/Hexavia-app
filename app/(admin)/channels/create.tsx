// app/(admin)/channels/create.tsx
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Switch,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Field from "@/components/admin/Field";
import HexButton from "@/components/ui/HexButton";

import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import { showError } from "@/components/ui/toast";
import {
    selectChannelsState,
    selectLastGeneratedCode,
} from "@/redux/channels/channels.slice";
import {
    createChannel,
    generateChannelCode,
} from "@/redux/channels/channels.thunks";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export default function CreateChannel() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const isIOS = Platform.OS === "ios";

    const { status, error } = useAppSelector(selectChannelsState);
    const generatedCode = useAppSelector(selectLastGeneratedCode);

    const [name, setName] = useState("");
    const [desc, setDesc] = useState<string>("");
    const [code, setCode] = useState<string>("");
    const [isStaff, setIsStaff] = useState(true);

    useEffect(() => {
        dispatch(generateChannelCode());
    }, [dispatch]);

    useEffect(() => {
        if (generatedCode) setCode(generatedCode);
    }, [generatedCode]);

    const onGenerateCode = () => {
        dispatch(generateChannelCode());
    };

    const onCreate = async () => {
        if (!name.trim()) {
            showError("Project name is required");
            return;
        }
        if (!code?.trim()) {
            showError("Project code is missing. Generate a code first.");
            return;
        }

        const body = {
            name: name.trim(),
            description: desc?.trim() ? desc.trim() : undefined,
            code: code.trim().toUpperCase(),
            isStaff,
        };

        const res = await dispatch(createChannel(body));
        if ((res as any)?.meta?.requestStatus === "fulfilled") {
            router.back();
        }
    };

    const creating = status === "loading";

    return (
        <SafeAreaView
            edges={
                isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]
            }
            className="flex-1 bg-white px-4"
        >
            {/* Header */}
            <PlatformAdaptiveHeader title="Create New Project" />

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
                    contentContainerClassName="pb-10 pt-4"
                    keyboardShouldPersistTaps="handled"
                >
                    {!!error && (
                        <View className="mb-3 rounded-xl bg-red-50 border border-red-100 px-4 py-3">
                            <Text className="text-red-700 font-kumbh">
                                {error}
                            </Text>
                        </View>
                    )}

                    <Field label="Name of Project">
                        <TextInput
                            placeholder="Enter Project Name"
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

                    <View className="mb-5">
                        <View className="flex-row items-center justify-between">
                            <View>
                                <Text className="text-[12px] text-gray-500 mb-1">
                                    Staff only channel
                                </Text>
                                <Text className="text-[10px] text-gray-400">
                                    Toggle on if this project should be
                                    restricted to staff.
                                </Text>
                            </View>
                            <Switch
                                value={isStaff}
                                onValueChange={setIsStaff}
                                trackColor={{
                                    false: "#d1d5db",
                                    true: "#4C5FAB",
                                }}
                                ios_backgroundColor="#d1d5db"
                            />
                        </View>
                    </View>

                    <View className="flex-row gap-3">
                        <Field label="Project Code" className="flex-1">
                            <View className="relative">
                                <TextInput
                                    placeholder="Auto-generated"
                                    placeholderTextColor="#9CA3AF"
                                    value={code}
                                    onChangeText={setCode}
                                    editable={false}
                                    selectTextOnFocus={false}
                                    className="bg-gray-200 rounded-2xl px-4 py-4 pr-24 font-kumbh text-text opacity-90"
                                    autoCapitalize="characters"
                                />
                                <Pressable
                                    onPress={onGenerateCode}
                                    disabled={creating}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-2 rounded-xl bg-primary-50 border border-primary-100"
                                >
                                    <Text className="font-kumbhBold text-primary-700">
                                        Generate
                                    </Text>
                                </Pressable>
                            </View>
                        </Field>
                    </View>

                    <HexButton
                        title={creating ? "Creating..." : "Create Project"}
                        onPress={onCreate}
                        disabled={creating}
                    />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
