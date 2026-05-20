import BottomSheetModal from "@/components/ui/BottomSheetModal";
import { useFocusEffect, useRouter } from "expo-router";
import {
    Filter as FilterIcon,
    Mail,
    MessageCircle,
    Phone,
    Plus,
    Search,
    X,
} from "lucide-react-native";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Platform,
    Pressable,
    RefreshControl,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import {
    selectAllPartnerships,
    selectPartnershipLoading,
} from "@/redux/partnership/partnership.selectors";
import {
    deletePartnership,
    fetchPartnerships,
} from "@/redux/partnership/partnership.thunks";
import type { Partnership } from "@/redux/partnership/partnership.types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { dialPhone, openEmail, openWhatsApp } from "@/utils/contact";
import clsx from "clsx";

const STATUS_OPTS = ["active", "inactive", "pending", "closed"] as const;
const SORT_OPTIONS = ["createdAt", "updatedAt", "name", "clientName"] as const;
const SORT_ORDER_OPTIONS = ["desc", "asc"] as const;
const LIMIT_OPTIONS = [5, 10, 20, 50, 100] as const;
type TabKey = "all" | "finance" | "non-finance";

function useDebounced<T>(value: T, ms: number) {
    const [deb, setDeb] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDeb(value), ms);
        return () => clearTimeout(t);
    }, [value, ms]);
    return deb;
}

