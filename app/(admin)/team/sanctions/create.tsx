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
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Field from "@/components/admin/Field";
import OptionSheet from "@/components/common/OptionSheet";
import { CustomTextInput } from "@/components/ui/CustomInput";

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
                    u.role === "supervisor" ||
                    u.role === "clientservice" ||
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
            return (
                selectedRecipientOptions[0]?.label ?? "1 team member selected"
            );
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
            className="flex-1 bg-[#F5F7FB]"
        >
            <PlatformAdaptiveHeader
                title="Add Sanction"
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
                    contentContainerClassName="pt-3 pb-10"
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <Field label="Recipient">
                        <View>
                            <Pressable
                                onPress={() => setShowRecipientSheet(true)}
                                className="h-14 flex-row items-center justify-between rounded-2xl border border-gray-200 bg-white px-4"
                            >
                                <Text
                                    className={`font-kumbh text-[15px] ${
                                        recipientIds.length === 0
                                            ? "text-[#9CA3AF]"
                                            : "text-[#111827]"
                                    }`}
                                >
                                    {recipientLabel}
                                </Text>
                                <ChevronDown size={18} color="#4C5FAB" />
                            </Pressable>

                            {selectedRecipientOptions.length > 0 && (
                                <View className="flex-row flex-wrap gap-2 mt-2.5">
                                    {selectedRecipientOptions.map((option) => (
                                        <View
                                            key={String(option.value)}
                                            className="bg-[#EEF2FF] rounded-full px-3 py-1"
                                        >
                                            <Text className="text-primary text-xs font-kumbhBold">
                                                {option.label}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    </Field>

                    <Field label="Reason">
                        <View className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                            <CustomTextInput
                                placeholder="Enter reason"
                                value={reason}
                                onChangeText={setReason}
                                multiline
                                textAlignVertical="top"
                                style={{ minHeight: 112 }}
                            />
                        </View>
                    </Field>

                    <View className="mt-4 flex-row gap-3">
                        <Pressable
                            onPress={() => router.back()}
                            className="h-14 flex-1 rounded-2xl border border-gray-200 bg-white items-center justify-center"
                        >
                            <Text className="text-[#374151] font-kumbhBold text-[15px]">
                                Cancel
                            </Text>
                        </Pressable>
                        <Pressable
                            onPress={handleSave}
                            className="h-14 flex-1 rounded-2xl bg-primary items-center justify-center active:opacity-90"
                        >
                            <Text className="text-white font-kumbhBold text-[15px]">
                                Save Sanction
                            </Text>
                        </Pressable>
                    </View>
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
