import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
    tray?: React.ReactNode;
    composer: React.ReactNode;
    isAdmin: boolean;
};
export default function BottomStack({
    tray,
    composer,
    isAdmin = false,
}: Props) {
    const { bottom } = useSafeAreaInsets();

    void isAdmin;

    return (
        <View style={{ minHeight: 60 }} pointerEvents="box-none">
            {tray ? <View pointerEvents="auto">{tray}</View> : null}
            <View
                style={{
                    paddingBottom: 0,
                }}
                pointerEvents="auto"
            >
                {composer}
            </View>
        </View>
    );
}
