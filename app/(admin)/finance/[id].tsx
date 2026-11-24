// app/(admin)/finance/[id].tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowUpRight, Edit2, Trash2 } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Platform,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// Removed unused print/share/file helpers (printing handled in installments)

import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import { showError, showSuccess } from "@/components/ui/toast";
import {
    selectFinanceDeletingId,
    selectFinanceFilters,
    selectFinanceListLoading,
    selectFinanceRecords,
} from "@/redux/finance/finance.selectors";
import {
    deleteFinanceRecord,
    fetchFinance,
} from "@/redux/finance/finance.thunks";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const NGN = (n: number) =>
    new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
    }).format(n);

const dmy = (iso?: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
};

// Printing/invoice helpers removed — invoices are generated from the
// installments flow (`app/(admin)/clients/installments.tsx`).

export default function FinanceDetail() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const isIOS = Platform.OS === "ios";
    const [isDeleting, setIsDeleting] = useState(false);

    const dispatch = useAppDispatch();
    const loading = useAppSelector(selectFinanceListLoading);
    const filters = useAppSelector(selectFinanceFilters);
    const records = useAppSelector(selectFinanceRecords);
    const deletingId = useAppSelector(selectFinanceDeletingId);

    // Find the finance record by id
    const row = useMemo(() => records.find((r) => r._id === id), [records, id]);

    // If record not present, fetch the list with current filters
    useEffect(() => {
        if (!row && !loading) {
            const params = {
                ...filters,
                page: filters.page ?? 1,
                limit: filters.limit ?? 50,
            };
            dispatch(fetchFinance(params as any) as any);
        }
    }, [row, loading, filters, dispatch]);

    const amountStr = NGN(row?.amount ?? 0);
    const dateStr = dmy(row?.date);
    const descStr = String(row?.description ?? "");

    // Print functionality removed — kept UI focused on expense actions.

    const handleDelete = () => {
        Alert.alert(
            "Delete Expense",
            `Are you sure you want to delete this expense of ${amountStr}? This action cannot be undone.`,
            [
                { text: "Cancel", onPress: () => {}, style: "cancel" },
                {
                    text: "Delete",
                    onPress: async () => {
                        try {
                            setIsDeleting(true);
                            await dispatch(deleteFinanceRecord(id!)).unwrap();
                            showSuccess("Expense deleted successfully.");

                            await dispatch(
                                fetchFinance({
                                    ...filters,
                                    type: "expense",
                                } as any),
                            );
                            router.back();
                        } catch (e: any) {
                            showError(e?.message || "Failed to delete expense");
                        } finally {
                            setIsDeleting(false);
                        }
                    },
                    style: "destructive",
                },
            ],
        );
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
                title="Expense Details"
                backgroundColor="#F5F7FB"
                headerRight={() => (
                    <View className="flex-row items-center gap-2">
                        <Pressable
                            onPress={() =>
                                router.push({
                                    pathname: "/(admin)/finance/form",
                                    params: { recordId: id },
                                })
                            }
                            hitSlop={8}
                            className="w-9 h-9 rounded-full bg-white border border-gray-200 items-center justify-center"
                            accessibilityLabel="Edit expense"
                        >
                            <Edit2 size={16} color="#4C5FAB" />
                        </Pressable>
                        <Pressable
                            onPress={handleDelete}
                            disabled={isDeleting || deletingId === id}
                            hitSlop={8}
                            className="w-9 h-9 rounded-full items-center justify-center bg-red-50 border border-red-100"
                            accessibilityLabel="Delete expense"
                        >
                            <Trash2 size={16} color="#DC2626" />
                        </Pressable>
                    </View>
                )}
            />

            {loading && !row ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator color="#4C5FAB" />
                    <Text className="mt-2.5 text-[#6B7280] font-kumbh">
                        Loading expense…
                    </Text>
                </View>
            ) : !row ? (
                <View className="flex-1 items-center justify-center px-6">
                    <View className="w-full rounded-[28px] bg-white border border-gray-100 px-6 py-12 items-center">
                        <Text className="text-center text-[#111827] font-kumbhBold text-base">
                            Record not found
                        </Text>
                        <Text className="mt-1 text-center text-[#6B7280] font-kumbh text-sm">
                            This expense record may have been removed.
                        </Text>
                    </View>
                </View>
            ) : (
                <ScrollView
                    className="flex-1"
                    contentContainerClassName="px-4 pt-3 pb-10"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Top card */}
                    <View className="rounded-[28px] bg-white border border-gray-100 px-5 py-7 items-center mb-4">
                        <View className="h-12 w-12 rounded-2xl bg-rose-50 items-center justify-center mb-3">
                            <ArrowUpRight size={22} color="#E11D48" />
                        </View>
                        <View className="rounded-full bg-rose-50 border border-rose-100 px-3 py-1 mb-2.5">
                            <Text className="text-[11px] tracking-wider text-rose-700 font-kumbhBold">
                                EXPENSE
                            </Text>
                        </View>
                        <Text className="text-[28px] font-kumbhBold text-[#111827]">
                            {amountStr}
                        </Text>
                    </View>

                    {/* Details panel */}
                    <View className="rounded-[28px] bg-white border border-gray-100 px-5 py-2">
                        <KV label="Amount" value={amountStr} />
                        <KV label="Date" value={dateStr} />
                        <KV label="Description" value={descStr || "—"} isLast />
                    </View>
                </ScrollView>
            )}

            {/* Bottom buttons */}
            <View className="px-4 pb-5 pt-2 flex-row items-center gap-3">
                <Pressable
                    onPress={() => router.replace("/(admin)")}
                    className="flex-1 h-14 rounded-2xl bg-[#4C5FAB] items-center justify-center active:opacity-90"
                >
                    <Text className="text-white text-[15px] font-kumbhBold">
                        Back to Home
                    </Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

function KV({
    label,
    value,
    isLast = false,
}: {
    label: string;
    value: string;
    isLast?: boolean;
}) {
    return (
        <View
            className={`flex-row items-start justify-between py-3.5 gap-8 ${
                isLast ? "" : "border-b border-gray-100"
            }`}
        >
            <Text className="text-[13px] text-[#6B7280] font-kumbh shrink-0">
                {label}
            </Text>
            <Text className="flex-1 text-right text-[14px] font-kumbhBold text-[#111827]">
                {value}
            </Text>
        </View>
    );
}
