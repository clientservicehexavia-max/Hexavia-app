import { logout } from "@/redux/auth/auth.slice";
import { resetChat } from "@/redux/chat/chat.slice";
import { selectPhase, selectUser } from "@/redux/user/user.slice";
import { fetchProfile, updateProfile } from "@/redux/user/user.thunks";
import { clearPendingUpdate, getPendingUpdate } from "@/storage/appUpdate";
import { clearToken, clearUser } from "@/storage/auth";
import { useAppDispatch } from "@/store/hooks";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useRouter } from "expo-router";
import * as Updates from "expo-updates";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Linking,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    View,
} from "react-native";
import { useSelector } from "react-redux";

function initialsOf(name?: string) {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "U";
}

function InfoRow({
    icon,
    label,
    value,
}: {
    icon: React.ComponentProps<typeof Ionicons>["name"];
    label: string;
    value?: string | null;
}) {
    return (
        <View className="flex-row items-center justify-between rounded-2xl bg-white/70 px-4 py-3 mb-3">
            <View className="flex-row items-center">
                <View className="mr-3 rounded-2xl bg-primary/10 p-2">
                    <Ionicons name={icon} size={18} color="#4C5FAB" />
                </View>
                <Text className="text-gray-500 font-kumbh">{label}</Text>
            </View>
            <Text className="ml-4 max-w-[58%] text-right text-sm text-gray-900 font-kumbh">
                {value || "—"}
            </Text>
        </View>
    );
}

