// app/(admin)/team/[id]/edit.tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import DatePickerModal from "@/components/admin/DatePickerModal";
import Field from "@/components/admin/Field";
import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import { CustomTextInput } from "@/components/ui/CustomInput";
import { showError } from "@/components/ui/toast";
import { selectAdminUsers } from "@/redux/admin/admin.slice";
import { updateAdminUser } from "@/redux/admin/admin.thunks";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { birthdayInputFromDate, birthdayPickerDate } from "@/utils/birthday";
import { AtSign, CalendarDays, Mail, User } from "lucide-react-native";

export default function EditStaff() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const isIOS = Platform.OS === "ios";

    const { id } = useLocalSearchParams<{ id: string }>();
    const userId = String(id ?? "");
    const users = useAppSelector(selectAdminUsers);

    const existing = users.find((u) => u._id === userId);
    const [fullname, setFullname] = useState(existing?.fullname ?? "");
    const [username, setUsername] = useState(existing?.username ?? "");
    const [email, setEmail] = useState(existing?.email ?? "");
    const [dateOfBirth, setDateOfBirth] = useState(
        existing?.dateOfBirth ? String(existing.dateOfBirth) : "",
    );
    const [birthdayPickerVisible, setBirthdayPickerVisible] = useState(false);

    useEffect(() => {
        if (existing) {
            setFullname(existing.fullname ?? "");
            setUsername(existing.username ?? "");
            setEmail(existing.email ?? "");
            setDateOfBirth(
                existing.dateOfBirth ? String(existing.dateOfBirth) : "",
            );
        }
    }, [existing]);

    const onSave = async () => {
        if (!fullname.trim()) return showError("Full name is required");
        if (!username.trim()) return showError("Username is required");
        if (!email.trim()) return showError("Email is required");

        try {
            await dispatch(
                updateAdminUser({
                    userId,
                    fullname: fullname.trim(),
                    username: username.trim(),
                    email: email.trim().toLowerCase(),
                    dateOfBirth: dateOfBirth || null,
                }),
            ).unwrap();

            router.back();
        } catch {
            // Toasts are handled by the thunk.
        }
    };

    const avatarUri = getAvatarUri(existing);
    const displayName =
        fullname.trim() ||
        existing?.fullname ||
        existing?.username ||
        existing?.email ||
        "Team Member";

    return (
        <SafeAreaView
            edges={
                isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]
            }
            className="flex-1 bg-[#F5F7FB]"
        >
            <PlatformAdaptiveHeader
                title="Edit Member"
                backgroundColor="#F5F7FB"
            />

            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.select({
                    ios: "padding",
                    android: "height",
                })}
                keyboardVerticalOffset={
                    Platform.select({ ios: 70, android: 0 }) as number
                }
            >
                <ScrollView
                    className="flex-1 px-5"
                    contentContainerClassName="pb-10 pt-3"
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Member Preview Card */}
                    <View className="mb-6 flex-row items-center rounded-[24px] border border-gray-100 bg-white p-4">
                        <EditAvatar uri={avatarUri} name={displayName} />
                        <View className="flex-1">
                            <Text
                                className="font-kumbhBold text-[17px] text-[#111827]"
                                numberOfLines={1}
                            >
                                {displayName}
                            </Text>
                            <Text
                                className="mt-0.5 font-kumbh text-[13px] text-[#6B7280]"
                                numberOfLines={1}
                            >
                                {existing?.email ||
                                    (existing?.username
                                        ? `@${existing.username}`
                                        : "Update member profile details")}
                            </Text>
                        </View>
                        {existing?.role ? (
                            <View className="ml-2 rounded-full bg-[#EEF2FF] px-3 py-1">
                                <Text className="font-kumbhBold text-[11px] text-primary">
                                    {formatRole(existing.role)}
                                </Text>
                            </View>
                        ) : null}
                    </View>

                    {/* Form Fields */}
                    <Field label="Full Name">
                        <View className="h-14 flex-row items-center rounded-2xl border border-gray-200 bg-white px-4">
                            <View className="mr-3">
                                <User size={18} color="#6B7280" />
                            </View>
                            <CustomTextInput
                                placeholder="Enter full name"
                                value={fullname}
                                onChangeText={setFullname}
                                className="h-full flex-1"
                                autoCapitalize="words"
                            />
                        </View>
                    </Field>

                    <Field label="Username">
                        <View className="h-14 flex-row items-center rounded-2xl border border-gray-200 bg-white px-4">
                            <View className="mr-3">
                                <AtSign size={18} color="#6B7280" />
                            </View>
                            <CustomTextInput
                                placeholder="Enter username"
                                value={username}
                                onChangeText={setUsername}
                                className="h-full flex-1"
                                autoCapitalize="none"
                            />
                        </View>
                    </Field>

                    <Field label="Email Address">
                        <View className="h-14 flex-row items-center rounded-2xl border border-gray-200 bg-white px-4">
                            <View className="mr-3">
                                <Mail size={18} color="#6B7280" />
                            </View>
                            <CustomTextInput
                                placeholder="Enter email"
                                value={email}
                                onChangeText={setEmail}
                                className="h-full flex-1"
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>
                    </Field>

                    <Field label="Date of Birth">
                        <Pressable
                            onPress={() => setBirthdayPickerVisible(true)}
                            className="h-14 flex-row items-center justify-between rounded-2xl border border-gray-200 bg-white px-4"
                        >
                            <View className="flex-row items-center">
                                <View className="mr-3">
                                    <CalendarDays size={18} color="#6B7280" />
                                </View>
                                <Text
                                    className={`font-kumbh text-[15px] ${
                                        dateOfBirth.length === 0
                                            ? "text-[#9CA3AF]"
                                            : "text-[#111827]"
                                    }`}
                                >
                                    {dateOfBirth.length === 0
                                        ? "Select date of birth"
                                        : new Date(
                                              dateOfBirth,
                                          ).toLocaleDateString()}
                                </Text>
                            </View>
                            <Text className="font-kumbhBold text-xs text-primary">
                                Change
                            </Text>
                        </Pressable>
                    </Field>

                    {/* Actions */}
                    <View className="mt-4 flex-row gap-3">
                        <Pressable
                            onPress={() => router.back()}
                            className="h-14 flex-1 items-center justify-center rounded-2xl border border-gray-200 bg-white"
                        >
                            <Text className="font-kumbhBold text-[15px] text-[#374151]">
                                Cancel
                            </Text>
                        </Pressable>
                        <Pressable
                            onPress={onSave}
                            className="h-14 flex-1 items-center justify-center rounded-2xl bg-primary"
                        >
                            <Text className="font-kumbhBold text-[15px] text-white">
                                Save Changes
                            </Text>
                        </Pressable>
                    </View>

                    <DatePickerModal
                        visible={birthdayPickerVisible}
                        value={birthdayPickerDate(dateOfBirth || undefined)}
                        maximumDate={new Date()}
                        onCancel={() => setBirthdayPickerVisible(false)}
                        onDone={() => setBirthdayPickerVisible(false)}
                        onDateChange={(date) => {
                            setDateOfBirth(birthdayInputFromDate(date));
                            setBirthdayPickerVisible(false);
                        }}
                    />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

function getAvatarUri(item?: Record<string, any>) {
    if (!item) return undefined;
    const raw =
        item.profilePicture ?? item.avatar ?? item.avatarUrl ?? item.photoUrl;
    if (typeof raw !== "string") return undefined;
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

function getInitials(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function EditAvatar({ uri, name }: { uri?: string; name: string }) {
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        setFailed(false);
    }, [uri]);

    if (uri && !failed) {
        return (
            <Image
                source={{ uri }}
                onError={() => setFailed(true)}
                className="mr-3.5 h-12 w-12 rounded-full bg-[#EEF2FF]"
                resizeMode="cover"
            />
        );
    }

    return (
        <View className="mr-3.5 h-12 w-12 items-center justify-center rounded-full bg-[#EEF2FF]">
            <Text className="font-kumbhBold text-[15px] text-primary">
                {getInitials(name)}
            </Text>
        </View>
    );
}

function formatRole(role: string) {
    const cleaned = role.replace(/[-_]+/g, " ");
    return cleaned
        .split(" ")
        .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
        .join(" ");
}
