// app/(admin)/team/[id]/edit.tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Field from "@/components/admin/Field";
import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import HexButton from "@/components/ui/HexButton";
import { showError, showSuccess } from "@/components/ui/toast";
import { selectAdminUsers } from "@/redux/admin/admin.slice";
import { useAppSelector } from "@/store/hooks";

export default function EditStaff() {
    const router = useRouter();
    const isIOS = Platform.OS === "ios";

    const { id } = useLocalSearchParams<{ id: string }>();
    const users = useAppSelector(selectAdminUsers);

    const existing = users.find((u) => u._id === id);
    const [fullname, setFullname] = useState(existing?.fullname ?? "");
    const [username, setUsername] = useState(existing?.username ?? "");
    const [email, setEmail] = useState(existing?.email ?? "");

    useEffect(() => {
        if (existing) {
            setFullname(existing.fullname ?? "");
            setUsername(existing.username ?? "");
            setEmail(existing.email ?? "");
        }
    }, [existing]);

    const onSave = async () => {
        if (!fullname.trim()) return showError("Full name is required");
        if (!email.trim()) return showError("Email is required");
        // TODO: dispatch(updateUser({ userId: id as string, fullname, username, email }))
        showSuccess("Saved (mock)");
        router.back();
    };

    return (
        <SafeAreaView
            edges={
                isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]
            }
            className="flex-1 bg-white px-4"
        >
            <PlatformAdaptiveHeader title="Edit Staff" />

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

                    <HexButton title="Save" onPress={onSave} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
