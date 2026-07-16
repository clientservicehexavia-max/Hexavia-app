import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Filter, Handshake, Plus, Wallet, X } from "lucide-react-native";
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
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
    selectAllDeals,
    selectDealError,
    selectDealLoading,
} from "@/redux/deal/deal.selectors";
import { fetchDeals } from "@/redux/deal/deal.thunks";
import type { Deal } from "@/redux/deal/deal.types";
import { selectAllPartners } from "@/redux/partner/partner.selectors";
import { fetchPartners } from "@/redux/partner/partner.thunks";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const STAGES = [
    "All",
    "Introduced",
    "Meeting Booked",
    "Proposal Sent",
    "Negotiation",
    "Closed Won",
    "Closed Lost",
    "On Hold",
] as const;

const INTRODUCTION_TYPES = [
    "New Lead",
    "Investor Introduction",
    "Client Introduction",
    "Vendor/Supplier Introduction",
    "Strategic Relationship",
] as const;

const DEAL_SOURCES = [
    "Brought by Us",
    "Brought by Partner",
    "Jointly Sourced",
] as const;

const AGREEMENT_TYPES = [
    "Percentage Commission",
    "Fixed Fee",
    "Equity/Shareholding",
    "Revenue Share",
    "Non-Financial Partnership",
] as const;

const RECURRING_FREQUENCIES = ["monthly", "quarterly", "yearly"] as const;

const PAYMENT_STATUSES = [
    "Not Due",
    "Pending",
    "Part Paid",
    "Fully Paid",
    "Disputed",
] as const;

const APPROVAL_STATUSES = ["Pending", "Approved", "Rejected"] as const;

const RELATIONSHIP_STRENGTHS = [
    "Weak",
    "Moderate",
    "Strong",
    "Very Strong",
] as const;

const VALUE_RATINGS = [
    "Low Value",
    "Medium Value",
    "High Value",
    "Strategic Value",
] as const;

const DOCUMENT_TYPES = [
    "agreement",
    "invoice",
    "receipt",
    "supporting",
] as const;

const SORT_OPTIONS = [
    { label: "Created: newest first", value: "createdAt_desc" },
    { label: "Created: oldest first", value: "createdAt_asc" },
    { label: "Updated: newest first", value: "updatedAt_desc" },
    { label: "Updated: oldest first", value: "updatedAt_asc" },
] as const;

type DealFilters = {
    introductionType?: string;
    dealSource?: string;
    agreementType?: string;
    recurringRevenue?: "yes" | "no";
    recurringFrequency?: string;
    paymentStatus?: string;
    approvalStatus?: string;
    relationshipStrength?: string;
    valueRating?: string;
    documentType?: string;
    tag?: string;
    activityType?: string;
    contributionType?: string;
    createdBy?: string;
    sortOrder?: (typeof SORT_OPTIONS)[number]["value"];
};

type DashboardView =
    | "open"
    | "dealValue"
    | "commissionsDue"
    | "commissionsPaid"
    | "outstanding";

const formatAmount = (value?: number) => {
    if (value === undefined || value === null || Number.isNaN(value))
        return "—";
    return new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 2,
    }).format(value);
};

const stageTone: Record<string, string> = {
    Introduced: "bg-blue-50 text-blue-700 border-blue-100",
    "Meeting Booked": "bg-indigo-50 text-indigo-700 border-indigo-100",
    "Proposal Sent": "bg-violet-50 text-violet-700 border-violet-100",
    Negotiation: "bg-amber-50 text-amber-700 border-amber-100",
    "Closed Won": "bg-emerald-50 text-emerald-700 border-emerald-100",
    "Closed Lost": "bg-red-50 text-red-700 border-red-100",
    "On Hold": "bg-gray-100 text-gray-700 border-gray-200",
};

function InfoItem({
    label,
    value,
    icon,
}: {
    label: string;
    value: string;
    icon?: React.ReactNode;
}) {
    return (
        <View className="flex-1 min-w-[46%] rounded-lg bg-gray-50 px-3 py-2">
            <View className="flex-row items-center mb-1">
                {icon}
                <Text className="text-[11px] text-gray-500 font-medium ml-1">
                    {label}
                </Text>
            </View>
            <Text
                className="text-sm text-gray-900 font-semibold"
                numberOfLines={1}
            >
                {value || "—"}
            </Text>
        </View>
    );
}

