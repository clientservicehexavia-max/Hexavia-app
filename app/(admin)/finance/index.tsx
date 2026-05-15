// app/(admin)/finance/index.tsx
import clsx from "clsx";
import { useRouter } from "expo-router";
import { ArrowDown, ArrowUp, Eye, Plus } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    FlatList,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    SectionList,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppDispatch, useAppSelector } from "@/store/hooks";

/* ───────── Expenses (existing) ───────── */
import {
    selectFinanceFilters,
    selectFinanceListLoading,
    selectFinancePagination,
    selectFinanceRecords,
    selectFinanceSummary,
} from "@/redux/finance/finance.selectors";
import {
    setFinanceFilters,
    setFinancePage,
} from "@/redux/finance/finance.slice";
import { fetchFinance } from "@/redux/finance/finance.thunks";

/* ───────── Clients (for Receivables) ───────── */
import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import { SwipeableTabView } from "@/components/ui/SwipeableTabView";
import { selectClientFilters } from "@/redux/client/client.selectors";
import { fetchClients } from "@/redux/client/client.thunks";

type Flow = "Receivables" | "Expenses";

type Txn = {
    id: string;
    title: "Expense" | "Receive";
    amount: number;
    time: string;
    status: "Successful" | "Pending";
    description: string;
    dir: "up" | "down";
    dateKey: string;
    kind: "expense" | "receivable";
};

const NGN = (n: number) =>
    new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 2,
    }).format(n);

function getOutstandingReceivable(client: any) {
    const summaryOutstanding = Number(
        client?.paymentSummary?.remainingBalance ?? NaN,
    );
    if (Number.isFinite(summaryOutstanding)) {
        return Math.max(summaryOutstanding, 0);
    }

    const payable = Number(client?.payableAmount || 0);
    const paid = Array.isArray(client?.installmentalPayment)
        ? client.installmentalPayment.reduce(
              (sum: number, p: any) => sum + Number(p?.amount || 0),
              0,
          )
        : 0;
    return Math.max(payable - paid, 0);
}

function getTotalPaid(client: any) {
    const summaryTotalPaid = Number(client?.paymentSummary?.totalPaid ?? NaN);
    if (Number.isFinite(summaryTotalPaid)) {
        return Math.max(summaryTotalPaid, 0);
    }

    return Array.isArray(client?.installmentalPayment)
        ? client.installmentalPayment.reduce(
              (sum: number, p: any) => sum + Number(p?.amount || 0),
              0,
          )
        : 0;
}

function buildFilteredReceivables(clients: any[]) {
    return (clients || [])
        .filter((c: any) => getTotalPaid(c) > 0)
        .sort(
            (a: any, b: any) =>
                new Date(b?.createdAt || 0).getTime() -
                new Date(a?.createdAt || 0).getTime(),
        );
}

