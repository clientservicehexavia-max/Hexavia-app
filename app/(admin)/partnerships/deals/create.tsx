import Field from "@/components/admin/Field";
import Input from "@/components/admin/Input";
import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import { PartnerPicker } from "@/components/partnership/PartnerPicker";
import { CustomTextInput } from "@/components/ui/CustomInput";
import { selectDealById, selectDealLoading } from "@/redux/deal/deal.selectors";
import {
    createDeal,
    fetchDealById,
    updateDeal,
} from "@/redux/deal/deal.thunks";
import type { Deal } from "@/redux/deal/deal.types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
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
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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

    // Treat commas only as thousands separators; decimal values must use `.`.
    let normalized = sanitized.replace(/,/g, "");

    const segments = normalized.split(".");
    if (segments.length > 2) {
        normalized = `${segments[0]}.${segments.slice(1).join("")}`;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
};

const formatAmountInputText = (value: string) => {
    const sanitized = value.replace(/[^\d.,]/g, "");
    if (!sanitized) return "";

    let normalized = sanitized.replace(/,/g, "");
    const segments = normalized.split(".");

    if (segments.length > 2) {
        normalized = `${segments[0]}.${segments.slice(1).join("")}`;
    }

    const [integerPartRaw, decimalPart] = normalized.split(".");
    const integerPart = integerPartRaw || "0";
    const formattedInteger = new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 0,
    }).format(Number(integerPart));

    if (normalized.endsWith(".")) {
        return `${formattedInteger}.`;
    }

    return decimalPart !== undefined
        ? `${formattedInteger}.${decimalPart}`
        : formattedInteger;
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
    const [expectedDealValueInput, setExpectedDealValueInput] = useState("");
    const [agreedPercentageInput, setAgreedPercentageInput] = useState("");
    const [agreedFixedAmountInput, setAgreedFixedAmountInput] = useState("");

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
            setExpectedDealValueInput(
                deal.expectedDealValue !== undefined
                    ? formatAmountInputText(String(deal.expectedDealValue))
                    : "",
            );
            setAgreedFixedAmountInput(
                deal.agreedFixedAmount !== undefined
                    ? formatAmountInputText(String(deal.agreedFixedAmount))
                    : "",
            );
        }
    }, [deal]);

    const handleAmountInputChange = (
        value: string,
        setter: (value: string) => void,
        field: "expectedDealValue" | "agreedFixedAmount",
    ) => {
        const formatted = formatAmountInputText(value);
        setter(formatted);
        handleUpdateForm(field, parseAmountInput(formatted));
    };

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
            className="flex-1 bg-[#F5F7FB]"
            edges={
                isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]
            }
        >
            <PlatformAdaptiveHeader
                title={dealId ? "Edit Deal" : "Add Deal"}
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
                    <Field label="Deal Title *">
                        <Input
                            placeholder="Enter deal title"
                            value={form.title}
                            onChangeText={(v) => handleUpdateForm("title", v)}
                        />
                    </Field>

                    <Field label="Partner *">
                        <PartnerPicker
                            value={form.partnerId}
                            onChange={(id, name) => {
                                handleUpdateForm("partnerId", id);
                                handleUpdateForm("partnerName", name);
                            }}
                            placeholder="Select a partner"
                            disabled={submitting}
                        />
                    </Field>

                    <Field label="Stage">
                        <View className="flex-row flex-wrap gap-2">
                            {DEAL_STAGES.map((s) => {
                                const active = form.stage === s;
                                return (
                                    <Pressable
                                        key={s}
                                        onPress={() =>
                                            handleUpdateForm("stage", s)
                                        }
                                        className={`px-3.5 py-2 rounded-full border ${
                                            active
                                                ? "border-[#4C5FAB] bg-[#4C5FAB]"
                                                : "border-gray-200 bg-white"
                                        }`}
                                    >
                                        <Text
                                            className={`font-kumbhBold text-xs ${
                                                active
                                                    ? "text-white"
                                                    : "text-[#374151]"
                                            }`}
                                        >
                                            {s}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </Field>

                    <Field label="Introduction Type">
                        <View className="flex-row flex-wrap gap-2">
                            {INTRODUCTION_TYPES.map((t) => {
                                const active = form.introductionType === t;
                                return (
                                    <Pressable
                                        key={t}
                                        onPress={() =>
                                            handleUpdateForm(
                                                "introductionType",
                                                t,
                                            )
                                        }
                                        className={`px-3.5 py-2 rounded-full border ${
                                            active
                                                ? "border-[#4C5FAB] bg-[#4C5FAB]"
                                                : "border-gray-200 bg-white"
                                        }`}
                                    >
                                        <Text
                                            className={`font-kumbhBold text-xs ${
                                                active
                                                    ? "text-white"
                                                    : "text-[#374151]"
                                            }`}
                                        >
                                            {t}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </Field>

                    <Field label="Deal Source">
                        <View className="flex-row gap-2">
                            {DEAL_SOURCES.map((s) => {
                                const active = form.dealSource === s;
                                return (
                                    <Pressable
                                        key={s}
                                        onPress={() =>
                                            handleUpdateForm("dealSource", s)
                                        }
                                        className={`flex-1 px-2.5 py-2.5 rounded-2xl border items-center justify-center ${
                                            active
                                                ? "border-[#4C5FAB] bg-[#4C5FAB]"
                                                : "border-gray-200 bg-white"
                                        }`}
                                    >
                                        <Text
                                            className={`font-kumbhBold text-[11px] text-center ${
                                                active
                                                    ? "text-white"
                                                    : "text-[#374151]"
                                            }`}
                                        >
                                            {s}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </Field>

                    <Field label="Agreement Type">
                        <View className="flex-row flex-wrap gap-2">
                            {AGREEMENT_TYPES.map((t) => {
                                const active = form.agreementType === t;
                                return (
                                    <Pressable
                                        key={t}
                                        onPress={() =>
                                            handleAgreementTypeChange(t)
                                        }
                                        className={`px-3.5 py-2 rounded-full border ${
                                            active
                                                ? "border-[#4C5FAB] bg-[#4C5FAB]"
                                                : "border-gray-200 bg-white"
                                        }`}
                                    >
                                        <Text
                                            className={`font-kumbhBold text-xs ${
                                                active
                                                    ? "text-white"
                                                    : "text-[#374151]"
                                            }`}
                                        >
                                            {t}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </Field>

                    {form.agreementType !== "Revenue Share" ? (
                        <Field label="Expected Deal Value">
                            <View className="h-14 justify-center rounded-2xl border border-gray-200 bg-white px-4">
                                <CustomTextInput
                                    placeholder="Enter value in numbers"
                                    value={expectedDealValueInput}
                                    onChangeText={(value) =>
                                        handleAmountInputChange(
                                            value,
                                            setExpectedDealValueInput,
                                            "expectedDealValue",
                                        )
                                    }
                                    keyboardType="decimal-pad"
                                    editable={!submitting}
                                />
                            </View>
                        </Field>
                    ) : null}

                    {(form.agreementType === "Percentage Commission" ||
                        form.agreementType === "Revenue Share") && (
                        <Field
                            label={
                                form.agreementType === "Revenue Share"
                                    ? "Revenue Share Percentage (%)"
                                    : "Agreed Percentage (%)"
                            }
                        >
                            <View className="h-14 justify-center rounded-2xl border border-gray-200 bg-white px-4">
                                <CustomTextInput
                                    placeholder="Enter percentage"
                                    value={agreedPercentageInput}
                                    onChangeText={
                                        handleAgreedPercentageInputChange
                                    }
                                    keyboardType="decimal-pad"
                                    editable={!submitting}
                                />
                            </View>
                        </Field>
                    )}

                    {form.agreementType === "Fixed Fee" && (
                        <Field label="Fixed Amount">
                            <View className="h-14 justify-center rounded-2xl border border-gray-200 bg-white px-4">
                                <CustomTextInput
                                    placeholder="Enter fixed amount"
                                    value={agreedFixedAmountInput}
                                    onChangeText={(value) =>
                                        handleAmountInputChange(
                                            value,
                                            setAgreedFixedAmountInput,
                                            "agreedFixedAmount",
                                        )
                                    }
                                    keyboardType="decimal-pad"
                                    editable={!submitting}
                                />
                            </View>
                        </Field>
                    )}

                    {form.agreementType !== "Revenue Share" ? (
                        <Field label="Partner Return">
                            <View className="h-14 justify-center rounded-2xl border border-gray-200 bg-[#F9FAFB] px-4">
                                <CustomTextInput
                                    placeholder="Calculated from agreement terms"
                                    value={formatAmountForInput(partnerReturn)}
                                    editable={false}
                                />
                            </View>
                        </Field>
                    ) : (
                        <View className="mb-4 rounded-2xl border border-primary/20 bg-[#EEF2FF] px-4 py-3.5">
                            <Text className="text-sm font-kumbhBold text-[#4C5FAB]">
                                Revenue Share deal
                            </Text>
                            <Text className="mt-1 text-xs font-kumbh text-[#4C5FAB]/80">
                                Add investor revenue entries in Deal Details -
                                Financials.
                            </Text>
                        </View>
                    )}

                    <Field label="Recurring Revenue">
                        <View className="flex-row gap-2.5">
                            {[true, false].map((value) => {
                                const active = form.recurringRevenue === value;
                                return (
                                    <Pressable
                                        key={String(value)}
                                        onPress={() =>
                                            handleUpdateForm(
                                                "recurringRevenue",
                                                value,
                                            )
                                        }
                                        className={`flex-1 h-12 rounded-2xl border items-center justify-center ${
                                            active
                                                ? "border-[#4C5FAB] bg-[#4C5FAB]"
                                                : "border-gray-200 bg-white"
                                        }`}
                                    >
                                        <Text
                                            className={`font-kumbhBold text-sm ${
                                                active
                                                    ? "text-white"
                                                    : "text-[#374151]"
                                            }`}
                                        >
                                            {value ? "Yes" : "No"}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </Field>

                    {form.recurringRevenue && (
                        <Field label="Recurring Frequency">
                            <View className="flex-row flex-wrap gap-2">
                                {(
                                    [
                                        "monthly",
                                        "quarterly",
                                        "yearly",
                                        "as needed",
                                    ] as const
                                ).map((f) => {
                                    const active = form.recurringFrequency === f;
                                    return (
                                        <Pressable
                                            key={f}
                                            onPress={() =>
                                                handleUpdateForm(
                                                    "recurringFrequency",
                                                    f,
                                                )
                                            }
                                            className={`flex-1 min-w-[22%] h-11 rounded-2xl border items-center justify-center px-2 ${
                                                active
                                                    ? "border-[#4C5FAB] bg-[#4C5FAB]"
                                                    : "border-gray-200 bg-white"
                                            }`}
                                        >
                                            <Text
                                                className={`font-kumbhBold text-xs text-center ${
                                                    active
                                                        ? "text-white"
                                                        : "text-[#374151]"
                                                }`}
                                            >
                                                {f.charAt(0).toUpperCase() +
                                                    f.slice(1)}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </Field>
                    )}

                    <Field label="Description / Notes">
                        <Input
                            placeholder="Enter deal description"
                            value={form.description}
                            onChangeText={(v) =>
                                handleUpdateForm("description", v)
                            }
                            multiline
                        />
                    </Field>

                    <Field label="Tags / Categories" className="mb-6">
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
                            {(form.tags || []).map((tag) => (
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
                                {dealId ? "Update Deal" : "Save Deal"}
                            </Text>
                        )}
                    </Pressable>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
