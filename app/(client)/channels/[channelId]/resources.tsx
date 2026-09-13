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
    return <SafeAreaView className="flex-1 bg-white" edges={["top", "left", "right"]}><ScrollView className="px-5" contentContainerStyle={{ paddingBottom: 32 }}><Pressable onPress={() => router.back()} className="mt-4"><Text className="text-[#4C5FAB] font-kumbhBold">← Project</Text></Pressable><View className="mt-5 flex-row items-center justify-between"><Text className="text-3xl text-gray-900 font-kumbh">Files</Text><Pressable onPress={upload} className="rounded-xl bg-[#4C5FAB] px-3 py-2"><Text className="text-white font-kumbhBold">{uploading ? "Uploading…" : "+ Upload"}</Text></Pressable></View><Text className="mt-2 text-gray-500 font-kumbh">Shared project files and deliverables.</Text>{resources.length ? resources.map((resource) => <Pressable key={resource._id} onPress={() => resource.resourceUpload && Linking.openURL(resource.resourceUpload)} className="mt-4 rounded-2xl border border-gray-200 p-4"><Text className="text-gray-900 font-kumbhBold">{resource.name}</Text><Text className="mt-1 text-gray-500 font-kumbh">{resource.description || ""}</Text><Text className="mt-3 text-sm text-[#4C5FAB] font-kumbhBold">Open file →</Text></Pressable>) : <View className="mt-5 rounded-2xl bg-[#F8FAFF] p-5"><Text className="text-gray-500 font-kumbh">No client-visible files yet.</Text></View>}</ScrollView></SafeAreaView>;
}
