import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";

import {
    selectRecruitmentError,
    selectRecruitmentLoading,
    selectRecruitments,
} from "@/redux/recruitment/recruitment.selectors";
import { fetchRecruitments } from "@/redux/recruitment/recruitment.thunks";
import type { RootState } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { normalizeRole } from "@/utils/roles";
import { useRouter } from "expo-router";
import {
    BriefcaseBusiness,
    ChevronRight,
    Users,
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function SummaryCard({
    label,
    value,
    tone,
    onPress,
}: {
    label: string;
    value: string;
    tone: string;
    onPress?: () => void;
}) {
    const Container = onPress ? Pressable : View;
    return (
        <Container
            onPress={onPress}
            className={`w-[48%] rounded-xl border p-3 ${tone}`}
        >
            <Text className="text-sm font-kumbhBold text-gray-500">
                {label}
            </Text>
            <Text className="mt-2 text-lg font-kumbhBold text-gray-900">
                {value}
            </Text>
        </Container>
    );
}

function Section({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <View className="mb-6">
            <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-lg font-kumbhBold text-gray-900">
                    {title}
                </Text>
            </View>
            {children}
        </View>
    );
}

export default function RecruitmentHomeScreen() {
    const isIOS = Platform.OS === "ios";
    const router = useRouter();
    const dispatch = useAppDispatch();
    const recruitments = useAppSelector(selectRecruitments);
    const loading = useAppSelector(selectRecruitmentLoading);
    const error = useAppSelector(selectRecruitmentError);
    const role = useAppSelector((state: RootState) => state.auth.user?.role);
    const currentUser = useAppSelector((state: RootState) => state.auth.user);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        dispatch(fetchRecruitments({ page: 1, limit: 100 }));
    }, [dispatch]);

    const visibleRecruitments = useMemo(() => {
        const recruiterOnly = normalizeRole(role) === "staff";
        return recruitments.filter((item) => {
            if (!recruiterOnly) return true;
            if (
                currentUser?._id &&
                item.recruiterId === String(currentUser._id)
            )
                return true;
            if (
                currentUser?.email &&
                (item.recruiterName || "").toLowerCase() ===
                    String(currentUser.email).toLowerCase()
            )
                return true;
            return false;
        });
    }, [recruitments, role, currentUser?._id, currentUser?.email]);

    const summary = useMemo(() => {
        const totalCandidates = visibleRecruitments.reduce(
            (sum, item) => sum + (item.candidates?.length || 0),
            0,
        );
        const active = visibleRecruitments.filter(
            (item) => item.status === "Active",
        ).length;
        const interview1 = visibleRecruitments.reduce(
            (sum, item) =>
                sum +
                (item.candidates?.filter(
                    (c) => c.currentStage === "Interview 1",
                ).length || 0),
            0,
        );
        const interview2 = visibleRecruitments.reduce(
            (sum, item) =>
                sum +
                (item.candidates?.filter(
                    (c) => c.currentStage === "Interview 2",
                ).length || 0),
            0,
        );
        const physical = visibleRecruitments.reduce(
            (sum, item) =>
                sum +
                (item.candidates?.filter(
                    (c) => c.currentStage === "Physical Interview",
                ).length || 0),
            0,
        );
        const offers = visibleRecruitments.reduce(
            (sum, item) =>
                sum +
                (item.candidates?.filter(
                    (c) =>
                        c.currentStage === "Offered" ||
                        c.overallStatus === "Offered",
                ).length || 0),
            0,
        );
        const employed = visibleRecruitments.reduce(
            (sum, item) =>
                sum +
                (item.candidates?.filter(
                    (c) =>
                        c.currentStage === "Employed" ||
                        c.overallStatus === "Employed",
                ).length || 0),
            0,
        );
        return {
            active,
            totalCandidates,
            interview1,
            interview2,
            physical,
            offers,
            employed,
        };
    }, [visibleRecruitments]);

    const interviewOperations = useMemo(() => {
        const now = new Date();
        const startOfWeek = new Date(now);
        const weekDay = startOfWeek.getDay();
        const mondayOffset = weekDay === 0 ? -6 : 1 - weekDay;
        startOfWeek.setDate(startOfWeek.getDate() + mondayOffset);
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        let upcomingThisWeek = 0;
        let pendingScheduling = 0;
        let offersPendingResponse = 0;

        const toDate = (value?: string) => {
            if (!value) return null;
            const parsed = new Date(value);
            return Number.isNaN(parsed.getTime()) ? null : parsed;
        };

        visibleRecruitments.forEach((recruitment) => {
            (recruitment.candidates || []).forEach((candidate) => {
                const progress = candidate.progress || {};
                const stage = (
                    candidate.currentStage ||
                    candidate.overallStatus ||
                    ""
                ).toLowerCase();

                const interviewDates = [
                    toDate(progress.interview1InviteDate),
                    toDate(progress.interview2InviteDate),
                    toDate(progress.physicalInterviewDate),
                ].filter(Boolean) as Date[];

                interviewDates.forEach((date) => {
                    if (date >= now && date <= endOfWeek) {
                        upcomingThisWeek += 1;
                    }
                });

                if (stage === "interview 1" && !progress.interview1InviteDate) {
                    pendingScheduling += 1;
                }
                if (stage === "interview 2" && !progress.interview2InviteDate) {
                    pendingScheduling += 1;
                }
                if (
                    stage === "physical interview" &&
                    !progress.physicalInterviewDate
                ) {
                    pendingScheduling += 1;
                }

                if (
                    stage === "offered" ||
                    candidate.overallStatus === "Offered"
                ) {
                    const response = String(
                        progress.salaryStatus || progress.employmentStatus || "",
                    ).toLowerCase();
                    const isResponded =
                        response === "accepted" ||
                        response === "rejected" ||
                        response === "employed";
                    if (!isResponded) {
                        offersPendingResponse += 1;
                    }
                }
            });
        });

        return {
            upcomingThisWeek,
            pendingScheduling,
            offersPendingResponse,
        };
    }, [visibleRecruitments]);

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await dispatch(fetchRecruitments({ page: 1, limit: 100 })).unwrap();
        } finally {
            setRefreshing(false);
        }
    };

    const summaryCards = [
        {
            label: "Active Recruitments",
            value: summary.active,
            dotClass: "bg-[#4C5FAB]",
            onPress: () =>
                router.push({
                    pathname: "/(admin)/recruitment/list",
                    params: { status: "Active" },
                }),
        },
        {
            label: "Total Candidates",
            value: summary.totalCandidates,
            dotClass: "bg-violet-500",
            onPress: () => router.push("/(admin)/recruitment/candidates"),
        },
        {
            label: "Interview 1",
            value: summary.interview1,
            dotClass: "bg-amber-500",
            onPress: () =>
                router.push({
                    pathname: "/(admin)/recruitment/candidates",
                    params: { status: "Interview 1" },
                }),
        },
        {
            label: "Interview 2",
            value: summary.interview2,
            dotClass: "bg-emerald-500",
            onPress: () =>
                router.push({
                    pathname: "/(admin)/recruitment/candidates",
                    params: { status: "Interview 2" },
                }),
        },
        {
            label: "Physical Interview",
            value: summary.physical,
            dotClass: "bg-slate-500",
            onPress: () =>
                router.push({
                    pathname: "/(admin)/recruitment/candidates",
                    params: { status: "Physical Interview" },
                }),
        },
        {
            label: "Offers",
            value: summary.offers,
            dotClass: "bg-rose-500",
            onPress: () =>
                router.push({
                    pathname: "/(admin)/recruitment/candidates",
                    params: { status: "Offered" },
                }),
        },
        {
            label: "Employed",
            value: summary.employed,
            dotClass: "bg-green-600",
            onPress: () =>
                router.push({
                    pathname: "/(admin)/recruitment/candidates",
                    params: { status: "Employed" },
                }),
        },
    ];

    const operationCards = [
        {
            label: "Upcoming This Week",
            value: interviewOperations.upcomingThisWeek,
            dotClass: "bg-[#4C5FAB]",
        },
        {
            label: "Pending Scheduling",
            value: interviewOperations.pendingScheduling,
            dotClass: "bg-amber-500",
        },
        {
            label: "Offers Pending Response",
            value: interviewOperations.offersPendingResponse,
            dotClass: "bg-rose-500",
        },
    ];

    return (
        <SafeAreaView
            edges={
                isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]
            }
            className="flex-1 bg-[#F5F7FB]"
        >
            <PlatformAdaptiveHeader
                title="Recruitment Dashboard"
                backgroundColor="#F5F7FB"
            />
            <ScrollView
                className="flex-1"
                contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingTop: 12,
                    paddingBottom: 32,
                }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#4C5FAB"
                    />
                }
            >
                {error ? (
                    <View className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-3.5">
                        <Text className="text-sm font-kumbh text-red-700">
                            {error}
                        </Text>
                    </View>
                ) : null}

                <View className="mb-6 flex-row gap-3">
                    <Pressable
                        onPress={() => router.push("/(admin)/recruitment/list")}
                        className="flex-1 rounded-[24px] border border-gray-100 bg-white p-4 active:opacity-90"
                    >
                        <View className="mb-3 flex-row items-center justify-between">
                            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF2FF]">
                                <BriefcaseBusiness size={20} color="#4C5FAB" />
                            </View>
                            <ChevronRight size={16} color="#9CA3AF" />
                        </View>
                        <Text className="text-[15px] font-kumbhBold text-[#111827]">
                            Campaigns
                        </Text>
                        <Text className="mt-0.5 text-xs font-kumbh text-[#6B7280]">
                            Open & closed roles
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={() =>
                            router.push("/(admin)/recruitment/candidates")
                        }
                        className="flex-1 rounded-[24px] border border-gray-100 bg-white p-4 active:opacity-90"
                    >
                        <View className="mb-3 flex-row items-center justify-between">
                            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF2FF]">
                                <Users size={20} color="#4C5FAB" />
                            </View>
                            <ChevronRight size={16} color="#9CA3AF" />
                        </View>
                        <Text className="text-[15px] font-kumbhBold text-[#111827]">
                            Candidates
                        </Text>
                        <Text className="mt-0.5 text-xs font-kumbh text-[#6B7280]">
                            Pipeline & reviews
                        </Text>
                    </Pressable>
                </View>

                <View className="mb-6">
                    <Text className="mb-3 text-base font-kumbhBold text-[#111827]">
                        Summary
                    </Text>
                    <View className="flex-row flex-wrap justify-between gap-y-3">
                        {summaryCards.map((card) => (
                            <Pressable
                                key={card.label}
                                onPress={card.onPress}
                                style={{ width: "48.5%" }}
                                className="rounded-[22px] border border-gray-100 bg-white p-4 active:opacity-90"
                            >
                                <View className="mb-2 flex-row items-center justify-between">
                                    <View
                                        className={`h-2.5 w-2.5 rounded-full ${card.dotClass}`}
                                    />
                                    <ChevronRight size={14} color="#9CA3AF" />
                                </View>
                                <Text className="text-2xl font-kumbhBold text-[#111827]">
                                    {card.value}
                                </Text>
                                <Text
                                    className="mt-1 text-xs font-kumbh text-[#6B7280]"
                                    numberOfLines={1}
                                >
                                    {card.label}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                </View>

                <View className="mb-4">
                    <Text className="mb-3 text-base font-kumbhBold text-[#111827]">
                        Interview Operations
                    </Text>
                    <View className="flex-row flex-wrap justify-between gap-y-3">
                        {operationCards.map((card) => (
                            <View
                                key={card.label}
                                style={{ width: "48.5%" }}
                                className="rounded-[22px] border border-gray-100 bg-white p-4"
                            >
                                <View
                                    className={`mb-2 h-2.5 w-2.5 rounded-full ${card.dotClass}`}
                                />
                                <Text className="text-2xl font-kumbhBold text-[#111827]">
                                    {card.value}
                                </Text>
                                <Text
                                    className="mt-1 text-xs font-kumbh text-[#6B7280]"
                                    numberOfLines={2}
                                >
                                    {card.label}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>

                {loading ? (
                    <View className="mt-6 items-center">
                        <ActivityIndicator color="#4C5FAB" />
                    </View>
                ) : null}
            </ScrollView>
        </SafeAreaView>
    );
}
