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
import { Plus } from "lucide-react-native";
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
            className="flex-1 bg-white"
        >
            <PlatformAdaptiveHeader
                title="Candidates"
                headerRight={({ tintColor }) =>
                    canAddCandidate(role) ? (
                        <Pressable
                            onPress={() =>
                                router.push({
                                    pathname:
                                        "/(admin)/recruitment/[id]/candidate/create",
                                    params: { id: recruitmentId },
                                })
                            }
                            className="h-10 w-10 items-center justify-center rounded-full"
                            hitSlop={8}
                        >
                            <Plus size={28} color={tintColor} />
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

                {recruitment?.candidates?.length ? (
                    <View className="gap-2">
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
                ) : (
                    <Text className="py-3 text-sm text-gray-500">
                        No candidates added yet
                    </Text>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
