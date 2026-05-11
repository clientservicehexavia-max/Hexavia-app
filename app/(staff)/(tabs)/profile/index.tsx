import { api } from "@/api/axios";
import { logout } from "@/redux/auth/auth.slice";
import { selectPhase, selectUser } from "@/redux/user/user.slice";
import { fetchProfile, updateProfile } from "@/redux/user/user.thunks";
import { clearToken, clearUser } from "@/storage/auth";
import { useAppDispatch } from "@/store/hooks";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    View,
} from "react-native";
import { useSelector } from "react-redux";

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

    // delete account modal state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

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
            await dispatch(updateProfile({ expoPushToken: null, silent: true }));
        } catch {}
        dispatch(logout());
        clearToken();
        clearUser();
        router.replace("/(auth)/login");
    }, [dispatch, router]);

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

    const role = user?.role ?? "";
    const channel =
        (user as any)?.channel?.name ||
        (user as any)?.channelName ||
        (user as any)?.channel ||
        "";

    const openDeleteModal = useCallback(() => {
        setDeleteError(null);
        setShowDeleteModal(true);
    }, []);

    const closeDeleteModal = useCallback(() => {
        if (deleting) return;
        setShowDeleteModal(false);
        setDeleteError(null);
    }, [deleting]);

    const handleConfirmDelete = useCallback(async () => {
        const userId = (user as any)?._id ?? (user as any)?.id;
        if (!userId) {
            setDeleteError("User ID is missing. Please refresh and try again.");
            return;
        }

        try {
            setDeleting(true);
            setDeleteError(null);

            await api.delete("/account", {
                data: { userId: String(userId) },
            });

            closeDeleteModal();
            logoutHandler();
        } catch (err: any) {
            const message =
                err?.response?.data?.message ||
                err?.response?.data?.error ||
                err?.message ||
                "Something went wrong. Please try again.";
            setDeleteError(message);
        } finally {
            setDeleting(false);
        }
    }, [closeDeleteModal, logoutHandler, user]);

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
                                source={require("@/assets/images/default.jpg")}
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
                        onPress={() => router.push("/(staff)/profile/edit")}
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

    return (
        <View className="flex-1 bg-gray-50">
            <StatusBar style="light" />
            {/* Header */}
            <View className="relative z-0 h-40 w-full bg-primary rounded-b-[28px] px-5 pt-20">
                <Text className="text-white font-kumbhBold text-2xl">
                    Profile
                </Text>
                <Text className="text-white/80 font-kumbh mt-1">
                    Manage your account
                </Text>
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

                <View className="mt-3 items-center px-4">
                    <Pressable
                        className="bg-white w-full py-6 px-4 rounded-lg"
                        onPress={openDeleteModal}
                        disabled={deleting}
                    >
                        <Text className="text-sm font-kumbhBold text-red-600">
                            Delete account
                        </Text>
                    </Pressable>
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

            {/* ⚠️ Delete Account Modal */}
            <Modal
                transparent
                visible={showDeleteModal}
                animationType="fade"
                onRequestClose={closeDeleteModal}
            >
                <KeyboardAvoidingView
                    className="flex-1"
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    keyboardVerticalOffset={24}
                >
                    <ScrollView
                        className="flex-1 bg-black/40"
                        contentContainerStyle={{
                            flexGrow: 1,
                            justifyContent: "center",
                            paddingHorizontal: 24,
                        }}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View className="w-full rounded-3xl bg-white p-5">
                            <Text className="text-lg font-kumbhBold text-gray-900 mb-1">
                                Delete account
                            </Text>
                            <Text className="text-sm font-kumbh text-gray-600 mb-4">
                                This action is permanent. Confirm to delete this
                                account.
                            </Text>

                            {deleteError ? (
                                <Text className="mt-2 text-xs font-kumbh text-red-500">
                                    {deleteError}
                                </Text>
                            ) : null}

                            <View className="mt-5 flex-row justify-end">
                                <Pressable
                                    onPress={closeDeleteModal}
                                    disabled={deleting}
                                    className="mr-3 px-4 py-2 rounded-2xl bg-gray-100"
                                >
                                    <Text className="text-sm font-kumbh text-gray-700">
                                        Cancel
                                    </Text>
                                </Pressable>
                                <Pressable
                                    onPress={handleConfirmDelete}
                                    disabled={deleting}
                                    className="px-4 py-2 rounded-2xl bg-red-500 flex-row items-center justify-center"
                                >
                                    {deleting && (
                                        <ActivityIndicator
                                            size="small"
                                            color="#ffffff"
                                        />
                                    )}
                                    <Text className="ml-2 text-sm font-kumbhBold text-white">
                                        {deleting
                                            ? "Deleting..."
                                            : "Confirm delete"}
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}
