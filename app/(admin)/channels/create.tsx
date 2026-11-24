import { useRouter } from "expo-router";
import {
    FolderKanban,
    Hash,
    RefreshCcw,
    Shield,
} from "lucide-react-native";
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
import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import { CustomTextInput } from "@/components/ui/CustomInput";
import HexButton from "@/components/ui/HexButton";
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
            className="flex-1 bg-[#F5F7FB]"
        >
            <PlatformAdaptiveHeader
                title="Create New Project"
                backgroundColor="#F5F7FB"
            />

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
                    showsVerticalScrollIndicator={false}
                    contentContainerClassName="px-4 pt-3 pb-12"
                    keyboardShouldPersistTaps="handled"
                >
                    {!!error && (
                        <View className="mb-4 rounded-2xl bg-red-50 border border-red-100 px-4 py-3">
                            <Text className="text-red-700 text-xs font-kumbh">
                                {error}
                            </Text>
                        </View>
                    )}

                    <Field label="Name of Project">
                        <View className="h-14 flex-row items-center rounded-2xl border border-gray-200 bg-white px-4">
                            <FolderKanban size={18} color="#6B7280" />
                            <CustomTextInput
                                placeholder="Enter Project Name"
                                value={name}
                                onChangeText={setName}
                                autoCapitalize="words"
                                className="flex-1 h-full ml-3"
                            />
                        </View>
                    </Field>

                    <Field label="Description">
                        <View className="rounded-2xl border border-gray-200 bg-white px-4 py-3.5">
                            <CustomTextInput
                                placeholder="Enter Description"
                                value={desc}
                                onChangeText={setDesc}
                                multiline
                                textAlignVertical="top"
                                style={{ minHeight: 96 }}
                            />
                        </View>
                    </Field>

                    <View className="mb-4 flex-row items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3.5">
                        <View className="flex-1 flex-row items-center gap-3">
                            <View className="h-10 w-10 rounded-xl bg-[#EEF2FF] items-center justify-center">
                                <Shield size={18} color="#4C5FAB" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-[14px] font-kumbhBold text-[#111827]">
                                    Staff only channel
                                </Text>
                                <Text className="mt-0.5 text-[12px] leading-[16px] font-kumbh text-[#6B7280]">
                                    Toggle on if this project should be
                                    restricted to staff.
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={isStaff}
                            onValueChange={setIsStaff}
                            trackColor={{
                                false: "#D1D5DB",
                                true: "#4C5FAB",
                            }}
                            thumbColor="#FFFFFF"
                            ios_backgroundColor="#D1D5DB"
                        />
                    </View>

                    <Field label="Project Code" className="mb-6">
                        <View className="flex-row items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3">
                            <View className="flex-1 flex-row items-center gap-3">
                                <View className="h-10 w-10 rounded-xl bg-[#EEF2FF] items-center justify-center">
                                    <Hash size={18} color="#4C5FAB" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-[11px] font-kumbh text-[#6B7280]">
                                        Auto-generated code
                                    </Text>
                                    <TextInput
                                        placeholder="Auto-generated"
                                        placeholderTextColor="#9CA3AF"
                                        value={code}
                                        onChangeText={setCode}
                                        editable={false}
                                        selectTextOnFocus={false}
                                        autoCapitalize="characters"
                                        className="mt-0.5 p-0 font-kumbhBold text-[16px] tracking-widest text-[#111827]"
                                    />
                                </View>
                            </View>
                            <Pressable
                                onPress={onGenerateCode}
                                disabled={creating}
                                hitSlop={6}
                                className="flex-row items-center gap-1.5 rounded-xl bg-[#EEF2FF] px-3.5 py-2.5 active:opacity-80"
                            >
                                <RefreshCcw size={14} color="#4C5FAB" />
                                <Text className="text-[13px] font-kumbhBold text-primary">
                                    Generate
                                </Text>
                            </Pressable>
                        </View>
                    </Field>

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
