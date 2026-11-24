import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import { CustomTextInput } from "@/components/ui/CustomInput";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Filter, Handshake, Plus, Search, Wallet, X } from "lucide-react-native";
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
        <View className="flex-1 min-w-[46%] rounded-2xl bg-[#F5F7FB] px-3.5 py-2.5">
            <View className="flex-row items-center mb-1">
                {icon}
                <Text className="text-[11px] text-[#6B7280] font-kumbh ml-1.5">
                    {label}
                </Text>
            </View>
            <Text
                className="text-[14px] text-[#111827] font-kumbhBold"
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
            className={`px-3.5 h-8 justify-center items-center rounded-full border ${
                active
                    ? "bg-[#4C5FAB] border-[#4C5FAB]"
                    : "bg-white border-gray-200"
            }`}
        >
            <Text
                className={`text-xs font-kumbhBold ${
                    active ? "text-white" : "text-[#4B5563]"
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
            <Text className="text-[12px] font-kumbhBold uppercase tracking-wider text-[#6B7280] mb-2.5">
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
                className={`px-3.5 py-2 rounded-full border ${
                    !value
                        ? "bg-[#4C5FAB] border-[#4C5FAB]"
                        : "bg-white border-gray-200"
                }`}
            >
                <Text
                    className={`text-xs font-kumbhBold ${
                        !value ? "text-white" : "text-[#374151]"
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
                        className={`px-3.5 py-2 rounded-full border ${
                            active
                                ? "bg-[#4C5FAB] border-[#4C5FAB]"
                                : "bg-white border-gray-200"
                        }`}
                    >
                        <Text
                            className={`text-xs font-kumbhBold capitalize ${
                                active ? "text-white" : "text-[#374151]"
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
                (dashboardView === "outstanding" && commission.outstanding > 0);

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
    }, [dashboardView, deals, debouncedQuery, filters, partnerNameById, stage]);

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
                className="bg-white p-4 mb-3 rounded-[24px] border border-gray-100 active:opacity-85"
            >
                <View className="flex-row items-start justify-between gap-2">
                    <Text
                        className="flex-1 text-[16px] font-kumbhBold text-[#111827]"
                        numberOfLines={2}
                    >
                        {item.title}
                    </Text>

                    <View className={`px-2.5 py-1 rounded-full border ${tone}`}>
                        <Text className={`text-[11px] font-kumbhBold ${tone}`}>
                            {item.stage}
                        </Text>
                    </View>
                </View>
                <View className="mt-1">
                    <Text
                        className="text-[13px] font-kumbh text-[#6B7280]"
                        numberOfLines={1}
                    >
                        Partner: {partnerName}
                    </Text>
                    <Text
                        className="text-[12px] font-kumbh text-[#9CA3AF] mt-0.5"
                        numberOfLines={1}
                    >
                        {item.introductionType || "No introduction type set"}
                    </Text>
                </View>

                <View className="flex-row flex-wrap gap-2.5 mt-3">
                    <InfoItem
                        label="Deal value"
                        value={formatAmount(item.expectedDealValue)}
                        icon={<Wallet size={13} color="#4C5FAB" />}
                    />
                    <InfoItem
                        label="Partner return"
                        value={formatAmount(partnerReturn)}
                        icon={<Handshake size={13} color="#4C5FAB" />}
                    />
                </View>

                <View className="mt-3 flex-row flex-wrap gap-2">
                    {commission.outstanding > 0 ? (
                        <View className="px-2.5 py-1 rounded-full bg-rose-50">
                            <Text className="text-[11px] text-rose-700 font-kumbhBold">
                                Outstanding:{" "}
                                {formatAmount(commission.outstanding)}
                            </Text>
                        </View>
                    ) : null}
                    <View
                        className={`px-2.5 py-1 rounded-full ${
                            isFullyPaid ? "bg-emerald-50" : "bg-[#EEF2FF]"
                        }`}
                    >
                        <Text
                            className={`text-[11px] font-kumbhBold ${
                                isFullyPaid
                                    ? "text-emerald-700"
                                    : "text-[#4C5FAB]"
                            }`}
                        >
                            Payment: {paymentStatus}
                        </Text>
                    </View>
                </View>

                {item.tags && item.tags.length > 0 && (
                    <View className="flex-row flex-wrap gap-1.5 mt-2.5">
                        {item.tags.slice(0, 3).map((t: string) => (
                            <View
                                key={t}
                                className="bg-[#EEF2FF] rounded-full px-2.5 py-1"
                            >
                                <Text className="text-[11px] font-kumbhBold text-[#4C5FAB]">
                                    {t}
                                </Text>
                            </View>
                        ))}
                        {item.tags.length > 3 ? (
                            <Text className="text-xs font-kumbh text-[#6B7280] pt-1">
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
            className="flex-1 bg-[#F5F7FB]"
            edges={
                isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]
            }
        >
            <PlatformAdaptiveHeader
                title="Deals / Opportunities"
                backgroundColor="#F5F7FB"
                headerRight={() => (
                    <Pressable
                        onPress={() =>
                            router.push("/(admin)/partnerships/deals/create")
                        }
                        className="w-10 h-10 rounded-full items-center justify-center bg-[#4C5FAB] ios:mr-3"
                        hitSlop={8}
                    >
                        <Plus size={20} color="#FFFFFF" />
                    </Pressable>
                )}
            />

            <View className="pt-2 flex-1">
                <View className="px-4">
                    <View className="h-14 bg-white border border-gray-200 rounded-2xl px-3.5 mb-3 flex-row items-center">
                        <Search size={17} color="#6B7280" />
                        <CustomTextInput
                            placeholder="Search deals..."
                            value={query}
                            onChangeText={setQuery}
                            className="flex-1 h-full ml-2.5"
                            returnKeyType="search"
                        />
                        <Pressable
                            onPress={() => setShowFilters(true)}
                            className={`ml-2 h-9 px-3 rounded-full flex-row items-center justify-center border ${
                                activeFilterCount
                                    ? "bg-[#4C5FAB] border-[#4C5FAB]"
                                    : "bg-[#F5F7FB] border-gray-200"
                            }`}
                        >
                            <Filter
                                size={15}
                                color={
                                    activeFilterCount ? "#FFFFFF" : "#374151"
                                }
                            />
                            {activeFilterCount ? (
                                <Text className="ml-1 text-xs font-kumbhBold text-white">
                                    {activeFilterCount}
                                </Text>
                            ) : null}
                        </Pressable>
                    </View>

                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        className="mb-3"
                        style={{ maxHeight: 38 }}
                        contentContainerStyle={{
                            alignItems: "center",
                            paddingRight: 16,
                        }}
                    >
                        <View className="flex-row gap-2">
                            {STAGES.map((s) => (
                                <Pill
                                    label={s}
                                    active={
                                        stage === s || (s === "All" && !stage)
                                    }
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
                </View>

                {error && (
                    <View className="mx-4 bg-red-50 border border-red-100 rounded-2xl px-4 py-3 mb-3">
                        <Text className="text-red-700 text-xs font-kumbh">
                            {error}
                        </Text>
                    </View>
                )}

                {loading && !refreshing ? (
                    <View className="flex-1 justify-center items-center mt-8">
                        <ActivityIndicator size="large" color="#4C5FAB" />
                    </View>
                ) : (
                    <FlatList
                        data={filtered}
                        keyExtractor={(item) => item._id}
                        renderItem={renderItem}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{
                            paddingHorizontal: 16,
                            paddingBottom: 28,
                        }}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                            />
                        }
                        ListEmptyComponent={
                            <View className="mt-2 rounded-[24px] bg-white border border-gray-100 px-5 py-12 items-center">
                                <View className="h-12 w-12 rounded-2xl bg-[#EEF2FF] items-center justify-center mb-3">
                                    <Handshake size={22} color="#4C5FAB" />
                                </View>
                                <Text className="text-[#111827] font-kumbhBold text-base">
                                    No deals found
                                </Text>
                                <Text className="mt-1 text-center text-[#6B7280] font-kumbh text-sm">
                                    Try adjusting your search or filter options.
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
                    <View className="bg-white rounded-t-[28px] pt-3 max-h-[88%]">
                        <View className="w-10 h-1 rounded-full bg-gray-200 self-center mb-3" />
                        <View className="px-5 pb-3.5 border-b border-gray-100 flex-row items-center justify-between">
                            <View>
                                <Text className="text-[18px] font-kumbhBold text-[#111827]">
                                    Filter deals
                                </Text>
                                <Text className="text-xs font-kumbh text-[#6B7280] mt-0.5">
                                    {filtered.length} of {deals.length} shown
                                </Text>
                            </View>
                            <Pressable
                                onPress={() => setShowFilters(false)}
                                className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center"
                            >
                                <X size={17} color="#374151" />
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

                        <View className="px-5 py-4 border-t border-gray-100 flex-row gap-3">
                            <Pressable
                                onPress={resetFilters}
                                className="flex-1 h-12 rounded-2xl bg-gray-100 items-center justify-center"
                            >
                                <Text className="text-sm font-kumbhBold text-[#374151]">
                                    Reset
                                </Text>
                            </Pressable>
                            <Pressable
                                onPress={() => setShowFilters(false)}
                                className="flex-1 h-12 rounded-2xl bg-[#4C5FAB] items-center justify-center"
                            >
                                <Text className="text-sm font-kumbhBold text-white">
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
