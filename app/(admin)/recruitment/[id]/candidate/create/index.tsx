import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import {
    addRecruitmentCandidate,
    fetchRecruitmentById,
    updateRecruitmentCandidate,
} from "@/redux/recruitment/recruitment.thunks";
import { selectSelectedRecruitment } from "@/redux/recruitment/recruitment.selectors";
import type { RootState } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { canAddCandidate } from "@/utils/recruitmentPermissions";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Check } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const candidateStates = [
    "New",
    "Contacted",
    "Interview 1",
    "Interview 2",
    "Physical Interview",
    "Salary Negotiation",
    "Offered",
    "Employed",
    "Rejected",
    "On Hold",
];

export default function AddCandidateScreen() {
    const isIOS = Platform.OS === "ios";
    const router = useRouter();
    const params = useLocalSearchParams();
    const dispatch = useAppDispatch();
    const role = useAppSelector((state: RootState) => state.auth.user?.role);
    const recruitment = useAppSelector(selectSelectedRecruitment);

    const recruitmentId = params.id as string;
    const candidateId = params.candidateId as string | undefined;
    const isEditMode = !!candidateId;

    const candidate = useMemo(() => {
        if (!candidateId) return undefined;
        return (recruitment?.candidates || []).find(
            (item) => item._id === candidateId,
        );
    }, [recruitment?.candidates, candidateId]);

    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [location, setLocation] = useState("");
    const [age, setAge] = useState("");
    const [yearsExperience, setYearsExperience] = useState("");
    const [recruiter, setRecruiter] = useState("");
    const [overallStatus, setOverallStatus] = useState("New");
    const [isSaving, setIsSaving] = useState(false);
    const [isPrefilled, setIsPrefilled] = useState(false);

    useEffect(() => {
        if (recruitmentId) {
            dispatch(fetchRecruitmentById(recruitmentId));
        }
    }, [dispatch, recruitmentId]);

    useEffect(() => {
        if (!isEditMode || !candidate || isPrefilled) return;

        setFullName(candidate.fullName || "");
        setEmail(candidate.email || "");
        setPhone(candidate.phone || "");
        setLocation(candidate.location || "");
        setAge(
            typeof candidate.age === "number" ? String(candidate.age) : "",
        );
        setYearsExperience(
            typeof candidate.yearsExperience === "number"
                ? String(candidate.yearsExperience)
                : "",
        );
        setRecruiter(candidate.recruiter || "");
        setOverallStatus(
            candidate.overallStatus || candidate.currentStage || "New",
        );
        setIsPrefilled(true);
    }, [candidate, isEditMode, isPrefilled]);

    const handleSave = async () => {
        if (isSaving) return;
        if (!canAddCandidate(role)) {
            Alert.alert(
                "Permission",
                "You do not have permission to add candidates",
            );
            return;
        }
        if (!recruitmentId) return;
        if (!fullName.trim()) {
            Alert.alert("Required", "Candidate full name is required");
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                fullName,
                email,
                phone,
                location,
                age: age ? Number(age) : undefined,
                yearsExperience: yearsExperience
                    ? Number(yearsExperience)
                    : undefined,
                recruiter,
                overallStatus,
                currentStage: overallStatus,
            };

            if (isEditMode && candidateId) {
                await dispatch(
                    updateRecruitmentCandidate({
                        recruitmentId,
                        candidateId,
                        payload,
                    }),
                ).unwrap();
            } else {
                await dispatch(
                    addRecruitmentCandidate({
                        recruitmentId,
                        payload,
                    }),
                ).unwrap();
            }

            await dispatch(fetchRecruitmentById(recruitmentId));
            router.back();
        } catch (error: any) {
            Alert.alert(
                "Error",
                error?.message ||
                    (isEditMode
                        ? "Failed to update candidate"
                        : "Failed to add candidate"),
            );
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <SafeAreaView
            edges={
                isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]
            }
            className="flex-1 bg-white"
        >
            <PlatformAdaptiveHeader
                title={isEditMode ? "Edit Candidate" : "Add Candidate"}
                headerRight={({ tintColor }) => (
                    <Pressable
                        onPress={handleSave}
                        disabled={isSaving}
                        className="w-10 h-10 rounded-full items-center justify-center"
                        hitSlop={8}
                    >
                        {isSaving ? (
                            <ActivityIndicator size="small" color={tintColor} />
                        ) : (
                            <Check size={28} color={tintColor} />
                        )}
                    </Pressable>
                )}
            />

            <KeyboardAvoidingView
                className="flex-1"
                behavior={isIOS ? "padding" : "height"}
                keyboardVerticalOffset={isIOS ? 120 : 0}
            >
                <ScrollView
                    className="flex-1 px-4 pb-8 mt-3"
                    keyboardShouldPersistTaps="handled"
                >
                    <View className="gap-4">
                        <View>
                            <Text className="mb-2 text-base font-kumbhBold text-gray-700">
                                Full Name
                            </Text>
                            <TextInput
                                className="rounded-xl bg-gray-100 px-4 py-3"
                                value={fullName}
                                onChangeText={setFullName}
                                placeholder="Candidate full name"
                            />
                        </View>

                        <View>
                            <Text className="mb-2 text-base font-kumbhBold text-gray-700">
                                Email
                            </Text>
                            <TextInput
                                className="rounded-xl bg-gray-100 px-4 py-3"
                                value={email}
                                onChangeText={setEmail}
                                placeholder="candidate@email.com"
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        <View>
                            <Text className="mb-2 text-base font-kumbhBold text-gray-700">
                                Phone Number
                            </Text>
                            <TextInput
                                className="rounded-xl bg-gray-100 px-4 py-3"
                                value={phone}
                                onChangeText={setPhone}
                                placeholder="Phone number"
                                keyboardType="phone-pad"
                            />
                        </View>

                        <View>
                            <Text className="mb-2 text-base font-kumbhBold text-gray-700">
                                Location
                            </Text>
                            <TextInput
                                className="rounded-xl bg-gray-100 px-4 py-3"
                                value={location}
                                onChangeText={setLocation}
                                placeholder="Candidate location"
                            />
                        </View>

                        <View className="flex-row gap-3">
                            <View className="flex-1">
                                <Text className="mb-2 text-base font-kumbhBold text-gray-700">
                                    Age
                                </Text>
                                <TextInput
                                    className="rounded-xl bg-gray-100 px-4 py-3"
                                    value={age}
                                    onChangeText={setAge}
                                    placeholder="Age"
                                    keyboardType="numeric"
                                />
                            </View>
                            <View className="flex-1">
                                <Text className="mb-2 text-base font-kumbhBold text-gray-700">
                                    Years of Experience
                                </Text>
                                <TextInput
                                    className="rounded-xl bg-gray-100 px-4 py-3"
                                    value={yearsExperience}
                                    onChangeText={setYearsExperience}
                                    placeholder="Years"
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>

                        <View>
                            <Text className="mb-2 text-base font-kumbhBold text-gray-700">
                                Recruiter
                            </Text>
                            <TextInput
                                className="rounded-xl bg-gray-100 px-4 py-3"
                                value={recruiter}
                                onChangeText={setRecruiter}
                                placeholder="Assigned recruiter"
                            />
                        </View>

                        <View>
                            <Text className="mb-2 text-base font-kumbhBold text-gray-700">
                                Overall Status
                            </Text>
                            <View className="flex-row flex-wrap gap-2">
                                {candidateStates.map((state) => (
                                    <Pressable
                                        key={state}
                                        onPress={() => setOverallStatus(state)}
                                        className={`rounded-full px-3 py-2 ${overallStatus === state ? "bg-[#4C5FAB]" : "bg-gray-100"}`}
                                    >
                                        <Text
                                            className={`${overallStatus === state ? "text-white" : "text-gray-700"}`}
                                        >
                                            {state}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
