import { selectUser } from "@/redux/user/user.slice";
import { useAppSelector } from "@/store/hooks";
import { isAdminLikeRole } from "@/utils/roles";
import { useRouter } from "expo-router";
import { ChevronLeft, Clipboard, Cloud } from "lucide-react-native";
import React from "react";
import { Platform, Pressable, Text, View } from "react-native";

type Props = {
    title: string;
    subtitle: string;
    // avatar: string;
    onPress: () => void;
    onTaskOpen: () => void;
    channelId?: string;
};

export default function ChatHeader({
    title,
    subtitle,
    onPress,
    onTaskOpen,
    channelId,
}: Props) {
    const router = useRouter();
    const me = useAppSelector(selectUser);
    const backPath = isAdminLikeRole(me?.role)
        ? "/(admin)"
        : me?.role === "client"
          ? "/(client)/(tabs)"
          : "/(staff)/(tabs)";
    const cut = (s: string, n = 24) =>
        s?.length > n ? s.slice(0, n - 1) + "…" : s;

    return (
        <View
            style={{ marginTop: Platform.select({ android: 10, ios: 0 }) }}
            className="px-5 pt-2 pb-3 bg-white"
        >
            <View className="flex-row items-center justify-between">
                {/* LEFT */}
                <View className="flex-row items-center flex-1">
                    <Pressable
                        onPress={() => router.push({ pathname: backPath })}
                        className="h-10 w-10 mr-2 rounded-2xl items-center justify-center"
                    >
                        <ChevronLeft size={24} color="#111827" />
                    </Pressable>

                    <Pressable
                        onPress={() =>
                            router.push({
                                pathname:
                                    "/(staff)/channels/[channelId]/members",
                                params: { channelId: channelId as any },
                            })
                        }
                        style={{ flex: 1 }} // key: constrain width
                    >
                        <View style={{ flexShrink: 1 }}>
                            <Text
                                style={{ flexShrink: 1 }}
                                className="font-kumbh text-[20px] text-gray-900"
                                numberOfLines={1}
                                ellipsizeMode="tail"
                            >
                                {cut(title, 20)}
                            </Text>

                            <Text
                                style={{ flexShrink: 1 }}
                                className="text-[12px] text-gray-500 font-kumbh"
                                numberOfLines={1}
                                ellipsizeMode="tail"
                            >
                                {cut(subtitle, 30)}
                            </Text>
                        </View>
                    </Pressable>
                </View>

                {/* RIGHT */}
                <View className="flex-row items-center gap-4">
                    <Pressable
                        onPress={onTaskOpen}
                        className="rounded-2xl flex-col items-center justify-center"
                    >
                        <Clipboard size={22} color="#111827" />
                        <Text className="text-sm font-kumbh">Tasks</Text>
                    </Pressable>

                    <Pressable
                        onPress={onPress}
                        className="rounded-2xl flex-col items-center justify-center"
                    >
                        <Cloud size={22} color="#111827" />
                        <Text className="text-sm font-kumbh">Resources</Text>
                    </Pressable>
                </View>
            </View>

            <View className="mt-3 h-[1px] bg-gray-200/70" />
        </View>
    );
}
