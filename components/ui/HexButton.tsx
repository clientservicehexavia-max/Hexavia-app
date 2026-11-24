import React from "react";
import { Pressable, Text } from "react-native";

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
};

export default function HexButton({ title, onPress, disabled }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`py-4 rounded-2xl items-center justify-center ${
        disabled ? "bg-gray-200" : "bg-primary active:opacity-90"
      }`}
    >
      <Text
        className={`text-base font-kumbhBold ${
          disabled ? "text-gray-400" : "text-white"
        }`}
      >
        {title}
      </Text>
    </Pressable>
  );
}
