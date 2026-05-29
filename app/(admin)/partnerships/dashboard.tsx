import Tile from "@/components/admin/Tile";
import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import {
    selectAllDeals,
    selectDealError,
    selectDealLoading,
} from "@/redux/deal/deal.selectors";
import { fetchDeals } from "@/redux/deal/deal.thunks";
import type { Deal } from "@/redux/deal/deal.types";
import {
    selectAllPartners,
    selectPartnerError,
    selectPartnerLoading,
} from "@/redux/partner/partner.selectors";
import { fetchPartners } from "@/redux/partner/partner.thunks";
import type { Partner } from "@/redux/partner/partner.types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useRouter } from "expo-router";
import {
    BarChart3,
    FileText,
    FolderKanban,
    Plus,
    Users,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const STAGES: Deal["stage"][] = [
    "Introduced",
    "Meeting Booked",
    "Proposal Sent",
    "Negotiation",
    "Closed Won",
    "Closed Lost",
    "On Hold",
];

const formatAmount = (value?: number) => {
    if (value === undefined || value === null || Number.isNaN(value)) {
        return "—";
    }

    return new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 0,
    }).format(value);
};

const formatDate = (value?: string) => {
    if (!value) return "—";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString();
};

const getCommissionSnapshot = (deal: Deal) => {
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
};

const stageTone: Record<Deal["stage"], string> = {
    Introduced: "border-blue-100 bg-blue-50",
    "Meeting Booked": "border-indigo-100 bg-indigo-50",
    "Proposal Sent": "border-violet-100 bg-violet-50",
    Negotiation: "border-amber-100 bg-amber-50",
    "Closed Won": "border-emerald-100 bg-emerald-50",
    "Closed Lost": "border-rose-100 bg-rose-50",
    "On Hold": "border-slate-200 bg-slate-50",
};

function Section({
    title,
    action,
    children,
}: {
    title: string;
    action?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <View className="mb-6">
            <View className="flex-row items-center justify-between mb-3">
                <Text className="text-lg font-kumbhBold text-gray-900">
                    {title}
                </Text>
                {action}
            </View>
            {children}
        </View>
    );
}

function SummaryCard({
    label,
    value,
    sub,
    tone = "blue",
}: {
    label: string;
    value: string;
    sub?: string;
    tone?: "blue" | "emerald" | "amber" | "violet" | "rose" | "slate";
}) {
    const toneClass = {
        blue: "border-blue-100 bg-blue-50",
        emerald: "border-emerald-100 bg-emerald-50",
        amber: "border-amber-100 bg-amber-50",
        violet: "border-violet-100 bg-violet-50",
        rose: "border-rose-100 bg-rose-50",
        slate: "border-slate-200 bg-slate-50",
    }[tone];

    return (
        <View className={`w-[48%] rounded-xl border p-3 ${toneClass}`}>
            <Text className="text-xs font-kumbh text-gray-500">{label}</Text>
            <Text className="mt-2 text-xl font-kumbhBold text-gray-900">
                {value}
            </Text>
            {sub ? (
                <Text className="mt-1 text-xs font-kumbh text-gray-500">
                    {sub}
                </Text>
            ) : null}
        </View>
    );
}

function EmptyState({ label }: { label: string }) {
    return (
        <View className="rounded-xl border border-dashed border-gray-200 p-4">
            <Text className="text-center text-sm font-kumbh text-gray-500">
                {label}
            </Text>
        </View>
    );
}

function ActionButton({
    label,
    icon,
    onPress,
}: {
    label: string;
    icon: React.ReactNode;
    onPress: () => void;
}) {
    return (
        <Pressable
            onPress={onPress}
            className="w-[48%] h-12 rounded-xl bg-[#4C5FAB] items-center justify-center flex-row"
        >
            {icon}
            <Text className="ml-2 text-sm font-kumbhBold text-white">
                {label}
            </Text>
        </Pressable>
    );
}

