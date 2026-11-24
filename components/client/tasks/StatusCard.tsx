import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { STATUS_META, StatusKey } from "@/features/staff/types";
import { router } from "expo-router";

type Props = { status: StatusKey };

export default function StatusCard({ status }: Props) {
  const meta = STATUS_META[status];
  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/(client)/tasks/[status]",
          params: { status },
        })
      }
      android_ripple={{ color: "#ffffff30" }}
      className="rounded-[24px] p-5"
      style={{ backgroundColor: meta.bgColor }}
    >
      <View className="flex-row items-start justify-between">
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text className="font-kumbhBold text-white text-[21px] leading-7">
            {meta.title}
          </Text>
          <View
            className="flex-row items-center"
            style={{ gap: 12, marginTop: 16 }}
          >
            <Text className="font-kumbhBold text-white/95 text-[13px]">
              View Tasks
            </Text>
            <View
              className="h-8 w-8 rounded-full items-center justify-center"
              style={{ backgroundColor: meta.arrowBg }}
            >
              <Ionicons name="arrow-forward" size={12} color="#FFFFFF" />
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
