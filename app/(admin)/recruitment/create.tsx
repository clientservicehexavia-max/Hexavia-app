import DatePickerModal from "@/components/admin/DatePickerModal";
import Field from "@/components/admin/Field";
import Input from "@/components/admin/Input";
import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import { createRecruitment } from "@/redux/recruitment/recruitment.thunks";
import type { RootState } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { canCreateRecruitment } from "@/utils/recruitmentPermissions";
import { useRouter } from "expo-router";
import { Calendar, Check } from "lucide-react-native";
import React, { useState } from "react";
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

const employmentTypes = ["Full Time", "Part Time", "Contract", "Internship"];
const statuses = ["Active", "Closed", "On Hold"];

const formatYMD = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

export default function RecruitmentCreateScreen() {
    const isIOS = Platform.OS === "ios";
    const router = useRouter();
    const dispatch = useAppDispatch();
    const role = useAppSelector((state: RootState) => state.auth.user?.role);
    const [companyName, setCompanyName] = useState("");
    const [position, setPosition] = useState("");
    const [recruiterName, setRecruiterName] = useState("");
    const [employmentType, setEmploymentType] = useState("Full Time");
    const [numberOfOpenings, setNumberOfOpenings] = useState("1");
    const [closingDate, setClosingDate] = useState("");
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [pickerDate, setPickerDate] = useState(new Date());
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState("Active");
    const [isSaving, setIsSaving] = useState(false);

    const openDatePicker = () => {
        const parsed = new Date(closingDate);
        setPickerDate(Number.isNaN(parsed.getTime()) ? new Date() : parsed);
        setShowDatePicker(true);
    };

    const handleSave = async () => {
        if (isSaving) return;
        if (!canCreateRecruitment(role)) {
            Alert.alert(
                "Permission",
                "You do not have permission to create recruitment campaigns",
            );
            return;
        }
        if (!position.trim()) {
            Alert.alert("Required", "Position is required");
            return;
        }
        setIsSaving(true);
        try {
            await dispatch(
                createRecruitment({
                    clientName: companyName,
                    position,
                    recruiterName,
                    employmentType,
                    numberOfOpenings: Number(numberOfOpenings || 1),
                    closingDate,
                    description,
                    status,
                }),
            ).unwrap();
            router.back();
        } catch (error: any) {
            Alert.alert(
                "Error",
                error?.message || "Failed to create recruitment",
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
                title="New Recruitment"
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
                        <Field label="Company">
                            <Input
                                value={companyName}
                                onChangeText={setCompanyName}
                                placeholder="Company name"
                            />
                        </Field>

                        <Field label="Position / Role">
                            <Input
                                value={position}
                                onChangeText={setPosition}
                                placeholder="e.g. Frontend Developer"
                            />
                        </Field>

                        <Field label="Recruiter">
                            <Input
                                value={recruiterName}
                                onChangeText={setRecruiterName}
                                placeholder="Recruiter name"
                            />
                        </Field>

                        <Field label="Employment Type">
                            <View className="flex-row flex-wrap gap-2">
                                {employmentTypes.map((type) => {
                                    const active = employmentType === type;
                                    return (
                                        <Pressable
                                            key={type}
                                            onPress={() =>
                                                setEmploymentType(type)
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
                                                {type}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </Field>

                        <Field label="Number of Openings">
                            <Input
                                value={numberOfOpenings}
                                onChangeText={setNumberOfOpenings}
                                placeholder="1"
                                keyboardType="numeric"
                            />
                        </Field>

                        <Field label="Closing Date">
                            <Pressable
                                onPress={openDatePicker}
                                className="h-14 flex-row items-center justify-between rounded-2xl border border-gray-200 bg-white px-4"
                            >
                                <Text
                                    className={`font-kumbh text-base ${closingDate ? "text-[#111827]" : "text-[#9CA3AF]"}`}
                                >
                                    {closingDate || "YYYY-MM-DD"}
                                </Text>
                                <Calendar size={18} color="#4C5FAB" />
                            </Pressable>
                        </Field>

                        <Field label="Status">
                            <View className="flex-row flex-wrap gap-2">
                                {statuses.map((item) => {
                                    const active = status === item;
                                    return (
                                        <Pressable
                                            key={item}
                                            onPress={() => setStatus(item)}
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
                                                {item}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </Field>

                        <Field label="Description">
                            <Input
                                multiline
                                value={description}
                                onChangeText={setDescription}
                                placeholder="Job description"
                            />
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
                                    Create Recruitment
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            <DatePickerModal
                visible={showDatePicker}
                value={pickerDate}
                onCancel={() => setShowDatePicker(false)}
                onDone={() => {
                    setShowDatePicker(false);
                    setClosingDate(formatYMD(pickerDate));
                }}
                onDateChange={(d: Date) => {
                    setPickerDate(d);
                }}
            />

        </SafeAreaView>
    );
}
