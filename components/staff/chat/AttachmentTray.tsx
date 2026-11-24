import type { AttachmentKind } from "@/types/chat";
import {
    Camera,
    FileAudio,
    FileText,
    Image as ImageIcon,
} from "lucide-react-native";
import React from "react";
import { Pressable, Text, View } from "react-native";

const items: { key: AttachmentKind; label: string; Icon: any }[] = [
    { key: "gallery", label: "Gallery", Icon: ImageIcon },
    { key: "audio", label: "Audio", Icon: FileAudio },
    { key: "camera", label: "Camera", Icon: Camera },
    { key: "document", label: "Document", Icon: FileText },
];

export default function AttachmentTray({
    onPick,
}: {
    onPick: (kind: AttachmentKind) => void;
}) {
    return (
        <View className="mx-3 mb-2 px-4 pt-4 pb-3 rounded-[24px] bg-white border border-gray-100">
            <View className="flex-row items-center justify-between mb-2">
                {items.map(({ key, label, Icon }) => (
                    <Pressable
                        key={key}
                        onPress={() => onPick(key)}
                        className="items-center justify-center flex-1"
                    >
                        <View className="h-14 w-14 rounded-2xl bg-[#EEF2FF] items-center justify-center mb-1.5">
                            <Icon size={21} color="#4C5FAB" />
                        </View>
                        <Text className="font-kumbhBold text-[#374151] text-[12px]">
                            {label}
                        </Text>
                    </Pressable>
                ))}
            </View>
            <Text className="font-kumbh text-[11px] text-[#9CA3AF] mt-1 text-center">
                Share a photo, video, audio, or file.
            </Text>
        </View>
    );
}
