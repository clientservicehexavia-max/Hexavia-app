import BottomSheetModal from "@/components/ui/BottomSheetModal";
import { useRouter } from "expo-router";
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
    selectAllClients,
    selectClientFilters,
    selectClientsLoading,
} from "@/redux/client/client.selectors";
import { setClientFilters } from "@/redux/client/client.slice";
import { fetchAllClients } from "@/redux/client/client.thunks";
import type { Client, ClientFilters } from "@/redux/client/client.types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { dialPhone, openEmail, openWhatsApp } from "@/utils/contact";
import clsx from "clsx";

const STATUS_OPTS = ["active", "closed"] as const;
const SORTBY_OPTS = ["createdAt", "updatedAt", "payableAmount"] as const;
const ORDER_OPTS = ["desc", "asc"] as const;
const LIMIT_OPTS = [10, 20, 50, 100] as const;
type TabKey = "all" | "active" | "closed";

function useDebounced<T>(value: T, ms: number) {
    const [deb, setDeb] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDeb(value), ms);
        return () => clearTimeout(t);
    }, [value, ms]);
    return deb;
}

type RangeKey = "24H" | "7D" | "30D" | "1Y";

function getSinceDate(range: RangeKey) {
    const d = new Date();
    if (range === "24H") d.setHours(d.getHours() - 24);
    if (range === "7D") d.setDate(d.getDate() - 7);
    if (range === "30D") d.setDate(d.getDate() - 30);
    if (range === "1Y") d.setFullYear(d.getFullYear() - 1);
    return d;
}

function getClientDate(c: any): Date | null {
    const raw =
        c?.createdAt ?? c?.created_at ?? c?.updatedAt ?? c?.updated_at ?? null;
    if (!raw) return null;
    const dt = new Date(raw);
    return isNaN(dt.getTime()) ? null : dt;
}

function normalizeClientStatus(status?: string) {
    if (!status) return status;
    if (status.toLowerCase() === "current") return "active";
    if (status.toLowerCase() === "completed" || status.toLowerCase() === "past")
        return "closed";
    return status;
}

