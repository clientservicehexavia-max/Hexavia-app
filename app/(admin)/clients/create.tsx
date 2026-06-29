import { yupResolver } from "@hookform/resolvers/yup";
import clsx from "clsx";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import { ChevronDown, Plus } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as yup from "yup";

import Field from "@/components/admin/Field";
import Input from "@/components/admin/Input";
import OptionSheet from "@/components/common/OptionSheet";

import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import { selectClientMutationLoading } from "@/redux/client/client.selectors";
import { createClient } from "@/redux/client/client.thunks";
import type { ClientCreateInput } from "@/redux/client/client.types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

type FormValues = {
    name?: string;
    projectName?: string;
    phoneNumber?: string;
    email?: string;
    source?:
        | "Lujo heights"
        | "Boing"
        | "Moses Okoh"
        | "TMI"
        | "Private jet"
        | "";
    industry?: string;
    industryOther?: string;
    staffSize?: string;
    description?: string;
    problems?: string;
    strength?: string;
    weakness?: string;
    opportunities?: string;
    threats?: string;
    engagement?: string;
    deliverables?: string;
    payableAmount?: string;
    status: "pending" | "active" | "closed";
};

const schema: yup.ObjectSchema<FormValues> = yup.object({
    name: yup.string().trim().optional(),
    projectName: yup.string().trim().optional(),
    email: yup.string().trim().optional(),
    phoneNumber: yup.string().trim().optional(),
    source: yup
        .string()
        .oneOf([
            "",
            "Lujo heights",
            "Boing",
            "Moses Okoh",
            "TMI",
            "Private jet",
        ])
        .optional(),
    industry: yup.string().trim().optional(),
    industryOther: yup
        .string()
        .trim()
        .when("industry", {
            is: "Other",
            then: (schema) => schema.required("Please specify the industry"),
            otherwise: (schema) => schema.optional(),
        }),
    staffSize: yup
        .string()
        .matches(/^\d*$/, "Staff size must be a number")
        .optional(),
    description: yup.string().trim().optional(),
    problems: yup.string().trim().optional(),
    strength: yup.string().trim().optional(),
    weakness: yup.string().trim().optional(),
    opportunities: yup.string().trim().optional(),
    threats: yup.string().trim().optional(),
    engagement: yup.string().trim().optional(),
    deliverables: yup.string().trim().optional(),
    payableAmount: yup
        .string()
        .matches(/^\d*$/, "Amount must be a number")
        .optional(),
    status: yup
        .mixed<"pending" | "active" | "closed">()
        .oneOf(["pending", "active", "closed"])
        .required(),
});

const STATUS_OPTIONS: Array<FormValues["status"]> = [
    "pending",
    "active",
    "closed",
];

const SOURCE_OPTIONS: Array<{
    label: string;
    value: NonNullable<FormValues["source"]>;
}> = [
    { label: "Lujo heights", value: "Lujo heights" },
    { label: "Boing", value: "Boing" },
    { label: "Moses Okoh", value: "Moses Okoh" },
    { label: "TMI", value: "TMI" },
    { label: "Private jet", value: "Private jet" },
];

const STAFF_SIZE_OPTIONS = [
    { label: "0-5", value: 5 },
    { label: "5-20", value: 20 },
    { label: "20-100", value: 100 },
    { label: "100-150", value: 150 },
    { label: "150+", value: 151 },
];

const INDUSTRY_OPTIONS = [
    { label: "Technology", value: "Technology" },
    { label: "Healthcare", value: "Healthcare" },
    { label: "Finance", value: "Finance" },
    { label: "Education", value: "Education" },
    { label: "Retail", value: "Retail" },
    { label: "Manufacturing", value: "Manufacturing" },
    { label: "Real Estate", value: "Real Estate" },
    { label: "Transportation", value: "Transportation" },
    { label: "Energy", value: "Energy" },
    { label: "Agriculture", value: "Agriculture" },
    { label: "Construction", value: "Construction" },
    { label: "Hospitality", value: "Hospitality" },
    { label: "Entertainment", value: "Entertainment" },
    { label: "Telecommunications", value: "Telecommunications" },
    { label: "Automotive", value: "Automotive" },
    { label: "Food & Beverage", value: "Food & Beverage" },
    { label: "Pharmaceuticals", value: "Pharmaceuticals" },
    { label: "Consulting", value: "Consulting" },
    { label: "Legal Services", value: "Legal Services" },
    { label: "Non-Profit", value: "Non-Profit" },
    { label: "Government", value: "Government" },
    { label: "Other", value: "Other" },
];