function formatTime(iso: string) {
    try {
        const d = new Date(iso);
        return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    } catch {
        return "";
    }
}
function isSameYMD(a: Date, b: Date) {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}
function dateBucket(iso?: string) {
    if (!iso) return "";
    const d = new Date(iso);
    const today = new Date();
    const yday = new Date(today);
    yday.setDate(today.getDate() - 1);
    if (isSameYMD(d, today)) return "Today";
    if (isSameYMD(d, yday)) return "Yesterday";
    return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

const ADMIN_FINANCE_PIN = "1473695";

export default function FinanceIndex() {
    const router = useRouter();
    const dispatch = useAppDispatch();

    const [pinLocked, setPinLocked] = useState(true);
    const [pinInput, setPinInput] = useState("");
    const [pinError, setPinError] = useState("");
    const [receivablesPage, setReceivablesPage] = useState(1);
    const [filteredReceivables, setFilteredReceivables] = useState<any[]>([]);
    const RECEIVABLES_LIMIT = 20;

    const handlePinSubmit = () => {
        if (pinInput.trim() === ADMIN_FINANCE_PIN) {
            setPinLocked(false);
            setPinError("");
            setPinInput("");
            return;
        }

        setPinError("Incorrect pin. Please try again.");
    };

    /* Expenses state (existing) */
    const records = useAppSelector(selectFinanceRecords);
    const financePagination = useAppSelector(selectFinancePagination);
    const summary = useAppSelector(selectFinanceSummary);
    const financeLoading = useAppSelector(selectFinanceListLoading);
    const financeFilters = useAppSelector(selectFinanceFilters);

    /* Clients for Receivables (local paged cache) */
    const clientFilters = useAppSelector(selectClientFilters);

    const [clients, setClients] = useState<any[]>([]);
    const [clientsLoading, setClientsLoading] = useState(false);
    const [clientsRefreshing, setClientsRefreshing] = useState(false);

    const [tab, setTab] = useState<Flow>("Receivables");
    const [hidden, setHidden] = useState(false);

    // client picker modal
    const [showClientPicker, setShowClientPicker] = useState(false);
    const [clientSearch, setClientSearch] = useState("");
    const [selectedClientId, setSelectedClientId] = useState<string | null>(
        null,
    );

    /* Totals */
    const total = useMemo(() => {
        if (tab === "Receivables") {
            const sum = (filteredReceivables || []).reduce(
                (acc, c: any) => acc + getTotalPaid(c),
                0,
            );
            return sum;
        }
        // Expenses: keep your existing summary behavior
        return summary?.totalExpenses || 0;
    }, [summary, tab, filteredReceivables]);

    /* Section builder */
    const sections = useMemo(() => {
        if (tab === "Receivables") {
            const txns: Txn[] = (clients || []).map((c: any) => ({
                id: c._id,
                title: "Receive",
                amount: getTotalPaid(c),
                time: formatTime(c?.createdAt || ""),
                description: String(c?.name || "Unnamed client"),
                status: "Pending",
                dir: "down",
                dateKey: dateBucket(c?.createdAt || ""),
                kind: "receivable", // <- new
            }));

            const map = new Map<string, Txn[]>();
            txns.forEach((t) => {
                const key = t.dateKey || "—";
                if (!map.has(key)) map.set(key, []);
                map.get(key)!.push(t);
            });

            return Array.from(map.entries()).map(([title, data]) => ({
                title,
                data,
            }));
        }

        // Expenses
        const txns: Txn[] = (records || [])
            .filter((r) => r.type === "expense")
            .sort(
                (a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime(),
            )
            .map((r) => ({
                id: r._id,
                title: "Expense",
                amount: r.amount,
                time: formatTime(r.date),
                description: String(r.description ?? ""), // <- force string
                status: "Successful",
                dir: "up",
                dateKey: dateBucket(r.date),
                kind: "expense", // <- new
            }));

        const map = new Map<string, Txn[]>();
        txns.forEach((t) => {
            if (!map.has(t.dateKey)) map.set(t.dateKey, []);
            map.get(t.dateKey)!.push(t);
        });

        return Array.from(map.entries()).map(([title, data]) => ({
            title,
            data,
        }));
    }, [tab, clients, records]);

    const fetchAndPaginateReceivables = useCallback(
        async (asRefresh = false) => {
            if (asRefresh) setClientsRefreshing(true);
            setClientsLoading(true);

            try {
                // 1) Fetch all clients (probe count, then bulk fetch)
                const probe = await dispatch(
                    fetchClients({
                        page: 1,
                        limit: 1,
                        sortOrder: clientFilters?.sortOrder ?? "desc",
                    }) as any,
                ).unwrap();

                const totalClients =
                    Number(probe?.pagination?.totalClients || 0) ||
                    (probe?.clients?.length ?? 0);

                const payload = await dispatch(
                    fetchClients({
                        page: 1,
                        limit: Math.max(totalClients, 1),
                        sortOrder: clientFilters?.sortOrder ?? "desc",
                    }) as any,
                ).unwrap();

                const all = payload?.clients ?? [];
                const filtered = buildFilteredReceivables(all);

                // Keep full filtered set and show first local page
                const visible = filtered.slice(0, RECEIVABLES_LIMIT);

                setFilteredReceivables(filtered);
                setReceivablesPage(1);
                setClients(visible);
            } catch {
                // swallow here: global error handling remains in redux slices/toasts
            } finally {
                setClientsLoading(false);
                setClientsRefreshing(false);
            }
        },
        [dispatch, clientFilters?.sortOrder],
    );

    /* First load + tab switching */
    useEffect(() => {
        if (pinLocked) return;

        if (tab === "Receivables") {
            fetchAndPaginateReceivables(false);
        } else {
            // fetch expenses (first page)
            dispatch(
                setFinanceFilters({
                    type: "expense",
                    page: 1,
                    limit: 20,
                }),
            );
            dispatch(
                fetchFinance({
                    type: "expense",
                    page: 1,
                    limit: 20,
                }) as any,
            );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab, dispatch, pinLocked, fetchAndPaginateReceivables]);

    useEffect(() => {
        if (!showClientPicker) return;
        if ((clients?.length ?? 0) === 0) {
            fetchAndPaginateReceivables(false);
        }
    }, [showClientPicker, clients?.length, fetchAndPaginateReceivables]);

    /* Refresh */
    const onRefresh = useCallback(() => {
        if (pinLocked) return;

        if (tab === "Receivables") {
            if (clientsLoading) return;
            fetchAndPaginateReceivables(true);
        } else {
            if (financeLoading) return;
            dispatch(setFinancePage(1));
            dispatch(
                fetchFinance({
                    ...financeFilters,
                    type: "expense",
                    page: 1,
                }) as any,
            );
        }
    }, [
        tab,
        clientsLoading,
        financeLoading,
        financeFilters,
        dispatch,
        pinLocked,
        fetchAndPaginateReceivables,
    ]);

    /* Infinite load */
    const loadMore = useCallback(() => {
        if (pinLocked) return;

        if (tab === "Receivables") {
            // Reveal next local page (21-40, 41-60...) from cached filtered list
            if (clientsLoading) return;
            if ((clients?.length ?? 0) >= (filteredReceivables?.length ?? 0))
                return;

            const nextPage = receivablesPage + 1;
            const nextVisible = (filteredReceivables || []).slice(
                0,
                nextPage * RECEIVABLES_LIMIT,
            );
            setReceivablesPage(nextPage);
            setClients(nextVisible);
            return;
        }

        // Expenses load more
        if (financeLoading || !financePagination) return;
        const { currentPage, totalPages } = financePagination;
        if (currentPage >= totalPages) return;
        const next = currentPage + 1;
        dispatch(setFinancePage(next));
        dispatch(
            fetchFinance({
                ...financeFilters,
                type: "expense",
                page: next,
            }) as any,
        );
    }, [
        tab,
        clients,
        clientsLoading,
        filteredReceivables,
        receivablesPage,
        financeLoading,
        financePagination,
        financeFilters,
        dispatch,
        pinLocked,
        fetchAndPaginateReceivables,
    ]);

    const refreshing =
        tab === "Receivables"
            ? clientsRefreshing ||
              (clientsLoading && (clients?.length ?? 0) === 0)
            : financeLoading && financeFilters.page === 1;

    const canLoadMore =
        tab === "Expenses" &&
        !!financePagination &&
        financePagination.currentPage < financePagination.totalPages;

    const isLoadingMore =
        financeLoading &&
        tab === "Expenses" &&
        (records?.length ?? 0) > 0 &&
        canLoadMore;

    const isIOS = Platform.OS === "ios";

    return (
        <SafeAreaView
            edges={
                isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]
            }
            className="flex-1 bg-white"
        >
            <Modal
                visible={pinLocked}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={() => {}}
            >
                <View className="flex-1 bg-black/70 px-5 justify-center">
                    <View className="bg-white rounded-3xl p-6 shadow-lg shadow-black/30">
                        <Text className="text-xl font-kumbhBold text-[#111827] mb-1">
                            Finance Access
                        </Text>
                        <Text className="text-sm text-gray-500 font-kumbh mb-4">
                            Enter the secret admin pin to continue.
                        </Text>

                        <View className="rounded-2xl border border-gray-200 ios:px-4 android:px-2 ios:py-3 mb-2">
                            <TextInput
                                value={pinInput}
                                onChangeText={(text) =>
                                    setPinInput(text.replace(/\s+/g, ""))
                                }
                                placeholder="Enter Pin"
                                placeholderTextColor="#9CA3AF"
                                keyboardType="number-pad"
                                maxLength={7}
                                secureTextEntry
                                className="font-kumbh text-base text-[#111827]"
                                autoFocus
                            />
                        </View>
                        {pinError ? (
                            <Text className="text-sm text-red-500 font-kumbh mb-3">
                                {pinError}
                            </Text>
                        ) : (
                            <Text className="text-xs text-gray-400 font-kumbh mb-3">
                                Pin is 7 digits long.
                            </Text>
                        )}

                        <Pressable
                            onPress={handlePinSubmit}
                            disabled={!pinInput}
                            className={clsx(
                                "h-12 rounded-2xl items-center justify-center",
                                pinInput
                                    ? "bg-[#4C5FAB] active:opacity-90"
                                    : "bg-gray-300",
                            )}
                        >
                            <Text className="text-white font-kumbhBold">
                                Unlock Finance
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={() => router.back()}
                            className="h-12 rounded-2xl items-center justify-center mt-3 border border-gray-200 active:opacity-90"
                        >
                            <Text className="text-[#111827] font-kumbh">
                                Go Back
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            {/* Header */}
            <PlatformAdaptiveHeader title="Finance" />

            {/* Total card */}
            <View className="px-5 mt-2">
                <View className="rounded-[28px] bg-primary-500 px-6 py-7">
                    <View className="flex-row items-center justify-center gap-2">
                        <Text className="text-white/90 font-kumbh">
                            Total Amount
                        </Text>
                        <Pressable
                            onPress={() => setHidden((s) => !s)}
                            className="opacity-90"
                        >
                            <Eye size={18} color="white" />
                        </Pressable>
                    </View>
                    <Text className="mt-3 text-white text-4xl font-kumbhBold text-center tracking-wide">
                        {hidden ? "••••••••" : NGN(total).replace("NGN", "₦")}
                    </Text>
                    <Text className="mt-2 text-white/90 font-kumbh text-center">
                        {tab.toUpperCase()}
                    </Text>
                </View>
            </View>

            {/* Tabs with content */}
            <SwipeableTabView
                navigationState={{
                    index: tab === "Receivables" ? 0 : 1,
                    routes: [
                        { key: "receivables", title: "Receivables" },
                        { key: "expenses", title: "Expenses" },
                    ],
                }}
                onIndexChange={(index) =>
                    setTab(index === 0 ? "Receivables" : "Expenses")
                }
                renderScene={() => (
                    <View className="flex-1 pt-2">
                        <SectionList
                            sections={sections}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={{ paddingBottom: 24 }}
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshing}
                                    onRefresh={onRefresh}
                                    tintColor="#4C5FAB"
                                />
                            }
                            onEndReachedThreshold={0.2}
                            onEndReached={loadMore}
                            renderSectionHeader={({ section: { title } }) => (
                                <Text className="px-5 py-3 text-gray-500 font-kumbh">
                                    {title}
                                </Text>
                            )}
                            ItemSeparatorComponent={() => (
                                <View className="h-[1px] bg-gray-200 ml-[76px]" />
                            )}
                            renderItem={({ item }) => (
                                <TxnRow
                                    item={item}
                                    onPress={() =>
                                        item.kind === "expense"
                                            ? router.push(
                                                  `/(admin)/finance/${item.id}`,
                                              )
                                            : router.push({
                                                  pathname:
                                                      "/(admin)/clients/installments",
                                                  params: {
                                                      clientId: item.id,
                                                  },
                                              })
                                    }
                                />
                            )}
                            ListFooterComponent={
                                isLoadingMore ? (
                                    <Text className="text-center text-gray-400 font-kumbh my-3">
                                        Loading more…
                                    </Text>
                                ) : null
                            }
                            stickySectionHeadersEnabled
                        />
                    </View>
                )}
                tabBarProps={{
                    activeColor: "#4C5FAB",
                    inactiveColor: "#6B7280",
                }}
            />

            {/* Floating button */}
            <Pressable
                onPress={() => {
                    if (tab === "Receivables") {
                        // ensure we have clients ready when opening the modal
                        if (!clients || clients.length === 0) {
                            fetchAndPaginateReceivables(false);
                        }
                        setClientSearch("");
                        setSelectedClientId(null);
                        setShowClientPicker(true);
                    } else {
                        router.push("/(admin)/finance/form");
                    }
                }}
                className="absolute right-5 bottom-10 px-4 h-12 rounded-2xl bg-[#4C5FAB] flex-row items-center"
                style={{ paddingHorizontal: 16 }}
            >
                <View className="w-6 h-6 rounded-full bg-white/15 items-center justify-center mr-2">
                    <Plus size={16} color="#fff" />
                </View>
                <Text className="text-white font-kumbhBold">
                    {tab === "Expenses"
                        ? "Record Expense"
                        : "Record Receivable"}
                </Text>
            </Pressable>

            {/* ───────── Client Picker Modal ───────── */}
            <Modal
                visible={showClientPicker}
                transparent
                animationType="slide"
                onRequestClose={() => setShowClientPicker(false)}
            >
                <View className="flex-1 bg-black/40 justify-end">
                    <View className="bg-white rounded-t-3xl px-5 pt-5 pb-6">
                        <View className="items-center mb-3">
                            <View className="w-16 h-1.5 rounded-full bg-gray-300" />
                        </View>

                        <Text className="text-xl font-kumbhBold text-[#111827] mb-1">
                            Record Receivable
                        </Text>
                        <Text className="text-gray-500 font-kumbh mb-4">
                            Select the client to create/install an installment
                            plan for.
                        </Text>

                        {/* Search */}
                        <View className="rounded-2xl border border-gray-200 px-4 py-3 mb-3">
                            <TextInput
                                placeholder="Search clients by name…"
                                placeholderTextColor="#9CA3AF"
                                value={clientSearch}
                                onChangeText={setClientSearch}
                                className="font-kumbh text-[#111827]"
                            />
                        </View>

                        {/* Client list */}
                        <View className="max-h-[50vh]">
                            <FlatList
                                data={(clients || []).filter((c: any) =>
                                    String(c?.name || "")
                                        .toLowerCase()
                                        .includes(clientSearch.toLowerCase()),
                                )}
                                keyExtractor={(c: any) => c._id}
                                ListEmptyComponent={
                                    <Text className="text-center text-gray-400 font-kumbh py-6">
                                        {clientsLoading
                                            ? "Loading clients…"
                                            : "No clients found"}
                                    </Text>
                                }
                                ItemSeparatorComponent={() => (
                                    <View className="h-[1px] bg-gray-100 mx-1" />
                                )}
                                renderItem={({ item: c }: any) => {
                                    const isSelected =
                                        selectedClientId === c._id;
                                    return (
                                        <Pressable
                                            onPress={() =>
                                                setSelectedClientId(
                                                    isSelected ? null : c._id,
                                                )
                                            }
                                            className="py-3 flex-row items-center justify-between"
                                        >
                                            <View
                                                style={{
                                                    flex: 1,
                                                    paddingRight: 12,
                                                }}
                                            >
                                                <Text
                                                    className={clsx(
                                                        "font-kumbh text-[16px]",
                                                        isSelected
                                                            ? "text-[#4C5FAB]"
                                                            : "text-[#111827]",
                                                    )}
                                                    numberOfLines={1}
                                                >
                                                    {c?.name ||
                                                        "Unnamed client"}
                                                </Text>
                                                <Text className="font-kumbh text-[12px] text-gray-500 mt-1">
                                                    Receivable:{" "}
                                                    {new Intl.NumberFormat(
                                                        "en-NG",
                                                        {
                                                            style: "currency",
                                                            currency: "NGN",
                                                            maximumFractionDigits: 0,
                                                        },
                                                    ).format(
                                                        Number(
                                                            c?.payableAmount ||
                                                                0,
                                                        ),
                                                    )}
                                                </Text>
                                            </View>
                                            <View
                                                className={clsx(
                                                    "w-5 h-5 rounded-full border items-center justify-center",
                                                    isSelected
                                                        ? "bg-[#4C5FAB] border-[#4C5FAB]"
                                                        : "border-gray-300",
                                                )}
                                            >
                                                {isSelected ? (
                                                    <View className="w-2.5 h-2.5 rounded-full bg-white" />
                                                ) : null}
                                            </View>
                                        </Pressable>
                                    );
                                }}
                            />
                        </View>

                        {/* Actions */}
                        <View className="flex-row mt-5" style={{ gap: 12 }}>
                            <Pressable
                                onPress={() => setShowClientPicker(false)}
                                className="flex-1 h-12 rounded-2xl border border-gray-300 items-center justify-center active:opacity-90"
                            >
                                <Text className="font-kumbh text-[#111827]">
                                    Cancel
                                </Text>
                            </Pressable>

                            <Pressable
                                disabled={!selectedClientId}
                                onPress={() => {
                                    if (!selectedClientId) return;
                                    setShowClientPicker(false);
                                    router.push({
                                        pathname:
                                            "/(admin)/clients/installments",
                                        params: { clientId: selectedClientId },
                                    });
                                }}
                                className={clsx(
                                    "flex-1 h-12 rounded-2xl items-center justify-center active:opacity-90",
                                    selectedClientId
                                        ? "bg-[#4C5FAB]"
                                        : "bg-gray-300",
                                )}
                            >
                                <Text className="text-white font-kumbhBold">
                                    Continue
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

/* ───────── UI bits ───────── */

function TxnRow({ item, onPress }: { item: Txn; onPress: () => void }) {
    const iconBg = "bg-blue-500";
    const isPending = item.status === "Pending";

    return (
        <Pressable
            onPress={onPress}
            className="px-5 py-3 flex-row items-center"
        >
            <View
                className={clsx(
                    "w-11 h-11 rounded-full items-center justify-center mr-4",
                    iconBg,
                )}
            >
                {item.dir === "up" ? (
                    <ArrowUp size={18} color="#fff" />
                ) : (
                    <ArrowDown size={18} color="#fff" />
                )}
            </View>

            <View className="flex-1">
                <Text className="text-base font-kumbhBold text-text">
                    {item.title}
                </Text>
                <Text
                    className={clsx(
                        "mt-1 text-sm font-kumbh",
                        isPending ? "text-yellow-600" : "text-green-600",
                    )}
                    numberOfLines={1}
                >
                    {item.description}
                </Text>
            </View>

            <View className="items-end">
                <Text className="text-base font-kumbhBold text-text">
                    {NGN(item.amount)}
                </Text>
                <Text className="text-sm text-gray-500 font-kumbh mt-1">
                    {item.time}
                </Text>
            </View>
        </Pressable>
    );
}
