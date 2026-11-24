import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/api/axios";
import { showError, showSuccess } from "@/components/ui/toast";
import { selectChannelById } from "@/redux/channels/channels.slice";
import { fetchChannelById } from "@/redux/channels/channels.thunks";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export default function ClientProjectFiles() {
    const { channelId } = useLocalSearchParams<{ channelId: string }>();
    const router = useRouter();
    const dispatch = useAppDispatch();
    const channel = useAppSelector(selectChannelById(channelId || ""));
    const [uploading, setUploading] = useState(false);
    useEffect(() => { if (channelId) dispatch(fetchChannelById(channelId)); }, [channelId, dispatch]);
    const upload = async () => {
        if (!channelId || uploading) return;
        const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
        if (result.canceled || !result.assets?.[0]) return;
        const file = result.assets[0];
        try {
            setUploading(true);
            const form = new FormData();
            form.append("channelId", channelId);
            form.append("name", file.name || "Project file");
            form.append("description", "Uploaded by client");
            form.append("pdfUpload", { uri: file.uri, name: file.name || "project-file", type: file.mimeType || "application/octet-stream" } as any);
            await api.post("/channel/upload-resources", form, { headers: { "Content-Type": "multipart/form-data" }, transformRequest: (value) => value });
            showSuccess("File uploaded");
            dispatch(fetchChannelById(channelId));
        } catch (error: any) { showError(error?.response?.data?.message || "Could not upload file"); }
        finally { setUploading(false); }
    };
    const resources = channel?.resources || [];
    return (
        <SafeAreaView
            className="flex-1 bg-[#F5F7FB]"
            edges={["top", "left", "right"]}
        >
            <ScrollView
                className="px-5"
                contentContainerStyle={{ paddingBottom: 32 }}
            >
                <Pressable onPress={() => router.back()} className="mt-4 self-start px-3 py-1.5 rounded-full bg-white border border-gray-100">
                    <Text className="text-primary font-kumbhBold text-sm">
                        ← Project
                    </Text>
                </Pressable>
                <View className="mt-5 flex-row items-center justify-between">
                    <Text className="text-2xl text-[#111827] font-kumbhBold">
                        Files
                    </Text>
                    <Pressable
                        onPress={upload}
                        className="rounded-full bg-primary px-4 py-2"
                    >
                        <Text className="text-white font-kumbhBold text-sm">
                            {uploading ? "Uploading…" : "+ Upload"}
                        </Text>
                    </Pressable>
                </View>
                <Text className="mt-1.5 text-[#6B7280] font-kumbh text-sm">
                    Shared project files and deliverables.
                </Text>
                {resources.length ? (
                    resources.map((resource) => (
                        <Pressable
                            key={resource._id}
                            onPress={() =>
                                resource.resourceUpload &&
                                Linking.openURL(resource.resourceUpload)
                            }
                            className="mt-3.5 rounded-[24px] bg-white border border-gray-100 p-4"
                        >
                            <Text className="text-[#111827] font-kumbhBold text-[15px]">
                                {resource.name}
                            </Text>
                            {!!resource.description && (
                                <Text className="mt-1 text-[#6B7280] font-kumbh text-sm">
                                    {resource.description}
                                </Text>
                            )}
                            <Text className="mt-3 text-xs text-primary font-kumbhBold">
                                Open file →
                            </Text>
                        </Pressable>
                    ))
                ) : (
                    <View className="mt-5 rounded-[24px] bg-white border border-gray-100 p-6 items-center">
                        <Text className="text-[#6B7280] font-kumbh">
                            No client-visible files yet.
                        </Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
