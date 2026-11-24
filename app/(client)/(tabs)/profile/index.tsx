import { api } from "@/api/axios";
import CustomTextInput from "@/components/ui/CustomInput";
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
            className={`flex-row items-center justify-between px-4 py-4 ${
                withBorder ? "border-b border-gray-100" : ""
            }`}
        >
            <View className="flex-row items-center">
                <View className="mr-3 h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                    <Ionicons name={icon} size={18} color="#4C5FAB" />
                </View>
                <Text className="font-kumbh text-base text-gray-800">
                    {label}
                </Text>
            </View>
            <Text className="ml-4 max-w-[185px] text-right font-kumbh text-base text-gray-900">
                {value || "—"}
            </Text>
        </View>
    );
}

export default function Profile() {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const user = useSelector(selectUser);
    // console.log(user)

    const phase = useSelector(selectPhase);

    const [refreshing, setRefreshing] = useState(false);

    // delete account modal state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletePassword, setDeletePassword] = useState("");
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
            await dispatch(
                updateProfile({ expoPushToken: null, silent: true }),
            );
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
        setDeletePassword("");
        setShowDeleteModal(true);
    }, []);

    const closeDeleteModal = useCallback(() => {
        if (deleting) return;
        setShowDeleteModal(false);
        setDeletePassword("");
        setDeleteError(null);
    }, [deleting]);

    // 🔥 Call delete-account API here
    const handleConfirmDelete = useCallback(async () => {
        if (!deletePassword.trim()) {
            setDeleteError("Please enter your password.");
            return;
        }

        try {
            setDeleting(true);
            setDeleteError(null);

            await api.delete("/account", {
                data: { password: deletePassword.trim() },
            });

            closeDeleteModal();

            Alert.alert(
                "Account deleted",
                "Your account has been deleted successfully.",
                [
                    {
                        text: "OK",
                        onPress: () => {
                            // reuse same cleanup logic
                            logoutHandler();
                        },
                    },
                ],
            );
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
    }, [deletePassword, closeDeleteModal, logoutHandler]);

    const topCard = useMemo(() => {
        return (
            <View
                className="mx-4 mt-4 rounded-3xl border border-gray-100 bg-white p-5"
                style={{ elevation: 2 }}
            >
                <View className="flex-row items-center">
                    <View className="mr-4 h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-gray-100">
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
                            className="font-kumbhBold text-xl text-gray-900"
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

                        <View className="mt-3 flex-row flex-wrap items-center gap-2">
                            <View className="flex-row items-center rounded-full bg-primary/10 px-3 py-1.5">
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
                    className="mt-5 flex-row items-center justify-center rounded-2xl bg-primary py-3"
                    onPress={() => router.push("/(staff)/profile/edit")}
                >
                    <Ionicons name="create-outline" size={18} color="white" />
                    <Text className="ml-2 font-kumbhBold text-sm text-white">
                        Edit Profile
                    </Text>
                </Pressable>
            </View>
        );
    }, [
        avatarUri,
        channel,
        logoutHandler,
        openDeleteModal,
        role,
        router,
        user?.fullname,
        user?.username,
        deleting,
    ]);

    return (
        <SafeAreaView className="flex-1 bg-[#F5F7FB]" edges={["top"]}>
            <StatusBar style="dark" />
            {/* Header */}
            <View className="px-5 pt-4 pb-1">
                <Text className="font-kumbhBold text-3xl text-[#0B1534]">
                    Profile
                </Text>
                <Text className="font-kumbh text-base text-[#667085]">
                    Manage your account
                </Text>
            </View>

            {/* Body */}
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 24 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                    />
                }
            >
                {topCard}

                {/* Details */}
                <View className="mt-8 px-4">
                    <Text className="mb-3 font-kumbhBold text-xs uppercase tracking-wider text-[#667085]">
                        Account Details
                    </Text>

                    <View
                        className="overflow-hidden rounded-3xl border border-gray-100 bg-white"
                        style={{ elevation: 2 }}
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
                        />
                        <InfoRow
                            icon="people"
                            label="Role"
                            value={role}
                            withBorder={false}
                        />
                    </View>
                </View>

                <View
                    className="mx-4 mt-4 rounded-3xl border border-red-100 bg-white"
                    style={{ elevation: 1 }}
                >
                    <Pressable
                        className="flex-row items-center justify-center py-4"
                        onPress={onLogOut}
                    >
                        <Ionicons
                            name="log-out-outline"
                            size={22}
                            color="#E24C4B"
                        />
                        <Text className="ml-3 font-kumbhBold text-base text-[#E24C4B]">
                            Log Out
                        </Text>
                    </Pressable>
                </View>

                <View
                    className="mx-4 mt-3 rounded-3xl border border-red-100 bg-white"
                    style={{ elevation: 1 }}
                >
                    <Pressable
                        className="flex-row items-center justify-center py-4"
                        onPress={openDeleteModal}
                        disabled={deleting}
                    >
                        <Ionicons
                            name="trash-outline"
                            size={20}
                            color="#DC2626"
                        />
                        <Text className="ml-2.5 font-kumbhBold text-base text-red-600">
                            Delete account
                        </Text>
                    </Pressable>
                </View>

                {/* Loading state overlay if first load */}
                {phase === "loading" && !user && (
                    <View className="mt-10 items-center">
                        <ActivityIndicator size="large" color="#4C5FAB" />
                        <Text className="mt-3 font-kumbh text-sm text-gray-500">
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
                    keyboardVerticalOffset={
                        Platform.select({ ios: 70, android: 0 }) as number
                    }
                >
                    <ScrollView
                        className="flex-1 bg-black/45"
                        contentContainerStyle={{
                            flexGrow: 1,
                            justifyContent: "center",
                            paddingHorizontal: 24,
                        }}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View className="w-full rounded-[28px] border border-gray-100 bg-white p-6">
                            <Text className="mb-1 font-kumbhBold text-lg text-[#111827]">
                                Delete account
                            </Text>
                            <Text className="mb-4 font-kumbh text-sm leading-5 text-gray-500">
                                This action is permanent. Please enter your
                                password to confirm.
                            </Text>

                            <Text className="mb-2 font-kumbhBold text-xs text-gray-700">
                                Password
                            </Text>
                            <View className="h-12 justify-center rounded-2xl border border-gray-200 bg-[#F9FAFB] px-3.5">
                                <CustomTextInput
                                    value={deletePassword}
                                    onChangeText={setDeletePassword}
                                    secureTextEntry
                                    placeholder="Enter your password"
                                    className="h-full w-full text-sm"
                                />
                            </View>

                            {deleteError ? (
                                <Text className="mt-2 font-kumbh text-xs text-red-500">
                                    {deleteError}
                                </Text>
                            ) : null}

                            <View className="mt-5 flex-row justify-end gap-2.5">
                                <Pressable
                                    onPress={closeDeleteModal}
                                    disabled={deleting}
                                    className="rounded-2xl border border-gray-200 bg-[#F5F7FB] px-4 py-2.5"
                                >
                                    <Text className="font-kumbhBold text-sm text-gray-700">
                                        Cancel
                                    </Text>
                                </Pressable>
                                <Pressable
                                    onPress={handleConfirmDelete}
                                    disabled={deleting}
                                    className="flex-row items-center justify-center rounded-2xl bg-red-600 px-4 py-2.5"
                                >
                                    {deleting && (
                                        <ActivityIndicator
                                            size="small"
                                            color="#ffffff"
                                        />
                                    )}
                                    <Text
                                        className={`font-kumbhBold text-sm text-white ${
                                            deleting ? "ml-2" : ""
                                        }`}
                                    >
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
        </SafeAreaView>
    );
}
