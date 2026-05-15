// app/_layout.tsx
import { persistor, store, type RootState } from "@/store";
import { useFonts } from "expo-font";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Platform, View } from "react-native";
import { Provider } from "react-redux";

import { attachStore } from "@/api/axios";
import AppUpdatePrompt from "@/components/common/AppUpdatePrompt";
import { TasksProvider } from "@/features/staff/tasksStore";
import Toast from "react-native-toast-message";
import "../global.css";

import { TOAST_TOP_OFFSET, toastConfig } from "@/components/ui/toast";
import { setPushToken } from "@/redux/auth/auth.slice";
import { getActiveChannelId } from "@/storage/auth";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { getExpoPushToken } from "@/utils/pushToken";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { PersistGate } from "redux-persist/integration/react";

SplashScreen.preventAutoHideAsync();
attachStore(store);

/** Global handler (safe at module scope) */
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

if (Platform.OS === "android") {
    Notifications.setNotificationChannelAsync("default", {
        name: "Hexavia",
        importance: Notifications.AndroidImportance.MAX,
        sound: "default",
        enableVibrate: true,
        lockscreenVisibility:
            Notifications.AndroidNotificationVisibility.PUBLIC,
    });
}

const PENDING_CHANNEL_KEY = "PENDING_CHANNEL_ID";

/** Unify chat path by role → always navigates to channels route */
const chatPathForRole = (role?: string | null | undefined) =>
    role === "client"
        ? "/(client)/(tabs)/chats/[channelId]"
        : role === "staff"
          ? "/(staff)/(tabs)/chats/[channelId]"
          : "/(admin)/chats/[channelId]";

/** Role-specific channel list route (for proper back navigation history) */
const channelListPathForRole = (role?: string | null | undefined) =>
    role === "client"
        ? "/(client)/channels"
        : role === "staff"
          ? "/(staff)/channels"
          : "/(admin)/channels";

export default function RootLayout() {
    const [fontsLoaded] = useFonts({
        "KumbhSans-Regular": require("../assets/fonts/KumbhSans-Regular.ttf"),
        "KumbhSans-Light": require("../assets/fonts/KumbhSans-Light.ttf"),
        "KumbhSans-Bold": require("../assets/fonts/KumbhSans-Bold.ttf"),
    });

    useEffect(() => {
        if (fontsLoaded) SplashScreen.hideAsync();
    }, [fontsLoaded]);

    if (!fontsLoaded) return null;

    return (
        <>
            <Provider store={store}>
                <PersistGate loading={null} persistor={persistor}>
                    <TasksProvider>
                        <AppFrame />
                    </TasksProvider>
                </PersistGate>
            </Provider>
            <Toast
                config={toastConfig}
                position="top"
                topOffset={TOAST_TOP_OFFSET}
                visibilityTime={4000}
            />
        </>
    );
}

function AppFrame() {
    const role = useAppSelector((s: RootState) => s.auth.user?.role);
    const phase = useAppSelector((s: RootState) => s.auth.phase);
    const meId = useAppSelector(
        (s: RootState) =>
            String(
                (s.auth.user as any)?._id ?? (s.user.user as any)?._id ?? "",
            ) || null,
    );

    const dispatch = useAppDispatch();

    useEffect(() => {
        (async () => {
            try {
                const tok = await getExpoPushToken();

                dispatch(setPushToken(tok));
            } catch {
                dispatch(setPushToken(null));
            }
        })();
    }, [dispatch]);

    useEffect(() => {
        if (phase !== "authenticated" || !meId) return;

        dispatch({ type: "chat/connect", payload: { meId } });

        return () => {
            dispatch({ type: "chat/disconnect" });
        };
    }, [dispatch, meId, phase]);

    useEffect(() => {
        const handleNotificationResponse = async (
            response: Notifications.NotificationResponse,
        ) => {
            const data = response.notification.request.content.data ?? {};
            const channelId = data?.channelId as string | undefined;
            const kind = data?.kind as string | undefined;
            const activeChannelId = await getActiveChannelId();

            if (kind === "finance") {
                router.push("/(admin)/finance");
                return;
            }

            if (kind === "channel") {
                if (!channelId) return;

                if (phase !== "authenticated") {
                    await AsyncStorage.setItem(PENDING_CHANNEL_KEY, channelId);
                    return;
                }

                if (activeChannelId === channelId) {
                    return;
                }

                // Push channel list first, then channel detail,
                // so back navigation returns to a valid list screen.
                router.dismissAll();
                router.replace("/(admin)/(tabs)/project");
                setTimeout(() => {
                    router.push({
                        pathname: chatPathForRole(role),
                        params: { channelId },
                    } as any);
                }, 0);
            }
        };

        const sub = Notifications.addNotificationResponseReceivedListener(
            handleNotificationResponse,
        );

        Notifications.getLastNotificationResponseAsync().then((response) => {
            if (response) {
                void handleNotificationResponse(response);
            }
        });

        return () => sub.remove();
    }, [role, phase]);

    return (
        <View style={{ flex: 1 }}>
            {/* <Slot /> */}
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: "#F3F4F6" }, // tailwind background
                    animation: "ios_from_right",
                }}
            />
            <AppUpdatePrompt />
        </View>
    );
}
