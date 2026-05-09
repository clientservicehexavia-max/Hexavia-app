import type { ChannelResource } from "@/redux/channels/resources.types";
import { detectCategory, ext } from "@/redux/channels/resources.utils";
import { getMimeFromName } from "@/utils/getMime";
import clsx from "clsx";
import { MoreVertical } from "lucide-react-native";
import React from "react";
import { Image, Pressable, Text, View, ViewStyle } from "react-native";

const icons = {
    image: require("@/assets/images/type-image.png"),
    document: require("@/assets/images/type-pdf.png"),
    audio: require("@/assets/images/type-audio.png"),
    video: require("@/assets/images/type-audio.png"),
    folder: require("@/assets/images/type-folder.png"),
    other: require("@/assets/images/type-folder.png"),
};

export default function ResourceCard({
    item,
    width,
    className,
    selected = false,
    onPress,
    onMenu,
}: {
    item: ChannelResource;
    width?: number;
    className?: string;
    selected?: boolean;
    onPress?: () => void;
    onMenu?: () => void;
}) {
    const cat = detectCategory(item);
    // console.log("ResourceCard", { item, cat });
    const fileExt = (ext(item.name || item.resourceUpload) || "").toUpperCase();
    const rawMime =
        item.mimetype || item.mime || getMimeFromName(item.name || "");
    const imageUri = item.rawFile
        ? `data:${rawMime || "image/*"};base64,${item.rawFile}`
        : item.resourceUpload;
    // console.log(item.resourceUpload)

    return (
        <Pressable
            onPress={onPress}
            className={clsx(
                "rounded-2xl p-3 mb-3 mr-0",
                selected ? "bg-indigo-50" : "bg-white border border-gray-200",
                className,
            )}
            style={
                {
                    shadowColor: "#000",
                    shadowOpacity: 0.04,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 2 },
                } as ViewStyle
            }
        >
            {/* top row */}
            <View className="flex-row items-center justify-between mb-2.5">
                <Image
                    source={icons[cat]}
                    className="w-[22px] h-[22px] rounded-md"
                    resizeMode="contain"
                />
                <Pressable hitSlop={10} onPress={onMenu}>
                    <MoreVertical size={18} color="#111827" />
                </Pressable>
            </View>

            {/* thumbnail */}
            {cat === "image" ? (
                <Image
                    source={{ uri: imageUri }}
                    className="w-full h-24 rounded-xl bg-gray-100"
                    resizeMode="cover"
                />
            ) : (
                <View className="w-full h-24 rounded-xl bg-slate-50 items-center justify-center">
                    <Image
                        source={icons[cat]}
                        className="w-12 h-12"
                        resizeMode="contain"
                    />
                    {fileExt ? (
                        <View className="absolute bottom-2 right-2 bg-gray-900 px-2 py-0.5 rounded-md">
                            <Text className="text-white text-[10px] font-kumbhBold">
                                {fileExt}
                            </Text>
                        </View>
                    ) : null}
                </View>
            )}

            {/* caption */}
            <Text
                numberOfLines={1}
                className="mt-1 text-gray-900 font-kumbh text-sm"
            >
                {item.name || "Untitled"}
            </Text>
            <Text className="mt-1 text-[11px] text-gray-500 font-kumbh">
                {formatCreatedAt((item as any).createdAt)}
            </Text>
        </Pressable>
    );
}

function formatCreatedAt(v?: string | number) {
    if (!v) return "—";
    try {
        const d = new Date(v);
        if (isNaN(d.getTime())) return "—";
        return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
    } catch {
        return "—";
    }
}
