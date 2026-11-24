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
    if (isMember) {
      router.push({
        pathname: "/(client)/(tabs)/chats/[channelId]" as any,
        params: { channelId: item.id },
      });
    } else if (onJoin) {
      onJoin(item.code);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={{ width, marginRight: gap }}
    >
      <View
        className="justify-between rounded-[24px] p-5"
        style={{
          backgroundColor: item.color,
          height: 200,
        }}
      >
        <View className="flex-row items-start justify-between">
          <Text
            className="flex-1 font-kumbhBold text-lg text-white"
            numberOfLines={2}
          >
            {item.title}
          </Text>
        </View>

        {/* Bottom (no member avatars to keep it clean & light) */}
        <View className="mt-4 flex-row items-end justify-between">
          <Text
            className="mr-2 flex-1 font-kumbh text-xs leading-4 text-white/90"
            numberOfLines={2}
          >
            {item.subtitle}
          </Text>
          <View>
            {isMember ? (
              <View className="rounded-full bg-white/20 px-2.5 py-1">
                <Text className="font-kumbhBold text-[11px] text-white">
                  {item.code}
                </Text>
              </View>
            ) : (
              <View className="rounded-full bg-white px-3.5 py-1.5">
                <Text className="font-kumbhBold text-xs text-[#111827]">
                  Join
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default React.memo(ChannelCard);
