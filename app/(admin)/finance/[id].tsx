// app/(admin)/finance/[id].tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Edit2, Trash2 } from "lucide-react-native";
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

const dmy = (iso?: string) =>
    iso
        ? new Date(iso).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "2-digit",
              year: "numeric",
          })
        : "—";

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
            className="flex-1 bg-white"
            edges={isIOS ? ["left", "right"] : ["top", "left", "right"]}
        >
            <StatusBar style="dark" />

            {/* Header */}
            <PlatformAdaptiveHeader
                title="Details"
                headerRight={({ tintColor }) => (
                    <View className="flex-row items-center gap-2">
                        <Pressable
                            onPress={() =>
                                router.push({
                                    pathname: "/(admin)/finance/form",
                                    params: { recordId: id },
                                })
                            }
                            hitSlop={8}
                            className="w-10 h-10 rounded-full items-center justify-center"
                        >
                            <Edit2 size={20} color={tintColor} />
                        </Pressable>
                        <Pressable
                            onPress={handleDelete}
                            disabled={isDeleting || deletingId === id}
                            hitSlop={8}
                            className="w-10 h-10 rounded-full items-center justify-center bg-red-500"
                        >
                            <Trash2 size={20} color="white" />
                        </Pressable>
                    </View>
                )}
            />

            {loading && !row ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator />
                    <Text className="mt-2 text-gray-500 font-kumbh">
                        Loading expense…
                    </Text>
                </View>
            ) : !row ? (
                <View className="flex-1 items-center justify-center px-6">
                    <Text className="text-center text-gray-500 font-kumbh">
                        Record not found.
                    </Text>
                </View>
            ) : (
                <ScrollView
                    className="flex-1"
                    contentContainerClassName="px-5 pb-10"
                >
                    {/* Top card */}
                    <View className="rounded-2xl bg-gray-100 border border-[#4C5FAB]/30 px-4 py-10 items-center my-4">
                        <Text className="text-[26px] font-kumbhBold text-[#111827]">
                            {amountStr}
                        </Text>
                        <Text className="mt-1 text-[12px] tracking-widest text-gray-600 font-kumbhBold">
                            EXPENSE
                        </Text>
                    </View>

                    {/* Details panel */}
                    <View className="rounded-2xl bg-gray-100 px-5 py-6">
                        <KV label="Amount" value={amountStr} />
                        <KV label="Date" value={dateStr} />
                        <KV label="Descriptions" value={descStr} />
                    </View>
                </ScrollView>
            )}

            {/* Bottom buttons */}
            <View className="px-5 pb-6 flex-row flex-wrap items-center justify-between gap-3">
                <Pressable
                    onPress={() =>
                        router.push({
                            pathname: "/(admin)/finance/form",
                            params: { recordId: id },
                        })
                    }
                    className="min-w-[48%] flex-1 h-12 rounded-2xl border border-[#4C5FAB] items-center justify-center flex-row"
                >
                    <View className="w-6 h-6 rounded-full bg-[#4C5FAB]/10 items-center justify-center mr-2">
                        <Edit2 size={16} color="#4C5FAB" />
                    </View>
                    <Text className="text-[#4C5FAB] font-kumbhBold">
                        Edit Expense
                    </Text>
                </Pressable>

                <Pressable
                    onPress={() => router.replace("/(admin)")}
                    className="min-w-[48%] flex-1 h-12 rounded-2xl bg-[#4C5FAB] items-center justify-center"
                >
                    <Text className="text-white font-kumbhBold">
                        Back to Home
                    </Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

function KV({ label, value }: { label: string; value: string }) {
    return (
        <View className="flex-row items-start justify-between py-2 gap-10">
            <Text className="text-[15px] text-gray-500 font-kumbh shrink-0">
                {label}
            </Text>
            <Text className="flex-1 text-right text-[15px] font-kumbhBold text-[#111827]">
                {value}
            </Text>
        </View>
    );
}
