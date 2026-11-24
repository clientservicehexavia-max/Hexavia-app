import clsx from "clsx";
import React from "react";
import { Pressable, Text, View, ViewProps } from "react-native";

export default function SectionCard({
    title,
    children,
    onPress,
    noTitle = false,
    className,
}: {
    title?: string;
    children: React.ReactNode;
    onPress?: () => void;
    noTitle?: boolean;
    className?: ViewProps["className"];
}) {
    const Wrapper = onPress ? Pressable : View;
    return (
        <Wrapper
            className={clsx(
                "my-2 rounded-[24px] border border-gray-100 bg-white p-4",
                className,
            )}
            onPress={onPress as any}
        >
            {!noTitle && title ? (
                <Text className="mb-2 font-kumbhBold text-base text-[#111827]">
                    {title}
                </Text>
            ) : null}
            {children}
        </Wrapper>
    );
}
