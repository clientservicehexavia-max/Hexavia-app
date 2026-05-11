// app/index.tsx (Splash)
import { bootstrapSession, ensureProfile } from "@/redux/auth/auth.slice";
import { RootState } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, Image, StyleSheet, View } from "react-native";

import { updateProfile } from "@/redux/user/user.thunks";
import { registerPushToken } from "@/utils/pushToken";

const PENDING_CHANNEL_KEY = "PENDING_CHANNEL_ID";

export default function Splash() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { hydrated, phase, user } = useAppSelector((s: RootState) => s.auth);

    const pushRegisteredRef = useRef(false);

    useEffect(() => {
        dispatch(bootstrapSession());
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        if (phase === "authenticated") {
            dispatch(ensureProfile());
        }
    }, [hydrated, phase]);

    useEffect(() => {
        if (phase !== "authenticated" || !user?._id) return;
        if (pushRegisteredRef.current) return;

        (async () => {
            try {
                const token = await registerPushToken();
                if (token) {
                    await dispatch(
                        updateProfile({ expoPushToken: token, silent: true }),
                    );
                }
                pushRegisteredRef.current = true;

                const pendingChannelId =
                    await AsyncStorage.getItem(PENDING_CHANNEL_KEY);
                if (pendingChannelId) {
                    await AsyncStorage.removeItem(PENDING_CHANNEL_KEY);
                    const role = user.role;
                    router.replace({
                        pathname:
                            role === "client"
                                ? "/(client)/(tabs)/chats/[channelId]"
                                : role === "staff"
                                  ? "/(staff)/(tabs)/chats/[channelId]"
                                  : "/(admin)/chats/[channelId]",
                        params: { channelId: pendingChannelId },
                    } as any);
                    return;
                }
            } catch (e) {
                // fail silently
            }
        })();
    }, [phase, user?._id]);

    // your existing role routing after 3s
    useEffect(() => {
        const timer = setTimeout(() => {
            if (!hydrated) return;

            if (phase === "idle") {
                router.replace("/(auth)/login");
            } else if (phase === "onboarding") {
                // user verified email but hasn’t finished last step
                router.replace("/(auth)/create-password");
            } else if (phase === "authenticated") {
                const role = user?.role;
                if (role === "client") router.replace("/(client)/(tabs)");
                else if (role === "staff") router.replace("/(staff)/(tabs)");
                else if (role === "admin") router.replace("/(admin)/(tabs)");
                else if (role === "super-admin")
                    router.replace("/(admin)/(tabs)");
                else router.replace("/(client)/(tabs)"); // default to client
            }
        }, 3000);
        return () => clearTimeout(timer);
    }, [hydrated, phase, user?.role]);

    return (
        <View style={styles.container}>
            <Image
                source={require("../assets/images/logo.png")}
                style={styles.logo}
            />
            <ActivityIndicator
                size="large"
                color="#fff"
                style={{ marginTop: 24 }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#4C5FAB",
        justifyContent: "center",
        alignItems: "center",
    },
    logo: { width: 200, height: 200, resizeMode: "contain" },
});