export default function ClientsIndex() {
    const clients = useAppSelector(selectAllClients);
    // ...existing code...
    // Normalize engagement values: trim, lowercase, remove punctuation, collapse spaces, etc.
    function normalizeEngagement(val: string): string {
        return val
            .trim()
            .toLowerCase()
            .replace(/[\s_-]+/g, " ")
            .replace(/[^a-z0-9 ]/g, "")
            .replace(/ +/g, " ")
            .replace(/^./, (c) => c.toUpperCase());
    }

    const dynamicEngagementOpts = useMemo(() => {
        const map = new Map<string, string>();
        clients.forEach((c) => {
            if (c.engagement) {
                const norm = normalizeEngagement(c.engagement);
                if (norm && !map.has(norm)) {
                    map.set(norm, c.engagement);
                }
            }
        });
        // Prefer the first original value for each normalized key
        return Array.from(map.values()).sort();
    }, [clients]);
    const router = useRouter();
    const dispatch = useAppDispatch();
    const isIOS = Platform.OS === "ios";

    const [range, setRange] = useState<RangeKey>("30D");
    const SEARCH_LIMIT = 100;

    const loading = useAppSelector(selectClientsLoading);
    const filters = useAppSelector(selectClientFilters);
    const activeStatus =
        filters.status === "pending" ? undefined : filters.status;

    const [tab, setTab] = useState<TabKey>("all");
    const [refreshing, setRefreshing] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [query, setQuery] = useState("");
    const debouncedQuery = useDebounced(query, 300);
    const didBootstrapRef = useRef(false);

    const [form, setForm] = useState<ClientFilters>({
        status: undefined,
        industry: undefined,
        engagement: undefined,
        sortBy: "createdAt",
        sortOrder: "desc",
        limit: 10,
        page: 1,
        createdAtFrom: undefined,
        createdAtTo: undefined,
        updatedAtFrom: undefined,
        updatedAtTo: undefined,
    });

    useEffect(() => {
        if (filters.status === "pending") {
            dispatch(setClientFilters({ status: undefined, page: 1 }));
            return;
        }

        const normalized = normalizeClientStatus(filters.status);
        if (normalized !== filters.status) {
            dispatch(setClientFilters({ status: normalized, page: 1 }));
        }
    }, [dispatch, filters.status]);

    useEffect(() => {
        setForm({
            status: filters.status,
            industry: filters.industry,
            engagement: filters.engagement,
            sortBy: (filters.sortBy as any) ?? "createdAt",
            sortOrder: filters.sortOrder ?? "desc",
            limit: filters.limit ?? 10,
            page: filters.page ?? 1,
            createdAtFrom: filters.createdAtFrom,
            createdAtTo: filters.createdAtTo,
            updatedAtFrom: filters.updatedAtFrom,
            updatedAtTo: filters.updatedAtTo,
        });
    }, [filters, showFilters]);

    useEffect(() => {
        if (didBootstrapRef.current) return;
        didBootstrapRef.current = true;
        dispatch(fetchAllClients());
    }, [dispatch]);

    const switchTab = useCallback(
        (next: TabKey) => {
            setTab(next);
            const status = next === "all" ? undefined : next;
            const nextFilters: ClientFilters = { ...filters, status, page: 1 };
            const nextKey = JSON.stringify(nextFilters);
            const currentKey = JSON.stringify(filters);
            if (nextKey !== currentKey) dispatch(setClientFilters(nextFilters));
        },
        [dispatch, filters],
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await dispatch(fetchAllClients()).unwrap();
        } finally {
            setRefreshing(false);
        }
    }, [dispatch]);

    const list = useMemo(() => {
        const since = getSinceDate(range);

        let base = clients.filter((c: any) => {
            const dt = getClientDate(c);
            if (!dt) return true;
            return dt >= since;
        });

        // Filter by createdAt range
        if (filters.createdAtFrom || filters.createdAtTo) {
            base = base.filter((c: any) => {
                const dt = new Date(c.createdAt ?? c.created_at ?? null);
                if (
                    filters.createdAtFrom &&
                    dt < new Date(filters.createdAtFrom)
                )
                    return false;
                if (filters.createdAtTo && dt > new Date(filters.createdAtTo))
                    return false;
                return true;
            });
        }
        // Filter by updatedAt range
        if (filters.updatedAtFrom || filters.updatedAtTo) {
            base = base.filter((c: any) => {
                const dt = new Date(c.updatedAt ?? c.updated_at ?? null);
                if (
                    filters.updatedAtFrom &&
                    dt < new Date(filters.updatedAtFrom)
                )
                    return false;
                if (filters.updatedAtTo && dt > new Date(filters.updatedAtTo))
                    return false;
                return true;
            });
        }

        if (activeStatus) {
            base = base.filter(
                (c: any) => normalizeClientStatus(c.status) === activeStatus,
            );
        }

        if (filters.industry) {
            const industry = String(filters.industry).toLowerCase();
            base = base.filter(
                (c: any) => String(c.industry ?? "").toLowerCase() === industry,
            );
        }

        if (filters.engagement) {
            const engagement = String(filters.engagement).toLowerCase();
            base = base.filter(
                (c: any) =>
                    String(c.engagement ?? "").toLowerCase() === engagement,
            );
        }

        const sortBy = filters.sortBy ?? "createdAt";
        const sortOrder = filters.sortOrder ?? "desc";
        base = [...base].sort((a: any, b: any) => {
            const direction = sortOrder === "asc" ? 1 : -1;

            if (sortBy === "payableAmount") {
                const av = Number(a?.payableAmount ?? 0);
                const bv = Number(b?.payableAmount ?? 0);
                return (av - bv) * direction;
            }

            if (sortBy === "updatedAt" || sortBy === "createdAt") {
                const ad = new Date(a?.[sortBy] ?? 0).getTime() || 0;
                const bd = new Date(b?.[sortBy] ?? 0).getTime() || 0;
                return (ad - bd) * direction;
            }

            const av = String(a?.[sortBy] ?? "").toLowerCase();
            const bv = String(b?.[sortBy] ?? "").toLowerCase();
            if (av < bv) return -1 * direction;
            if (av > bv) return 1 * direction;
            return 0;
        });

        if (!debouncedQuery.trim()) return base;

        const q = debouncedQuery.trim().toLowerCase();
        return base.filter((c: any) =>
            [
                c.name,
                c.projectName,
                c.email,
                c.industry,
                c.status,
                String(c.payableAmount ?? ""),
            ]
                .join(" ")
                .toLowerCase()
                .includes(q),
        );
    }, [
        clients,
        debouncedQuery,
        filters.engagement,
        filters.industry,
        filters.sortBy,
        filters.sortOrder,
        activeStatus,
        range,
    ]);

    const pageSize = filters.limit ?? 10;
    const totalClients = list.length;
    const totalPages = Math.max(1, Math.ceil(totalClients / pageSize));
    const currentPage = Math.min(Math.max(filters.page ?? 1, 1), totalPages);

    const pagedList = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return list.slice(start, start + pageSize);
    }, [list, currentPage, pageSize]);

    useEffect(() => {
        if ((filters.page ?? 1) !== currentPage) {
            dispatch(setClientFilters({ page: currentPage }));
        }
    }, [currentPage, dispatch, filters.page]);

    const canPrev = currentPage > 1;
    const canNext = currentPage < totalPages;

    const gotoPage = (page: number) => {
        const next = { ...filters, page };
        if (page !== currentPage) dispatch(setClientFilters(next));
    };

    const appliedFilterCount = useMemo(
        () =>
            [
                activeStatus,
                filters.industry,
                filters.engagement,
                filters.sortBy && filters.sortBy !== "createdAt"
                    ? filters.sortBy
                    : undefined,
                filters.sortOrder && filters.sortOrder !== "desc"
                    ? filters.sortOrder
                    : undefined,
                filters.limit && filters.limit !== 10
                    ? filters.limit
                    : undefined,
                filters.createdAtFrom,
                filters.createdAtTo,
                filters.updatedAtFrom,
                filters.updatedAtTo,
            ].filter(Boolean).length,
        [
            activeStatus,
            filters.createdAtFrom,
            filters.createdAtTo,
            filters.engagement,
            filters.industry,
            filters.limit,
            filters.sortBy,
            filters.sortOrder,
            filters.updatedAtFrom,
            filters.updatedAtTo,
        ],
    );

    const hasAppliedFilters = appliedFilterCount > 0;

    const clearFilters = useCallback(() => {
        const cleared: ClientFilters = {
            page: 1,
            limit: 10,
            sortOrder: "desc",
            sortBy: "createdAt",
            status: undefined,
            industry: undefined,
            engagement: undefined,
            createdAtFrom: undefined,
            createdAtTo: undefined,
            updatedAtFrom: undefined,
            updatedAtTo: undefined,
        };

        if (JSON.stringify(cleared) !== JSON.stringify(filters)) {
            dispatch(setClientFilters(cleared));
        }
        setTab("all");
        setForm(cleared);
        setShowFilters(false);
    }, [dispatch, filters]);

    const dynamicIndustryOpts = useMemo(() => {
        const set = new Set<string>();
        clients.forEach((c: any) => c.industry && set.add(c.industry));
        const arr = Array.from(set);
        if (arr.length === 0)
            return ["Technology", "Finance", "Health", "Education", "Other"];
        return arr;
    }, [clients]);

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
                    title="Hexavia Clients"
                    headerRight={({ tintColor }) => (
                        <Pressable
                            onPress={() => setShowFilters(true)}
                            className={clsx(
                                "w-10 h-10 rounded-full items-center justify-center ios:mr-3",
                                hasAppliedFilters
                                    ? "bg-blue-50"
                                    : "bg-transparent",
                            )}
                        >
                            <FilterIcon
                                size={22}
                                color={hasAppliedFilters ? "#2563EB" : tintColor}
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
                    headerLeft={() => null}
                />

                {/* Search + Add */}
                <View className="mt-3 flex-row items-center gap-3">
                    <View className="flex-1 flex-row items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 h-12">
                        <Search size={18} color="#6B7280" />
                        <TextInput
                            value={query}
                            onChangeText={setQuery}
                            placeholder="Search name, project, email, industry"
                            placeholderTextColor="#9CA3AF"
                            className="flex-1 text-[15px] font-kumbh text-gray-800"
                            returnKeyType="search"
                        />
                    </View>

                    <Pressable
                        onPress={() => router.push("/(admin)/clients/create")}
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
                    {(["all", "active", "closed"] as const).map((t) => (
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

                <View className="mt-4">
                    <RangeTabs
                        value={range}
                        onChange={(v) => {
                            setRange(v);
                            // reset to page 1 because range changes result set
                            dispatch(setClientFilters({ ...filters, page: 1 }));
                        }}
                    />
                </View>

                {hasAppliedFilters ? (
                    <View className="mt-3 flex-row items-center justify-between rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
                        <Text className="text-xs font-kumbh text-blue-700">
                            {appliedFilterCount} filter
                            {appliedFilterCount > 1 ? "s" : ""} active
                        </Text>
                        <Pressable
                            onPress={clearFilters}
                            className="flex-row items-center gap-1 rounded-full bg-white px-3 py-1.5"
                        >
                            <X size={13} color="#2563EB" />
                            <Text className="text-xs font-kumbhBold text-blue-700">
                                Clear
                            </Text>
                        </Pressable>
                    </View>
                ) : null}
            </View>

            {loading && clients.length === 0 ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator />
                    <Text className="mt-2 text-gray-500 font-kumbh">
                        Loading clients…
                    </Text>
                </View>
            ) : (
                <>
                    <FlatList
                        data={pagedList}
                        keyExtractor={(item) => item._id}
                        contentContainerStyle={{
                            paddingBottom: totalPages > 1 ? 100 : 20,
                            paddingHorizontal: 16,
                        }}
                        keyboardShouldPersistTaps="handled"
                        removeClippedSubviews
                        initialNumToRender={10}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                            />
                        }
                        renderItem={({ item }) => (
                            <View className="bg-white border border-gray-200 rounded-xl p-4 my-1">
                                <ClientRow
                                    item={item}
                                    onPress={(id) =>
                                        router.push({
                                            pathname: "/(admin)/clients/[id]",
                                            params: { id },
                                        })
                                    }
                                />
                            </View>
                        )}
                        ListEmptyComponent={
                            <View className="px-5 py-16">
                                <Text className="text-center text-gray-500 font-kumbh">
                                    No clients found.
                                </Text>
                            </View>
                        }
                    />

                    {totalPages > 1 && !query.trim() && (
                        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-5 py-3">
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
                                            canPrev
                                                ? "text-gray-800"
                                                : "text-gray-400"
                                        }`}
                                    >
                                        Prev
                                    </Text>
                                </Pressable>

                                <Text className="font-kumbh text-gray-700">
                                    Page {currentPage} / {totalPages} •{" "}
                                    {totalClients} clients
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
                                            canNext
                                                ? "text-gray-800"
                                                : "text-gray-400"
                                        }`}
                                    >
                                        Next
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    )}
                </>
            )}

            <FilterModal
                open={showFilters}
                form={form}
                industryOptions={dynamicIndustryOpts}
                engagementOptions={dynamicEngagementOpts}
                onClose={() => setShowFilters(false)}
                onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
                onApply={() => {
                    const next: ClientFilters = {
                        ...filters,
                        ...form,
                        page: 1,
                    };
                    if (!next.status) delete next.status;
                    if (JSON.stringify(next) !== JSON.stringify(filters)) {
                        dispatch(setClientFilters(next));
                    }
                    setShowFilters(false);
                }}
                onClear={clearFilters}
            />
        </SafeAreaView>
    );
}

