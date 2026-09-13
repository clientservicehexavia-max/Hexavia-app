// app/(admin)/team/[id]/edit.tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import DatePickerModal from "@/components/admin/DatePickerModal";
import Field from "@/components/admin/Field";
import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import HexButton from "@/components/ui/HexButton";
import { showError } from "@/components/ui/toast";
import { selectAdminUsers } from "@/redux/admin/admin.slice";
import { updateAdminUser } from "@/redux/admin/admin.thunks";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { birthdayInputFromDate, birthdayPickerDate } from "@/utils/birthday";
import { CalendarDays } from "lucide-react-native";

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

    return (
        <SafeAreaView
            edges={
                isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]
            }
            className="flex-1 bg-white px-4"
        >
            <PlatformAdaptiveHeader title="Edit Team Member" />

            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.select({
                    ios: "padding",
                    android: "height",
                })}
            >
                <ScrollView
                    className="flex-1"
                    contentContainerClassName="pb-10 pt-4"
                    keyboardShouldPersistTaps="handled"
                >
                    <Field label="Full name">
                        <TextInput
                            placeholder="Enter full name"
                            placeholderTextColor="#9CA3AF"
                            value={fullname}
                            onChangeText={setFullname}
                            className="bg-gray-200 rounded-2xl px-4 py-4 font-kumbh text-text"
                            autoCapitalize="words"
                        />
                    </Field>

                    <Field label="Username">
                        <TextInput
                            placeholder="Enter username"
                            placeholderTextColor="#9CA3AF"
                            value={username}
                            onChangeText={setUsername}
                            className="bg-gray-200 rounded-2xl px-4 py-4 font-kumbh text-text"
                            autoCapitalize="none"
                        />
                    </Field>

                    <Field label="Email">
                        <TextInput
                            placeholder="Enter email"
                            placeholderTextColor="#9CA3AF"
                            value={email}
                            onChangeText={setEmail}
                            className="bg-gray-200 rounded-2xl px-4 py-4 font-kumbh text-text"
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </Field>

                    <Field label="Date of birth">
                        <Pressable
                            onPress={() => setBirthdayPickerVisible(true)}
                            className="flex-row items-center justify-between rounded-2xl bg-gray-200 px-4 py-4"
                        >
                            <Text className="font-kumbh text-text">
                                {dateOfBirth.length === 0
                                    ? "Select date of birth"
                                    : new Date(
                                          dateOfBirth,
                                      ).toLocaleDateString()}
                            </Text>
                            <CalendarDays size={18} color="#6B7280" />
                        </Pressable>
                    </Field>

                    <HexButton title="Save" onPress={onSave} />
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