export default function PartnershipsIndex() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const isIOS = Platform.OS === "ios";

    const partnerships = useAppSelector(selectAllPartnerships);
    const loading = useAppSelector(selectPartnershipLoading);

    const [tab, setTab] = useState<TabKey>("all");
    const [query, setQuery] = useState("");
    const debouncedQuery = useDebounced(query, 300);
    const [showFilters, setShowFilters] = useState(false);
    const [status, setStatus] = useState<string | undefined>(undefined);
    const [sortBy, setSortBy] = useState<string>("createdAt");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
    const [limit, setLimit] = useState<number>(10);
    const [page, setPage] = useState(1);
    const [refreshing, setRefreshing] = useState(false);
    const didBootstrapRef = useRef(false);

    // Load all partnerships without filters (for client-side filtering)
    const onRefresh = useCallback(
        async (isInitialLoad = false) => {
            if (!isInitialLoad) setRefreshing(true);
            try {
                // Load all partnerships without filters - filtering happens locally
                await dispatch(
                    fetchPartnerships({
                        limit: 100,
                        page: 1,
                    }),
                ).unwrap();
            } catch (err) {
                console.error("Error fetching partnerships:", err);
            } finally {
                if (!isInitialLoad) setRefreshing(false);
            }
        },
        [dispatch],
    );

    useEffect(() => {
        if (didBootstrapRef.current) return;
        didBootstrapRef.current = true;
        onRefresh(true); // Initial load
    }, [onRefresh]);

    // Refetch when screen comes into focus (after creating/editing partnership)
    useFocusEffect(
        useCallback(() => {
            onRefresh(true);
        }, [onRefresh]),
    );

    const switchTab = useCallback((t: TabKey) => setTab(t), []);

    const list = useMemo(() => {
        let base = partnerships.filter((p: Partnership) => {
            if (tab === "finance") return p.isFinance === true;
            if (tab === "non-finance") return p.isFinance !== true;
            return true;
        });

        if (status) {
            base = base.filter((p: Partnership) => p.status === status);
        }

        const direction = sortOrder === "asc" ? 1 : -1;
        base = [...base].sort((a: Partnership, b: Partnership) => {
            if (sortBy === "createdAt" || sortBy === "updatedAt") {
                const ad = new Date((a as any)?.[sortBy] ?? 0).getTime() || 0;
                const bd = new Date((b as any)?.[sortBy] ?? 0).getTime() || 0;
                return (ad - bd) * direction;
            }

            const av = String((a as any)?.[sortBy] ?? "").toLowerCase();
            const bv = String((b as any)?.[sortBy] ?? "").toLowerCase();
            if (av < bv) return -1 * direction;
            if (av > bv) return 1 * direction;
            return 0;
        });

        if (!debouncedQuery.trim()) return base;

        const q = debouncedQuery.trim().toLowerCase();
        return base.filter((p: Partnership) =>
            [p.name, p.clientName, p.email, p.partnershipAgreement, p.status]
                .join(" ")
                .toLowerCase()
                .includes(q),
        );
    }, [partnerships, tab, status, sortBy, sortOrder, debouncedQuery]);

    const totalPartnerships = list.length;
    const totalPages = Math.max(1, Math.ceil(totalPartnerships / limit));
    const currentPage = Math.min(Math.max(page, 1), totalPages);

    const pagedList = useMemo(() => {
        const start = (currentPage - 1) * limit;
        return list.slice(start, start + limit);
    }, [list, currentPage, limit]);

    useEffect(() => {
        if (page !== currentPage) {
            setPage(currentPage);
        }
    }, [currentPage, page]);

    const canPrev = currentPage > 1;
    const canNext = currentPage < totalPages;

    const gotoPage = (nextPage: number) => {
        if (nextPage !== currentPage) setPage(nextPage);
    };

    const appliedFilterCount = useMemo(
        () =>
            [
                status,
                sortBy && sortBy !== "createdAt" ? sortBy : undefined,
                sortOrder && sortOrder !== "desc" ? sortOrder : undefined,
                limit && limit !== 10 ? limit : undefined,
            ].filter(Boolean).length,
        [status, sortBy, sortOrder, limit],
    );

    useEffect(() => {
        setPage(1);
    }, [tab, status, sortBy, sortOrder, limit, debouncedQuery]);

    const hasAppliedFilters = appliedFilterCount > 0;

    return (
        <SafeAreaView
            edges={
                isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]
            }
            className="flex-1 bg-white"
        >
            {/* Header */}
            <View className="pb-4 px-4">
                <PlatformAdaptiveHeader
                    title="Partnerships"
                    headerRight={({ tintColor }) => (
                        <Pressable
                            onPress={() => setShowFilters(true)}
                            className={clsx(
                                "w-10 h-10 rounded-full items-center justify-center",
                                hasAppliedFilters
                                    ? "bg-blue-50"
                                    : "bg-transparent",
                            )}
                        >
                            <FilterIcon
                                size={22}
                                color={
                                    hasAppliedFilters ? "#2563EB" : tintColor
                                }
                            />
                            {hasAppliedFilters ? (
                                <View className="absolute right-1.5 top-1.5 min-w-4 h-4 rounded-full bg-blue-600 px-1 items-center justify-center">
                                    <Text className="text-[9px] leading-3 font-kumbhBold text-white">
                                        {appliedFilterCount}
                                    </Text>
                                </View>
                            ) : null}
                        </Pressable>
                    )}
                />

                {/* Search + Add */}
                <View className="mt-3 flex-row items-center gap-3">
                    <View className="flex-1 flex-row items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 h-12">
                        <Search size={18} color="#6B7280" />
                        <TextInput
                            value={query}
                            onChangeText={setQuery}
                            placeholder="Search name, client, email, agreement"
                            placeholderTextColor="#9CA3AF"
                            className="flex-1 text-[15px] font-kumbh text-gray-800"
                            returnKeyType="search"
                        />
                    </View>

                    <Pressable
                        onPress={() =>
                            router.push("/(admin)/partnerships/create")
                        }
                        className="flex-row items-center justify-center gap-1 bg-primary-50 border border-primary-100 rounded-xl px-2 h-12"
                    >
                        <Plus size={18} color="#111827" />
                        <Text className="text-sm font-kumbh text-text">
                            Add
                        </Text>
                    </Pressable>
                </View>

                {/* Tabs */}
                <View className="mt-6 flex-row items-center justify-around gap-8 px-1">
                    {(["all", "finance", "non-finance"] as const).map((t) => (
                        <Pressable
                            key={t}
                            onPress={() => switchTab(t)}
                            className="items-center"
                        >
                            <Text
                                className={`text-base font-kumbh ${
                                    tab === t
                                        ? "text-blue-600 font-kumbhBold"
                                        : "text-gray-600"
                                }`}
                            >
                                {labelForTab(t)}
                            </Text>
                            {tab === t ? (
                                <View className="h-[3px] w-16 bg-blue-300 rounded-full mt-1" />
                            ) : (
                                <View className="h-[3px] w-16 mt-1" />
                            )}
                        </Pressable>
                    ))}
                </View>
            </View>

            {/* List */}
            <FlatList
                data={loading && pagedList.length === 0 ? [] : pagedList}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                    <PartnershipRow
                        item={item}
                        onPress={(id) =>
                            router.push({
                                pathname: "/(admin)/partnerships/create",
                                params: { id },
                            })
                        }
                        onDelete={(id) => {
                            dispatch(deletePartnership(id))
                                .unwrap()
                                .catch((err) =>
                                    console.error("Delete error:", err),
                                );
                        }}
                    />
                )}
                ListEmptyComponent={
                    <View className="flex-1 items-center justify-center px-4 py-10">
                        {loading && !refreshing ? (
                            <ActivityIndicator size="large" color="#4c5fab" />
                        ) : (
                            <>
                                <Text className="font-kumbhBold text-lg text-gray-700">
                                    No partnerships found
                                </Text>
                                <Text className="mt-2 text-center font-kumbh text-gray-500">
                                    {hasAppliedFilters
                                        ? "Try adjusting your filters"
                                        : "Create a new partnership to get started"}
                                </Text>
                            </>
                        )}
                    </View>
                }
                contentContainerStyle={{
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                    />
                }
            />

            <FilterModal
                open={showFilters}
                status={status}
                sortBy={sortBy}
                sortOrder={sortOrder}
                limit={limit}
                onClose={() => setShowFilters(false)}
                onChange={(s) => setStatus(s)}
                onClear={() => {
                    setStatus(undefined);
                    setSortBy("createdAt");
                    setSortOrder("desc");
                    setLimit(10);
                    setPage(1);
                }}
                onSortByChange={setSortBy}
                onSortOrderChange={setSortOrder}
                onLimitChange={setLimit}
            />

            {totalPages > 1 && (
                <View className="border-t border-gray-200 px-5 py-3 bg-white">
                    <View className="flex-row items-center justify-between">
                        <Pressable
                            disabled={!canPrev}
                            onPress={() => gotoPage(currentPage - 1)}
                            className={`px-4 py-2 rounded-xl border ${
                                canPrev ? "bg-white" : "bg-gray-100"
                            }`}
                        >
                            <Text
                                className={`font-kumbh ${
                                    canPrev ? "text-gray-800" : "text-gray-400"
                                }`}
                            >
                                Prev
                            </Text>
                        </Pressable>

                        <Text className="font-kumbh text-gray-700">
                            Page {currentPage} / {totalPages} •{" "}
                            {totalPartnerships} partnerships
                        </Text>

                        <Pressable
                            disabled={!canNext}
                            onPress={() => gotoPage(currentPage + 1)}
                            className={`px-4 py-2 rounded-xl border ${
                                canNext ? "bg-white" : "bg-gray-100"
                            }`}
                        >
                            <Text
                                className={`font-kumbh ${
                                    canNext ? "text-gray-800" : "text-gray-400"
                                }`}
                            >
                                Next
                            </Text>
                        </Pressable>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}

function PartnershipRow({
    item,
    onPress,
    onDelete,
}: {
    item: Partnership;
    onPress: (id: string) => void;
    onDelete: (id: string) => void;
}) {
    const name = item.name || "Unknown";
    const badgeText = item.status ? capitalize(item.status) : "—";
    const badgeStyle =
        item.status === "closed"
            ? "bg-red-100 text-red-700"
            : item.status === "pending"
              ? "bg-yellow-100 text-yellow-700"
              : item.status === "active"
                ? "bg-green-100 text-green-700"
                : item.status === "inactive"
                  ? "bg-gray-100 text-gray-700"
                  : "bg-gray-100 text-gray-700";

    return (
        <Pressable
            onPress={() => onPress(item._id)}
            className="py-1 border rounded-xl border-gray-200 px-3 my-1"
        >
            <Row label="Name" value={name} />
            <Row label="Client" value={item.clientName ?? "—"} />

            <Row
                label="Email"
                value={item.email ?? "—"}
                actions={
                    item.email
                        ? [
                              {
                                  icon: Mail,
                                  onPress: () => openEmail(item.email),
                                  label: "Email partner",
                              },
                          ]
                        : undefined
                }
            />

            <Row
                label="Phone"
                value={item.phoneNumber ?? "—"}
                actions={
                    item.phoneNumber
                        ? [
                              {
                                  icon: Phone,
                                  onPress: () => dialPhone(item.phoneNumber),
                                  label: "Call partner",
                              },
                              {
                                  icon: MessageCircle,
                                  onPress: () => openWhatsApp(item.phoneNumber),
                                  label: "Message on WhatsApp",
                              },
                          ]
                        : undefined
                }
            />

            <Row label="Agreement" value={item.partnershipAgreement ?? "—"} />
            <Row label="Created At" value={formatDateTime(item.createdAt)} />
            <Row label="Updated At" value={formatDateTime(item.updatedAt)} />

            <Row
                label="Status"
                right={
                    <View className={`px-3 py-1 rounded-full ${badgeStyle}`}>
                        <Text className="text-xs font-kumbhBold">
                            {badgeText}
                        </Text>
                    </View>
                }
            />

            <Row
                label="Type"
                value="Finance"
                right={
                    <View
                        className={clsx(
                            "px-3 py-1 rounded-full",
                            item.isFinance
                                ? "bg-purple-100 text-purple-700"
                                : "bg-gray-100 text-gray-700",
                        )}
                    >
                        <Text className="text-xs font-kumbhBold">
                            {item.isFinance ? "Finance" : "Non-Finance"}
                        </Text>
                    </View>
                }
            />
        </Pressable>
    );
}

type RowAction = {
    icon: React.ComponentType<{ size?: number; color?: string }>;
    onPress: () => void;
    label?: string;
};

function Row({
    label,
    value,
    actions,
    right,
}: {
    label: string;
    value?: string;
    actions?: RowAction[];
    right?: React.ReactNode;
}) {
    return (
        <View className="flex-row items-center py-2">
            {/* Fixed label column */}
            <Text
                className="w-28 text-base text-gray-700 font-kumbh"
                numberOfLines={1}
            >
                {label}
            </Text>

            {/* Right column (important: min-w-0 so ellipsis works in flex layouts) */}
            <View className="flex-1 flex-row items-center justify-end min-w-0">
                {right ? (
                    right
                ) : (
                    <Text
                        className="flex-1 min-w-0 text-base text-text font-kumbhBold text-right"
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {value ?? "—"}
                    </Text>
                )}

                {actions?.length ? (
                    <View className="flex-row items-center ml-3">
                        {actions.map((action, index) => (
                            <Pressable
                                key={`${label}-${index}`}
                                onPress={(event: any) => {
                                    event?.stopPropagation?.();
                                    action.onPress();
                                }}
                                className="w-9 h-9 rounded-full border border-gray-200 bg-white items-center justify-center ml-2"
                                accessibilityLabel={action.label}
                            >
                                <action.icon size={16} color="#111827" />
                            </Pressable>
                        ))}
                    </View>
                ) : null}
            </View>
        </View>
    );
}

type FilterModalProps = {
    open: boolean;
    status: string | undefined;
    sortBy: string;
    sortOrder: "asc" | "desc";
    limit: number;
    onClose: () => void;
    onChange: (status: string | undefined) => void;
    onClear: () => void;
    onSortByChange: (value: string) => void;
    onSortOrderChange: (value: "asc" | "desc") => void;
    onLimitChange: (value: number) => void;
};

function FilterModal({
    open,
    status,
    sortBy,
    sortOrder,
    limit,
    onClose,
    onChange,
    onClear,
    onSortByChange,
    onSortOrderChange,
    onLimitChange,
}: FilterModalProps) {
    const activeCount = [
        status,
        sortBy && sortBy !== "createdAt" ? sortBy : undefined,
        sortOrder && sortOrder !== "desc" ? sortOrder : undefined,
        limit && limit !== 10 ? limit : undefined,
    ].filter(Boolean).length;

    return (
        <BottomSheetModal
            visible={open}
            onRequestClose={onClose}
            showActionRow={false}
        >
            <View className="mb-4 flex-row items-center justify-between">
                <View>
                    <Text className="text-xl font-kumbhBold text-gray-900">
                        Filter Partnerships
                    </Text>
                    <Text className="mt-1 text-xs font-kumbh text-gray-500">
                        {activeCount
                            ? `${activeCount} active filter${activeCount > 1 ? "s" : ""}`
                            : "No filters applied"}
                    </Text>
                </View>
                <Pressable
                    onPress={onClose}
                    className="h-9 w-9 items-center justify-center rounded-full bg-gray-100"
                    accessibilityLabel="Close filters"
                >
                    <X size={17} color="#374151" />
                </Pressable>
            </View>

            <Field label="Status">
                <PillGroup
                    options={["All", ...STATUS_OPTS]}
                    value={status ?? "All"}
                    onChange={(v) =>
                        onChange(v === "All" ? undefined : (v as any))
                    }
                />
            </Field>

            <Field label="Sort by">
                <PillGroup
                    options={["createdAt", "updatedAt", "name", "clientName"]}
                    value={sortBy}
                    onChange={onSortByChange}
                />
            </Field>

            <Field label="Order">
                <PillGroup
                    options={["desc", "asc"]}
                    value={sortOrder}
                    onChange={(v) => onSortOrderChange(v as "asc" | "desc")}
                />
            </Field>

            <Field label="Limit">
                <PillGroup
                    options={LIMIT_OPTIONS.map(String)}
                    value={String(limit)}
                    onChange={(v) => onLimitChange(Number(v))}
                />
            </Field>

            <View className="mt-6 flex-row gap-3">
                <Pressable
                    onPress={onClear}
                    className="flex-1 items-center justify-center rounded-lg border-2 border-gray-200 py-3"
                >
                    <Text className="font-kumbhBold text-gray-700">Clear</Text>
                </Pressable>
                <Pressable
                    onPress={onClose}
                    className="flex-1 items-center justify-center rounded-lg bg-primary py-3"
                >
                    <Text className="font-kumbhBold text-white">Apply</Text>
                </Pressable>
            </View>
        </BottomSheetModal>
    );
}

function Field({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <View className="mb-6">
            <Text className="mb-3 text-sm font-kumbhBold text-gray-900">
                {label}
            </Text>
            {children}
        </View>
    );
}

interface PillGroupProps {
    options: string[];
    value: string;
    onChange: (v: string) => void;
    scrollable?: boolean;
}

function PillGroup({ options, value, onChange }: PillGroupProps) {
    return (
        <FlatList
            data={options}
            scrollEnabled={false}
            numColumns={3}
            columnWrapperStyle={{ gap: 8, marginBottom: 8 }}
            renderItem={({ item }) => {
                const active = item === value;
                return (
                    <Pressable
                        onPress={() => onChange(item)}
                        className={`flex-1 px-3.5 py-2 rounded-full border ${
                            active
                                ? "bg-primary/10 border-primary/50"
                                : "bg-white border-gray-200"
                        }`}
                    >
                        <Text
                            className={`text-xs font-kumbh text-center ${
                                active
                                    ? "text-primary font-kumbhBold"
                                    : "text-gray-700"
                            }`}
                        >
                            {filterLabel(item)}
                        </Text>
                    </Pressable>
                );
            }}
            keyExtractor={(x) => x}
        />
    );
}

function labelForTab(t: TabKey) {
    if (t === "all") return "All";
    if (t === "finance") return "Finance";
    return "Non-Finance";
}

function filterLabel(value: string) {
    const labels: Record<string, string> = {
        All: "All",
        active: "Active",
        inactive: "Inactive",
        pending: "Pending",
        closed: "Closed",
        createdAt: "Created At",
        updatedAt: "Updated At",
        name: "Name",
        clientName: "Client Name",
        asc: "Ascending",
        desc: "Descending",
        "10": "10",
        "20": "20",
        "50": "50",
        "100": "100",
    };
    return labels[value] ?? value;
}

function capitalize(s?: string) {
    if (!s) return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatMoney(n?: number) {
    const amount = typeof n === "number" ? n : 0;
    try {
        return new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: "NGN",
            maximumFractionDigits: 0,
        }).format(amount);
    } catch {
        return String(amount);
    }
}

function formatDateTime(value?: string) {
    if (!value) return "—";
    const dt = new Date(value);
    if (isNaN(dt.getTime())) return "—";
    return dt.toLocaleString();
}
