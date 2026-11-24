import Field from "@/components/admin/Field";
import Input from "@/components/admin/Input";
import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import CustomTextInput from "@/components/ui/CustomInput";
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
    TouchableOpacity,
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
            className="flex-1 bg-[#F5F7FB]"
        >
            <PlatformAdaptiveHeader
                title={isEditMode ? "Edit Candidate" : "Add Candidate"}
                backgroundColor="#F5F7FB"
                headerRight={() => (
                    <Pressable
                        onPress={handleSave}
                        disabled={isSaving}
                        className="h-10 w-10 items-center justify-center rounded-full bg-[#4C5FAB]"
                        hitSlop={8}
                    >
                        {isSaving ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Check size={20} color="#FFFFFF" />
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
                    className="flex-1"
                    contentContainerStyle={{
                        paddingHorizontal: 16,
                        paddingTop: 12,
                        paddingBottom: 36,
                    }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View className="gap-4">
                        <Field label="Full Name">
                            <Input
                                value={fullName}
                                onChangeText={setFullName}
                                placeholder="Candidate full name"
                            />
                        </Field>

                        <Field label="Email">
                            <View className="h-14 justify-center rounded-2xl border border-gray-200 bg-white px-4">
                                <CustomTextInput
                                    value={email}
                                    onChangeText={setEmail}
                                    placeholder="candidate@email.com"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    className="font-kumbh text-base text-[#111827]"
                                />
                            </View>
                        </Field>

                        <Field label="Phone Number">
                            <View className="h-14 justify-center rounded-2xl border border-gray-200 bg-white px-4">
                                <CustomTextInput
                                    value={phone}
                                    onChangeText={setPhone}
                                    placeholder="Phone number"
                                    keyboardType="phone-pad"
                                    className="font-kumbh text-base text-[#111827]"
                                />
                            </View>
                        </Field>

                        <Field label="Location">
                            <Input
                                value={location}
                                onChangeText={setLocation}
                                placeholder="Candidate location"
                            />
                        </Field>

                        <View className="flex-row gap-3">
                            <View className="flex-1">
                                <Field label="Age">
                                    <Input
                                        value={age}
                                        onChangeText={setAge}
                                        placeholder="Age"
                                        keyboardType="numeric"
                                    />
                                </Field>
                            </View>
                            <View className="flex-1">
                                <Field label="Years of Experience">
                                    <Input
                                        value={yearsExperience}
                                        onChangeText={setYearsExperience}
                                        placeholder="Years"
                                        keyboardType="numeric"
                                    />
                                </Field>
                            </View>
                        </View>

                        <Field label="Recruiter">
                            <Input
                                value={recruiter}
                                onChangeText={setRecruiter}
                                placeholder="Assigned recruiter"
                            />
                        </Field>

                        <Field label="Overall Status">
                            <View className="flex-row flex-wrap gap-2">
                                {candidateStates.map((state) => {
                                    const active = overallStatus === state;
                                    return (
                                        <Pressable
                                            key={state}
                                            onPress={() =>
                                                setOverallStatus(state)
                                            }
                                            className={`rounded-full border px-3.5 py-2 ${
                                                active
                                                    ? "border-[#4C5FAB] bg-[#4C5FAB]"
                                                    : "border-gray-200 bg-white"
                                            }`}
                                        >
                                            <Text
                                                className={`text-xs font-kumbhBold ${
                                                    active
                                                        ? "text-white"
                                                        : "text-[#374151]"
                                                }`}
                                            >
                                                {state}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </Field>

                        <TouchableOpacity
                            onPress={handleSave}
                            disabled={isSaving}
                            activeOpacity={0.85}
                            className={`mt-2 h-14 flex-row items-center justify-center rounded-2xl ${
                                isSaving ? "bg-[#4C5FAB]/60" : "bg-[#4C5FAB]"
                            }`}
                        >
                            {isSaving ? (
                                <ActivityIndicator
                                    size="small"
                                    color="#FFFFFF"
                                />
                            ) : (
                                <Text className="font-kumbhBold text-base text-white">
                                    {isEditMode
                                        ? "Save Candidate"
                                        : "Add Candidate"}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
