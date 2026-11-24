import DatePickerModal from "@/components/admin/DatePickerModal";
import Field from "@/components/admin/Field";
import Input from "@/components/admin/Input";
import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import { CustomTextInput } from "@/components/ui/CustomInput";
import {
    selectPartnerById,
    selectPartnerLoading,
} from "@/redux/partner/partner.selectors";
import {
    createPartner,
    fetchPartnerById,
    updatePartner,
} from "@/redux/partner/partner.thunks";
import type { Partner } from "@/redux/partner/partner.types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { birthdayInputFromDate, birthdayPickerDate, toBirthdayInput } from "@/utils/birthday";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CalendarDays, Check } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type FormData = Partial<Partner> & {
    engagementTags: string[];
};

export default function PartnerFormScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const dispatch = useAppDispatch();
    const isIOS = Platform.OS === "ios";

    const partnerId = params.partnerId as string | undefined;
    const partner = useAppSelector((state) =>
        partnerId ? selectPartnerById(partnerId)(state) : undefined,
    );
    const loading = useAppSelector(selectPartnerLoading);

    const [form, setForm] = useState<FormData>({
        name: "",
        company: "",
        description: "",
        contactEmail: "",
        contactPhone: "",
        alternateContactEmail: "",
        alternateContactPhone: "",
        address: "",
        partnerType: undefined,
        industry: "",
        dateOfBirth: "",
        engagementTags: [],
        notes: "",
        profileImage: "",
        status: "active",
    });

    const [submitting, setSubmitting] = useState(false);
    const [tagInput, setTagInput] = useState("");
    const [birthdayPickerVisible, setBirthdayPickerVisible] = useState(false);

    useEffect(() => {
        if (partnerId && !partner) {
            dispatch(fetchPartnerById(partnerId));
        }
    }, [partnerId, partner, dispatch]);

    useEffect(() => {
        if (partner) {
            setForm({
                name: partner.name,
                company: partner.company,
                description: partner.description,
                contactEmail: partner.contactEmail,
                contactPhone: partner.contactPhone,
                alternateContactEmail: partner.alternateContactEmail,
                alternateContactPhone: partner.alternateContactPhone,
                address: partner.address,
                partnerType: partner.partnerType,
                industry: partner.industry,
                dateOfBirth: toBirthdayInput(partner.dateOfBirth),
                engagementTags: partner.engagementTags || [],
                notes: partner.notes,
                profileImage: partner.profileImage,
                status: partner.status,
            });
        }
    }, [partner]);

    const handleUpdateForm = (field: keyof FormData, value: any) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleAddTag = () => {
        if (
            tagInput.trim() &&
            !form.engagementTags?.includes(tagInput.trim())
        ) {
            handleUpdateForm("engagementTags", [
                ...(form.engagementTags || []),
                tagInput.trim(),
            ]);
            setTagInput("");
        }
    };

    const handleRemoveTag = (tag: string) => {
        handleUpdateForm(
            "engagementTags",
            (form.engagementTags || []).filter((t) => t !== tag),
        );
    };

    const handleSubmit = async () => {
        if (!form.name?.trim()) {
            Alert.alert("Error", "Partner name is required");
            return;
        }

        setSubmitting(true);
        try {
            if (partnerId && partner) {
                const {
                    name,
                    company,
                    description,
                    contactEmail,
                    contactPhone,
                    alternateContactEmail,
                    alternateContactPhone,
                    address,
                    partnerType,
                    industry,
                    dateOfBirth,
                    engagementTags,
                    notes,
                    profileImage,
                    status,
                } = form;
                await dispatch(
                    updatePartner({
                        id: partnerId,
                        updates: {
                            name: name || "",
                            company,
                            description,
                            contactEmail,
                            contactPhone,
                            alternateContactEmail,
                            alternateContactPhone,
                            address,
                            partnerType,
                            industry,
                            dateOfBirth,
                            engagementTags,
                            notes,
                            profileImage,
                            status:
                                (status as "active" | "inactive") || "active",
                        },
                    }),
                ).unwrap();
                Alert.alert("Success", "Partner updated successfully");
            } else {
                const {
                    name,
                    company,
                    description,
                    contactEmail,
                    contactPhone,
                    alternateContactEmail,
                    alternateContactPhone,
                    address,
                    partnerType,
                    industry,
                    dateOfBirth,
                    engagementTags,
                    notes,
                    profileImage,
                    status,
                } = form;
                await dispatch(
                    createPartner({
                        name: name || "",
                        company,
                        description,
                        contactEmail,
                        contactPhone,
                        alternateContactEmail,
                        alternateContactPhone,
                        address,
                        partnerType,
                        industry,
                        dateOfBirth,
                        engagementTags,
                        notes,
                        profileImage,
                        status: (status as "active" | "inactive") || "active",
                    }),
                ).unwrap();
                Alert.alert("Success", "Partner created successfully");
            }
            router.back();
        } catch (err: any) {
            Alert.alert("Error", err?.message || "Failed to save partner");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView
            className="flex-1 bg-[#F5F7FB]"
            edges={
                isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]
            }
        >
            <PlatformAdaptiveHeader
                title={partnerId ? "Edit Partner" : "Add Partner"}
                backgroundColor="#F5F7FB"
                headerRight={() => (
                    <Pressable
                        onPress={handleSubmit}
                        disabled={submitting || loading}
                        className={`w-10 h-10 rounded-full items-center justify-center ios:mr-3 ${
                            submitting || loading ? "bg-gray-200" : "bg-primary"
                        }`}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Check
                                size={20}
                                color={
                                    submitting || loading ? "#9CA3AF" : "#FFFFFF"
                                }
                            />
                        )}
                    </Pressable>
                )}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className="flex-1"
                keyboardVerticalOffset={
                    Platform.select({ ios: 70, android: 0 }) as number
                }
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerClassName="px-4 pt-3 pb-12"
                >
                    <Field label="Partner Name *">
                        <Input
                            placeholder="Enter partner name"
                            value={form.name}
                            onChangeText={(v) => handleUpdateForm("name", v)}
                        />
                    </Field>

                    <Field label="Company">
                        <Input
                            placeholder="Enter company name"
                            value={form.company}
                            onChangeText={(v) => handleUpdateForm("company", v)}
                        />
                    </Field>

                    <Field label="Description">
                        <Input
                            placeholder="Enter description"
                            value={form.description}
                            onChangeText={(v) =>
                                handleUpdateForm("description", v)
                            }
                            multiline
                        />
                    </Field>

                    <Field label="Email">
                        <View className="h-14 justify-center rounded-2xl border border-gray-200 bg-white px-4">
                            <CustomTextInput
                                placeholder="Enter email address"
                                value={form.contactEmail}
                                onChangeText={(v) =>
                                    handleUpdateForm("contactEmail", v)
                                }
                                keyboardType="email-address"
                                autoCapitalize="none"
                                editable={!submitting}
                            />
                        </View>
                    </Field>

                    <Field label="Phone">
                        <Input
                            placeholder="Enter phone number"
                            value={form.contactPhone}
                            onChangeText={(v) =>
                                handleUpdateForm("contactPhone", v)
                            }
                            keyboardType="numeric"
                        />
                    </Field>

                    <Field label="Alternate Email (Optional)">
                        <View className="h-14 justify-center rounded-2xl border border-gray-200 bg-white px-4">
                            <CustomTextInput
                                placeholder="Enter alternate email address"
                                value={form.alternateContactEmail}
                                onChangeText={(v) =>
                                    handleUpdateForm("alternateContactEmail", v)
                                }
                                keyboardType="email-address"
                                autoCapitalize="none"
                                editable={!submitting}
                            />
                        </View>
                    </Field>

                    <Field label="Alternate Phone (Optional)">
                        <Input
                            placeholder="Enter alternate phone number"
                            value={form.alternateContactPhone}
                            onChangeText={(v) =>
                                handleUpdateForm("alternateContactPhone", v)
                            }
                            keyboardType="numeric"
                        />
                    </Field>

                    <Field label="Address">
                        <Input
                            placeholder="Enter address"
                            value={form.address}
                            onChangeText={(v) => handleUpdateForm("address", v)}
                        />
                    </Field>

                    <Field label="Date of Birth">
                        <Pressable
                            disabled={submitting}
                            onPress={() => setBirthdayPickerVisible(true)}
                            className="h-14 flex-row items-center justify-between rounded-2xl border border-gray-200 bg-white px-4"
                        >
                            <Text
                                className={`font-kumbh text-[15px] ${
                                    form.dateOfBirth
                                        ? "text-[#111827]"
                                        : "text-[#9CA3AF]"
                                }`}
                            >
                                {form.dateOfBirth || "Select date of birth"}
                            </Text>
                            <CalendarDays size={18} color="#4C5FAB" />
                        </Pressable>
                        {form.dateOfBirth ? (
                            <Pressable
                                onPress={() =>
                                    handleUpdateForm("dateOfBirth", "")
                                }
                                className="mt-2 self-start"
                            >
                                <Text className="text-xs font-kumbhBold text-[#4C5FAB]">
                                    Clear date
                                </Text>
                            </Pressable>
                        ) : null}
                    </Field>

                    <Field label="Industry">
                        <Input
                            placeholder="Enter industry"
                            value={form.industry}
                            onChangeText={(v) =>
                                handleUpdateForm("industry", v)
                            }
                        />
                    </Field>

                    <Field label="Partner Type">
                        <View className="flex-row flex-wrap gap-2">
                            {(
                                [
                                    "individual",
                                    "company",
                                    "investor",
                                    "vendor",
                                    "other",
                                ] as const
                            ).map((t) => {
                                const active = form.partnerType === t;
                                return (
                                    <Pressable
                                        key={t}
                                        onPress={() =>
                                            handleUpdateForm("partnerType", t)
                                        }
                                        className={`px-3.5 py-2 rounded-full border ${
                                            active
                                                ? "border-[#4C5FAB] bg-[#4C5FAB]"
                                                : "border-gray-200 bg-white"
                                        }`}
                                    >
                                        <Text
                                            className={`font-kumbhBold text-[13px] ${
                                                active
                                                    ? "text-white"
                                                    : "text-[#374151]"
                                            }`}
                                        >
                                            {t.charAt(0).toUpperCase() +
                                                t.slice(1)}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </Field>

                    <Field label="Status">
                        <View className="flex-row gap-2.5">
                            {(["active", "inactive"] as const).map((s) => {
                                const active = form.status === s;
                                return (
                                    <Pressable
                                        key={s}
                                        onPress={() =>
                                            handleUpdateForm("status", s)
                                        }
                                        className={`flex-1 h-12 rounded-2xl border items-center justify-center ${
                                            active
                                                ? "border-[#4C5FAB] bg-[#4C5FAB]"
                                                : "border-gray-200 bg-white"
                                        }`}
                                    >
                                        <Text
                                            className={`font-kumbhBold text-[13px] ${
                                                active
                                                    ? "text-white"
                                                    : "text-[#374151]"
                                            }`}
                                        >
                                            {s.charAt(0).toUpperCase() +
                                                s.slice(1)}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </Field>

                    <Field label="Engagement Tags">
                        <View className="flex-row mb-2.5 gap-2">
                            <View className="flex-1 h-12 justify-center rounded-2xl border border-gray-200 bg-white px-4">
                                <CustomTextInput
                                    placeholder="Add tags..."
                                    value={tagInput}
                                    onChangeText={setTagInput}
                                    editable={!submitting}
                                />
                            </View>
                            <Pressable
                                onPress={handleAddTag}
                                disabled={!tagInput.trim() || submitting}
                                className={`h-12 px-5 rounded-2xl items-center justify-center ${
                                    !tagInput.trim() || submitting
                                        ? "bg-gray-200"
                                        : "bg-[#4C5FAB]"
                                }`}
                            >
                                <Text
                                    className={`font-kumbhBold text-lg ${
                                        !tagInput.trim() || submitting
                                            ? "text-gray-400"
                                            : "text-white"
                                    }`}
                                >
                                    +
                                </Text>
                            </Pressable>
                        </View>
                        <View className="flex-row flex-wrap gap-2">
                            {(form.engagementTags || []).map((tag) => (
                                <View
                                    key={tag}
                                    className="bg-[#EEF2FF] rounded-full px-3 py-1.5 flex-row items-center gap-1.5"
                                >
                                    <Text className="text-[#4C5FAB] text-xs font-kumbhBold">
                                        {tag}
                                    </Text>
                                    <Pressable
                                        onPress={() => handleRemoveTag(tag)}
                                    >
                                        <Text className="text-[#4C5FAB] font-kumbhBold">
                                            ×
                                        </Text>
                                    </Pressable>
                                </View>
                            ))}
                        </View>
                    </Field>

                    <Field label="Notes" className="mb-6">
                        <Input
                            placeholder="Enter notes"
                            value={form.notes}
                            onChangeText={(v) => handleUpdateForm("notes", v)}
                            multiline
                        />
                    </Field>

                    <Pressable
                        onPress={handleSubmit}
                        disabled={submitting || loading}
                        className={`h-14 rounded-2xl items-center justify-center ${
                            submitting || loading
                                ? "bg-primary/50"
                                : "bg-primary"
                        }`}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Text className="font-kumbhBold text-[15px] text-white">
                                {partnerId ? "Update Partner" : "Save Partner"}
                            </Text>
                        )}
                    </Pressable>
                </ScrollView>
            </KeyboardAvoidingView>
            <DatePickerModal
                visible={birthdayPickerVisible}
                value={birthdayPickerDate(form.dateOfBirth)}
                maximumDate={new Date()}
                onCancel={() => setBirthdayPickerVisible(false)}
                onDone={() => setBirthdayPickerVisible(false)}
                onDateChange={(date) =>
                    handleUpdateForm("dateOfBirth", birthdayInputFromDate(date))
                }
            />
        </SafeAreaView>
    );
}
