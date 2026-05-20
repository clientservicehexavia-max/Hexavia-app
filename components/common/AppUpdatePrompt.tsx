import * as Updates from "expo-updates";
import React, { useCallback, useEffect, useState } from "react";
import { Modal, Platform, Pressable, Text, View } from "react-native";

import { setPendingUpdate } from "@/storage/appUpdate";

export default function AppUpdatePrompt() {
    const [visible, setVisible] = useState(false);
    const [hasUpdate, setHasUpdate] = useState(false);

    // intentionally do not show or persist a semantic app version for OTA
    // updates since OTA updates do not change the app version shown to users.

    useEffect(() => {
        let active = true;

        (async () => {
            try {
                if (Platform.OS === "web" || !Updates.checkForUpdateAsync)
                    return;
                const update = await Updates.checkForUpdateAsync();
                if (!active || !update?.isAvailable) return;
                setHasUpdate(true);
                setVisible(true);
            } catch {
                // ignore
            }
        })();

        return () => {
            active = false;
        };
    }, []);

    const handleDownload = useCallback(async () => {
        try {
            if (
                !Updates.checkForUpdateAsync ||
                !Updates.fetchUpdateAsync ||
                !Updates.reloadAsync
            )
                return;
            const update = await Updates.checkForUpdateAsync();
            if (!update?.isAvailable) return;
            await Updates.fetchUpdateAsync();
            await Updates.reloadAsync();
        } catch {
            // ignore update failures
        }
    }, []);

    const handleDismiss = useCallback(async () => {
        await setPendingUpdate({
            ota: true,
            latestVersion: null,
            storeUrl: null,
            checkedAt: Date.now(),
        });
        setVisible(false);
    }, []);

    if (!hasUpdate || Platform.OS === "web") return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={() => setVisible(false)}
        >
            <View className="flex-1 items-center justify-center bg-black/50 px-6">
                <View className="w-full max-w-sm rounded-3xl bg-white p-6">
                    <Text className="text-lg font-kumbhBold text-gray-900">
                        Update Available
                    </Text>
                    <Text className="mt-2 text-sm text-gray-600">
                        A newer OTA update is available.
                    </Text>
                    <View className="mt-5 flex-row justify-end gap-3">
                        <Pressable
                            onPress={handleDismiss}
                            className="rounded-xl border border-gray-200 px-4 py-2"
                        >
                            <Text className="font-kumbh text-sm text-gray-600">
                                Dismiss
                            </Text>
                        </Pressable>
                        <Pressable
                            onPress={handleDownload}
                            className="rounded-xl bg-primary-500 px-4 py-2"
                        >
                            <Text className="font-kumbhBold text-sm text-white">
                                Download
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