function ClientRow({
    item,
    onPress,
}: {
    item: Client;
    onPress: (id: string) => void;
}) {
    const name = item.name || "Unknown";
    const createdAt = (item as any).createdAt ?? (item as any).created_at;
    const updatedAt = (item as any).updatedAt ?? (item as any).updated_at;
    const badgeText = item.status
        ? capitalize(normalizeClientStatus(item.status))
        : "—";
    const badgeStyle =
        item.status === "closed" ||
        item.status === "completed" ||
        item.status === "past"
            ? "bg-blue-100 text-blue-700"
            : item.status === "pending"
              ? "bg-yellow-100 text-yellow-700"
              : item.status === "active" || item.status === "current"
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-700";

    return (
        <Pressable onPress={() => onPress(item._id)} className="py-1">
            <Row label="Name" value={name} />
            <Row label="Project" value={item.projectName ?? "—"} />

            <Row
                label="Email"
                value={item.email ?? "—"}
                actions={
                    item.email
                        ? [
                              {
                                  icon: Mail,
                                  onPress: () => openEmail(item.email),
                                  label: "Email client",
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
                                  label: "Call client",
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

            <Row label="Industry" value={item.industry ?? "—"} />
            <Row label="Engagement" value={item.engagement ?? "—"} />
            <Row label="Receivable" value={formatMoney(item.payableAmount)} />
            <Row label="Created At" value={formatDateTime(createdAt)} />
            <Row label="Updated At" value={formatDateTime(updatedAt)} />

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
                                onPress={(event) => {
                                    event.stopPropagation();
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
    form: ClientFilters;
    industryOptions: string[];
    engagementOptions: string[];
    onClose: () => void;
    onChange: (patch: Partial<ClientFilters>) => void;
    onApply: () => void;
    onClear: () => void;
};

function FilterModal({
    open,
    form,
    industryOptions,
    engagementOptions,
    onClose,
    onChange,
    onApply,
    onClear,
}: FilterModalProps) {
    const activeCount = [
        form.status,
        form.industry,
        form.engagement,
        form.sortBy && form.sortBy !== "createdAt" ? form.sortBy : undefined,
        form.sortOrder && form.sortOrder !== "desc"
            ? form.sortOrder
            : undefined,
        form.limit && form.limit !== 10 ? form.limit : undefined,
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
                        Filter Clients
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
                    value={form.status ?? "All"}
                    onChange={(v) =>
                        onChange({
                            status: v === "All" ? undefined : (v as any),
                        })
                    }
                />
            </Field>

            <Field label="Industry">
                <PillGroup
                    options={["Any", ...industryOptions]}
                    value={form.industry ?? "Any"}
                    onChange={(v) =>
                        onChange({
                            industry: v === "Any" ? undefined : v,
                        })
                    }
                    scrollable
                />
            </Field>

            <Field label="Engagement">
                <PillGroup
                    options={["Any", ...engagementOptions]}
                    value={form.engagement ?? "Any"}
                    onChange={(v) =>
                        onChange({
                            engagement: v === "Any" ? undefined : v,
                        })
                    }
                    scrollable
                />
            </Field>

            <Field label="Sort by">
                <PillGroup
                    options={[...SORTBY_OPTS]}
                    value={(form.sortBy as any) ?? "createdAt"}
                    onChange={(v) => onChange({ sortBy: v as any })}
                />
            </Field>

            <Field label="Order">
                <PillGroup
                    options={[...ORDER_OPTS]}
                    value={form.sortOrder ?? "desc"}
                    onChange={(v) =>
                        onChange({ sortOrder: v as "asc" | "desc" })
                    }
                />
            </Field>

            <Field label="Limit">
                <PillGroup
                    options={LIMIT_OPTS.map(String)}
                    value={String(form.limit ?? 10)}
                    onChange={(v) => onChange({ limit: parseInt(v, 10) })}
                />
            </Field>

            {/* Actions */}
            <View className="flex-row items-center justify-between border-t border-gray-100 pt-4 mt-2">
                <Pressable
                    onPress={onClear}
                    className="h-11 px-4 rounded-xl border border-gray-200 items-center justify-center"
                >
                    <Text className="font-kumbh text-gray-700">Clear</Text>
                </Pressable>
                <View className="flex-row gap-3">
                    <Pressable
                        onPress={onClose}
                        className="h-11 px-4 rounded-xl border border-gray-200 items-center justify-center"
                    >
                        <Text className="font-kumbh text-gray-700">Cancel</Text>
                    </Pressable>
                    <Pressable
                        onPress={onApply}
                        className="h-11 px-5 rounded-xl bg-blue-600 items-center justify-center"
                    >
                        <Text className="font-kumbhBold text-white">Apply</Text>
                    </Pressable>
                </View>
            </View>

            <View className="h-3" />
        </BottomSheetModal>
    );
}

export function Field({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <View className="mb-3">
            <Text className="text-[13px] font-kumbhBold text-gray-700 mb-1.5">
                {label}
            </Text>
            {children}
        </View>
    );
}

function PillGroup({
    options,
    value,
    onChange,
    scrollable,
}: {
    options: string[];
    value: string;
    onChange: (v: string) => void;
    scrollable?: boolean;
}) {
    const content = (
        <View className="flex-row flex-wrap gap-2">
            {options.map((opt) => {
                const active = opt === value;
                return (
                    <Pressable
                        key={opt}
                        onPress={() => onChange(opt)}
                        className={`px-3.5 py-2 rounded-full border ${
                            active
                                ? "bg-primary/10 border-primary/50"
                                : "bg-white border-gray-200"
                        }`}
                    >
                        <Text
                            className={`text-xs font-kumbh ${active ? "text-primary font-kumbhBold" : "text-gray-700"}`}
                        >
                            {filterLabel(opt)}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );

    if (!scrollable) return content;

    return (
        <FlatList
            data={options}
            keyExtractor={(x) => x}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2"
            renderItem={({ item }) => {
                const active = item === value;
                return (
                    <Pressable
                        onPress={() => onChange(item)}
                        className={`px-3.5 py-2 rounded-full border ${
                            active
                                ? "bg-primary/10 border-primary/50"
                                : "bg-white border-gray-200"
                        }`}
                    >
                        <Text
                            className={`text-xs font-kumbh ${active ? "text-primary font-kumbhBold" : "text-gray-700"}`}
                        >
                            {filterLabel(item)}
                        </Text>
                    </Pressable>
                );
            }}
        />
    );
}

function labelForTab(t: TabKey) {
    if (t === "all") return "All";
    if (t === "active") return "Active";
    return "Closed";
}

function filterLabel(value: string) {
    const labels: Record<string, string> = {
        All: "All",
        Any: "Any",
        active: "Active",
        closed: "Closed",
        createdAt: "Created",
        updatedAt: "Updated",
        payableAmount: "Receivable",
        desc: "Descending",
        asc: "Ascending",
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

function RangeTabs({
    value,
    onChange,
}: {
    value: RangeKey;
    onChange: (v: RangeKey) => void;
}) {
    const options: RangeKey[] = ["24H", "7D", "30D", "1Y"];

    return (
        <View className="flex-row bg-white border border-gray-200 rounded-xl p-1">
            {options.map((opt) => {
                const active = opt === value;
                return (
                    <Pressable
                        key={opt}
                        onPress={() => onChange(opt)}
                        className={clsx(
                            "flex-1 py-2 rounded-xl items-center justify-center",
                            active ? "bg-gray-900" : "bg-transparent",
                        )}
                    >
                        <Text
                            className={clsx(
                                "font-kumbh text-sm",
                                active ? "text-white" : "text-gray-700",
                            )}
                        >
                            {opt}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}