function useDebounced<T>(value: T, ms: number) {
    const [deb, setDeb] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDeb(value), ms);
        return () => clearTimeout(t);
    }, [value, ms]);
    return deb;
}

function Pill({
    label,
    active,
    onPress,
}: {
    label: string;
    active: boolean;
    onPress: () => void;
}) {
    return (
        <Pressable
            onPress={onPress}
            className={`px-3 py-2 justify-center items-center rounded-full border ${
                active
                    ? "bg-blue-500 border-blue-500"
                    : "bg-white border-gray-200"
            }`}
        >
            <Text
                className={`text-sm font-medium ${
                    active ? "text-white" : "text-gray-700"
                }`}
            >
                {label}
            </Text>
        </Pressable>
    );
}

function FilterSection({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <View className="mb-5">
            <Text className="text-sm font-semibold text-gray-900 mb-2">
                {title}
            </Text>
            {children}
        </View>
    );
}

function ChoiceGroup({
    options,
    value,
    onChange,
}: {
    options: { label: string; value: string }[];
    value?: string;
    onChange: (value?: string) => void;
}) {
    return (
        <View className="flex-row flex-wrap gap-2">
            <Pressable
                onPress={() => onChange(undefined)}
                className={`px-3 py-2 rounded-full border ${
                    !value
                        ? "bg-blue-500 border-blue-500"
                        : "bg-white border-gray-200"
                }`}
            >
                <Text
                    className={`text-xs font-semibold ${
                        !value ? "text-white" : "text-gray-700"
                    }`}
                >
                    Any
                </Text>
            </Pressable>
            {options.map((option) => {
                const active = value === option.value;
                return (
                    <Pressable
                        key={option.value}
                        onPress={() =>
                            onChange(active ? undefined : option.value)
                        }
                        className={`px-3 py-2 rounded-full border ${
                            active
                                ? "bg-blue-500 border-blue-500"
                                : "bg-white border-gray-200"
                        }`}
                    >
                        <Text
                            className={`text-xs font-semibold capitalize ${
                                active ? "text-white" : "text-gray-700"
                            }`}
                        >
                            {option.label}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

function getPartnerReturn(deal: Deal) {
    return (
        deal.expectedPartnerReturn ??
        deal.agreedFixedAmount ??
        (deal.expectedDealValue && deal.agreedPercentage
            ? (deal.expectedDealValue * deal.agreedPercentage) / 100
            : undefined)
    );
}

function getCommissionSnapshot(deal: Deal) {
    const financial = deal.financialReconciliation;
    const due =
        financial?.agreedAmount ??
        deal.expectedPartnerReturn ??
        deal.agreedFixedAmount ??
        (deal.expectedDealValue && deal.agreedPercentage
            ? (deal.expectedDealValue * deal.agreedPercentage) / 100
            : 0);
    const paid = Number(financial?.amountPaid || 0);
    const outstanding =
        financial?.balanceOutstanding !== undefined
            ? Number(financial.balanceOutstanding || 0)
            : Math.max(Number(due || 0) - paid, 0);

    return {
        due: Number(due || 0),
        paid,
        outstanding,
    };
}

function firstParam(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value;
}

function parseDashboardView(value: string | string[] | undefined) {
    const next = firstParam(value);
    return [
        "open",
        "dealValue",
        "commissionsDue",
        "commissionsPaid",
        "outstanding",
    ].includes(next || "")
        ? (next as DashboardView)
        : undefined;
}

function parseStage(value: string | string[] | undefined) {
    const next = firstParam(value);
    return STAGES.includes(next as (typeof STAGES)[number]) && next !== "All"
        ? next
        : undefined;
}

function toOptions(values: readonly string[]) {
    return values.map((value) => ({ label: value, value }));
}

function uniqueOptions(values: (string | undefined)[]) {
    return Array.from(
        new Set(
            values.map((value) => value?.trim()).filter(Boolean) as string[],
        ),
    )
        .sort((a, b) => a.localeCompare(b))
        .map((value) => ({ label: value, value }));
}

function hasTextMatch(value: string | undefined, query: string) {
    return value?.toLowerCase().includes(query) ?? false;
}

export default function DealsList() {
    const router = useRouter();
    const params = useLocalSearchParams<{
        stage?: string;
        dashboardView?: DashboardView;
    }>();
    const dispatch = useAppDispatch();
    const isIOS = Platform.OS === "ios";

    const deals = useAppSelector(selectAllDeals);
    const partners = useAppSelector(selectAllPartners);
    const loading = useAppSelector(selectDealLoading);
    const error = useAppSelector(selectDealError);

    const [query, setQuery] = useState("");
    const [stage, setStage] = useState<string | undefined>(() =>
        parseStage(params.stage),
    );
    const [dashboardView, setDashboardView] = useState<
        DashboardView | undefined
    >(() => parseDashboardView(params.dashboardView));
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState<DealFilters>({});
    const [refreshing, setRefreshing] = useState(false);
    const didInitialLoadRef = useRef(false);

    const debouncedQuery = useDebounced(query, 300);

    const partnerNameById = useMemo(() => {
        const map = new Map<string, string>();
        partners.forEach((partner) => {
            map.set(
                partner._id,
                partner.company
                    ? `${partner.name} (${partner.company})`
                    : partner.name,
            );
        });
        return map;
    }, [partners]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await Promise.all([
                dispatch(
                    fetchDeals({
                        search: debouncedQuery,
                        stage: stage,
                        limit: 50,
                        page: 1,
                    }),
                ).unwrap(),
                dispatch(fetchPartners({ limit: 100, page: 1 })).unwrap(),
            ]);
        } catch (err: any) {
            console.error("Error fetching deals:", err);
            // show friendly message if backend returns not found
            Alert.alert("Error fetching deals", err?.message || String(err));
        } finally {
            setRefreshing(false);
        }
    }, [dispatch, debouncedQuery, stage]);

    useFocusEffect(
        useCallback(() => {
            onRefresh();
        }, [onRefresh]),
    );

    useEffect(() => {
        if (!didInitialLoadRef.current) {
            didInitialLoadRef.current = true;
            return;
        }

        onRefresh();
    }, [debouncedQuery, stage, onRefresh]);

    const filterOptions = useMemo(() => {
        const activityTypes = deals.flatMap(
            (deal) =>
                deal.activities?.map((activity) => activity.activityType) ?? [],
        );
        const contributionTypes = deals.flatMap(
            (deal) =>
                deal.contributionLogs?.map(
                    (contribution) => contribution.contributionType,
                ) ?? [],
        );
        const tags = deals.flatMap((deal) => deal.tags ?? []);

        return {
            createdBy: uniqueOptions(deals.map((deal) => deal.createdBy)),
            activityTypes: uniqueOptions(activityTypes),
            contributionTypes: uniqueOptions(contributionTypes),
            tags: uniqueOptions(tags),
        };
    }, [deals]);

    const activeFilterCount = useMemo(() => {
        const modalFilterCount = Object.values(filters).filter((value) =>
            String(value ?? "").trim(),
        ).length;
        return modalFilterCount + (dashboardView ? 1 : 0);
    }, [dashboardView, filters]);

    const resetFilters = useCallback(() => {
        setStage(undefined);
        setDashboardView(undefined);
        setFilters({});
    }, []);

    const handleStageChange = useCallback((nextStage?: string) => {
        setDashboardView(undefined);
        setStage(nextStage);
    }, []);

    const updateFilter = useCallback(
        <K extends keyof DealFilters>(key: K, value: DealFilters[K]) => {
            setFilters((current) => ({
                ...current,
                [key]: value?.toString().trim() ? value : undefined,
            }));
        },
        [],
    );

    const filtered = useMemo(() => {
        const normalizedQuery = debouncedQuery.trim().toLowerCase();

        const list = deals.filter((d) => {
            const partnerName = partnerNameById.get(d.partnerId);
            const matchesQuery =
                !normalizedQuery ||
                [
                    d.title,
                    partnerName,
                    d.introductionType,
                    d.dealSource,
                    d.assignedOwner,
                    d.stage,
                    d.agreementType,
                    d.description,
                    d.recurringFrequency,
                    d.financialReconciliation?.paymentStatus,
                    d.financialReconciliation?.approvalStatus,
                    d.createdBy,
                    d.updatedBy,
                    d.nonFinancialContribution?.brandVisibilityCreated,
                    d.nonFinancialContribution?.followUpSupport,
                    d.nonFinancialContribution?.relationshipStrength,
                    d.nonFinancialContribution?.contributionNotes,
                    d.nonFinancialContribution?.valueRating,
                    ...(d.tags ?? []),
                    ...(d.activities?.flatMap((activity) => [
                        activity.activityType,
                        activity.note,
                        activity.createdBy,
                    ]) ?? []),
                    ...(d.contributionLogs?.flatMap((contribution) => [
                        contribution.contributionType,
                        contribution.description,
                        contribution.valueRating,
                        contribution.notes,
                    ]) ?? []),
                    ...(d.documents?.flatMap((document) => [
                        document.name,
                        document.type,
                        document.url,
                    ]) ?? []),
                ].some((value) => hasTextMatch(value, normalizedQuery));
            const matchesStage =
                !stage || stage === "All" ? true : d.stage === stage;
            const commission = getCommissionSnapshot(d);
            const matchesDashboardView =
                !dashboardView ||
                (dashboardView === "open" &&
                    d.stage !== "Closed Won" &&
                    d.stage !== "Closed Lost") ||
                (dashboardView === "dealValue" &&
                    Number(d.expectedDealValue || 0) > 0) ||
                (dashboardView === "commissionsDue" && commission.due > 0) ||
                (dashboardView === "commissionsPaid" && commission.paid > 0) ||
                (dashboardView === "outstanding" &&
                    commission.outstanding > 0);

            return (
                matchesQuery &&
                matchesStage &&
                matchesDashboardView &&
                (!filters.introductionType ||
                    d.introductionType === filters.introductionType) &&
                (!filters.dealSource || d.dealSource === filters.dealSource) &&
                (!filters.agreementType ||
                    d.agreementType === filters.agreementType) &&
                (!filters.recurringRevenue ||
                    d.recurringRevenue ===
                        (filters.recurringRevenue === "yes")) &&
                (!filters.recurringFrequency ||
                    d.recurringFrequency === filters.recurringFrequency) &&
                (!filters.paymentStatus ||
                    d.financialReconciliation?.paymentStatus ===
                        filters.paymentStatus) &&
                (!filters.approvalStatus ||
                    d.financialReconciliation?.approvalStatus ===
                        filters.approvalStatus) &&
                (!filters.relationshipStrength ||
                    d.nonFinancialContribution?.relationshipStrength ===
                        filters.relationshipStrength) &&
                (!filters.valueRating ||
                    d.nonFinancialContribution?.valueRating ===
                        filters.valueRating ||
                    d.contributionLogs?.some(
                        (contribution) =>
                            contribution.valueRating === filters.valueRating,
                    )) &&
                (!filters.documentType ||
                    d.documents?.some(
                        (document) => document.type === filters.documentType,
                    )) &&
                (!filters.tag || d.tags?.includes(filters.tag)) &&
                (!filters.activityType ||
                    d.activities?.some(
                        (activity) =>
                            activity.activityType === filters.activityType,
                    )) &&
                (!filters.contributionType ||
                    d.contributionLogs?.some(
                        (contribution) =>
                            contribution.contributionType ===
                            filters.contributionType,
                    )) &&
                (!filters.createdBy || d.createdBy === filters.createdBy)
            );
        });

        if (!filters.sortOrder) return list;

        const [field, direction] = filters.sortOrder.split("_") as [
            "createdAt" | "updatedAt",
            "asc" | "desc",
        ];

        return [...list].sort((a, b) => {
            const first = new Date(a[field]).getTime();
            const second = new Date(b[field]).getTime();
            const safeFirst = Number.isNaN(first) ? 0 : first;
            const safeSecond = Number.isNaN(second) ? 0 : second;
            return direction === "asc"
                ? safeFirst - safeSecond
                : safeSecond - safeFirst;
        });
    }, [
        dashboardView,
        deals,
        debouncedQuery,
        filters,
        partnerNameById,
        stage,
    ]);

    const renderItem = ({ item }: { item: Deal }) => {
        const paymentStatus =
            item.financialReconciliation?.paymentStatus || "Not Due";
        const tone = stageTone[item.stage] || stageTone.Introduced;
        const partnerName =
            partnerNameById.get(item.partnerId) || "Unknown partner";
        const partnerReturn = getPartnerReturn(item);
        const commission = getCommissionSnapshot(item);
        const isFullyPaid = paymentStatus === "Fully Paid";

        return (
            <Pressable
                onPress={() =>
                    router.push(`/(admin)/partnerships/deals/${item._id}`)
                }
                className="bg-white p-3 mb-3 rounded-xl border border-gray-200"
            >
                <View className="flex-row items-start justify-between">
                    <Text
                        className="text-lg font-semibold text-gray-900"
                        numberOfLines={2}
                    >
                        {item.title}
                    </Text>

                    <View className={`px-2.5 py-1 rounded-full border ${tone}`}>
                        <Text className={`text-xs font-semibold ${tone}`}>
                            {item.stage}
                        </Text>
                    </View>
                </View>
                <View className="flex-1 pr-3">
                    <Text
                        className="text-sm text-gray-500 mt-1"
                        numberOfLines={1}
                    >
                        Partner: {partnerName}
                    </Text>
                    <Text
                        className="text-sm text-gray-500 mt-0.5"
                        numberOfLines={1}
                    >
                        {item.introductionType || "No introduction type set"}
                    </Text>
                </View>

                <View className="flex-row flex-wrap gap-2 mt-2">
                    <InfoItem
                        label="Deal value"
                        value={formatAmount(item.expectedDealValue)}
                        icon={<Wallet size={13} color="#6B7280" />}
                    />
                    <InfoItem
                        label="Partner return"
                        value={formatAmount(partnerReturn)}
                        icon={<Handshake size={13} color="#6B7280" />}
                    />
                </View>

                <View className="mt-3 flex-row flex-wrap gap-2">
                    {commission.outstanding > 0 ? (
                        <View className="px-2 py-1 rounded-full bg-rose-50">
                            <Text className="text-xs text-rose-700 font-medium">
                                Outstanding:{" "}
                                {formatAmount(commission.outstanding)}
                            </Text>
                        </View>
                    ) : null}
                    <View
                        className={`px-2 py-1 rounded-full ${
                            isFullyPaid ? "bg-emerald-50" : "bg-blue-50"
                        }`}
                    >
                        <Text
                            className={`text-xs font-medium ${
                                isFullyPaid
                                    ? "text-emerald-700"
                                    : "text-blue-700"
                            }`}
                        >
                            Payment: {paymentStatus}
                        </Text>
                    </View>
                </View>

                {item.tags && item.tags.length > 0 && (
                    <View className="flex-row flex-wrap gap-2 mt-3">
                        {item.tags.slice(0, 3).map((t: string) => (
                            <View
                                key={t}
                                className="bg-blue-100 rounded-full px-2 py-1"
                            >
                                <Text className="text-xs text-blue-800">
                                    {t}
                                </Text>
                            </View>
                        ))}
                        {item.tags.length > 3 ? (
                            <Text className="text-xs text-gray-500 pt-1">
                                +{item.tags.length - 3}
                            </Text>
                        ) : null}
                    </View>
                )}
            </Pressable>
        );
    };

    return (
        <SafeAreaView
            className="flex-1 bg-white"
            edges={
                isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]
            }
        >
            <PlatformAdaptiveHeader
                title="Deals / Opportunities"
                headerRight={({ tintColor }) => (
                    <Pressable
                        onPress={() =>
                            router.push("/(admin)/partnerships/deals/create")
                        }
                        className="w-10 h-10 rounded-full items-center justify-center"
                        hitSlop={8}
                    >
                        <Plus size={28} color={tintColor} />
                    </Pressable>
                )}
            />

            <View className="px-4 pt-1 flex-1">
                <View className="bg-gray-50 rounded-lg px-3 py-2 mb-3 flex-row items-center">
                    <TextInput
                        placeholder="Search deals..."
                        value={query}
                        onChangeText={setQuery}
                        className="flex-1 ml-2 text-base"
                        placeholderTextColor="#999"
                    />
                    <Pressable
                        onPress={() => setShowFilters(true)}
                        className={`ml-2 h-9 px-3 rounded-full flex-row items-center justify-center ${
                            activeFilterCount
                                ? "bg-blue-500"
                                : "bg-white border border-gray-200"
                        }`}
                    >
                        <Filter
                            size={16}
                            color={activeFilterCount ? "#FFFFFF" : "#374151"}
                        />
                        {activeFilterCount ? (
                            <Text className="ml-1 text-xs font-semibold text-white">
                                {activeFilterCount}
                            </Text>
                        ) : null}
                    </Pressable>
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="mb-3"
                    style={{ maxHeight: 36 }}
                    contentContainerStyle={{
                        alignItems: "center",
                        paddingRight: 16,
                    }}
                >
                    <View className="flex-row gap-1.5">
                        {STAGES.map((s) => (
                            <Pill
                                label={s}
                                active={stage === s || (s === "All" && !stage)}
                                key={s}
                                onPress={() =>
                                    handleStageChange(
                                        s === "All" ? undefined : s,
                                    )
                                }
                            />
                        ))}
                    </View>
                </ScrollView>

                {error && (
                    <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                        <Text className="text-red-800 text-sm">{error}</Text>
                    </View>
                )}

                {loading && !refreshing ? (
                    <View className="flex-1 justify-center items-center mt-8">
                        <ActivityIndicator size="large" color="#3b82f6" />
                    </View>
                ) : (
                    <FlatList
                        data={filtered}
                        keyExtractor={(item) => item._id}
                        renderItem={renderItem}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                            />
                        }
                        ListEmptyComponent={
                            <View className="flex-1 justify-center items-center mt-8">
                                <Text className="text-gray-500 text-base">
                                    No deals found
                                </Text>
                            </View>
                        }
                    />
                )}
            </View>

            <Modal
                visible={showFilters}
                transparent
                animationType="slide"
                onRequestClose={() => setShowFilters(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    className="flex-1 justify-end bg-black/40"
                >
                    <View className="bg-white rounded-t-2xl max-h-[88%]">
                        <View className="px-4 py-4 border-b border-gray-100 flex-row items-center justify-between">
                            <View>
                                <Text className="text-lg font-semibold text-gray-900">
                                    Filter deals
                                </Text>
                                <Text className="text-xs text-gray-500 mt-0.5">
                                    {filtered.length} of {deals.length} shown
                                </Text>
                            </View>
                            <Pressable
                                onPress={() => setShowFilters(false)}
                                className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center"
                            >
                                <X size={18} color="#374151" />
                            </Pressable>
                        </View>

                        <ScrollView
                            className="px-4 py-4"
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            <FilterSection title="Opportunity details">
                                <View className="gap-4">
                                    <View>
                                        <Text className="text-xs text-gray-500 mb-2">
                                            Introduction type
                                        </Text>
                                        <ChoiceGroup
                                            options={toOptions(
                                                INTRODUCTION_TYPES,
                                            )}
                                            value={filters.introductionType}
                                            onChange={(value) =>
                                                updateFilter(
                                                    "introductionType",
                                                    value,
                                                )
                                            }
                                        />
                                    </View>
                                    <View>
                                        <Text className="text-xs text-gray-500 mb-2">
                                            Deal source
                                        </Text>
                                        <ChoiceGroup
                                            options={toOptions(DEAL_SOURCES)}
                                            value={filters.dealSource}
                                            onChange={(value) =>
                                                updateFilter(
                                                    "dealSource",
                                                    value,
                                                )
                                            }
                                        />
                                    </View>

                                    <View>
                                        <Text className="text-xs text-gray-500 mb-2">
                                            Agreement type
                                        </Text>
                                        <ChoiceGroup
                                            options={toOptions(AGREEMENT_TYPES)}
                                            value={filters.agreementType}
                                            onChange={(value) =>
                                                updateFilter(
                                                    "agreementType",
                                                    value,
                                                )
                                            }
                                        />
                                    </View>
                                </View>
                            </FilterSection>

                            <FilterSection title="Recurring revenue">
                                <View className="gap-4">
                                    <ChoiceGroup
                                        options={[
                                            { label: "Yes", value: "yes" },
                                            { label: "No", value: "no" },
                                        ]}
                                        value={filters.recurringRevenue}
                                        onChange={(value) =>
                                            updateFilter(
                                                "recurringRevenue",
                                                value as
                                                    | "yes"
                                                    | "no"
                                                    | undefined,
                                            )
                                        }
                                    />
                                    <ChoiceGroup
                                        options={toOptions(
                                            RECURRING_FREQUENCIES,
                                        )}
                                        value={filters.recurringFrequency}
                                        onChange={(value) =>
                                            updateFilter(
                                                "recurringFrequency",
                                                value,
                                            )
                                        }
                                    />
                                </View>
                            </FilterSection>

                            <FilterSection title="Financial reconciliation">
                                <View className="gap-4">
                                    <View>
                                        <Text className="text-xs text-gray-500 mb-2">
                                            Payment status
                                        </Text>
                                        <ChoiceGroup
                                            options={toOptions(
                                                PAYMENT_STATUSES,
                                            )}
                                            value={filters.paymentStatus}
                                            onChange={(value) =>
                                                updateFilter(
                                                    "paymentStatus",
                                                    value,
                                                )
                                            }
                                        />
                                    </View>
                                    <View>
                                        <Text className="text-xs text-gray-500 mb-2">
                                            Approval status
                                        </Text>
                                        <ChoiceGroup
                                            options={toOptions(
                                                APPROVAL_STATUSES,
                                            )}
                                            value={filters.approvalStatus}
                                            onChange={(value) =>
                                                updateFilter(
                                                    "approvalStatus",
                                                    value,
                                                )
                                            }
                                        />
                                    </View>
                                </View>
                            </FilterSection>

                            <FilterSection title="Contributions and documents">
                                <View className="gap-4">
                                    <View>
                                        <Text className="text-xs text-gray-500 mb-2">
                                            Relationship strength
                                        </Text>
                                        <ChoiceGroup
                                            options={toOptions(
                                                RELATIONSHIP_STRENGTHS,
                                            )}
                                            value={filters.relationshipStrength}
                                            onChange={(value) =>
                                                updateFilter(
                                                    "relationshipStrength",
                                                    value,
                                                )
                                            }
                                        />
                                    </View>
                                    <View>
                                        <Text className="text-xs text-gray-500 mb-2">
                                            Value rating
                                        </Text>
                                        <ChoiceGroup
                                            options={toOptions(VALUE_RATINGS)}
                                            value={filters.valueRating}
                                            onChange={(value) =>
                                                updateFilter(
                                                    "valueRating",
                                                    value,
                                                )
                                            }
                                        />
                                    </View>
                                    <View>
                                        <Text className="text-xs text-gray-500 mb-2">
                                            Document type
                                        </Text>
                                        <ChoiceGroup
                                            options={toOptions(DOCUMENT_TYPES)}
                                            value={filters.documentType}
                                            onChange={(value) =>
                                                updateFilter(
                                                    "documentType",
                                                    value,
                                                )
                                            }
                                        />
                                    </View>
                                    <View>
                                        <Text className="text-xs text-gray-500 mb-2">
                                            Activity type
                                        </Text>
                                        <ChoiceGroup
                                            options={
                                                filterOptions.activityTypes
                                            }
                                            value={filters.activityType}
                                            onChange={(value) =>
                                                updateFilter(
                                                    "activityType",
                                                    value,
                                                )
                                            }
                                        />
                                    </View>
                                    <View>
                                        <Text className="text-xs text-gray-500 mb-2">
                                            Contribution type
                                        </Text>
                                        <ChoiceGroup
                                            options={
                                                filterOptions.contributionTypes
                                            }
                                            value={filters.contributionType}
                                            onChange={(value) =>
                                                updateFilter(
                                                    "contributionType",
                                                    value,
                                                )
                                            }
                                        />
                                    </View>
                                    <View>
                                        <Text className="text-xs text-gray-500 mb-2">
                                            Tags
                                        </Text>
                                        <ChoiceGroup
                                            options={filterOptions.tags}
                                            value={filters.tag}
                                            onChange={(value) =>
                                                updateFilter("tag", value)
                                            }
                                        />
                                    </View>
                                </View>
                            </FilterSection>

                            <FilterSection title="Record metadata">
                                <View className="gap-4">
                                    <View>
                                        <Text className="text-xs text-gray-500 mb-2">
                                            Sort order
                                        </Text>
                                        <ChoiceGroup
                                            options={SORT_OPTIONS.map(
                                                (option) => ({
                                                    label: option.label,
                                                    value: option.value,
                                                }),
                                            )}
                                            value={filters.sortOrder}
                                            onChange={(value) =>
                                                updateFilter(
                                                    "sortOrder",
                                                    value as
                                                        | DealFilters["sortOrder"]
                                                        | undefined,
                                                )
                                            }
                                        />
                                    </View>
                                </View>
                            </FilterSection>
                        </ScrollView>

                        <View className="px-4 py-4 border-t border-gray-100 flex-row gap-3">
                            <Pressable
                                onPress={resetFilters}
                                className="flex-1 py-3 rounded-lg bg-gray-100 items-center"
                            >
                                <Text className="text-sm font-semibold text-gray-700">
                                    Reset
                                </Text>
                            </Pressable>
                            <Pressable
                                onPress={() => setShowFilters(false)}
                                className="flex-1 py-3 rounded-lg bg-blue-500 items-center"
                            >
                                <Text className="text-sm font-semibold text-white">
                                    Apply filters
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}
