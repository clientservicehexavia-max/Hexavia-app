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
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";

function InfoRow({
    icon,
    label,
    value,
    withBorder = true,
}: {
    icon: React.ComponentProps<typeof Ionicons>["name"];
    label: string;
    value?: string | null;
    withBorder?: boolean;
}) {
    return (
        <View
            className={`flex-row items-center justify-between px-5 py-4 ${
                withBorder ? "border-b border-gray-100" : ""
            }`}
        >
            <View className="flex-row items-center">
                <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <Ionicons name={icon} size={17} color="#4C5FAB" />
                </View>
                <Text className="font-kumbh text-sm text-gray-600">
                    {label}
                </Text>
            </View>
            <View className="ml-4 flex-row items-center gap-2">
                <Text className="max-w-[185px] text-right font-kumbhBold text-sm text-gray-900">
                    {value || "-"}
                </Text>
            </View>
        </View>
    );
}

export default function Profile() {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const user = useSelector(selectUser);
    const phase = useSelector(selectPhase);

    const [refreshing, setRefreshing] = useState(false);
    const [pending, setPending] = useState<any | null>(null);

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

    const avatarUri = user?.profilePicture || undefined;
    const role = user?.role ?? "";
    const channel =
        (user as any)?.channel?.name ||
        (user as any)?.channelName ||
        (user as any)?.channel ||
        "";

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

    const onLogOut = useCallback(() => {
        Alert.alert("Logout", "Are you sure you want to logout?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Logout",
                style: "destructive",
                onPress: logoutHandler,
            },
        ]);
    }, [logoutHandler]);

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

    const topCard = useMemo(() => {
        return (
            <View
                className="mx-4 mt-4 rounded-[28px] border border-gray-100 bg-white px-5 py-5"
                style={{ elevation: 1 }}
            >
                <View className="flex-row items-center">
                    <View className="relative mr-4">
                        <View className="h-[84px] w-[84px] overflow-hidden rounded-full bg-gray-100">
                            {avatarUri ? (
                                <Image
                                    source={{ uri: avatarUri }}
                                    className="h-[84px] w-[84px]"
                                    resizeMode="cover"
                                />
                            ) : (
                                <Image
                                    source={require("@/assets/images/default.jpg")}
                                    className="h-[84px] w-[84px]"
                                    resizeMode="cover"
                                />
                            )}
                        </View>
                        <View className="absolute bottom-1 right-1 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                    </View>

                    <View className="flex-1">
                        <Text
                            className="font-kumbhBold text-xl text-[#0F172A]"
                            numberOfLines={2}
                        >
                            {user?.fullname || "Unnamed User"}
                        </Text>
                        <Text
                            className="mt-1 font-kumbh text-sm text-gray-500"
                            numberOfLines={1}
                        >
                            @{user?.username || "username"}
                        </Text>

                        <View className="mt-2.5 flex-row items-center gap-2">
                            <View className="flex-row items-center rounded-full border border-primary/15 bg-primary/10 px-3 py-1.5">
                                <Ionicons
                                    name="shield-checkmark"
                                    size={14}
                                    color="#4C5FAB"
                                />
                                <Text className="ml-1.5 font-kumbhBold text-xs text-primary">
                                    {role || "Role"}
                                </Text>
                            </View>

                            {!!channel && (
                                <View className="rounded-full bg-gray-100 px-3 py-1.5">
                                    <Text className="font-kumbh text-xs text-gray-600">
                                        {channel}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>

                <Pressable
                    className="mt-5 flex-row items-center justify-center rounded-2xl bg-primary py-3.5"
                    onPress={() => router.push("/(staff)/profile/edit")}
                >
                    <Ionicons name="create-outline" size={18} color="white" />
                    <Text className="ml-2 font-kumbhBold text-sm text-white">
                        Edit Profile
                    </Text>
                </Pressable>
            </View>
        );
    }, [avatarUri, channel, role, router, user?.fullname, user?.username]);

    return (
        <SafeAreaView className="flex-1 bg-[#F4F5FA]" edges={["top"]}>
            <View className="px-5 pb-1 pt-4">
                <Text className="font-kumbhBold text-3xl text-[#0B1534]">
                    Profile
                </Text>
                <Text className="font-kumbh text-base text-[#667085]">
                    Manage your account
                </Text>
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 20 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                    />
                }
            >
                {topCard}

                {pending && (
                    <View
                        className="mx-4 mt-4 rounded-3xl border border-primary/10 bg-white p-4"
                        style={{ elevation: 1 }}
                    >
                        <View className="flex-row items-center">
                            <View className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                                <Ionicons
                                    name="arrow-up-circle"
                                    size={20}
                                    color="#4C5FAB"
                                />
                            </View>
                            <View className="flex-1">
                                <Text className="font-kumbhBold text-base text-[#111827]">
                                    Update available
                                </Text>
                                <Text className="mt-0.5 font-kumbh text-sm text-[#667085]">
                                    {pending.latestVersion
                                        ? `Version ${pending.latestVersion} is ready.`
                                        : "A new update is available."}
                                </Text>
                            </View>
                            <Pressable
                                onPress={applyPending}
                                className="rounded-xl bg-primary px-4 py-2.5"
                            >
                                <Text className="font-kumbhBold text-sm text-white">
                                    Update
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                )}

                <View className="mt-7 px-4">
                    <Text className="mb-3 font-kumbhBold text-xs uppercase tracking-wider text-[#667085]">
                        Account Details
                    </Text>

                    <View
                        className="overflow-hidden rounded-3xl border border-gray-100 bg-white"
                        style={{ elevation: 1 }}
                    >
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
                            withBorder={false}
                        />
                    </View>
                </View>

                <View
                    className="mx-4 mt-4 rounded-3xl border border-red-100 bg-white"
                    style={{ elevation: 1 }}
                >
                    <Pressable
                        className="flex-row items-center justify-center py-5"
                        onPress={onLogOut}
                    >
                        <Ionicons
                            name="log-out-outline"
                            size={22}
                            color="#E24C4B"
                        />
                        <Text className="ml-3 font-kumbhBold text-lg text-[#E24C4B]">
                            Log Out
                        </Text>
                    </Pressable>
                </View>

                {phase === "loading" && !user && (
                    <View className="mt-12 items-center">
                        <ActivityIndicator size="large" color="#4C5FAB" />
                        <Text className="mt-4 font-kumbh text-sm text-gray-500">
                            Loading profile...
                        </Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
