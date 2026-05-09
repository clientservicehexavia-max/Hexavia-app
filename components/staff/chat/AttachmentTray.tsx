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
        <View className="mx-3 px-4 pt-4 pb-2 rounded-3xl bg-[#E1E4F6]">
            <View className="flex-row items-center justify-between mb-2">
                {items.map(({ key, label, Icon }) => (
                    <Pressable
                        key={key}
                        onPress={() => onPick(key)}
                        className="items-center justify-center"
                    >
                        <View className="h-14 w-14 rounded-2xl bg-white/40 items-center justify-center mb-2">
                            <Icon size={22} color="#4C5FAB" />
                        </View>
                        <Text className="text-gray-700 text-[12px]">
                            {label}
                        </Text>
                    </Pressable>
                ))}
            </View>
            <Text className="text-[11px] text-gray-400 mt-2 ml-1 text-center">
                Share a photo, video, audio, or file.
            </Text>
        </View>
    );
}
