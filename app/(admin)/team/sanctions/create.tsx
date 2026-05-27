// app/(admin)/team/sanctions/create.tsx
import { useRouter } from "expo-router";
import { ChevronDown } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Field from "@/components/admin/Field";
import OptionSheet from "@/components/common/OptionSheet";

import { selectAdminUsers } from "@/redux/admin/admin.slice";
import { fetchAdminUsers } from "@/redux/admin/admin.thunks";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import { showError, showSuccess } from "@/components/ui/toast";
import { createSanction } from "@/redux/sanctions/sanctions.thunks";

export default function CreateSanction() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const isIOS = Platform.OS === "ios";

    const [showRecipientSheet, setShowRecipientSheet] = useState(false);
    const [recipientIds, setRecipientIds] = useState<string[]>([]);

    // load team members to select recipients
    const allUsers = useAppSelector(selectAdminUsers);
    const staff = useMemo(
        () =>
            allUsers.filter(
                (u) =>
                    u.role === "staff" ||
                    u.role === "admin" ||
                    u.role === "super-admin",
            ),
        [allUsers],
    );

    useEffect(() => {
        if (staff.length === 0) dispatch(fetchAdminUsers());
    }, [dispatch, staff.length]);

    const [reason, setReason] = useState("");
    const recipientOptions = useMemo(
        () =>
            staff.map((u) => ({
                value: u._id,
                label: u.fullname || u.username || u.email || u._id,
            })),
        [staff],
    );

    const selectedRecipientOptions = useMemo(
        () =>
            recipientOptions.filter((option) =>
                recipientIds.includes(String(option.value)),
            ),
        [recipientIds, recipientOptions],
    );

    const recipientLabel = useMemo(() => {
        if (recipientIds.length === 0) return "Select team members";
        if (recipientIds.length === 1) {
            return selectedRecipientOptions[0]?.label ?? "1 team member selected";
        }
        return `${recipientIds.length} team members selected`;
    }, [recipientIds.length, selectedRecipientOptions]);

    const handleSave = async () => {
        if (recipientIds.length === 0) {
            return showError("Select at least one team member to sanction");
        }
        if (!reason.trim()) return showError("Enter a reason");

        const uniqueRecipientIds = Array.from(new Set(recipientIds));
        const payload = {
            reason: reason.trim(),
            type: "warning",
            silent: true as const,
        };

        const results = await Promise.all(
            uniqueRecipientIds.map((userId) =>
                dispatch(
                    createSanction({
                        userId,
                        ...payload,
                    }),
                ),
            ),
        );

        const successCount = results.filter(
            (res) => (res as any)?.meta?.requestStatus === "fulfilled",
        ).length;
        const failureCount = uniqueRecipientIds.length - successCount;

        if (failureCount === 0) {
            showSuccess(
                successCount === 1
                    ? "Sanction created"
                    : `Sanctions created for ${successCount} team members`,
            );
            router.replace("/(admin)/team/sanctions");
            return;
        }

        if (successCount > 0) {
            showError(
                `Created ${successCount} sanction(s), failed for ${failureCount}. Please retry.`,
            );
            return;
        }

        showError("Failed to create sanction");
    };

    return (
        <SafeAreaView
            edges={
                isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]
            }
            className="flex-1 bg-white px-4"
        >
            <PlatformAdaptiveHeader title="Add Sanction" />

            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.select({
                    ios: "padding",
                    android: "height",
                })}
            >
                <ScrollView
                    className="flex-1"
                    contentContainerClassName="pb-10"
                    keyboardShouldPersistTaps="handled"
                >
                    <Field label="Recipient">
                        <View>
                            <Pressable
                                onPress={() => setShowRecipientSheet(true)}
                                className="flex-row items-center justify-between rounded-2xl px-4 py-4 bg-gray-200"
                            >
                                <Text className="text-gray-700 font-kumbh">
                                    {recipientLabel}
                                </Text>
                                <ChevronDown size={18} color="#111827" />
                            </Pressable>

                            {selectedRecipientOptions.length > 0 && (
                                <View className="flex-row flex-wrap gap-2 mt-2">
                                    {selectedRecipientOptions.map((option) => (
                                        <View
                                            key={String(option.value)}
                                            className="bg-primary-50 rounded-full px-3 py-1"
                                        >
                                            <Text className="text-primary-700 text-xs font-kumbh">
                                                {option.label}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    </Field>

                    <Field label="Reason">
                        <TextInput
                            placeholder="Enter reason"
                            placeholderTextColor="#9CA3AF"
                            value={reason}
                            onChangeText={setReason}
                            multiline
                            className="bg-gray-200 rounded-2xl px-4 py-4 min-h-[88px] font-kumbh text-text"
                        />
                    </Field>

                    <Pressable
                        onPress={handleSave}
                        className="mt-6 rounded-2xl bg-primary-500 py-4 items-center active:opacity-90"
                    >
                        <Text className="text-white font-kumbhBold">
                            Save Sanction
                        </Text>
                    </Pressable>
                </ScrollView>
            </KeyboardAvoidingView>

            <OptionSheet
                visible={showRecipientSheet}
                onClose={() => setShowRecipientSheet(false)}
                title="Select team members"
                options={recipientOptions}
                multiSelect
                searchable
                searchPlaceholder="Search team members by name or email"
                selectedValues={recipientIds}
                onSelectMultiple={(values) =>
                    setRecipientIds(values.map((value) => String(value)))
                }
                applyText="Done"
            />
        </SafeAreaView>
    );
}