export default function Profile() {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const user = useSelector(selectUser);
    const phase = useSelector(selectPhase);
    const [refreshing, setRefreshing] = useState(false);
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await dispatch(fetchProfile());
        setRefreshing(false);
    }, [dispatch]);
    useFocusEffect(
        useCallback(() => {
            if (!user) dispatch(fetchProfile());
        }, [dispatch, user]),
    );
    const avatarUri = user?.profilePicture || undefined;
    const logoutHandler = useCallback(async () => {
        try {
            await dispatch(
                updateProfile({ expoPushToken: null, silent: true }),
            );
        } catch {}
        dispatch(logout());
        dispatch({ type: "chat/disconnect" });
        dispatch(resetChat());
        clearToken();
        clearUser();
        router.replace("/(auth)/login");
    }, [dispatch, router]);
    const role = user?.role ?? "";
    const channel =
        (user as any)?.channel?.name ||
        (user as any)?.channelName ||
        (user as any)?.channel ||
        "";

    const onLogOut = () => {
        Alert.alert("Logout", "Are you sure you want to logout?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Logout",
                style: "destructive",
                onPress: logoutHandler,
            },
        ]);
    };

    const topCard = useMemo(() => {
        return (
            <View
                className="relative z-30 mx-4 mt-10 rounded-3xl bg-white p-4 shadow-lg"
                style={{ elevation: 12 }}
            >
                <View className="flex-row items-center">
                    <View className="h-20 w-20 rounded-2xl bg-gray-100 overflow-hidden mr-4 items-center justify-center">
                        {avatarUri ? (
                            <Image
                                source={{ uri: avatarUri }}
                                className="h-20 w-20"
                                resizeMode="cover"
                            />
                        ) : (
                            <Image
                                source={{
                                    uri: "https://png.pngtree.com/png-vector/20220709/ourmid/pngtree-businessman-user-avatar-wearing-suit-with-red-tie-png-image_5809521.png",
                                }}
                                className="h-20 w-20"
                                resizeMode="cover"
                            />
                        )}
                    </View>
                    <View className="flex-1">
                        <Text
                            className="text-xl font-kumbhBold text-gray-900"
                            numberOfLines={1}
                        >
                            {user?.fullname || "Unnamed User"}
                        </Text>
                        <Text
                            className="mt-1 font-kumbh text-gray-500"
                            numberOfLines={1}
                        >
                            @{user?.username || "username"} • {role || "Role"}
                        </Text>
                        {!!channel && (
                            <View className="mt-2 self-start rounded-xl bg-primary/10 px-2.5 py-1">
                                <Text className="text-xs font-kumbhBold text-primary">
                                    Channel: {channel}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
                <View className="mt-4 flex-row">
                    <Pressable
                        className="flex-1 mr-2 items-center justify-center rounded-2xl bg-primary px-4 py-3"
                        onPress={() => router.push("/(admin)/profile/edit")}
                    >
                        <Text className="font-kumbhBold text-white">
                            Edit Profile
                        </Text>
                    </Pressable>
                    <Pressable
                        className="flex-1 ml-2 items-center justify-center rounded-2xl bg-red-500 px-4 py-3"
                        onPress={onLogOut}
                    >
                        <Text className="font-kumbhBold text-white">
                            Log Out
                        </Text>
                    </Pressable>
                </View>
            </View>
        );
    }, [
        avatarUri,
        channel,
        logoutHandler,
        role,
        router,
        user?.fullname,
        user?.username,
    ]);

    const [pending, setPending] = useState<any | null>(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            const p = await getPendingUpdate();
            if (!mounted) return;
            setPending(p);
        })();
        return () => {
            mounted = false;
        };
    }, []);

    const applyPending = useCallback(async () => {
        if (!pending) return;
        try {
            if (
                pending.ota &&
                Updates?.fetchUpdateAsync &&
                Updates?.reloadAsync
            ) {
                await Updates.fetchUpdateAsync();
                try {
                    await clearPendingUpdate();
                } catch {}
                setPending(null);
                await Updates.reloadAsync();
                return;
            }
            if (pending.storeUrl) {
                const can = await Linking.canOpenURL(pending.storeUrl);
                if (can) {
                    await Linking.openURL(pending.storeUrl);
                    try {
                        await clearPendingUpdate();
                    } catch {}
                    setPending(null);
                }
            }
        } catch {}
    }, [pending]);

    return (
        <View className="flex-1 bg-gray-50">
            {/* <StatusBar style="light" /> */}
            {/* Header */}
            <View className="relative z-0 h-40 w-full bg-primary rounded-b-[28px] px-5 pt-20 flex-row items-center gap-2">
                <Pressable className="" onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color="white" />
                </Pressable>
                <View>
                    <Text className="text-white font-kumbhBold text-2xl">
                        Profile
                    </Text>
                    <Text className="text-white/80 font-kumbh mt-1">
                        Manage your account
                    </Text>
                </View>
            </View>

            {/* Body */}
            <ScrollView
                className="flex-1 "
                contentContainerStyle={{ paddingTop: 0, paddingBottom: 28 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                    />
                }
            >
                {topCard}

                {pending && (
                    <View className="mx-4 mt-4 rounded-2xl bg-yellow-50 p-4">
                        <Text className="font-kumbhBold text-sm text-yellow-800">
                            App update available
                        </Text>
                        <Text className="mt-1 text-sm text-yellow-700">
                            {pending.latestVersion
                                ? `Version: ${pending.latestVersion}`
                                : "A new update is available."}
                        </Text>
                        <View className="mt-3 flex-row justify-end">
                            <Pressable
                                onPress={applyPending}
                                className="rounded-xl bg-yellow-600 px-3 py-2"
                            >
                                <Text className="text-sm font-kumbhBold text-white">
                                    Update
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                )}

                {/* Details */}
                <View className="mt-5 px-4">
                    <Text className="mb-3 text-gray-800 font-kumbhBold">
                        Account Details
                    </Text>

                    <InfoRow
                        icon="person"
                        label="Full name"
                        value={user?.fullname || ""}
                    />
                    <InfoRow
                        icon="at"
                        label="Username"
                        value={user?.username || ""}
                    />
                    <InfoRow
                        icon="mail"
                        label="Email"
                        value={user?.email || ""}
                    />
                    <InfoRow
                        icon="call"
                        label="Phone"
                        value={
                            (user as any)?.phoneNumber ||
                            (user as any)?.phone ||
                            ""
                        }
                    />
                    <InfoRow icon="people" label="Role" value={role} />
                </View>

                {/* Loading state overlay if first load */}
                {phase === "loading" && !user && (
                    <View className="mt-8 items-center">
                        <ActivityIndicator />
                        <Text className="mt-2 text-gray-500 font-kumbh">
                            Loading profile…
                        </Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
