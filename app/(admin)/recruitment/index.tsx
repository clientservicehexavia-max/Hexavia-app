import Tile from "@/components/admin/Tile";
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
import { BriefcaseBusiness, Users } from "lucide-react-native";
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

    return (
        <SafeAreaView
            edges={
                isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]
            }
            className="flex-1 bg-white"
        >
            <PlatformAdaptiveHeader title="Recruitment Dashboard" />
            <ScrollView
                className="flex-1 px-4 pb-8 mt-3"
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                    />
                }
            >
                {error ? (
                    <Text className="mb-3 text-sm text-red-500">{error}</Text>
                ) : null}

                <View className="mb-6 flex-row gap-2">
                    <Tile
                        title="Campaigns"
                        icon={<BriefcaseBusiness size={20} color="white" />}
                        onPress={() =>
                            router.push("/(admin)/recruitment/list")
                        }
                    />
                    <Tile
                        title="Candidates"
                        icon={<Users size={20} color="white" />}
                        onPress={() =>
                            router.push("/(admin)/recruitment/candidates")
                        }
                    />
                </View>

                <Section title="Summary">
                    <View className="flex-row flex-wrap gap-2">
                        <SummaryCard
                            label="Active Recruitments"
                            value={String(summary.active)}
                            tone="border-blue-100 bg-blue-50"
                            onPress={() =>
                                router.push({
                                    pathname: "/(admin)/recruitment/list",
                                    params: { status: "Active" },
                                })
                            }
                        />
                        <SummaryCard
                            label="Total Candidates"
                            value={String(summary.totalCandidates)}
                            tone="border-violet-100 bg-violet-50"
                            onPress={() =>
                                router.push("/(admin)/recruitment/candidates")
                            }
                        />
                        <SummaryCard
                            label="Interview 1"
                            value={String(summary.interview1)}
                            tone="border-amber-100 bg-amber-50"
                            onPress={() =>
                                router.push({
                                    pathname:
                                        "/(admin)/recruitment/candidates",
                                    params: { status: "Interview 1" },
                                })
                            }
                        />
                        <SummaryCard
                            label="Interview 2"
                            value={String(summary.interview2)}
                            tone="border-emerald-100 bg-emerald-50"
                            onPress={() =>
                                router.push({
                                    pathname:
                                        "/(admin)/recruitment/candidates",
                                    params: { status: "Interview 2" },
                                })
                            }
                        />
                        <SummaryCard
                            label="Physical Interview"
                            value={String(summary.physical)}
                            tone="border-slate-200 bg-slate-50"
                            onPress={() =>
                                router.push({
                                    pathname:
                                        "/(admin)/recruitment/candidates",
                                    params: {
                                        status: "Physical Interview",
                                    },
                                })
                            }
                        />
                        <SummaryCard
                            label="Offers"
                            value={String(summary.offers)}
                            tone="border-rose-100 bg-rose-50"
                            onPress={() =>
                                router.push({
                                    pathname:
                                        "/(admin)/recruitment/candidates",
                                    params: { status: "Offered" },
                                })
                            }
                        />
                        <SummaryCard
                            label="Employed"
                            value={String(summary.employed)}
                            tone="border-green-100 bg-green-50"
                            onPress={() =>
                                router.push({
                                    pathname:
                                        "/(admin)/recruitment/candidates",
                                    params: { status: "Employed" },
                                })
                            }
                        />
                    </View>
                </Section>

                <Section title="Interview Operations">
                    <View className="flex-row flex-wrap gap-2">
                        <SummaryCard
                            label="Upcoming This Week"
                            value={String(interviewOperations.upcomingThisWeek)}
                            tone="border-indigo-100 bg-indigo-50"
                        />
                        <SummaryCard
                            label="Pending Scheduling"
                            value={String(interviewOperations.pendingScheduling)}
                            tone="border-amber-100 bg-amber-50"
                        />
                        <SummaryCard
                            label="Offers Pending Response"
                            value={String(
                                interviewOperations.offersPendingResponse,
                            )}
                            tone="border-rose-100 bg-rose-50"
                        />
                    </View>
                </Section>

                {loading ? (
                    <View className="mt-6 items-center">
                        <ActivityIndicator color="#4C5FAB" />
                    </View>
                ) : null}
            </ScrollView>
        </SafeAreaView>
    );
}
