import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import CandidateCard from "@/components/recruitment/CandidateCard";
import {
    selectRecruitmentError,
    selectRecruitmentLoading,
    selectSelectedRecruitment,
} from "@/redux/recruitment/recruitment.selectors";
import { fetchRecruitmentById } from "@/redux/recruitment/recruitment.thunks";
import type { RootState } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { canAddCandidate } from "@/utils/recruitmentPermissions";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Plus, Users } from "lucide-react-native";
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

export default function RecruitmentCandidatesScreen() {
    const isIOS = Platform.OS === "ios";
    const router = useRouter();
    const params = useLocalSearchParams();
    const dispatch = useAppDispatch();
    const recruitment = useAppSelector(selectSelectedRecruitment);
    const loading = useAppSelector(selectRecruitmentLoading);
    const error = useAppSelector(selectRecruitmentError);
    const role = useAppSelector((state: RootState) => state.auth.user?.role);

    const recruitmentId = params.id as string;

    useEffect(() => {
        if (recruitmentId) dispatch(fetchRecruitmentById(recruitmentId));
    }, [dispatch, recruitmentId]);

    return (
        <SafeAreaView
            edges={
                isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]
            }
            className="flex-1 bg-[#F5F7FB]"
        >
            <PlatformAdaptiveHeader
                title="Candidates"
                backgroundColor="#F5F7FB"
                headerRight={() =>
                    canAddCandidate(role) ? (
                        <Pressable
                            onPress={() =>
                                router.push({
                                    pathname:
                                        "/(admin)/recruitment/[id]/candidate/create",
                                    params: { id: recruitmentId },
                                })
                            }
                            className="h-10 w-10 items-center justify-center rounded-full bg-[#4C5FAB]"
                            hitSlop={8}
                        >
                            <Plus size={20} color="#FFFFFF" />
                        </Pressable>
                    ) : null
                }
            />

            <ScrollView
                className="flex-1"
                contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingTop: 12,
                    paddingBottom: 32,
                }}
                showsVerticalScrollIndicator={false}
            >
                {recruitment ? (
                    <View className="mb-4 flex-row items-center justify-between rounded-[24px] border border-gray-100 bg-white p-4">
                        <View className="flex-1 flex-row items-center pr-3">
                            <View className="mr-3 h-10 w-10 items-center justify-center rounded-2xl bg-[#EEF2FF]">
                                <Users size={18} color="#4C5FAB" />
                            </View>
                            <View className="flex-1">
                                <Text
                                    className="text-sm font-kumbhBold text-[#111827]"
                                    numberOfLines={1}
                                >
                                    {recruitment.position}
                                </Text>
                                <Text
                                    className="mt-0.5 text-xs font-kumbh text-[#6B7280]"
                                    numberOfLines={1}
                                >
                                    {recruitment.clientName || "Campaign"}
                                </Text>
                            </View>
                        </View>
                        <View className="rounded-full bg-[#EEF2FF] px-3 py-1">
                            <Text className="text-xs font-kumbhBold text-[#4C5FAB]">
                                {recruitment.candidates?.length || 0}
                            </Text>
                        </View>
                    </View>
                ) : null}

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

                {recruitment?.candidates?.length ? (
                    <View>
                        {recruitment.candidates.map((candidate, index) => (
                            <CandidateCard
                                key={
                                    candidate._id ||
                                    `${candidate.fullName}-${index}`
                                }
                                fullName={candidate.fullName}
                                clientName={recruitment.clientName}
                                recruitmentName={recruitment.position}
                                recruiter={candidate.recruiter}
                                email={candidate.email}
                                updatedAt={candidate.updatedAt}
                                status={
                                    candidate.currentStage ||
                                    candidate.overallStatus ||
                                    "New"
                                }
                                onPress={() => {
                                    if (!candidate._id) return;
                                    router.push({
                                        pathname:
                                            "/(admin)/recruitment/[id]/candidate/[candidateId]",
                                        params: {
                                            id: recruitmentId,
                                            candidateId: candidate._id,
                                        },
                                    });
                                }}
                            />
                        ))}
                    </View>
                ) : !loading ? (
                    <View className="items-center rounded-[24px] border border-gray-100 bg-white px-6 py-10">
                        <View className="mb-3 h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF2FF]">
                            <Users size={22} color="#4C5FAB" />
                        </View>
                        <Text className="text-base font-kumbhBold text-[#111827]">
                            No candidates yet
                        </Text>
                        <Text className="mt-1 text-center text-sm font-kumbh text-[#6B7280]">
                            Add candidates to track their progress through this
                            hiring pipeline.
                        </Text>
                    </View>
                ) : null}
            </ScrollView>
        </SafeAreaView>
    );
}
