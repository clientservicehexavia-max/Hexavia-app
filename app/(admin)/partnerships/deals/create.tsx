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

import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import { PartnerPicker } from "@/components/partnership/PartnerPicker";
import { selectDealById, selectDealLoading } from "@/redux/deal/deal.selectors";
import {
    createDeal,
    fetchDealById,
    updateDeal,
} from "@/redux/deal/deal.thunks";
import type { Deal } from "@/redux/deal/deal.types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const DEAL_STAGES = [
    "Introduced",
    "Meeting Booked",
    "Proposal Sent",
    "Negotiation",
    "Closed Won",
    "Closed Lost",
    "On Hold",
] as const;

const INTRODUCTION_TYPES = [
    "New Lead",
    "Investor Introduction",
    "Client Introduction",
    "Vendor/Supplier Introduction",
    "Strategic Relationship",
] as const;

const DEAL_SOURCES = [
    "Brought by Us",
    "Brought by Partner",
    "Jointly Sourced",
] as const;

const AGREEMENT_TYPES = [
    "Percentage Commission",
    "Fixed Fee",
    "Equity/Shareholding",
    "Revenue Share",
    "Non-Financial Partnership",
] as const;

type FormData = Partial<Deal> & {
    partnerName?: string;
    tags?: string[];
};

const formatAmountForInput = (value?: number) => {
    if (value === undefined || value === null || Number.isNaN(value)) return "";
    return new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 2,
    }).format(value);
};

