import DatePickerModal from "@/components/admin/DatePickerModal";
import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import { CustomTextInput } from "@/components/ui/CustomInput";
import { showError, showSuccess } from "@/components/ui/toast";
import clsx from "clsx";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Calendar } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    selectFinanceCreating,
    selectFinanceFilters,
    selectFinanceRecords,
    selectFinanceUpdating,
} from "@/redux/finance/finance.selectors";
import {
    createFinanceRecord,
    fetchFinance,
    updateFinanceRecord,
} from "@/redux/finance/finance.thunks";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

function toISO(dmy: string) {
    const m = dmy.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return dmy;
    const [_, dd, mm, yyyy] = m;
    // Return just the date; time will be added by caller
    return `${yyyy}-${mm}-${dd}`;
}
function fmtDMY(d: Date) {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

export default function FinanceForm() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const params = useLocalSearchParams<{ recordId?: string }>();
    const records = useAppSelector(selectFinanceRecords);
    const filters = useAppSelector(selectFinanceFilters);
    const creating = useAppSelector(selectFinanceCreating);
    const updating = useAppSelector(selectFinanceUpdating);
    const isIOS = Platform.OS === "ios";

    // Determine if we're editing
    const recordId = params?.recordId;
    const isEditing = !!recordId;
    const currentRecord = records?.find((r) => r._id === recordId);

    const [amount, setAmount] = useState("");
    const [date, setDate] = useState("");
    const [desc, setDesc] = useState("");

    const [showPicker, setShowPicker] = useState(false);
    const [pickerDate, setPickerDate] = useState<Date>(new Date());

    // Initialize form with record data if editing
    useEffect(() => {
        if (isEditing && currentRecord) {
            setAmount(String(currentRecord.amount));
            setDesc(currentRecord.description || "");

            // Parse date from ISO format to DMY
            const recordDate = new Date(currentRecord.date);
            setDate(fmtDMY(recordDate));
        }
    }, [isEditing, currentRecord]);

    const openPicker = () => {
        const m = date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (m) {
            setPickerDate(new Date(+m[3], +m[2] - 1, +m[1]));
        } else {
            setPickerDate(new Date());
        }
        setShowPicker(true);
    };

    // Use custom DatePickerModal: onDateChange updates draft, onDone commits

    const onSave = async () => {
        const amt = Number(String(amount).replace(/[^\d.]/g, ""));
        if (!Number.isFinite(amt) || amt <= 0)
            return showError("Enter a valid amount.");
        if (!date) return showError("Pick a date.");
        if (desc === "") return showError("Description field cannot be empty!");

        try {
            // Get current time and combine with selected date
            const now = new Date();
            const hh = String(now.getHours()).padStart(2, "0");
            const mm = String(now.getMinutes()).padStart(2, "0");
            const ss = String(now.getSeconds()).padStart(2, "0");
            const dateWithTime = `${toISO(date)}T${hh}:${mm}:${ss}`;

            if (isEditing && recordId) {
                // Update existing record
                await dispatch(
                    updateFinanceRecord({
                        recordId,
                        body: {
                            type: "expense",
                            amount: amt,
                            description: desc.trim() || undefined,
                            date: dateWithTime,
                        },
                    }),
                ).unwrap();

                showSuccess("Finance record updated.");
            } else {
                // Create new record
                await dispatch(
                    createFinanceRecord({
                        type: "expense",
                        amount: amt,
                        description: desc.trim() || undefined,
                        date: dateWithTime,
                    }),
                ).unwrap();
                showSuccess("Finance record added.");
            }

            // Refetch to get updated data
            await dispatch(
                fetchFinance({
                    ...filters,
                    type: "expense",
                } as any),
            );
            router.back();
        } catch (e: any) {
            showError(e?.message || "Failed to save record");
        }
    };

    return (
        <SafeAreaView
            className="flex-1 bg-[#F5F7FB]"
            edges={
                isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]
            }
        >
            {/* Header */}
            <PlatformAdaptiveHeader
                title={isEditing ? "Edit Expense" : "Record Expense"}
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
                    className="flex-1"
                    contentContainerClassName="px-4 pb-12 pt-3"
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Amount + Date */}
                    <View className="flex-row gap-3 mb-4">
                        <View className="flex-1">
                            <Text className="mb-2 text-sm text-[#374151] font-kumbhBold">
                                Amount
                            </Text>
                            <View className="h-14 flex-row items-center rounded-2xl border border-gray-200 bg-white px-4">
                                <Text className="font-kumbhBold text-[15px] text-[#6B7280] mr-1.5">
                                    ₦
                                </Text>
                                <CustomTextInput
                                    value={amount}
                                    onChangeText={setAmount}
                                    placeholder="0.00"
                                    keyboardType="numeric"
                                    className="flex-1 h-full"
                                />
                            </View>
                        </View>

                        <View className="flex-1">
                            <Text className="mb-2 text-sm text-[#374151] font-kumbhBold">
                                Date
                            </Text>
                            <Pressable
                                onPress={openPicker}
                                className="h-14 rounded-2xl border border-gray-200 bg-white px-4 flex-row items-center justify-between"
                            >
                                <Text
                                    className={clsx(
                                        "font-kumbh text-[15px]",
                                        date
                                            ? "text-[#111827]"
                                            : "text-[#9CA3AF]",
                                    )}
                                >
                                    {date || "DD/MM/YYYY"}
                                </Text>
                                <Calendar size={18} color="#4C5FAB" />
                            </Pressable>
                        </View>
                    </View>

                    {/* Description */}
                    <View className="mb-6">
                        <Text className="mb-2 text-sm text-[#374151] font-kumbhBold">
                            Description
                        </Text>
                        <View className="rounded-2xl border border-gray-200 bg-white px-4 py-3.5">
                            <CustomTextInput
                                value={desc}
                                onChangeText={setDesc}
                                placeholder="Enter Description"
                                multiline
                                textAlignVertical="top"
                                style={{ minHeight: 112 }}
                            />
                        </View>
                    </View>

                    <Pressable
                        onPress={onSave}
                        disabled={creating || updating}
                        className={clsx(
                            "h-14 rounded-2xl items-center justify-center active:opacity-90",
                            creating || updating
                                ? "bg-gray-300"
                                : "bg-[#4C5FAB]",
                        )}
                    >
                        <Text className="text-white text-[15px] font-kumbhBold">
                            {creating || updating
                                ? "Saving…"
                                : isEditing
                                  ? "Update Record"
                                  : "Save Expense"}
                        </Text>
                    </Pressable>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Custom Date Picker Modal */}
            <DatePickerModal
                visible={showPicker}
                value={pickerDate}
                onCancel={() => setShowPicker(false)}
                onDone={(selectedDate) => {
                    setShowPicker(false);
                    const finalDate = selectedDate instanceof Date ? selectedDate : pickerDate;
                    setDate(fmtDMY(finalDate));
                }}
                onDateChange={(d: Date) => {
                    setPickerDate(d);
                }}
            />
        </SafeAreaView>
    );
}