export default function PartnershipDashboard() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const isIOS = Platform.OS === "ios";

    const deals = useAppSelector(selectAllDeals);
    const partners = useAppSelector(selectAllPartners);
    const dealsLoading = useAppSelector(selectDealLoading);
    const partnersLoading = useAppSelector(selectPartnerLoading);
    const dealError = useAppSelector(selectDealError);
    const partnerError = useAppSelector(selectPartnerError);

    const [refreshing, setRefreshing] = useState(false);

    const partnerById = useMemo(() => {
        const map = new Map<string, Partner>();
        partners.forEach((partner) => map.set(partner._id, partner));
        return map;
    }, [partners]);

    const loadDashboard = useCallback(async () => {
        setRefreshing(true);
        try {
            await Promise.all([
                dispatch(fetchDeals({ page: 1, limit: 100 })).unwrap(),
                dispatch(fetchPartners({ page: 1, limit: 100 })).unwrap(),
            ]);
        } finally {
            setRefreshing(false);
        }
    }, [dispatch]);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    const dashboard = useMemo(() => {
        const closedWon = deals.filter((deal) => deal.stage === "Closed Won");
        const openDeals = deals.filter(
            (deal) =>
                deal.stage !== "Closed Won" && deal.stage !== "Closed Lost",
        );

        const totalDealValue = deals.reduce(
            (sum, deal) => sum + Number(deal.expectedDealValue || 0),
            0,
        );

        const totalCommissionsDue = deals.reduce(
            (sum, deal) => sum + getCommissionSnapshot(deal).due,
            0,
        );

        const totalCommissionsPaid = deals.reduce(
            (sum, deal) => sum + getCommissionSnapshot(deal).paid,
            0,
        );

        const outstandingBalance = deals.reduce(
            (sum, deal) => sum + getCommissionSnapshot(deal).outstanding,
            0,
        );

        const pipeline = STAGES.map((stage) => ({
            stage,
            count: deals.filter((deal) => deal.stage === stage).length,
        }));

        const recentDeals = [...deals]
            .sort(
                (a, b) =>
                    new Date(b.updatedAt || b.createdAt).getTime() -
                    new Date(a.updatedAt || a.createdAt).getTime(),
            )
            .slice(0, 5);

        const topPartners = partners
            .map((partner) => {
                const partnerDeals = deals.filter(
                    (deal) => deal.partnerId === partner._id,
                );
                const partnerClosedWon = partnerDeals.filter(
                    (deal) => deal.stage === "Closed Won",
                );
                const partnerRevenue = partnerDeals.reduce(
                    (sum, deal) => sum + Number(deal.expectedDealValue || 0),
                    0,
                );

                return {
                    partner,
                    totalDeals: partnerDeals.length,
                    closedWonDeals: partnerClosedWon.length,
                    revenue: partnerRevenue,
                };
            })
            .filter((item) => item.totalDeals > 0)
            .sort(
                (a, b) =>
                    b.closedWonDeals - a.closedWonDeals ||
                    b.revenue - a.revenue ||
                    b.totalDeals - a.totalDeals,
            )
            .slice(0, 5);

        const pendingReconciliations = deals
            .filter((deal) => {
                const financial = deal.financialReconciliation;
                const outstanding = getCommissionSnapshot(deal).outstanding;
                return (
                    outstanding > 0 ||
                    financial?.paymentStatus === "Pending" ||
                    financial?.paymentStatus === "Part Paid" ||
                    financial?.approvalStatus === "Pending"
                );
            })
            .slice(0, 5);

        return {
            closedWon,
            openDeals,
            totalDealValue,
            totalCommissionsDue,
            totalCommissionsPaid,
            outstandingBalance,
            pipeline,
            recentDeals,
            topPartners,
            pendingReconciliations,
        };
    }, [deals, partners]);

    const loading = (dealsLoading || partnersLoading) && !refreshing;

    const showReportPlaceholder = (label: string) => {
        Alert.alert(
            label,
            "Report generation will be connected when the reporting endpoint is available.",
        );
    };

    return (
        <SafeAreaView
            className="flex-1 bg-white"
            edges={
                isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]
            }
        >
            <PlatformAdaptiveHeader title="Partnership Dashboard" />

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#4C5FAB" />
                </View>
            ) : (
                <ScrollView
                    className="flex-1"
                    contentContainerClassName="px-4 pb-8"
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={loadDashboard}
                        />
                    }
                    showsVerticalScrollIndicator={false}
                >
                    {dealError || partnerError ? (
                        <View className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3">
                            <Text className="text-sm font-kumbh text-red-700">
                                {dealError || partnerError}
                            </Text>
                        </View>
                    ) : null}

                    <View className="flex-row gap-2 mb-6">
                        <Tile
                            title="Partners"
                            icon={<Users size={20} color="white" />}
                            onPress={() =>
                                router.push("/(admin)/partnerships/partners")
                            }
                        />

                        <Tile
                            title="Deals"
                            icon={<FolderKanban size={20} color="white" />}
                            onPress={() =>
                                router.push("/(admin)/partnerships/deals")
                            }
                        />
                    </View>

                    <Section title="Summary">
                        <View className="flex-row flex-wrap gap-3">
                            <SummaryCard
                                label="Total Partners"
                                value={String(partners.length)}
                                tone="blue"
                            />
                            <SummaryCard
                                label="Total Deals"
                                value={String(deals.length)}
                                tone="violet"
                            />
                            <SummaryCard
                                label="Closed Won Deals"
                                value={String(dashboard.closedWon.length)}
                                tone="emerald"
                            />
                            <SummaryCard
                                label="Open Opportunities"
                                value={String(dashboard.openDeals.length)}
                                tone="amber"
                            />
                            <SummaryCard
                                label="Total Deal Value"
                                value={formatAmount(dashboard.totalDealValue)}
                                tone="slate"
                            />
                            <SummaryCard
                                label="Commissions Due"
                                value={formatAmount(
                                    dashboard.totalCommissionsDue,
                                )}
                                tone="violet"
                            />
                            <SummaryCard
                                label="Commissions Paid"
                                value={formatAmount(
                                    dashboard.totalCommissionsPaid,
                                )}
                                tone="emerald"
                            />
                            <SummaryCard
                                label="Outstanding Balance"
                                value={formatAmount(
                                    dashboard.outstandingBalance,
                                )}
                                tone="rose"
                            />
                        </View>
                    </Section>

                    <Section title="Deal Pipeline">
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                        >
                            <View className="flex-row gap-3">
                                {dashboard.pipeline.map((item) => (
                                    <View
                                        key={item.stage}
                                        className={`w-32 rounded-xl border p-3 ${stageTone[item.stage]}`}
                                    >
                                        <Text
                                            className="text-xs font-kumbh text-gray-500"
                                            numberOfLines={2}
                                        >
                                            {item.stage}
                                        </Text>
                                        <Text className="mt-2 text-2xl font-kumbhBold text-gray-900">
                                            {item.count}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </ScrollView>
                    </Section>

                    <Section
                        title="Recent Deals"
                        action={
                            <Pressable
                                onPress={() =>
                                    router.push("/(admin)/partnerships/deals")
                                }
                            >
                                <Text className="text-sm font-kumbhBold text-[#4C5FAB]">
                                    View all
                                </Text>
                            </Pressable>
                        }
                    >
                        {dashboard.recentDeals.length === 0 ? (
                            <EmptyState label="No recent deals yet." />
                        ) : (
                            dashboard.recentDeals.map((deal) => {
                                const partner = partnerById.get(deal.partnerId);
                                return (
                                    <Pressable
                                        key={deal._id}
                                        onPress={() =>
                                            router.push(
                                                `/(admin)/partnerships/deals/${deal._id}`,
                                            )
                                        }
                                        className="mb-2 rounded-xl border border-gray-200 p-3"
                                    >
                                        <View className="flex-row items-start justify-between">
                                            <View className="flex-1 pr-3">
                                                <Text
                                                    className="font-kumbhBold text-gray-900"
                                                    numberOfLines={1}
                                                >
                                                    {deal.title}
                                                </Text>
                                                <Text
                                                    className="mt-1 text-sm font-kumbh text-gray-500"
                                                    numberOfLines={1}
                                                >
                                                    {partner?.name ||
                                                        "Unknown partner"}
                                                </Text>
                                            </View>
                                            <Text className="text-xs font-kumbhBold text-[#4C5FAB]">
                                                {deal.stage}
                                            </Text>
                                        </View>
                                        <Text className="mt-2 text-xs font-kumbh text-gray-500">
                                            Owner: {deal.assignedOwner || "—"} •
                                            Updated:{" "}
                                            {formatDate(deal.updatedAt)}
                                        </Text>
                                    </Pressable>
                                );
                            })
                        )}
                    </Section>

                    <Section title="Top Performing Partners">
                        {dashboard.topPartners.length === 0 ? (
                            <EmptyState label="No partner performance data yet." />
                        ) : (
                            dashboard.topPartners.map((item) => (
                                <View
                                    key={item.partner._id}
                                    className="mb-2 rounded-xl border border-gray-200 p-3"
                                >
                                    <Text
                                        className="font-kumbhBold text-gray-900"
                                        numberOfLines={1}
                                    >
                                        {item.partner.name}
                                    </Text>
                                    <Text className="mt-1 text-sm font-kumbh text-gray-500">
                                        {item.totalDeals} deals •{" "}
                                        {item.closedWonDeals} closed won
                                    </Text>
                                    <Text className="mt-1 text-sm font-kumbhBold text-gray-900">
                                        Revenue: {formatAmount(item.revenue)}
                                    </Text>
                                </View>
                            ))
                        )}
                    </Section>

                    <Section title="Pending Financial Reconciliations">
                        {dashboard.pendingReconciliations.length === 0 ? (
                            <EmptyState label="No pending financial reconciliations." />
                        ) : (
                            dashboard.pendingReconciliations.map((deal) => {
                                const financial = deal.financialReconciliation;
                                const partner = partnerById.get(deal.partnerId);
                                const commission = getCommissionSnapshot(deal);
                                return (
                                    <Pressable
                                        key={deal._id}
                                        onPress={() =>
                                            router.push(
                                                `/(admin)/partnerships/deals/${deal._id}`,
                                            )
                                        }
                                        className="mb-2 rounded-xl border border-amber-200 bg-amber-50 p-3"
                                    >
                                        <Text
                                            className="font-kumbhBold text-gray-900"
                                            numberOfLines={1}
                                        >
                                            {deal.title}
                                        </Text>
                                        <Text
                                            className="mt-1 text-sm font-kumbh text-gray-600"
                                            numberOfLines={1}
                                        >
                                            {partner?.name || "Unknown partner"}
                                        </Text>
                                        <Text className="mt-2 text-sm font-kumbh text-gray-700">
                                            Outstanding:{" "}
                                            {formatAmount(
                                                commission.outstanding,
                                            )}
                                        </Text>
                                        <Text className="mt-1 text-xs font-kumbh text-gray-600">
                                            Payment:{" "}
                                            {financial?.paymentStatus ||
                                                "Not Due"}{" "}
                                            • Approval:{" "}
                                            {financial?.approvalStatus ||
                                                "Pending"}
                                        </Text>
                                    </Pressable>
                                );
                            })
                        )}
                    </Section>

                    <Section title="Quick Actions">
                        <View className="flex-row flex-wrap gap-3">
                            <ActionButton
                                label="Add Partner"
                                icon={<Users size={18} color="white" />}
                                onPress={() =>
                                    router.push(
                                        "/(admin)/partnerships/partners-create",
                                    )
                                }
                            />
                            <ActionButton
                                label="Add Deal"
                                icon={<Plus size={18} color="white" />}
                                onPress={() =>
                                    router.push(
                                        "/(admin)/partnerships/deals/create",
                                    )
                                }
                            />
                            <ActionButton
                                label="Deal Report"
                                icon={<BarChart3 size={18} color="white" />}
                                onPress={() =>
                                    showReportPlaceholder(
                                        "Generate Deal Report",
                                    )
                                }
                            />
                            <ActionButton
                                label="Partner Report"
                                icon={<FileText size={18} color="white" />}
                                onPress={() =>
                                    showReportPlaceholder(
                                        "Generate Partner Report",
                                    )
                                }
                            />
                        </View>
                    </Section>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
