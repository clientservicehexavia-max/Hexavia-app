import { useRouter } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";

interface ChannelCardItem {
    id: string;
    title: string;
    subtitle: string;
    logo?: string;
    color: string;
    code: string;
}

type Props = {
    item: ChannelCardItem;
    width: number;
    gap: number;
    isMember?: boolean;
    onJoin?: (code: string) => void;
};

function ChannelCard({ item, width, gap, isMember = true, onJoin }: Props) {
    const router = useRouter();

    const handlePress = () => {
        const channelId = item.id ?? (item as any)?._id;
        if (!channelId) return;
        router.push({
            pathname: "/(staff)/(tabs)/chats/[channelId]" as any,
            params: { channelId: String(channelId) },
        });
    };

    return (
        <Pressable onPress={handlePress} style={{ width, marginRight: gap }}>
            <View
                className="rounded-xl p-4"
                style={{
                    backgroundColor: item.color,
                    height: 130,
                    justifyContent: "space-between",
                }}
            >
                <View className="flex-row justify-between">
                    <Text
                        className="text-white text-lg font-kumbhBold"
                        numberOfLines={1}
                    >
                        {item.title}
                    </Text>
                    {/* <View className="size-16 rounded-full overflow-hidden border border-white/40">
            {item.logo ? (
              <Image source={{ uri: item.logo }} className="h-full w-full" />
            ) : (
              <View className="h-full w-full bg-white/30" />
            )}
          </View> */}
                </View>

                {/* Bottom (no member avatars to keep it clean & light) */}
                <View className="mt-4 flex-row justify-between items-center">
                    <Text
                        className="text-white/90 flex-1 leading-5 text-[11px] font-kumbh"
                        numberOfLines={2}
                    >
                        {item.subtitle}
                    </Text>
                    <View className="ml-2">
                        <Text className="text-white/90 font-kumbh text-[12px]">
                            Code: {item.code}
                        </Text>
                    </View>
                </View>
            </View>
        </Pressable>
    );
}

export default React.memo(ChannelCard);
