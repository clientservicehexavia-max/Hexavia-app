import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import {
    selectRecruitmentError,
    selectRecruitmentLoading,
    selectSelectedRecruitment,
} from "@/redux/recruitment/recruitment.selectors";
import { fetchRecruitmentById } from "@/redux/recruitment/recruitment.thunks";
import type { RootState } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
    canAddCandidate,
    canEditRecruitment,
} from "@/utils/recruitmentPermissions";
import { normalizeRole } from "@/utils/roles";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    BriefcaseBusiness,
    ChevronRight,
    Pencil,
    Plus,
    Users,
} from "lucide-react-native";
import React, { useEffect } from "react";
import {
    ActivityIndicator,
    Platform,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function RecruitmentDetailScreen() {
    const isIOS = Platform.OS === "ios";
    const router = useRouter();
    const params = useLocalSearchParams();
    const dispatch = useAppDispatch();
    const recruitment = useAppSelector(selectSelectedRecruitment);
    const loading = useAppSelector(selectRecruitmentLoading);
    const error = useAppSelector(selectRecruitmentError);
    const role = useAppSelector((state: RootState) => state.auth.user?.role);
    const currentUser = useAppSelector((state: RootState) => state.auth.user);

    const recruitmentId = params.id as string;

    useEffect(() => {
        if (recruitmentId) dispatch(fetchRecruitmentById(recruitmentId));
    }, [dispatch, recruitmentId]);

    const recruiterOnly = normalizeRole(role) === "staff";
    const isAssignedRecruitment =
        !recruitment ||
        !recruiterOnly ||
        (!!currentUser?._id &&
            recruitment.recruiterId === String(currentUser._id)) ||
        (!!currentUser?.email &&
            (recruitment.recruiterName || "").toLowerCase() ===
                String(currentUser.email).toLowerCase());

    return (
        <SafeAreaView
            edges={
                isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]
            }
            className="flex-1 bg-[#F5F7FB]"
        >
            <PlatformAdaptiveHeader
                title="Recruitment Details"
                backgroundColor="#F5F7FB"
                headerRight={() =>
                    canEditRecruitment(role) &&
                    isAssignedRecruitment &&
                    recruitmentId ? (
                        <Pressable
                            onPress={() =>
                                router.push({
                                    pathname: "/(admin)/recruitment/[id]/edit",
                                    params: { id: recruitmentId },
                                })
                            }
                            className="h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white"
                            hitSlop={8}
                        >
                            <Pencil size={18} color="#4C5FAB" />
                        </Pressable>
                    ) : null
                }
            />
            <ScrollView
                className="flex-1"
                contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingTop: 12,
                    paddingBottom: 36,
                }}
                showsVerticalScrollIndicator={false}
            >
                {loading && !recruitment ? (
                    <View className="py-10 items-center">
                        <ActivityIndicator color="#4C5FAB" />
                    </View>
                ) : null}
                {error ? (
                    <View className="mb-3 rounded-2xl border border-red-100 bg-red-50 p-3.5">
                        <Text className="text-sm font-kumbh text-red-700">
                            {error}
                        </Text>
                    </View>
                ) : null}
                {recruitment && !isAssignedRecruitment ? (
                    <View className="rounded-[24px] border border-amber-200 bg-amber-50 p-4">
                        <Text className="text-sm font-kumbh text-amber-800">
                            You can only view recruitments assigned to you.
                        </Text>
                    </View>
                ) : null}
                {recruitment ? (
                    <>
                        {!isAssignedRecruitment ? null : (
                            <>
                                <View className="mb-4 rounded-[28px] border border-gray-100 bg-white p-5">
                                    <View className="flex-row items-start justify-between gap-3">
                                        <View className="flex-1 flex-row items-center">
                                            <View className="mr-3.5 h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF2FF]">
                                                <BriefcaseBusiness
                                                    size={22}
                                                    color="#4C5FAB"
                                                />
                                            </View>
                                            <View className="flex-1">
                                                <Text className="text-xl font-kumbhBold text-[#111827]">
                                                    {recruitment.position}
                                                </Text>
                                                <Text className="mt-0.5 text-sm font-kumbh text-[#6B7280]">
                                                    {recruitment.clientName ||
                                                        "No company"}
                                                </Text>
                                            </View>
                                        </View>
                                        <View className="rounded-full bg-[#EEF2FF] px-3 py-1.5">
                                            <Text className="text-xs font-kumbhBold text-[#4C5FAB]">
                                                {recruitment.status || "Active"}
                                            </Text>
                                        </View>
                                    </View>

                                    <View className="mt-4 gap-2.5 rounded-2xl bg-[#F5F7FB] p-4">
                                        <View className="flex-row items-center justify-between">
                                            <Text className="text-xs font-kumbh text-[#6B7280]">
                                                Recruiter
                                            </Text>
                                            <Text className="text-xs font-kumbhBold text-[#111827]">
                                                {recruitment.recruiterName ||
                                                    "—"}
                                            </Text>
                                        </View>
                                        <View className="flex-row items-center justify-between">
                                            <Text className="text-xs font-kumbh text-[#6B7280]">
                                                Employment Type
                                            </Text>
                                            <Text className="text-xs font-kumbhBold text-[#111827]">
                                                {recruitment.employmentType ||
                                                    "—"}
                                            </Text>
                                        </View>
                                        <View className="flex-row items-center justify-between">
                                            <Text className="text-xs font-kumbh text-[#6B7280]">
                                                Openings
                                            </Text>
                                            <Text className="text-xs font-kumbhBold text-[#111827]">
                                                {recruitment.numberOfOpenings ||
                                                    0}
                                            </Text>
                                        </View>
                                    </View>

                                    <View className="mt-3 rounded-2xl bg-[#F5F7FB] p-4">
                                        <Text className="mb-1 text-xs font-kumbhBold text-[#6B7280]">
                                            Description
                                        </Text>
                                        <Text className="text-sm font-kumbh leading-5 text-[#374151]">
                                            {recruitment.description ||
                                                "No description provided"}
                                        </Text>
                                    </View>
                                </View>

                                <View className="rounded-[24px] border border-gray-100 bg-white p-4">
                                    <View className="mb-3 flex-row items-center justify-between">
                                        <View className="flex-row items-center gap-2">
                                            <View className="h-9 w-9 items-center justify-center rounded-xl bg-[#EEF2FF]">
                                                <Users
                                                    size={18}
                                                    color="#4C5FAB"
                                                />
                                            </View>
                                            <Text className="text-base font-kumbhBold text-[#111827]">
                                                Candidates
                                            </Text>
                                        </View>
                                        <View className="flex-row items-center gap-2">
                                            <Pressable
                                                onPress={() =>
                                                    router.push({
                                                        pathname:
                                                            "/(admin)/recruitment/[id]/candidates",
                                                        params: {
                                                            id: recruitmentId,
                                                        },
                                                    })
                                                }
                                                className="rounded-full bg-[#EEF2FF] px-3.5 py-1.5"
                                            >
                                                <Text className="text-xs font-kumbhBold text-[#4C5FAB]">
                                                    View all
                                                </Text>
                                            </Pressable>
                                            {canAddCandidate(role) ? (
                                                <Pressable
                                                    onPress={() =>
                                                        router.push({
                                                            pathname:
                                                                "/(admin)/recruitment/[id]/candidate/create",
                                                            params: {
                                                                id: recruitmentId,
                                                            },
                                                        })
                                                    }
                                                    className="h-9 w-9 items-center justify-center rounded-full bg-[#4C5FAB]"
                                                >
                                                    <Plus
                                                        size={18}
                                                        color="#FFFFFF"
                                                    />
                                                </Pressable>
                                            ) : null}
                                        </View>
                                    </View>
                                    {recruitment.candidates?.length ? (
                                        <View className="gap-2.5">
                                            {[...recruitment.candidates]
                                                .sort((a, b) => {
                                                    const aTime = a.updatedAt
                                                        ? new Date(
                                                              a.updatedAt,
                                                          ).getTime()
                                                        : 0;
                                                    const bTime = b.updatedAt
                                                        ? new Date(
                                                              b.updatedAt,
                                                          ).getTime()
                                                        : 0;
                                                    return bTime - aTime;
                                                })
                                                .slice(0, 5)
                                                .map((candidate, index) => (
                                                    <Pressable
                                                        key={
                                                            candidate._id ||
                                                            `${candidate.fullName}-${index}`
                                                        }
                                                        onPress={() => {
                                                            if (!candidate._id)
                                                                return;
                                                            router.push({
                                                                pathname:
                                                                    "/(admin)/recruitment/[id]/candidate/[candidateId]",
                                                                params: {
                                                                    id: recruitmentId,
                                                                    candidateId:
                                                                        candidate._id,
                                                                },
                                                            });
                                                        }}
                                                        className="rounded-2xl border border-gray-100 bg-[#F5F7FB] p-3.5 active:opacity-90"
                                                    >
                                                        <View className="flex-row items-start justify-between">
                                                            <View className="flex-1 pr-2">
                                                                <Text
                                                                    className="text-sm font-kumbhBold text-[#111827]"
                                                                    numberOfLines={
                                                                        1
                                                                    }
                                                                >
                                                                    {
                                                                        candidate.fullName
                                                                    }
                                                                </Text>
                                                                <Text
                                                                    className="mt-1 text-xs font-kumbh text-[#6B7280]"
                                                                    numberOfLines={
                                                                        1
                                                                    }
                                                                >
                                                                    Recruiter:{" "}
                                                                    {candidate.recruiter ||
                                                                        "—"}
                                                                </Text>
                                                            </View>
                                                            <View className="flex-row items-center">
                                                                <Text className="mr-1 text-[11px] font-kumbh text-[#9CA3AF]">
                                                                    {candidate.updatedAt
                                                                        ? new Date(
                                                                              candidate.updatedAt,
                                                                          ).toLocaleDateString()
                                                                        : "—"}
                                                                </Text>
                                                                <ChevronRight
                                                                    size={14}
                                                                    color="#9CA3AF"
                                                                />
                                                            </View>
                                                        </View>
                                                        <View className="mt-2.5 self-start rounded-full bg-[#EEF2FF] px-3 py-1">
                                                            <Text className="text-[11px] font-kumbhBold text-[#4C5FAB]">
                                                                {candidate.currentStage ||
                                                                    candidate.overallStatus ||
                                                                    "New"}
                                                            </Text>
                                                        </View>
                                                    </Pressable>
                                                ))}
                                            {recruitment.candidates.length >
                                            5 ? (
                                                <Text className="pt-1 text-xs font-kumbh text-[#6B7280]">
                                                    Showing 5 of{" "}
                                                    {
                                                        recruitment.candidates
                                                            .length
                                                    }{" "}
                                                    candidates
                                                </Text>
                                            ) : null}
                                        </View>
                                    ) : (
                                        <Text className="py-3 text-sm font-kumbh text-[#6B7280]">
                                            No candidates added yet
                                        </Text>
                                    )}
                                </View>
                            </>
                        )}
                    </>
                ) : null}
            </ScrollView>
        </SafeAreaView>
    );
}
