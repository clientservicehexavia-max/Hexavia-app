// app/(admin)/finance/index.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import clsx from "clsx";
import { useRouter } from "expo-router";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Eye,
  EyeOff,
  Filter,
  Lock,
  Plus,
  Receipt,
  Search,
  Upload,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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

import { STORAGE_KEYS } from "@/storage/keys";
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
import { CustomTextInput } from "@/components/ui/CustomInput";
import { SwipeableTabView } from "@/components/ui/SwipeableTabView";
import { fetchClients } from "@/redux/client/client.thunks";

type Flow = "Receivables" | "Expenses";
type GroupingMode = "daily" | "monthly";

type Txn = {
  id: string;
  title: string;
  amount: number;
  status: "Successful" | "Pending";
  description: string;
  projectName?: string;
  clientName?: string;
  companyName?: string;
  source?: string;
  engagement?: string;
  isExternal?: boolean;
  isFullyPaid?: boolean;
  dir: "up" | "down";
  isoDate: string;
  dateKey: string;
  monthKey: string;
  monthLabel: string;
  kind: "expense" | "clientReceivable";
};

type TxnSection = {
  title: string;
  bucketTotal: number;
  sortValue: number;
  data: Txn[];
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

function getReceivableActivityDate(client: any) {
  // 1. Use client.receivableUpdatedAt (consistently kept up to date with the latest row date)
  if (client?.receivableUpdatedAt) {
    const ts = new Date(client.receivableUpdatedAt).getTime();
    if (!Number.isNaN(ts) && ts > 0) {
      return new Date(ts).toISOString();
    }
  }

  // 2. Fallback to direct inspection of rows (for instant optimistic updates or legacy data)
  if (Array.isArray(client?.installmentalPayment) && client.installmentalPayment.length > 0) {
    let latestPaidTs = 0;
    for (const payment of client.installmentalPayment) {
      if (payment?.isPaid === false) continue;
      const paymentDate = payment?.date || payment?.paymentUpdatedAt;
      const paymentTs = new Date(paymentDate || "").getTime();
      if (!Number.isNaN(paymentTs) && paymentTs > latestPaidTs) {
        latestPaidTs = paymentTs;
      }
    }

    if (latestPaidTs > 0) {
      return new Date(latestPaidTs).toISOString();
    }

    // If no installments are marked paid, use latest scheduled due date
    let latestScheduledTs = 0;
    for (const payment of client.installmentalPayment) {
      const paymentDate = payment?.date || payment?.paymentUpdatedAt;
      const paymentTs = new Date(paymentDate || "").getTime();
      if (!Number.isNaN(paymentTs) && paymentTs > latestScheduledTs) {
        latestScheduledTs = paymentTs;
      }
    }

    if (latestScheduledTs > 0) {
      return new Date(latestScheduledTs).toISOString();
    }
  }

  // 3. Fallback to account creation date
  return client?.createdAt || "";
}

function buildFilteredReceivables(
  clients: any[],
  sourceFilter: ReceivableSourceFilter = "All",
) {
  return (clients || [])
    .filter((c: any) => {
      const source = String(c?.engagement ?? "").trim();
      const matchesSource =
        sourceFilter === "All" ||
        (sourceFilter === "Others"
          ? !source ||
            !RECEIVABLE_SOURCE_FILTER_OPTIONS.slice(1).includes(source as any)
          : source === sourceFilter);

      if (!matchesSource) return false;

      // Include clients with payment activity, plus all external receivables
      // that have been paid (including fully paid ones).
      const paid = getTotalPaid(c);
      const hasPaid = Number.isFinite(paid) && paid > 0;
      const isExternal = Boolean(c?.isExternal);
      const outstanding = getOutstandingReceivable(c);
      const hasOutstanding = outstanding > 0;
      const isFullyPaid = hasPaid && outstanding === 0;

      // External receivables with any payment history are always included
      // Regular clients must be active/current with payment history
      if (isExternal) {
        return true;
      }

      const isActive =
        String(c?.status ?? "").toLowerCase() === "active" ||
        String(c?.status ?? "").toLowerCase() === "current";

      return isActive && hasPaid;
    })
    .sort(
      (a: any, b: any) =>
        new Date(getReceivableActivityDate(b) || 0).getTime() -
        new Date(getReceivableActivityDate(a) || 0).getTime(),
    );
}

const MONTH_NAMES_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const MONTH_NAMES_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function formatDateLabel(iso: string) {
  try {
    if (!iso) return "";
    const d = new Date(iso);

    if (Number.isNaN(d.getTime())) return "";
    const month = MONTH_NAMES_SHORT[d.getMonth()];
    const day = d.getDate();
    const year = d.getFullYear();
    return `${month} ${day}, ${year}`;
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
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  const yday = new Date(today);
  yday.setDate(today.getDate() - 1);
  if (isSameYMD(d, today)) return "Today";
  if (isSameYMD(d, yday)) return "Yesterday";
  const month = MONTH_NAMES_SHORT[d.getMonth()];
  const day = d.getDate();
  const year = d.getFullYear();
  return `${month} ${day}, ${year}`;
}

function monthKey(iso?: string) {
  const d = new Date(iso || "");
  if (Number.isNaN(d.getTime())) return "unknown";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthLabel(iso?: string) {
  const d = new Date(iso || "");
  if (Number.isNaN(d.getTime())) return "Unknown month";
  const month = MONTH_NAMES_LONG[d.getMonth()];
  const year = d.getFullYear();
  return `${month} ${year}`;
}

const ENGAGEMENT_BADGES: Record<string, string> = {
  BWE: "bg-amber-500",
  "Inner Circle": "bg-violet-500",
  Consulting: "bg-emerald-500",
  Partnerships: "bg-rose-500",
  Retreat: "bg-cyan-500",
  Books: "bg-sky-500",
};

function getEngagementBadge(engagement?: string) {
  return ENGAGEMENT_BADGES[engagement || ""] || "bg-[#4C5FAB]";
}

const ENGAGEMENT_TEXT_COLORS: Record<string, string> = {
  BWE: "text-amber-500",
  "Inner Circle": "text-violet-500",
  Consulting: "text-emerald-500",
  Partnerships: "text-rose-500",
  Retreat: "text-cyan-500",
  Books: "text-sky-500",
};

function getEngagementTextColor(engagement?: string) {
  return ENGAGEMENT_TEXT_COLORS[engagement || ""] || "text-[#4C5FAB]";
}

const RECEIVABLE_SOURCE_FILTER_OPTIONS = [
  "All",
  "BWE",
  "Inner Circle",
  "Consulting",
  "Books",
  "Partnerships",
  "Retreat",
  "Internal Transfer",
  "Others",
] as const;

type ReceivableSourceFilter = (typeof RECEIVABLE_SOURCE_FILTER_OPTIONS)[number];

const normalizeSearchText = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

function filterReceivablesBySearch(clients: any[], query: string) {
  const q = normalizeSearchText(query);
  if (!q) return clients;

  return (clients || []).filter((client: any) => {
    const companyName = normalizeSearchText(client?.projectName);
    const clientName = normalizeSearchText(client?.name);
    const source = normalizeSearchText(client?.engagement);

    return (
      companyName.includes(q) || clientName.includes(q) || source.includes(q)
    );
  });
}

function filterExpensesBySearch(records: any[], query: string) {
  const q = normalizeSearchText(query);
  if (!q) return records;

  return (records || []).filter((record: any) => {
    const description = normalizeSearchText(record?.description);
    const notes = normalizeSearchText(record?.notes);
    const date = normalizeSearchText(record?.date);

    return description.includes(q) || notes.includes(q) || date.includes(q);
  });
}

const ADMIN_FINANCE_PIN = "1473695";

export default function FinanceIndex() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [pinLocked, setPinLocked] = useState(true);
  const [isPasswordCheckInitialized, setIsPasswordCheckInitialized] =
    useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [receivablesPage, setReceivablesPage] = useState(1);
  const [allReceivablesClients, setAllReceivablesClients] = useState<any[]>([]);
  const [filteredReceivables, setFilteredReceivables] = useState<any[]>([]);
  const [receivablesLoadingMore, setReceivablesLoadingMore] = useState(false);
  const RECEIVABLES_LIMIT = 20;

  // Check if password was already verified in this session
  useEffect(() => {
    const checkFinancePasswordVerified = async () => {
      try {
        const verified = await AsyncStorage.getItem(
          STORAGE_KEYS.FINANCE_PASSWORD_VERIFIED,
        );
        setPinLocked(verified !== "true");
      } catch (error) {
        console.error("Error checking finance password verification:", error);
        // Default to locked on error
        setPinLocked(true);
      } finally {
        setIsPasswordCheckInitialized(true);
      }
    };

    checkFinancePasswordVerified();
  }, []);

  const handlePinSubmit = async () => {
    if (pinInput.trim() === ADMIN_FINANCE_PIN) {
      setPinLocked(false);
      setPinError("");
      setPinInput("");
      // Store that password was verified in this session
      try {
        await AsyncStorage.setItem(
          STORAGE_KEYS.FINANCE_PASSWORD_VERIFIED,
          "true",
        );
      } catch (error) {
        console.error("Error saving finance password verification:", error);
      }
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
  const financeRequestFilters = useMemo(
    () => ({
      type: "expense" as const,
      startDate: financeFilters.startDate,
      endDate: financeFilters.endDate,
      limit: financeFilters.limit ?? 20,
    }),
    [financeFilters.startDate, financeFilters.endDate, financeFilters.limit],
  );

  /* Clients for Receivables (local paged cache) */
  const RECEIVABLES_SORT_ORDER = "desc" as const;

  const [clients, setClients] = useState<any[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientsRefreshing, setClientsRefreshing] = useState(false);

  const [tab, setTab] = useState<Flow>("Receivables");
  const [groupingMode, setGroupingMode] = useState<GroupingMode>("monthly");
  const [selectedReceivableSource, setSelectedReceivableSource] =
    useState<ReceivableSourceFilter>("All");
  const [financeSearch, setFinanceSearch] = useState("");
  const [showFinanceSearch, setShowFinanceSearch] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // client picker modal
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const searchedReceivables = useMemo(
    () => filterReceivablesBySearch(filteredReceivables, financeSearch),
    [filteredReceivables, financeSearch],
  );
  const searchedExpenses = useMemo(
    () => filterExpensesBySearch(records || [], financeSearch),
    [records, financeSearch],
  );

  const totalReceivablesAll = useMemo(() => {
    const filtered = buildFilteredReceivables(
      allReceivablesClients,
      selectedReceivableSource,
    );
    return filtered.reduce((acc: number, c: any) => acc + getTotalPaid(c), 0);
  }, [allReceivablesClients, selectedReceivableSource]);

  useEffect(() => {
    setReceivablesPage(1);
    setClients(searchedReceivables.slice(0, RECEIVABLES_LIMIT));
  }, [searchedReceivables]);

  /* Totals */
  const total = useMemo(() => {
    if (tab === "Receivables") {
      return totalReceivablesAll;
    }
    // Expenses: use backend summary (all matching records, not just current page)
    if (Number.isFinite(Number(summary?.totalExpenses))) {
      return Number(summary?.totalExpenses || 0);
    }

    // Fallback if summary is temporarily unavailable.
    return (records || []).reduce(
      (acc, r: any) =>
        acc + (r?.type === "expense" ? Number(r?.amount || 0) : 0),
      0,
    );
  }, [summary, tab, totalReceivablesAll, records]);

  /* Section builder */
  const sections = useMemo<TxnSection[]>(() => {
    const buildSections = (txns: Txn[], mode: GroupingMode) => {
      const map = new Map<string, TxnSection>();

      txns.forEach((txn) => {
        const key =
          mode === "daily" ? txn.dateKey || "—" : txn.monthKey || "unknown";
        const title =
          mode === "daily"
            ? txn.dateKey || "—"
            : txn.monthLabel || "Unknown month";

        if (!map.has(key)) {
          map.set(key, {
            title,
            bucketTotal: 0,
            sortValue: 0,
            data: [],
          });
        }

        const section = map.get(key)!;
        section.data.push(txn);
        section.bucketTotal += Number(txn.amount || 0);

        const txDate = new Date(txn.isoDate || "");
        const fallbackDate = new Date();
        const parsed = Number.isNaN(txDate.getTime())
          ? fallbackDate.getTime()
          : txDate.getTime();
        section.sortValue = Math.max(section.sortValue, parsed);
      });

      return Array.from(map.values()).sort((a, b) => b.sortValue - a.sortValue);
    };

    if (tab === "Receivables") {
      const clientTxns: Txn[] = (clients || []).map((c: any) => {
        const activityIso = getReceivableActivityDate(c);
        const engagement = String(c?.engagement || "").trim();
        const title =
          !c?.isExternal && engagement === "Consulting"
            ? "Consulting - Internal"
            : c?.isExternal
              ? engagement || "External"
              : "Receive";

        return {
          id: c._id,
          title,
          amount: getTotalPaid(c),
          description: `${c?.projectName || "Unnamed project"}\n${c?.name || "Unnamed client"}`,
          projectName: c?.projectName || "Unnamed project",
          clientName: c?.name || "Unnamed client",
          engagement: c?.engagement,
          isExternal: Boolean(c?.isExternal),
          isFullyPaid: getOutstandingReceivable(c) === 0,
          status: "Pending",
          dir: "down",
          isoDate: activityIso,
          dateKey: dateBucket(activityIso),
          monthKey: monthKey(activityIso),
          monthLabel: monthLabel(activityIso),
          kind: "clientReceivable",
        };
      });

      return buildSections(clientTxns, groupingMode);
    }

    // Expenses
    const txns: Txn[] = searchedExpenses
      .filter((r) => r.type === "expense")
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map((r) => ({
        id: r._id,
        title: "Expense",
        amount: r.amount,
        description: String(r.description ?? ""), // <- force string
        status: "Successful",
        dir: "up",
        isoDate: r.date,
        dateKey: dateBucket(r.date),
        monthKey: monthKey(r.date),
        monthLabel: monthLabel(r.date),
        kind: "expense", // <- new
      }));

    return buildSections(txns, groupingMode);
  }, [tab, clients, searchedExpenses, groupingMode]);

  const fetchAndPaginateReceivables = useCallback(
    async (asRefresh = false) => {
      if (asRefresh) setClientsRefreshing(true);
      setClientsLoading(true);
      setReceivablesLoadingMore(false);

      try {
        // 1) Fetch all clients (probe count, then bulk fetch)
        const probe = await dispatch(
          fetchClients({
            page: 1,
            limit: 1,
            sortOrder: RECEIVABLES_SORT_ORDER,
          }) as any,
        ).unwrap();

        const totalClients =
          Number(probe?.pagination?.totalClients || 0) ||
          (probe?.clients?.length ?? 0);

        const payload = await dispatch(
          fetchClients({
            page: 1,
            limit: Math.max(totalClients, 1),
            sortOrder: RECEIVABLES_SORT_ORDER,
          }) as any,
        ).unwrap();

        const all = payload?.clients ?? [];
        setAllReceivablesClients(all);
      } catch {
        // swallow here: global error handling remains in redux slices/toasts
      } finally {
        setClientsLoading(false);
        setClientsRefreshing(false);
      }
    },
    [dispatch],
  );

  useEffect(() => {
    if (tab !== "Receivables") return;
    if (!allReceivablesClients.length) return;

    const filtered = buildFilteredReceivables(
      allReceivablesClients,
      selectedReceivableSource,
    );
    const searched = filterReceivablesBySearch(filtered, financeSearch);
    const visible = searched.slice(0, RECEIVABLES_LIMIT);

    setFilteredReceivables(filtered);
    setReceivablesPage(1);
    setClients(visible);
  }, [
    allReceivablesClients,
    RECEIVABLES_LIMIT,
    financeSearch,
    selectedReceivableSource,
    tab,
  ]);

  /* First load + tab switching */
  useEffect(() => {
    if (pinLocked) return;

    // Preload expense summary so total amount is not tied to paginated rows.
    dispatch(
      fetchFinance({
        type: "expense",
        startDate: financeRequestFilters.startDate,
        endDate: financeRequestFilters.endDate,
        page: 1,
        limit: 1,
      }) as any,
    );

    if (tab === "Receivables") {
      fetchAndPaginateReceivables(false);
    } else {
      // fetch expenses (first page)
      dispatch(
        setFinanceFilters({
          type: "expense",
          page: 1,
          limit: financeRequestFilters.limit,
        }),
      );
      dispatch(fetchFinance({ ...financeRequestFilters, page: 1 }) as any);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, dispatch, pinLocked, fetchAndPaginateReceivables]);

  useEffect(() => {
    if (!showClientPicker) return;
    if ((allReceivablesClients?.length ?? 0) === 0) {
      fetchAndPaginateReceivables(false);
    }
  }, [
    showClientPicker,
    allReceivablesClients?.length,
    fetchAndPaginateReceivables,
  ]);

  // Keep Receivables fresh when returning from child screens.
  useFocusEffect(
    useCallback(() => {
      if (pinLocked) return;

      if (tab === "Receivables") {
        fetchAndPaginateReceivables(false);
      }
    }, [pinLocked, tab, fetchAndPaginateReceivables]),
  );

  /* Refresh */
  const onRefresh = useCallback(() => {
    if (pinLocked) return;

    if (tab === "Receivables") {
      if (clientsLoading) return;
      fetchAndPaginateReceivables(true);
      dispatch(setFinancePage(1));
    } else {
      if (financeLoading) return;
      dispatch(setFinancePage(1));
      dispatch(fetchFinance({ ...financeRequestFilters, page: 1 }) as any);
    }
  }, [
    tab,
    clientsLoading,
    financeLoading,
    financeRequestFilters,
    dispatch,
    pinLocked,
    fetchAndPaginateReceivables,
  ]);

  const refreshing =
    tab === "Receivables"
      ? clientsRefreshing || (clientsLoading && (clients?.length ?? 0) === 0)
      : financeLoading && (financePagination?.currentPage ?? 1) === 1;

  /* Infinite load */
  const loadMore = useCallback(() => {
    if (pinLocked) return;

    if (tab === "Receivables") {
      // Reveal next local page (21-40, 41-60...) from cached filtered list
      if (clientsLoading || receivablesLoadingMore) return;
      if ((clients?.length ?? 0) >= (searchedReceivables?.length ?? 0)) {
        return;
      }

      setReceivablesLoadingMore(true);
      setTimeout(() => {
        const nextPage = receivablesPage + 1;
        const nextVisible = (searchedReceivables || []).slice(
          0,
          nextPage * RECEIVABLES_LIMIT,
        );
        setReceivablesPage(nextPage);
        setClients(nextVisible);
        setReceivablesLoadingMore(false);
      }, 0);
      return;
    }

    // Expenses load more
    if (financeLoading || refreshing || !financePagination) return;
    const { currentPage, totalPages } = financePagination;
    if (currentPage >= totalPages) return;
    const next = currentPage + 1;
    dispatch(setFinancePage(next));
    dispatch(fetchFinance({ ...financeRequestFilters, page: next }) as any);
  }, [
    tab,
    clients,
    clientsLoading,
    receivablesLoadingMore,
    searchedReceivables,
    receivablesPage,
    financeLoading,
    financePagination,
    financeRequestFilters,
    dispatch,
    pinLocked,
    refreshing,
  ]);

  const isInitialExpensesLoading =
    tab === "Expenses" &&
    financeLoading &&
    !refreshing &&
    (records?.length ?? 0) === 0;

  const isLoadingMoreReceivables =
    tab === "Receivables" &&
    receivablesLoadingMore &&
    (clients?.length ?? 0) > 0;

  const isLoadingMoreExpenses =
    tab === "Expenses" &&
    financeLoading &&
    !refreshing &&
    (records?.length ?? 0) > 0;

  const isIOS = Platform.OS === "ios";

  const hasActiveFilter =
    groupingMode !== "monthly" ||
    (tab === "Receivables" && selectedReceivableSource !== "All");

  return (
    <SafeAreaView
      edges={isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]}
      className="flex-1 bg-[#F5F7FB]"
    >
      {isPasswordCheckInitialized && (
        <Modal
          visible={pinLocked}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => {}}
        >
          <View className="flex-1 bg-black/60 px-5 justify-center">
            <View className="bg-white rounded-[28px] p-6 border border-gray-100">
              <View className="h-12 w-12 rounded-2xl bg-[#EEF2FF] items-center justify-center mb-4">
                <Lock size={22} color="#4C5FAB" />
              </View>
              <Text className="text-xl font-kumbhBold text-[#111827] mb-1">
                Finance Access
              </Text>
              <Text className="text-sm text-[#6B7280] font-kumbh mb-4">
                Enter the admin PIN to view financial records.
              </Text>

              <View className="h-14 justify-center rounded-2xl border border-gray-200 bg-[#F9FAFB] px-4 mb-2">
                <CustomTextInput
                  value={pinInput}
                  onChangeText={(text) => setPinInput(text.replace(/\s+/g, ""))}
                  placeholder="Enter 7-digit PIN"
                  keyboardType="number-pad"
                  maxLength={7}
                  secureTextEntry
                  autoFocus
                />
              </View>
              {pinError ? (
                <Text className="text-xs text-red-600 font-kumbhBold mb-3">
                  {pinError}
                </Text>
              ) : (
                <Text className="text-xs text-[#9CA3AF] font-kumbh mb-4">
                  PIN is 7 digits long.
                </Text>
              )}

              <Pressable
                onPress={handlePinSubmit}
                disabled={!pinInput}
                className={clsx(
                  "h-12 rounded-2xl items-center justify-center",
                  pinInput ? "bg-[#4C5FAB] active:opacity-90" : "bg-gray-200",
                )}
              >
                <Text
                  className={clsx(
                    "font-kumbhBold text-[15px]",
                    pinInput ? "text-white" : "text-gray-400",
                  )}
                >
                  Unlock Finance
                </Text>
              </Pressable>

              <Pressable
                onPress={() => router.back()}
                className="h-12 rounded-2xl items-center justify-center mt-2.5 bg-gray-100 active:opacity-90"
              >
                <Text className="text-[#374151] font-kumbhBold text-[14px]">
                  Go Back
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}

      {/* Header */}
      <PlatformAdaptiveHeader
        title="Finance"
        backgroundColor="#F5F7FB"
        headerRight={() => (
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => setShowFilterModal(true)}
              className={clsx(
                "w-9 h-9 rounded-full items-center justify-center border",
                hasActiveFilter
                  ? "bg-[#EEF2FF] border-primary/20"
                  : "bg-white border-gray-200",
              )}
              accessibilityRole="button"
              accessibilityLabel="Open finance filters"
            >
              <Filter
                size={17}
                color={hasActiveFilter ? "#4C5FAB" : "#111827"}
              />
            </Pressable>

            <Pressable
              onPress={() => setShowFinanceSearch((current) => !current)}
              className={clsx(
                "w-9 h-9 rounded-full items-center justify-center border",
                showFinanceSearch
                  ? "bg-[#EEF2FF] border-primary/20"
                  : "bg-white border-gray-200",
              )}
              accessibilityRole="button"
              accessibilityLabel="Toggle finance search"
            >
              <Search
                size={17}
                color={showFinanceSearch ? "#4C5FAB" : "#111827"}
              />
            </Pressable>
          </View>
        )}
      />

      {/* Total card */}
      <View className="px-4 mt-2">
        <View className="rounded-[28px] bg-[#4C5FAB] px-5 py-5">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View className="rounded-full bg-white/15 px-3 py-1">
                <Text className="text-white text-[11px] font-kumbhBold uppercase tracking-wider">
                  {tab}
                </Text>
              </View>
              {hasActiveFilter ? (
                <View className="rounded-full bg-white/15 px-2.5 py-1">
                  <Text className="text-white/90 text-[11px] font-kumbh">
                    {tab === "Receivables" &&
                    selectedReceivableSource !== "All"
                      ? selectedReceivableSource
                      : groupingMode === "daily"
                        ? "Daily"
                        : "Monthly"}
                  </Text>
                </View>
              ) : null}
            </View>
            <Pressable
              onPress={() => setHidden((s) => !s)}
              hitSlop={8}
              className="h-9 w-9 rounded-full bg-white/15 items-center justify-center"
              accessibilityLabel={hidden ? "Show total" : "Hide total"}
            >
              {hidden ? (
                <EyeOff size={17} color="#ffffff" />
              ) : (
                <Eye size={17} color="#ffffff" />
              )}
            </Pressable>
          </View>

          <Text className="mt-3.5 text-white text-[30px] font-kumbhBold tracking-tight">
            {hidden ? "••••••••" : NGN(total).replace("NGN", "₦")}
          </Text>
          <Text className="mt-1 text-white/75 text-[12px] font-kumbh">
            {groupingMode === "monthly"
              ? "Grouped by month"
              : "Grouped by day"}
            {tab === "Receivables" && selectedReceivableSource !== "All"
              ? ` • ${selectedReceivableSource}`
              : ""}
          </Text>
        </View>
      </View>

      {/* Search bar */}
      {showFinanceSearch ? (
        <View className="px-4 mt-3">
          <View className="h-12 flex-row items-center rounded-2xl border border-gray-200 bg-white px-3.5">
            <Search size={16} color="#9CA3AF" />
            <CustomTextInput
              value={financeSearch}
              onChangeText={setFinanceSearch}
              placeholder={
                tab === "Receivables"
                  ? "Search by company, client, or source"
                  : "Search expenses by description, notes, or date"
              }
              className="flex-1 h-full ml-2.5"
            />
            {financeSearch ? (
              <Pressable
                onPress={() => setFinanceSearch("")}
                hitSlop={8}
                className="h-7 w-7 rounded-full bg-gray-100 items-center justify-center"
              >
                <X size={14} color="#6B7280" />
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

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
        renderScene={() =>
          isInitialExpensesLoading ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color="#4C5FAB" />
            </View>
          ) : (
            <View className="flex-1">
              <SectionList<Txn, TxnSection>
                sections={sections}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingBottom: 165, paddingTop: 4 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor="#4C5FAB"
                  />
                }
                onEndReachedThreshold={0.2}
                onEndReached={loadMore}
                renderSectionHeader={({ section }) => (
                  <View className="bg-[#F5F7FB] px-4 pt-4 pb-2 flex-row items-center justify-between">
                    <Text className="text-[12px] text-[#6B7280] font-kumbhBold uppercase tracking-wider">
                      {section.title}
                    </Text>
                    <View className="rounded-full bg-white border border-gray-100 px-3 py-1">
                      <Text className="text-[12px] text-[#111827] font-kumbhBold">
                        {NGN(section.bucketTotal)}
                      </Text>
                    </View>
                  </View>
                )}
                renderItem={({ item }) => (
                  <TxnRow
                    item={item}
                    onPress={() =>
                      item.kind === "expense"
                        ? router.push(`/(admin)/finance/${item.id}`)
                        : router.push({
                            pathname: "/(admin)/clients/installments",
                            params: {
                              clientId: item.id,
                            },
                          })
                    }
                  />
                )}
                ListEmptyComponent={
                  <View className="mx-4 mt-4 rounded-[28px] bg-white border border-gray-100 px-6 py-12 items-center">
                    <View className="h-14 w-14 rounded-2xl bg-[#EEF2FF] items-center justify-center mb-3.5">
                      <Receipt size={24} color="#4C5FAB" />
                    </View>
                    <Text className="text-[#111827] font-kumbhBold text-[16px]">
                      {tab === "Receivables"
                        ? "No receivables found"
                        : "No expenses found"}
                    </Text>
                    <Text className="text-[#6B7280] font-kumbh text-[13px] mt-1 text-center">
                      {financeSearch.trim()
                        ? "Try clearing your search or switching filters."
                        : tab === "Receivables"
                          ? "Recorded client receivables will appear here."
                          : "Recorded company expenses will appear here."}
                    </Text>
                  </View>
                }
                ListFooterComponent={
                  isLoadingMoreExpenses || isLoadingMoreReceivables ? (
                    <View className="py-4 items-center">
                      <ActivityIndicator size="small" color="#4C5FAB" />
                    </View>
                  ) : null
                }
                stickySectionHeadersEnabled={false}
              />
            </View>
          )
        }
        tabBarProps={{
          activeColor: "#4C5FAB",
          inactiveColor: "#6B7280",
          style: {
            backgroundColor: "#F5F7FB",
            borderBottomWidth: 1,
            borderBottomColor: "#E5E7EB",
            marginTop: 6,
          },
          renderTabLabel: ({ route, focused, color }) => (
            <Text
              style={{
                color,
                fontFamily: focused ? "KumbhSans-Bold" : "KumbhSans-Regular",
                fontSize: 14,
              }}
            >
              {route.title}
            </Text>
          ),
        }}
      />

      {/* Floating Statement Import Button */}
      <Pressable
        onPress={() => router.push("/(admin)/finance/import-statement")}
        className="absolute right-5 h-12 w-12 items-center justify-center rounded-full bg-white border border-gray-200 shadow-md"
        style={{
          bottom: (isIOS ? 34 : 24) + 66,
        }}
        accessibilityRole="button"
        accessibilityLabel="Import Bank Statement"
      >
        <Upload size={20} color="#4C5FAB" />
      </Pressable>

      <Pressable
        onPress={() => {
          if (tab === "Receivables") {
            router.push("/(admin)/finance/receivable");
          } else {
            router.push("/(admin)/finance/form");
          }
        }}
        className="absolute right-5 h-14 w-14 items-center justify-center rounded-full bg-[#4C5FAB] shadow-lg"
        style={{
          bottom: isIOS ? 34 : 24,
        }}
        accessibilityRole="button"
        accessibilityLabel={
          tab === "Receivables" ? "Add receivable" : "Add expense record"
        }
      >
        <Plus size={24} color="#FFFFFF" />
      </Pressable>

      <Modal
        visible={showFilterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <Pressable
          className="flex-1 bg-black/40 justify-end"
          onPress={() => setShowFilterModal(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-white rounded-t-[28px] px-5 pt-3 pb-8"
          >
            <View className="w-10 h-1 rounded-full bg-gray-200 self-center mb-4" />
            <Text className="text-[18px] font-kumbhBold text-[#111827] mb-4">
              Filters
            </Text>

            <Text className="text-[12px] font-kumbhBold uppercase tracking-wider text-[#6B7280] mb-2">
              Sectioning
            </Text>
            {(
              [
                ["daily", "Daily"],
                ["monthly", "Monthly"],
              ] as const
            ).map(([value, label]) => {
              const active = groupingMode === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => {
                    setGroupingMode(value);
                    setShowFilterModal(false);
                  }}
                  className={clsx(
                    "h-12 rounded-2xl px-4 mb-2 flex-row items-center justify-between border",
                    active
                      ? "bg-[#EEF2FF] border-primary/20"
                      : "bg-[#F9FAFB] border-gray-200",
                  )}
                >
                  <Text
                    className={clsx(
                      "font-kumbhBold text-[14px]",
                      active ? "text-[#4C5FAB]" : "text-[#111827]",
                    )}
                  >
                    {label}
                  </Text>
                  {active ? <Check size={16} color="#4C5FAB" /> : null}
                </Pressable>
              );
            })}

            {tab === "Receivables" ? (
              <View className="mt-4">
                <Text className="text-[12px] font-kumbhBold uppercase tracking-wider text-[#6B7280] mb-2.5">
                  Receivable Source
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {RECEIVABLE_SOURCE_FILTER_OPTIONS.map((option) => {
                    const active = selectedReceivableSource === option;
                    return (
                      <Pressable
                        key={option}
                        onPress={() => {
                          setSelectedReceivableSource(option);
                          setShowFilterModal(false);
                        }}
                        className={clsx(
                          "px-3.5 py-2 rounded-full border",
                          active
                            ? "bg-[#4C5FAB] border-[#4C5FAB]"
                            : "bg-[#F9FAFB] border-gray-200",
                        )}
                      >
                        <Text
                          className={clsx(
                            "font-kumbhBold text-[12px]",
                            active ? "text-white" : "text-[#374151]",
                          )}
                        >
                          {option}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ───────── Client Picker Modal ───────── */}
      <Modal
        visible={showClientPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowClientPicker(false)}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-[28px] px-5 pt-3 pb-7">
            <View className="items-center mb-4">
              <View className="w-10 h-1 rounded-full bg-gray-200" />
            </View>

            <Text className="text-xl font-kumbhBold text-[#111827] mb-1">
              Record Receivable
            </Text>
            <Text className="text-[13px] text-[#6B7280] font-kumbh mb-4">
              Select the client to create an installment plan for, or add a
              manual receivable.
            </Text>

            <Pressable
              onPress={() => {
                setShowClientPicker(false);
                router.push("/(admin)/finance/receivable");
              }}
              className="h-12 rounded-2xl bg-[#4C5FAB] items-center justify-center mb-4 active:opacity-90"
            >
              <Text className="text-white font-kumbhBold text-[14px]">
                Add Manual Receivable
              </Text>
            </Pressable>

            {/* Search */}
            <View className="h-12 flex-row items-center rounded-2xl border border-gray-200 bg-[#F9FAFB] px-3.5 mb-3">
              <Search size={16} color="#9CA3AF" />
              <CustomTextInput
                placeholder="Search clients by name…"
                value={clientSearch}
                onChangeText={setClientSearch}
                className="flex-1 h-full ml-2"
              />
            </View>

            {/* Client list */}
            <View className="max-h-[45vh]">
              <FlatList
                data={allReceivablesClients.filter((c: any) =>
                  String(c?.name || "")
                    .toLowerCase()
                    .includes(clientSearch.toLowerCase()),
                )}
                keyExtractor={(c: any) => c._id}
                ListEmptyComponent={
                  <Text className="text-center text-gray-400 font-kumbh py-6">
                    {clientsLoading ? "Loading clients…" : "No clients found"}
                  </Text>
                }
                ItemSeparatorComponent={() => (
                  <View className="h-[1px] bg-gray-100 mx-1" />
                )}
                renderItem={({ item: c }: any) => {
                  const isSelected = selectedClientId === c._id;
                  return (
                    <Pressable
                      onPress={() =>
                        setSelectedClientId(isSelected ? null : c._id)
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
                            "font-kumbhBold text-[15px]",
                            isSelected ? "text-[#4C5FAB]" : "text-[#111827]",
                          )}
                          numberOfLines={1}
                        >
                          {c?.name || "Unnamed client"}
                        </Text>
                        <Text className="font-kumbh text-[12px] text-[#6B7280] mt-0.5">
                          Receivable:{" "}
                          {new Intl.NumberFormat("en-NG", {
                            style: "currency",
                            currency: "NGN",
                            maximumFractionDigits: 0,
                          }).format(Number(c?.payableAmount || 0))}
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
            <View className="flex-row mt-5 gap-3">
              <Pressable
                onPress={() => setShowClientPicker(false)}
                className="flex-1 h-12 rounded-2xl bg-gray-100 items-center justify-center active:opacity-90"
              >
                <Text className="font-kumbhBold text-[#374151]">Cancel</Text>
              </Pressable>

              <Pressable
                disabled={!selectedClientId}
                onPress={() => {
                  if (!selectedClientId) return;
                  setShowClientPicker(false);
                  router.push({
                    pathname: "/(admin)/clients/installments",
                    params: { clientId: selectedClientId },
                  });
                }}
                className={clsx(
                  "flex-1 h-12 rounded-2xl items-center justify-center active:opacity-90",
                  selectedClientId ? "bg-[#4C5FAB]" : "bg-gray-200",
                )}
              >
                <Text
                  className={clsx(
                    "font-kumbhBold",
                    selectedClientId ? "text-white" : "text-gray-400",
                  )}
                >
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
  const iconBg =
    item.kind === "expense"
      ? "bg-rose-500"
      : item.engagement
        ? getEngagementBadge(item.engagement)
        : "bg-[#4C5FAB]";
  const isPending = item.status === "Pending";

  return (
    <Pressable
      onPress={onPress}
      className="mx-4 mb-2.5 rounded-[22px] bg-white border border-gray-100 px-4 py-3.5 flex-row items-center active:opacity-85"
    >
      <View
        className={clsx(
          "w-11 h-11 rounded-2xl items-center justify-center mr-3.5",
          iconBg,
        )}
      >
        {item.dir === "up" ? (
          <ArrowUp size={18} color="#fff" />
        ) : (
          <ArrowDown size={18} color="#fff" />
        )}
      </View>

      <View className="flex-1 mr-3">
        <Text
          className={clsx(
            "text-[14px] font-kumbhBold",
            item.engagement
              ? getEngagementTextColor(item.engagement)
              : "text-[#111827]",
          )}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        {item.projectName && item.clientName ? (
          <View>
            <Text
              className="text-[13px] font-kumbh text-[#4B5563] mt-0.5"
              numberOfLines={1}
            >
              {item.projectName}
            </Text>
            <Text
              className={clsx(
                "text-[12px] font-kumbh mt-0.5",
                isPending ? "text-amber-600" : "text-emerald-600",
              )}
              numberOfLines={1}
            >
              {item.clientName}
            </Text>
          </View>
        ) : (
          <Text
            className="text-[13px] font-kumbh text-[#6B7280] mt-0.5"
            numberOfLines={1}
          >
            {item.description || "Expense"}
          </Text>
        )}
      </View>

      <View className="items-end shrink-0 min-w-[90px]">
        <Text
          className={clsx(
            "text-[14px] font-kumbhBold",
            item.isFullyPaid ? "text-emerald-600" : "text-[#111827]",
          )}
          numberOfLines={1}
        >
          {NGN(item.amount)}
        </Text>
        <Text
          className="text-[11px] text-[#6B7280] font-kumbh mt-1"
          numberOfLines={1}
          style={{ includeFontPadding: false }}
        >
          {formatDateLabel(item.isoDate)}
        </Text>
      </View>
    </Pressable>
  );
}
