import DatePickerModal from "@/components/admin/DatePickerModal";
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
    TextInput,
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
            className="flex-1 bg-white"
        >
            <PlatformAdaptiveHeader
                title="New Recruitment"
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
                                Company
                            </Text>
                            <TextInput
                                className="rounded-xl bg-gray-100 px-4 py-3"
                                value={companyName}
                                onChangeText={setCompanyName}
                                placeholder="Company name"
                            />
                        </View>
                        <View>
                            <Text className="mb-2 text-base font-kumbhBold text-gray-700">
                                Position / Role
                            </Text>
                            <TextInput
                                className="rounded-xl bg-gray-100 px-4 py-3"
                                value={position}
                                onChangeText={setPosition}
                                placeholder="e.g. Frontend Developer"
                            />
                        </View>
                        <View>
                            <Text className="mb-2 text-base font-kumbhBold text-gray-700">
                                Recruiter
                            </Text>
                            <TextInput
                                className="rounded-xl bg-gray-100 px-4 py-3"
                                value={recruiterName}
                                onChangeText={setRecruiterName}
                                placeholder="Recruiter name"
                            />
                        </View>
                        <View>
                            <Text className="mb-2 text-base font-kumbhBold text-gray-700">
                                Employment Type
                            </Text>
                            <View className="flex-row flex-wrap gap-2">
                                {employmentTypes.map((type) => (
                                    <Pressable
                                        key={type}
                                        onPress={() => setEmploymentType(type)}
                                        className={`rounded-full px-3 py-2 ${employmentType === type ? "bg-[#4C5FAB]" : "bg-gray-100"}`}
                                    >
                                        <Text
                                            className={`${employmentType === type ? "text-white" : "text-gray-700"}`}
                                        >
                                            {type}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>
                        <View>
                            <Text className="mb-2 text-base font-kumbhBold text-gray-700">
                                Number of Openings
                            </Text>
                            <TextInput
                                className="rounded-xl bg-gray-100 px-4 py-3"
                                value={numberOfOpenings}
                                onChangeText={setNumberOfOpenings}
                                keyboardType="numeric"
                            />
                        </View>
                        <View>
                            <Text className="mb-2 text-base font-kumbhBold text-gray-700">
                                Closing Date
                            </Text>
                            <Pressable
                                onPress={openDatePicker}
                                className="rounded-xl bg-gray-100 px-4 py-3 flex-row items-center justify-between"
                            >
                                <Text
                                    className={`text-base ${closingDate ? "text-gray-900" : "text-gray-400"}`}
                                >
                                    {closingDate || "YYYY-MM-DD"}
                                </Text>
                                <Calendar size={18} color="#111827" />
                            </Pressable>
                        </View>

                        <View>
                            <Text className="mb-2 text-base font-kumbhBold text-gray-700">
                                Status
                            </Text>
                            <View className="flex-row flex-wrap gap-2">
                                {statuses.map((item) => (
                                    <Pressable
                                        key={item}
                                        onPress={() => setStatus(item)}
                                        className={`rounded-full px-3 py-2 ${status === item ? "bg-[#4C5FAB]" : "bg-gray-100"}`}
                                    >
                                        <Text
                                            className={`${status === item ? "text-white" : "text-gray-700"}`}
                                        >
                                            {item}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>
                        <View>
                            <Text className="mb-2 text-base font-kumbhBold text-gray-700">
                                Description
                            </Text>
                            <TextInput
                                className="min-h-[120px] rounded-xl bg-gray-100 px-4 py-3"
                                multiline
                                value={description}
                                onChangeText={setDescription}
                                placeholder="Job description"
                            />
                        </View>
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
