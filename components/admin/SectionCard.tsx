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
            className={clsx("rounded-xl bg-background p-4 my-2", className)}
            onPress={onPress as any}
        >
            {!noTitle && title ? (
                <Text className="text-lg font-kumbhBold text-text mb-2">
                    {title}
                </Text>
            ) : null}
            {children}
        </Wrapper>
    );
}
