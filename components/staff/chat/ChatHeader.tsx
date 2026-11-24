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
            className="px-5 pt-2 pb-3 bg-[#F5F7FB] border-b border-gray-100"
        >
            <View className="flex-row items-center justify-between">
                {/* LEFT */}
                <View className="flex-row items-center flex-1">
                    <Pressable
                        onPress={() => router.push({ pathname: backPath })}
                        className="h-10 w-10 mr-3 rounded-full bg-white border border-gray-100 items-center justify-center"
                    >
                        <ChevronLeft size={20} color="#111827" />
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
                                className="font-kumbhBold text-[18px] text-[#111827]"
                                numberOfLines={1}
                                ellipsizeMode="tail"
                            >
                                {cut(title, 20)}
                            </Text>

                            <Text
                                style={{ flexShrink: 1 }}
                                className="text-[12px] text-[#6B7280] font-kumbh"
                                numberOfLines={1}
                                ellipsizeMode="tail"
                            >
                                {cut(subtitle, 30)}
                            </Text>
                        </View>
                    </Pressable>
                </View>

                {/* RIGHT */}
                <View className="flex-row items-center gap-2">
                    <Pressable
                        onPress={onTaskOpen}
                        className="h-10 px-3 rounded-full bg-[#EEF2FF] flex-row items-center gap-1.5"
                    >
                        <Clipboard size={16} color="#4C5FAB" />
                        <Text className="text-[12px] font-kumbhBold text-primary">
                            Tasks
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={onPress}
                        className="h-10 px-3 rounded-full bg-white border border-gray-200 flex-row items-center gap-1.5"
                    >
                        <Cloud size={16} color="#111827" />
                        <Text className="text-[12px] font-kumbhBold text-[#111827]">
                            Files
                        </Text>
                    </Pressable>
                </View>
            </View>

            <View className="mt-3 h-[1px] bg-gray-200/70" />
        </View>
    );
}
