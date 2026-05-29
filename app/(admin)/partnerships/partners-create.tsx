import { useLocalSearchParams, useRouter } from "expo-router";
import { Check } from "lucide-react-native";
import React, { useEffect, useState } from "react";
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

import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
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
        contactEmail: "",
        contactPhone: "",
        address: "",
        partnerType: undefined,
        industry: "",
        engagementTags: [],
        notes: "",
        profileImage: "",
        status: "active",
    });

    const [submitting, setSubmitting] = useState(false);
    const [tagInput, setTagInput] = useState("");

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
                contactEmail: partner.contactEmail,
                contactPhone: partner.contactPhone,
                address: partner.address,
                partnerType: partner.partnerType,
                industry: partner.industry,
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
                    contactEmail,
                    contactPhone,
                    address,
                    partnerType,
                    industry,
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
                            contactEmail,
                            contactPhone,
                            address,
                            partnerType,
                            industry,
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
                    contactEmail,
                    contactPhone,
                    address,
                    partnerType,
                    industry,
                    engagementTags,
                    notes,
                    profileImage,
                    status,
                } = form;
                await dispatch(
                    createPartner({
                        name: name || "",
                        company,
                        contactEmail,
                        contactPhone,
                        address,
                        partnerType,
                        industry,
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
            className="flex-1 bg-white"
            edges={
                isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]
            }
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className="flex-1"
            >
                <View className="flex-1 px-4">
                    <PlatformAdaptiveHeader
                        title={partnerId ? "Edit Partner" : "Add Partner"}
                        headerRight={({ tintColor }) => (
                            <Pressable
                                onPress={handleSubmit}
                                disabled={submitting || loading}
                                className="w-10 h-10 rounded-full items-center justify-center"
                            >
                                {submitting ? (
                                    <ActivityIndicator
                                        size="small"
                                        color={tintColor}
                                    />
                                ) : (
                                    <Check
                                        size={28}
                                        color={
                                            submitting || loading
                                                ? "#9CA3AF"
                                                : tintColor
                                        }
                                    />
                                )}
                            </Pressable>
                        )}
                    />

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Partner Name */}
                        <View className="mb-6">
                            <Text className="text-gray-700 font-semibold mb-2">
                                Partner Name *
                            </Text>
                            <TextInput
                                placeholder="Enter partner name"
                                value={form.name}
                                onChangeText={(v) =>
                                    handleUpdateForm("name", v)
                                }
                                className="border border-gray-300 rounded-lg px-4 py-3 text-base"
                                editable={!submitting}
                            />
                        </View>

                        {/* Company */}
                        <View className="mb-6">
                            <Text className="text-gray-700 font-semibold mb-2">
                                Company
                            </Text>
                            <TextInput
                                placeholder="Enter company name"
                                value={form.company}
                                onChangeText={(v) =>
                                    handleUpdateForm("company", v)
                                }
                                className="border border-gray-300 rounded-lg px-4 py-3 text-base"
                                editable={!submitting}
                            />
                        </View>

                        {/* Email */}
                        <View className="mb-6">
                            <Text className="text-gray-700 font-semibold mb-2">
                                Email
                            </Text>
                            <TextInput
                                placeholder="Enter email address"
                                value={form.contactEmail}
                                onChangeText={(v) =>
                                    handleUpdateForm("contactEmail", v)
                                }
                                keyboardType="email-address"
                                className="border border-gray-300 rounded-lg px-4 py-3 text-base"
                                editable={!submitting}
                            />
                        </View>

                        {/* Phone */}
                        <View className="mb-6">
                            <Text className="text-gray-700 font-semibold mb-2">
                                Phone
                            </Text>
                            <TextInput
                                placeholder="Enter phone number"
                                value={form.contactPhone}
                                onChangeText={(v) =>
                                    handleUpdateForm("contactPhone", v)
                                }
                                keyboardType="phone-pad"
                                className="border border-gray-300 rounded-lg px-4 py-3 text-base"
                                editable={!submitting}
                            />
                        </View>

                        {/* Address */}
                        <View className="mb-6">
                            <Text className="text-gray-700 font-semibold mb-2">
                                Address
                            </Text>
                            <TextInput
                                placeholder="Enter address"
                                value={form.address}
                                onChangeText={(v) =>
                                    handleUpdateForm("address", v)
                                }
                                className="border border-gray-300 rounded-lg px-4 py-3 text-base"
                                editable={!submitting}
                            />
                        </View>

                        {/* Industry */}
                        <View className="mb-6">
                            <Text className="text-gray-700 font-semibold mb-2">
                                Industry
                            </Text>
                            <TextInput
                                placeholder="Enter industry"
                                value={form.industry}
                                onChangeText={(v) =>
                                    handleUpdateForm("industry", v)
                                }
                                className="border border-gray-300 rounded-lg px-4 py-3 text-base"
                                editable={!submitting}
                            />
                        </View>

                        {/* Partner Type */}
                        <View className="mb-6">
                            <Text className="text-gray-700 font-semibold mb-2">
                                Partner Type
                            </Text>
                            <View className="flex-row flex-wrap gap-2">
                                {(
                                    [
                                        "individual",
                                        "company",
                                        "investor",
                                        "vendor",
                                        "other",
                                    ] as const
                                ).map((t) => (
                                    <Pressable
                                        key={t}
                                        onPress={() =>
                                            handleUpdateForm("partnerType", t)
                                        }
                                        className={`px-3 py-2 rounded-lg border ${
                                            form.partnerType === t
                                                ? "border-blue-500 bg-blue-50"
                                                : "border-gray-300 bg-white"
                                        }`}
                                    >
                                        <Text
                                            className={`font-medium text-sm ${
                                                form.partnerType === t
                                                    ? "text-blue-700"
                                                    : "text-gray-700"
                                            }`}
                                        >
                                            {t.charAt(0).toUpperCase() +
                                                t.slice(1)}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>

                        {/* Status */}
                        <View className="mb-6">
                            <Text className="text-gray-700 font-semibold mb-2">
                                Status
                            </Text>
                            <View className="flex-row gap-2">
                                {(["active", "inactive"] as const).map((s) => (
                                    <Pressable
                                        key={s}
                                        onPress={() =>
                                            handleUpdateForm("status", s)
                                        }
                                        className={`flex-1 px-3 py-2 rounded-lg border ${
                                            form.status === s
                                                ? "border-blue-500 bg-blue-50"
                                                : "border-gray-300 bg-white"
                                        }`}
                                    >
                                        <Text
                                            className={`text-center font-medium ${
                                                form.status === s
                                                    ? "text-blue-700"
                                                    : "text-gray-700"
                                            }`}
                                        >
                                            {s.charAt(0).toUpperCase() +
                                                s.slice(1)}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>

                        {/* Engagement Tags */}
                        <View className="mb-6">
                            <Text className="text-gray-700 font-semibold mb-2">
                                Engagement Tags
                            </Text>
                            <View className="flex-row mb-2 gap-2">
                                <TextInput
                                    placeholder="Add tags..."
                                    value={tagInput}
                                    onChangeText={setTagInput}
                                    className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-base"
                                    editable={!submitting}
                                />
                                <Pressable
                                    onPress={handleAddTag}
                                    disabled={!tagInput.trim() || submitting}
                                    className="px-4 py-2 bg-blue-500 rounded-lg justify-center"
                                >
                                    <Text className="text-white font-semibold">
                                        +
                                    </Text>
                                </Pressable>
                            </View>
                            <View className="flex-row flex-wrap gap-2">
                                {(form.engagementTags || []).map((tag) => (
                                    <View
                                        key={tag}
                                        className="bg-blue-100 rounded-full px-3 py-1 flex-row items-center gap-1"
                                    >
                                        <Text className="text-blue-800 text-sm font-medium">
                                            {tag}
                                        </Text>
                                        <Pressable
                                            onPress={() => handleRemoveTag(tag)}
                                        >
                                            <Text className="text-blue-800 font-bold">
                                                ×
                                            </Text>
                                        </Pressable>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* Notes */}
                        <View className="mb-6">
                            <Text className="text-gray-700 font-semibold mb-2">
                                Notes
                            </Text>
                            <TextInput
                                placeholder="Enter notes"
                                value={form.notes}
                                onChangeText={(v) =>
                                    handleUpdateForm("notes", v)
                                }
                                multiline
                                numberOfLines={4}
                                className="border border-gray-300 rounded-lg px-4 py-3 text-base"
                                textAlignVertical="top"
                                editable={!submitting}
                            />
                        </View>

                        <View className="mb-10" />
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
