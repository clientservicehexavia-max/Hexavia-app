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
import { ChevronRight, Pencil, Plus } from "lucide-react-native";
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
            className="flex-1 bg-white"
        >
            <PlatformAdaptiveHeader
                title="Recruitment Details"
                headerRight={({ tintColor }) =>
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
                            className="w-10 h-10 rounded-full items-center justify-center"
                            hitSlop={8}
                        >
                            <Pencil size={22} color={tintColor} />
                        </Pressable>
                    ) : null
                }
            />
            <ScrollView className="flex-1 px-4 pb-8 mt-3">
                {loading && !recruitment ? (
                    <View className="py-8">
                        <ActivityIndicator color="#4C5FAB" />
                    </View>
                ) : null}
                {error ? (
                    <Text className="mb-3 text-sm text-red-500">{error}</Text>
                ) : null}
                {recruitment && !isAssignedRecruitment ? (
                    <View className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <Text className="text-sm text-amber-800">
                            You can only view recruitments assigned to you.
                        </Text>
                    </View>
                ) : null}
                {recruitment ? (
                    <>
                        {!isAssignedRecruitment ? null : (
                            <>
                                <View className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                                    <Text className="text-xl font-kumbhBold text-gray-900">
                                        {recruitment.position}
                                    </Text>
                                    <Text className="mt-1 text-sm text-gray-600">
                                        Company: {recruitment.clientName || "—"}
                                    </Text>
                                    <Text className="mt-1 text-sm text-gray-600">
                                        Recruiter:{" "}
                                        {recruitment.recruiterName || "—"}
                                    </Text>
                                    <Text className="mt-1 text-sm text-gray-600">
                                        Employment Type:{" "}
                                        {recruitment.employmentType || "—"}
                                    </Text>
                                    <Text className="mt-1 text-sm text-gray-600">
                                        Openings:{" "}
                                        {recruitment.numberOfOpenings || 0}
                                    </Text>
                                    <Text className="mt-1 text-sm text-gray-600">
                                        Status: {recruitment.status || "Active"}
                                    </Text>
                                    <Text className="mt-2 text-sm text-gray-700">
                                        {recruitment.description ||
                                            "No description provided"}
                                    </Text>
                                </View>

                                <View className="rounded-xl border border-gray-200 p-3">
                                    <View className="mb-3 flex-row items-center justify-between">
                                        <Text className="text-lg font-kumbhBold text-gray-900">
                                            Candidates
                                        </Text>
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
                                                className="rounded-lg bg-gray-100 px-3 py-1.5"
                                            >
                                                <Text className="text-xs font-kumbhBold text-gray-700">
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
                                                    className="h-8 w-8 items-center justify-center rounded-lg"
                                                >
                                                    <Plus
                                                        size={25}
                                                        color="black"
                                                    />
                                                </Pressable>
                                            ) : null}
                                        </View>
                                    </View>
                                    {recruitment.candidates?.length ? (
                                        <View className="gap-2">
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
                                                        className="rounded-xl border border-gray-200 bg-gray-50 p-2.5"
                                                    >
                                                        <View className="flex-row items-start justify-between">
                                                            <View className="flex-1 pr-2">
                                                                <Text
                                                                    className="text-base font-kumbhBold text-gray-900"
                                                                    numberOfLines={
                                                                        1
                                                                    }
                                                                >
                                                                    {
                                                                        candidate.fullName
                                                                    }
                                                                </Text>
                                                                <Text
                                                                    className="mt-1 text-xs text-gray-600"
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
                                                                <Text className="mr-1 text-[11px] text-gray-500">
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
                                                        <View className="mt-2 self-start rounded-full bg-[#E9ECF8] px-2.5 py-1">
                                                            <Text className="text-[10px] font-kumbhBold text-[#2F3C7A]">
                                                                {candidate.currentStage ||
                                                                    candidate.overallStatus ||
                                                                    "New"}
                                                            </Text>
                                                        </View>
                                                    </Pressable>
                                                ))}
                                            {recruitment.candidates.length >
                                            5 ? (
                                                <Text className="pt-1 text-xs text-gray-500">
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
                                        <Text className="py-3 text-sm text-gray-500">
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