const parseAmountInput = (value: string) => {
    const sanitized = value.replace(/[^\d.,]/g, "");
    if (!sanitized) return undefined;

    // Support both `.` and `,` decimal separators while keeping thousands commas.
    const hasDot = sanitized.includes(".");
    const hasComma = sanitized.includes(",");
    let normalized = sanitized;

    if (hasDot && hasComma) {
        normalized = sanitized.replace(/,/g, "");
    } else if (!hasDot && hasComma) {
        normalized = sanitized.replace(/,/g, ".");
    }

    const segments = normalized.split(".");
    if (segments.length > 2) {
        normalized = `${segments[0]}.${segments.slice(1).join("")}`;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
};

export default function CreateDealScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const dispatch = useAppDispatch();
    const isIOS = Platform.OS === "ios";

    const dealId = params.dealId as string | undefined;
    const deal = useAppSelector((state) =>
        dealId ? selectDealById(dealId)(state) : undefined,
    );
    const loading = useAppSelector(selectDealLoading);

    const [form, setForm] = useState<FormData>({
        title: "",
        partnerId: "",
        partnerName: "",
        introductionType: undefined,
        dealSource: undefined,
        stage: "Introduced",
        agreementType: undefined,
        expectedDealValue: undefined,
        agreedPercentage: undefined,
        agreedFixedAmount: undefined,
        expectedPartnerReturn: undefined,
        recurringRevenue: false,
        recurringFrequency: undefined,
        description: "",
        tags: [],
    });

    const [submitting, setSubmitting] = useState(false);
    const [tagInput, setTagInput] = useState("");
    const [agreedPercentageInput, setAgreedPercentageInput] = useState("");

    useEffect(() => {
        if (dealId && !deal) {
            dispatch(fetchDealById(dealId));
        }
    }, [dealId, deal, dispatch]);

    useEffect(() => {
        if (deal) {
            setForm({
                title: deal.title,
                partnerId: deal.partnerId,
                introductionType: deal.introductionType,
                dealSource: deal.dealSource,
                stage: deal.stage,
                agreementType: deal.agreementType,
                expectedDealValue: deal.expectedDealValue,
                agreedPercentage: deal.agreedPercentage,
                agreedFixedAmount: deal.agreedFixedAmount,
                expectedPartnerReturn: deal.expectedPartnerReturn,
                recurringRevenue: deal.recurringRevenue,
                recurringFrequency: deal.recurringFrequency,
                description: deal.description,
                tags: deal.tags || [],
            });
            setAgreedPercentageInput(
                deal.agreedPercentage !== undefined
                    ? String(deal.agreedPercentage)
                    : "",
            );
        }
    }, [deal]);

    const handleAgreedPercentageInputChange = (value: string) => {
        const sanitized = value.replace(/[^\d.,]/g, "");
        setAgreedPercentageInput(sanitized);
        handleUpdateForm("agreedPercentage", parseAmountInput(sanitized));
    };

    const handleUpdateForm = (field: keyof FormData, value: any) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleAgreementTypeChange = (
        agreementType: Deal["agreementType"] | undefined,
    ) => {
        setForm((prev) => ({
            ...prev,
            agreementType,
            agreedPercentage:
                agreementType === "Percentage Commission" ||
                agreementType === "Revenue Share"
                    ? prev.agreedPercentage
                    : undefined,
            agreedFixedAmount:
                agreementType === "Fixed Fee"
                    ? prev.agreedFixedAmount
                    : undefined,
            expectedDealValue:
                agreementType === "Revenue Share"
                    ? undefined
                    : prev.expectedDealValue,
        }));
    };

    const partnerReturn = useMemo(() => {
        if (form.agreementType === "Percentage Commission") {
            const value = Number(form.expectedDealValue ?? 0);
            const percentage = Number(form.agreedPercentage ?? 0);
            if (!Number.isFinite(value) || !Number.isFinite(percentage)) {
                return undefined;
            }
            return (value * percentage) / 100;
        }

        if (form.agreementType === "Fixed Fee") {
            const amount = Number(form.agreedFixedAmount ?? 0);
            return Number.isFinite(amount) ? amount : undefined;
        }

        return undefined;
    }, [
        form.agreedFixedAmount,
        form.agreedPercentage,
        form.agreementType,
        form.expectedDealValue,
    ]);

    const handleAddTag = () => {
        if (tagInput.trim() && !form.tags?.includes(tagInput.trim())) {
            handleUpdateForm("tags", [...(form.tags || []), tagInput.trim()]);
            setTagInput("");
        }
    };

    const handleRemoveTag = (tag: string) => {
        handleUpdateForm(
            "tags",
            (form.tags || []).filter((t) => t !== tag),
        );
    };

    const handleSubmit = async () => {
        if (!form.title?.trim()) {
            Alert.alert("Error", "Deal title is required");
            return;
        }
        if (!form.partnerId?.trim()) {
            Alert.alert("Error", "Partner is required");
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                title: form.title || "",
                partnerId: form.partnerId || "",
                introductionType: form.introductionType,
                dealSource: form.dealSource,
                stage: form.stage as Deal["stage"],
                agreementType: form.agreementType,
                expectedDealValue:
                    form.agreementType === "Revenue Share"
                        ? undefined
                        : form.expectedDealValue,
                agreedPercentage:
                    form.agreementType === "Percentage Commission" ||
                    form.agreementType === "Revenue Share"
                        ? form.agreedPercentage
                        : undefined,
                agreedFixedAmount:
                    form.agreementType === "Fixed Fee"
                        ? form.agreedFixedAmount
                        : undefined,
                expectedPartnerReturn: partnerReturn,
                financialReconciliation:
                    form.agreementType === "Revenue Share"
                        ? {
                              ...(deal?.financialReconciliation || {}),
                              amountPaid: Number(
                                  deal?.financialReconciliation?.amountPaid ??
                                      0,
                              ),
                              paymentStatus:
                                  deal?.financialReconciliation
                                      ?.paymentStatus ?? "Not Paid",
                              approvalStatus:
                                  deal?.financialReconciliation
                                      ?.approvalStatus ?? "Pending",
                              revenueSharePercentage:
                                  form.agreedPercentage ?? 0,
                          }
                        : undefined,
                recurringRevenue: form.recurringRevenue,
                recurringFrequency: form.recurringFrequency,
                description: form.description,
                tags: form.tags,
            };

            if (dealId && deal) {
                await dispatch(
                    updateDeal({
                        id: dealId,
                        updates: payload,
                    }),
                ).unwrap();
                Alert.alert("Success", "Deal updated successfully");
            } else {
                await dispatch(createDeal(payload)).unwrap();
                Alert.alert("Success", "Deal created successfully");
            }
            router.back();
        } catch (err: any) {
            Alert.alert("Error", err?.message || "Failed to save deal");
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
                keyboardVerticalOffset={
                    Platform.select({ ios: 70, android: 0 }) as number
                }
            >
                <View className="flex-1 px-4">
                    <PlatformAdaptiveHeader
                        title={dealId ? "Edit Deal" : "Add Deal"}
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
                        {/* Deal Title */}
                        <View className="mb-6">
                            <Text className="text-gray-700 font-semibold mb-2">
                                Deal Title *
                            </Text>
                            <TextInput
                                placeholder="Enter deal title"
                                value={form.title}
                                onChangeText={(v) =>
                                    handleUpdateForm("title", v)
                                }
                                className="border border-gray-300 rounded-lg px-4 py-2 text-base"
                                editable={!submitting}
                                placeholderTextColor="#9CA3AF"
                            />
                        </View>

                        {/* Partner Picker */}
                        <View className="mb-6">
                            <Text className="text-gray-700 font-semibold mb-2">
                                Partner *
                            </Text>
                            <PartnerPicker
                                value={form.partnerId}
                                onChange={(id, name) => {
                                    handleUpdateForm("partnerId", id);
                                    handleUpdateForm("partnerName", name);
                                }}
                                placeholder="Select a partner"
                                disabled={submitting}
                            />
                        </View>

                        {/* Deal Stage */}
                        <View className="mb-6">
                            <Text className="text-gray-700 font-semibold mb-2">
                                Stage
                            </Text>
                            <View className="flex-row flex-wrap gap-2">
                                {DEAL_STAGES.map((s) => (
                                    <Pressable
                                        key={s}
                                        onPress={() =>
                                            handleUpdateForm("stage", s)
                                        }
                                        className={`px-3 py-2 rounded-lg border ${
                                            form.stage === s
                                                ? "border-blue-500 bg-blue-50"
                                                : "border-gray-300 bg-white"
                                        }`}
                                    >
                                        <Text
                                            className={`font-medium text-xs ${
                                                form.stage === s
                                                    ? "text-blue-700"
                                                    : "text-gray-700"
                                            }`}
                                        >
                                            {s}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>

                        {/* Introduction Type */}
                        <View className="mb-6">
                            <Text className="text-gray-700 font-semibold mb-2">
                                Introduction Type
                            </Text>
                            <View className="flex-row flex-wrap gap-2">
                                {INTRODUCTION_TYPES.map((t) => (
                                    <Pressable
                                        key={t}
                                        onPress={() =>
                                            handleUpdateForm(
                                                "introductionType",
                                                t,
                                            )
                                        }
                                        className={`px-3 py-2 rounded-lg border ${
                                            form.introductionType === t
                                                ? "border-blue-500 bg-blue-50"
                                                : "border-gray-300 bg-white"
                                        }`}
                                    >
                                        <Text
                                            className={`font-medium text-xs ${
                                                form.introductionType === t
                                                    ? "text-blue-700"
                                                    : "text-gray-700"
                                            }`}
                                        >
                                            {t}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>

                        {/* Deal Source */}
                        <View className="mb-6">
                            <Text className="text-gray-700 font-semibold mb-2">
                                Deal Source
                            </Text>
                            <View className="flex-row gap-2">
                                {DEAL_SOURCES.map((s) => (
                                    <Pressable
                                        key={s}
                                        onPress={() =>
                                            handleUpdateForm("dealSource", s)
                                        }
                                        className={`flex-1 px-2 py-2 rounded-lg border ${
                                            form.dealSource === s
                                                ? "border-blue-500 bg-blue-50"
                                                : "border-gray-300 bg-white"
                                        }`}
                                    >
                                        <Text
                                            className={`font-medium text-xs text-center ${
                                                form.dealSource === s
                                                    ? "text-blue-700"
                                                    : "text-gray-700"
                                            }`}
                                        >
                                            {s}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>

                        {/* Agreement Type */}
                        <View className="mb-6">
                            <Text className="text-gray-700 font-semibold mb-2">
                                Agreement Type
                            </Text>
                            <View className="flex-row flex-wrap gap-2">
                                {AGREEMENT_TYPES.map((t) => (
                                    <Pressable
                                        key={t}
                                        onPress={() =>
                                            handleAgreementTypeChange(t)
                                        }
                                        className={`px-3 py-2 rounded-lg border ${
                                            form.agreementType === t
                                                ? "border-blue-500 bg-blue-50"
                                                : "border-gray-300 bg-white"
                                        }`}
                                    >
                                        <Text
                                            className={`font-medium text-xs ${
                                                form.agreementType === t
                                                    ? "text-blue-700"
                                                    : "text-gray-700"
                                            }`}
                                        >
                                            {t}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>

                        {form.agreementType !== "Revenue Share" ? (
                            <View className="mb-6">
                                <Text className="text-gray-700 font-semibold mb-2">
                                    Expected Deal Value
                                </Text>
                                <TextInput
                                    placeholder="Enter value in numbers"
                                    placeholderTextColor="#9CA3AF"
                                    value={formatAmountForInput(
                                        form.expectedDealValue,
                                    )}
                                    onChangeText={(v) =>
                                        handleUpdateForm(
                                            "expectedDealValue",
                                            parseAmountInput(v),
                                        )
                                    }
                                    keyboardType="decimal-pad"
                                    className="border border-gray-300 rounded-lg px-4 py-2 text-base"
                                    editable={!submitting}
                                />
                            </View>
                        ) : null}

                        {/* Agreed Percentage/Amount */}
                        {(form.agreementType === "Percentage Commission" ||
                            form.agreementType === "Revenue Share") && (
                            <View className="mb-6">
                                <Text className="text-gray-700 font-semibold mb-2">
                                    {form.agreementType === "Revenue Share"
                                        ? "Revenue Share Percentage (%)"
                                        : "Agreed Percentage (%)"}
                                </Text>
                                <TextInput
                                    placeholder="Enter percentage"
                                    placeholderTextColor="#9CA3AF"
                                    value={agreedPercentageInput}
                                    onChangeText={
                                        handleAgreedPercentageInputChange
                                    }
                                    keyboardType="decimal-pad"
                                    className="border border-gray-300 rounded-lg px-4 py-2 text-base"
                                    editable={!submitting}
                                />
                            </View>
                        )}

                        {form.agreementType === "Fixed Fee" && (
                            <View className="mb-6">
                                <Text className="text-gray-700 font-semibold mb-2">
                                    Fixed Amount
                                </Text>
                                <TextInput
                                    placeholder="Enter fixed amount"
                                    placeholderTextColor="#9CA3AF"
                                    value={formatAmountForInput(
                                        form.agreedFixedAmount,
                                    )}
                                    onChangeText={(v) =>
                                        handleUpdateForm(
                                            "agreedFixedAmount",
                                            parseAmountInput(v),
                                        )
                                    }
                                    keyboardType="decimal-pad"
                                    className="border border-gray-300 rounded-lg px-4 py-2 text-base"
                                    editable={!submitting}
                                />
                            </View>
                        )}

                        {form.agreementType !== "Revenue Share" ? (
                            <View className="mb-6">
                                <Text className="text-gray-700 font-semibold mb-2">
                                    Partner Return
                                </Text>
                                <TextInput
                                    placeholder="Calculated from agreement terms"
                                    placeholderTextColor="#9CA3AF"
                                    value={formatAmountForInput(partnerReturn)}
                                    className="border border-gray-300 rounded-lg px-4 py-2 text-base"
                                    editable={false}
                                />
                            </View>
                        ) : (
                            <View className="mb-6 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
                                <Text className="text-sm font-semibold text-blue-700">
                                    Revenue Share deal
                                </Text>
                                <Text className="mt-1 text-xs text-blue-700/80">
                                    Add investor revenue entries in Deal Details
                                    - Financials.
                                </Text>
                            </View>
                        )}

                        {/* Recurring Revenue */}
                        <View className="mb-6">
                            <Text className="text-gray-700 font-semibold mb-2">
                                Recurring Revenue
                            </Text>
                            <View className="flex-row gap-2">
                                {[true, false].map((value) => (
                                    <Pressable
                                        key={String(value)}
                                        onPress={() =>
                                            handleUpdateForm(
                                                "recurringRevenue",
                                                value,
                                            )
                                        }
                                        className={`flex-1 px-3 py-2 rounded-lg border ${
                                            form.recurringRevenue === value
                                                ? "border-blue-500 bg-blue-50"
                                                : "border-gray-300 bg-white"
                                        }`}
                                    >
                                        <Text
                                            className={`text-center font-medium ${
                                                form.recurringRevenue === value
                                                    ? "text-blue-700"
                                                    : "text-gray-700"
                                            }`}
                                        >
                                            {value ? "Yes" : "No"}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>

                        {form.recurringRevenue && (
                            <View className="mb-6">
                                <Text className="text-gray-700 font-semibold mb-2">
                                    Recurring Frequency
                                </Text>
                                <View className="flex-row gap-2">
                                    {(
                                        [
                                            "monthly",
                                            "quarterly",
                                            "yearly",
                                            "as needed",
                                        ] as const
                                    ).map((f) => (
                                        <Pressable
                                            key={f}
                                            onPress={() =>
                                                handleUpdateForm(
                                                    "recurringFrequency",
                                                    f,
                                                )
                                            }
                                            className={`flex-1 p-2 rounded-lg border ${
                                                form.recurringFrequency === f
                                                    ? "border-blue-500 bg-blue-50"
                                                    : "border-gray-300 bg-white"
                                            }`}
                                        >
                                            <Text
                                                className={`text-center font-medium text-sm ${
                                                    form.recurringFrequency ===
                                                    f
                                                        ? "text-blue-700"
                                                        : "text-gray-700"
                                                }`}
                                            >
                                                {f.charAt(0).toUpperCase() +
                                                    f.slice(1)}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Description */}
                        <View className="mb-6">
                            <Text className="text-gray-700 font-semibold mb-2">
                                Description / Notes
                            </Text>
                            <TextInput
                                placeholder="Enter deal description"
                                placeholderTextColor="#9CA3AF"
                                value={form.description}
                                onChangeText={(v) =>
                                    handleUpdateForm("description", v)
                                }
                                multiline
                                numberOfLines={4}
                                className="border border-gray-300 rounded-lg px-4 py-2 text-base"
                                textAlignVertical="top"
                                editable={!submitting}
                            />
                        </View>

                        {/* Tags */}
                        <View className="mb-6">
                            <Text className="text-gray-700 font-semibold mb-2">
                                Tags / Categories
                            </Text>
                            <View className="flex-row mb-2 gap-2">
                                <TextInput
                                    placeholder="Add tags..."
                                    placeholderTextColor="#9CA3AF"
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
                                {(form.tags || []).map((tag) => (
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

                        <View className="mb-10" />
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