const DOCUMENT_TYPES: string[] = ["application/pdf"];

export default function CreateClient() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const isIOS = Platform.OS === "ios";
    const loading = useAppSelector(selectClientMutationLoading);

    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [showStaffSizeSheet, setShowStaffSizeSheet] = useState(false);
    const [showIndustrySheet, setShowIndustrySheet] = useState(false);
    const [showSourceSheet, setShowSourceSheet] = useState(false);
    const [documentName, setDocumentName] = useState("");
    const [documentFile, setDocumentFile] = useState<{
        uri: string;
        name: string;
        type?: string;
    } | null>(null);
    const [uploadingDocument, setUploadingDocument] = useState(false);

    const handleAttachDocument = useCallback(async () => {
        if (uploadingDocument) return;
        setUploadingDocument(true);
        try {
            const res = await DocumentPicker.getDocumentAsync({
                copyToCacheDirectory: true,
                type: DOCUMENT_TYPES,
            });
            if (res.canceled) return;
            const asset = res.assets?.[0];
            if (!asset) return;

            const name = asset.name ?? `document_${Date.now()}.pdf`;
            setDocumentFile({
                uri: asset.uri,
                name,
                type: asset.mimeType ?? "application/pdf",
            });
            setDocumentName(name);
        } catch (err) {
            console.warn("[client/create] document upload failed", err);
        } finally {
            setUploadingDocument(false);
        }
    }, [uploadingDocument]);

    const handleRemoveDocument = useCallback(() => {
        setDocumentFile(null);
        setDocumentName("");
    }, []);

    const {
        control,
        handleSubmit,
        formState: { errors, isValid },
        setValue,
        watch,
    } = useForm<FormValues>({
        mode: "onChange",
        resolver: yupResolver(schema),
        defaultValues: {
            name: "",
            projectName: "",
            email: "",
            phoneNumber: "",
            source: "",
            industry: "",
            industryOther: "",
            staffSize: "",
            description: "",
            problems: "",
            strength: "",
            weakness: "",
            opportunities: "",
            threats: "",
            engagement: "",
            deliverables: "",
            payableAmount: "",
            status: "pending",
        },
    });

    const onSubmit = async (values: FormValues) => {
        const industryValue = values.industry?.trim();
        const industryOtherValue = values.industryOther?.trim();
        const payload: ClientCreateInput = {
            name: values.name?.trim() || "",
            projectName: values.projectName?.trim() || "",
            phoneNumber: values.phoneNumber?.trim() || undefined,
            email: values.email?.trim() || undefined,
            source: values.source || undefined,
            engagement: values.engagement?.trim() || undefined,
            industry:
                industryValue === "Other"
                    ? industryOtherValue || undefined
                    : industryValue || undefined,
            staffSize: values.staffSize ? Number(values.staffSize) : undefined,
            description: values.description?.trim() || undefined,
            problems: values.problems?.trim() || undefined,
            strength: values.strength?.trim() || undefined,
            weakness: values.weakness?.trim() || undefined,
            opportunities: values.opportunities?.trim() || undefined,
            threats: values.threats?.trim() || undefined,
            deliverables: values.deliverables?.trim() || undefined,
            documentFile: documentFile ?? undefined,
            payableAmount: values.payableAmount
                ? Number(values.payableAmount)
                : undefined,
            status: values.status,
        };

        try {
            const created = await dispatch(createClient(payload)).unwrap();
            if (created?._id) {
                router.push({
                    pathname: "/(admin)/clients",
                    params: { id: created._id },
                });
            } else {
                router.back();
            }
        } catch {
            // showError already handled in thunk
        }
    };

    return (
        <SafeAreaView
            edges={
                isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]
            }
            className="flex-1 bg-white"
        >
            {/* Header */}

            <PlatformAdaptiveHeader
                title="Add New Client"
                // onBackPress={onHeaderBackPress}
                headerRight={({ tintColor }) => (
                    <Pressable
                        onPress={handleSubmit(onSubmit)}
                        disabled={!isValid || loading}
                        className="w-10 h-10 rounded-full items-center justify-center"
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color={tintColor} />
                        ) : (
                            <Plus
                                size={28}
                                color={
                                    !isValid || loading ? "#9CA3AF" : tintColor
                                }
                            />
                        )}
                    </Pressable>
                )}
            />

            <KeyboardAvoidingView
                className="flex-1 mt-3"
                behavior={Platform.select({
                    ios: "padding",
                    android: "height",
                })}
                keyboardVerticalOffset={
                    Platform.select({ ios: 70, android: 0 }) as number
                }
            >
                <ScrollView
                    className="flex-1"
                    contentContainerClassName="pb-10 px-4"
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Name */}
                    <Field label="Name">
                        <Controller
                            control={control}
                            name="name"
                            render={({ field: { value, onChange } }) => (
                                <Input
                                    placeholder="Enter Name"
                                    value={value}
                                    onChangeText={onChange}
                                />
                            )}
                        />
                    </Field>
                    {errors.name?.message ? (
                        <ErrorText msg={errors.name.message} />
                    ) : null}

                    {/* Project Name */}
                    <Field label="Project Name">
                        <Controller
                            control={control}
                            name="projectName"
                            render={({ field: { value, onChange } }) => (
                                <Input
                                    placeholder="Enter Project Name"
                                    value={value}
                                    onChangeText={onChange}
                                />
                            )}
                        />
                    </Field>
                    {errors.projectName?.message ? (
                        <ErrorText msg={errors.projectName.message} />
                    ) : null}

                    {/* Email */}
                    <Field label="Email Address">
                        <Controller
                            control={control}
                            name="email"
                            render={({ field: { value, onChange } }) => (
                                <Input
                                    placeholder="Enter Email"
                                    value={value}
                                    onChangeText={onChange}
                                />
                            )}
                        />
                    </Field>
                    {errors.email?.message ? (
                        <ErrorText msg={errors.email.message} />
                    ) : null}

                    {/* phoneNumber */}
                    <Field label="Phone Number">
                        <Controller
                            control={control}
                            name="phoneNumber"
                            render={({ field: { value, onChange } }) => (
                                <Input
                                    placeholder="Enter Phone Number"
                                    keyboardType="numeric"
                                    value={value}
                                    onChangeText={onChange}
                                />
                            )}
                        />
                    </Field>
                    {errors.phoneNumber?.message ? (
                        <ErrorText msg={errors.phoneNumber.message} />
                    ) : null}

                    {/* Source */}
                    <Field label="Source (optional)">
                        <Controller
                            control={control}
                            name="source"
                            render={({ field: { value } }) => (
                                <Pressable
                                    disabled={loading}
                                    onPress={() => setShowSourceSheet(true)}
                                    className="flex-row items-center justify-between bg-gray-200 rounded-2xl px-4 py-4"
                                >
                                    <Text className="text-gray-700 font-kumbh capitalize flex-1">
                                        {value || "Select Source"}
                                    </Text>
                                    <ChevronDown size={18} color="#111827" />
                                </Pressable>
                            )}
                        />
                    </Field>
                    {errors.source?.message ? (
                        <ErrorText msg={errors.source.message} />
                    ) : null}

                    {/* Industry + Staff size */}
                    <View className="flex-row gap-3">
                        <View className="flex-1">
                            <Field label="Industry">
                                <Controller
                                    control={control}
                                    name="industry"
                                    render={({
                                        field: { value, onChange },
                                    }) => (
                                        <Pressable
                                            disabled={loading}
                                            onPress={() =>
                                                setShowIndustrySheet(true)
                                            }
                                            className="flex-row items-center justify-between bg-gray-200 rounded-2xl px-4 py-4"
                                        >
                                            <Text className="text-gray-700 font-kumbh capitalize">
                                                {value || "Select Industry"}
                                            </Text>
                                            <ChevronDown
                                                size={18}
                                                color="#111827"
                                            />
                                        </Pressable>
                                    )}
                                />
                            </Field>
                            {errors.industry?.message ? (
                                <ErrorText msg={errors.industry.message} />
                            ) : null}
                        </View>

                        <View className="flex-1">
                            <Field label="Staff Size">
                                <Controller
                                    control={control}
                                    name="staffSize"
                                    render={({
                                        field: { value, onChange },
                                    }) => (
                                        <Pressable
                                            disabled={loading}
                                            onPress={() =>
                                                setShowStaffSizeSheet(true)
                                            }
                                            className="flex-row items-center justify-between bg-gray-200 rounded-2xl px-4 py-4"
                                        >
                                            <Text className="text-gray-700 font-kumbh">
                                                {value
                                                    ? STAFF_SIZE_OPTIONS.find(
                                                          (opt) =>
                                                              opt.value ===
                                                              Number(value),
                                                      )?.label
                                                    : "Select Staff Size"}
                                            </Text>
                                            <ChevronDown
                                                size={18}
                                                color="#111827"
                                            />
                                        </Pressable>
                                    )}
                                />
                            </Field>
                            {errors.staffSize?.message ? (
                                <ErrorText msg={errors.staffSize.message} />
                            ) : null}
                        </View>
                    </View>
                    {watch("industry") === "Other" ? (
                        <View className="mt-3">
                            <Field label="Other Industry">
                                <Controller
                                    control={control}
                                    name="industryOther"
                                    render={({
                                        field: { value, onChange },
                                    }) => (
                                        <Input
                                            placeholder="Enter Industry"
                                            value={value}
                                            onChangeText={onChange}
                                        />
                                    )}
                                />
                            </Field>
                            {errors.industryOther?.message ? (
                                <ErrorText msg={errors.industryOther.message} />
                            ) : null}
                        </View>
                    ) : null}

                    {/* Description */}
                    <Field label="Description">
                        <Controller
                            control={control}
                            name="description"
                            render={({ field: { value, onChange } }) => (
                                <Input
                                    multiline
                                    placeholder="Enter Description"
                                    value={value}
                                    onChangeText={onChange}
                                />
                            )}
                        />
                    </Field>
                    {errors.description?.message ? (
                        <ErrorText msg={errors.description.message} />
                    ) : null}

                    {/* Problems */}
                    <Field label="Problems Faced">
                        <Controller
                            control={control}
                            name="problems"
                            render={({ field: { value, onChange } }) => (
                                <Input
                                    multiline
                                    placeholder="Enter Problems"
                                    value={value}
                                    onChangeText={onChange}
                                />
                            )}
                        />
                    </Field>
                    {errors.problems?.message ? (
                        <ErrorText msg={errors.problems.message} />
                    ) : null}

                    {/* Strength */}
                    <Field label="Strengths">
                        <Controller
                            control={control}
                            name="strength"
                            render={({ field: { value, onChange } }) => (
                                <Input
                                    multiline
                                    placeholder="Enter Strengths"
                                    value={value}
                                    onChangeText={onChange}
                                />
                            )}
                        />
                    </Field>
                    {errors.strength?.message ? (
                        <ErrorText msg={errors.strength.message} />
                    ) : null}

                    {/* Weakness */}
                    <Field label="Weaknesses">
                        <Controller
                            control={control}
                            name="weakness"
                            render={({ field: { value, onChange } }) => (
                                <Input
                                    multiline
                                    placeholder="Enter Weaknesses"
                                    value={value}
                                    onChangeText={onChange}
                                />
                            )}
                        />
                    </Field>
                    {errors.weakness?.message ? (
                        <ErrorText msg={errors.weakness.message} />
                    ) : null}

                    {/* Opportunities */}
                    <Field label="Opportunities">
                        <Controller
                            control={control}
                            name="opportunities"
                            render={({ field: { value, onChange } }) => (
                                <Input
                                    multiline
                                    placeholder="Enter Opportunities"
                                    value={value}
                                    onChangeText={onChange}
                                />
                            )}
                        />
                    </Field>
                    {errors.opportunities?.message ? (
                        <ErrorText msg={errors.opportunities.message} />
                    ) : null}

                    {/* Threats */}
                    <Field label="Threats">
                        <Controller
                            control={control}
                            name="threats"
                            render={({ field: { value, onChange } }) => (
                                <Input
                                    multiline
                                    placeholder="Enter Threats"
                                    value={value}
                                    onChangeText={onChange}
                                />
                            )}
                        />
                    </Field>
                    {errors.threats?.message ? (
                        <ErrorText msg={errors.threats.message} />
                    ) : null}

                    {/* Engagement */}
                    <Field label="Engagement Offered">
                        <Controller
                            control={control}
                            name="engagement"
                            render={({ field: { value, onChange } }) => (
                                <Input
                                    placeholder='e.g. "Full-time", "Part-time"'
                                    value={value}
                                    onChangeText={onChange}
                                />
                            )}
                        />
                    </Field>
                    {errors.engagement?.message ? (
                        <ErrorText msg={errors.engagement.message} />
                    ) : null}

                    {/* Deliverables */}
                    <Field label="Deliverables">
                        <Controller
                            control={control}
                            name="deliverables"
                            render={({ field: { value, onChange } }) => (
                                <Input
                                    multiline
                                    placeholder="Enter Deliverables"
                                    value={value}
                                    onChangeText={onChange}
                                />
                            )}
                        />
                    </Field>
                    {errors.deliverables?.message ? (
                        <ErrorText msg={errors.deliverables.message} />
                    ) : null}

                    {/* Document upload */}
                    <Field label="Supporting Document (optional)">
                        <View className="flex-row items-center gap-3">
                            <Pressable
                                disabled={loading || uploadingDocument}
                                onPress={handleAttachDocument}
                                className={clsx(
                                    "flex-row items-center gap-2 rounded-2xl px-4 py-3",
                                    loading || uploadingDocument
                                        ? "bg-gray-300"
                                        : "bg-primary-500",
                                )}
                            >
                                {uploadingDocument ? (
                                    <ActivityIndicator
                                        size="small"
                                        color="#fff"
                                    />
                                ) : (
                                    <Text className="text-white font-kumbh">
                                        {documentFile
                                            ? "Replace document"
                                            : "Upload document"}
                                    </Text>
                                )}
                            </Pressable>
                            {documentFile ? (
                                <Pressable
                                    onPress={handleRemoveDocument}
                                    className="rounded-full border border-gray-200 px-3 py-2"
                                >
                                    <Text className="text-xs text-gray-600 font-kumbh">
                                        Remove
                                    </Text>
                                </Pressable>
                            ) : null}
                        </View>
                        <Text className="text-xs text-gray-500 mt-1 font-kumbh">
                            {documentName
                                ? `Uploaded: ${documentName}`
                                : "Attach a PDF document (optional)."}
                        </Text>
                    </Field>

                    {/* Amount + Status */}
                    <View className="flex-row gap-3">
                        <View className="flex-1">
                            <Field label="Receivable Amount">
                                <Controller
                                    control={control}
                                    name="payableAmount"
                                    render={({
                                        field: { value, onChange },
                                    }) => {
                                        const raw = onlyDigits(value ?? "");
                                        const display = formatWithCommas(raw);

                                        return (
                                            <Input
                                                placeholder="Enter Amount"
                                                value={display}
                                                keyboardType="numeric"
                                                onChangeText={(text) => {
                                                    // strip commas/spaces/etc then store digits only
                                                    onChange(onlyDigits(text));
                                                }}
                                            />
                                        );
                                    }}
                                />
                            </Field>

                            {errors.payableAmount?.message ? (
                                <ErrorText msg={errors.payableAmount.message} />
                            ) : null}
                        </View>

                        <View className="flex-1">
                            <Field label="Status">
                                <Controller
                                    control={control}
                                    name="status"
                                    render={({
                                        field: { value, onChange },
                                    }) => (
                                        <Pressable
                                            disabled={loading}
                                            onPress={() =>
                                                setShowStatusMenu(true)
                                            }
                                            className="flex-row items-center justify-between bg-gray-200 rounded-2xl px-4 py-4"
                                        >
                                            <Text className="text-gray-700 font-kumbh">
                                                {capitalize(value)}
                                            </Text>
                                            <ChevronDown
                                                size={18}
                                                color="#111827"
                                            />
                                        </Pressable>
                                    )}
                                />
                            </Field>
                            {errors.status?.message ? (
                                <ErrorText msg={errors.status.message} />
                            ) : null}
                        </View>
                    </View>

                    {/* Bottom actions – left as requested (disabled while loading) */}
                    {/* <View className="mt-8">
              <Pressable
                disabled={loading}
                className={clsx(
                  "flex-row items-center justify-center gap-3 rounded-2xl py-4 active:opacity-90",
                  loading ? "bg-gray-300" : "bg-primary-500"
                )}
              >
                <View className="w-6 h-6 rounded-md bg-primary-400 items-center justify-center">
                  <Bell size={14} color="white" />
                </View>
                <Text className="text-white font-kumbhBold">Send Invoice</Text>
              </Pressable>

              <Pressable
                disabled={loading}
                className={clsx(
                  "mt-3 rounded-2xl py-4 items-center",
                  "border",
                  loading ? "border-gray-300" : "border-primary-300"
                )}
              >
                <Text
                  className={clsx(
                    "font-kumbhBold",
                    loading ? "text-gray-400" : "text-primary-700"
                  )}
                >
                  Generate Invoice
                </Text>
              </Pressable>
            </View> */}
                </ScrollView>
            </KeyboardAvoidingView>

            <OptionSheet
                visible={showStaffSizeSheet}
                onClose={() => setShowStaffSizeSheet(false)}
                onSelect={(value) => {
                    setValue("staffSize", String(value));
                    setShowStaffSizeSheet(false);
                }}
                title="Select Staff Size"
                options={STAFF_SIZE_OPTIONS}
                selectedValue={
                    control._getWatch("staffSize")
                        ? Number(control._getWatch("staffSize"))
                        : undefined
                }
            />

            <OptionSheet
                visible={showIndustrySheet}
                onClose={() => setShowIndustrySheet(false)}
                onSelect={(value) => {
                    setValue("industry", value as string);
                    if (value !== "Other") {
                        setValue("industryOther", "");
                    }
                    setShowIndustrySheet(false);
                }}
                title="Select Industry"
                options={INDUSTRY_OPTIONS}
                selectedValue={control._getWatch("industry")}
            />

            <OptionSheet
                visible={showStatusMenu}
                onClose={() => setShowStatusMenu(false)}
                onSelect={(value) => {
                    setValue(
                        "status",
                        value as "pending" | "active" | "closed",
                    );
                    setShowStatusMenu(false);
                }}
                title="Select Status"
                options={STATUS_OPTIONS.map((opt) => ({
                    label: capitalize(opt),
                    value: opt,
                }))}
                selectedValue={control._getWatch("status")}
            />

            <OptionSheet
                visible={showSourceSheet}
                onClose={() => setShowSourceSheet(false)}
                onSelect={(value) => {
                    setValue(
                        "source",
                        value as NonNullable<FormValues["source"]>,
                    );
                    setShowSourceSheet(false);
                }}
                title="Select Source"
                options={SOURCE_OPTIONS}
                selectedValue={control._getWatch("source")}
            />
        </SafeAreaView>
    );
}

function capitalize(s: string) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
function ErrorText({ msg }: { msg: string }) {
    return <Text className="text-xs text-red-600 mt-1">{msg}</Text>;
}
const onlyDigits = (s: string) => s.replace(/[^\d]/g, "");

const formatWithCommas = (digits: string) => {
    if (!digits) return "";
    // add commas every 3 digits
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};
