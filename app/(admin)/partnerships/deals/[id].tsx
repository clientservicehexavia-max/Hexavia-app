import { api } from "@/api/axios";
import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import { selectDealById, selectDealLoading } from "@/redux/deal/deal.selectors";
import {
    deleteDeal,
    fetchDealById,
    updateDeal,
} from "@/redux/deal/deal.thunks";
import { selectPartnerById } from "@/redux/partner/partner.selectors";
import { fetchPartnerById } from "@/redux/partner/partner.thunks";
import { uploadSingle } from "@/redux/upload/upload.thunks";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { generateDealReportPdf } from "@/utils/partnershipReports";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import {
    Check,
    Download,
    Edit2,
    ExternalLink,
    FileText,
    Plus,
    Share2,
    Trash2,
    Upload,
    X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type TabKey =
    | "Overview"
    | "Activities"
    | "Financials"
    | "Contributions"
    | "Documents";

type PickedFile = {
    uri: string;
    name: string;
    type?: string;
};

const TABS: TabKey[] = [
    "Overview",
    "Activities",
    "Financials",
    "Contributions",
    "Documents",
];

const DEAL_STAGES = [
    "Introduced",
    "Meeting Booked",
    "Proposal Sent",
    "Negotiation",
    "Closed Won",
    "Closed Lost",
    "On Hold",
] as const;

const CONTRIBUTION_TYPES = [
    "Introduction",
    "Meeting Secured",
    "Strategic Door",
    "Brand Visibility",
    "Referral Converted",
    "Follow-up Support",
] as const;

const VALUE_RATINGS = [
    "Low Value",
    "Medium Value",
    "High Value",
    "Strategic Value",
] as const;

const DOCUMENT_TYPES = [
    "agreement",
    "invoice",
    "receipt",
    "supporting",
] as const;

const formatAmount = (value?: number) => {
    if (value === undefined || value === null || Number.isNaN(value))
        return "—";
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(
        value,
    );
};

const formatAmountInput = (value: string) => {
    if (!value) return "";

    // Keep only digits, commas, and decimal points from user input.
    const raw = value.replace(/[^\d.,]/g, "").replace(/,/g, "");
    if (!raw) return "";

    const firstDot = raw.indexOf(".");
    let normalized = raw;
    if (firstDot !== -1) {
        const intPart = raw.slice(0, firstDot);
        const decPart = raw.slice(firstDot + 1).replace(/\./g, "");
        normalized = `${intPart}.${decPart}`;
    }

    const hasTrailingDot = normalized.endsWith(".");
    const [intPartRaw, decPartRaw] = normalized.split(".");
    const intPart = intPartRaw || "0";
    const groupedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    if (hasTrailingDot) return `${groupedInt}.`;
    if (decPartRaw !== undefined) return `${groupedInt}.${decPartRaw}`;
    return groupedInt;
};

const parseAmount = (value: string) => {
    const cleaned = value.replace(/,/g, "").replace(/[^\d.]/g, "");
    if (!cleaned) return 0;
    const firstDot = cleaned.indexOf(".");
    const normalized =
        firstDot === -1
            ? cleaned
            : `${cleaned.slice(0, firstDot)}.${cleaned
                  .slice(firstDot + 1)
                  .replace(/\./g, "")}`;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
};

const formatDate = (value?: string) => {
    if (!value) return "—";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString();
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const hasValue = (value: unknown) =>
    value !== undefined && value !== null && String(value).trim() !== "";

function Card({ children }: { children: React.ReactNode }) {
    return <View className="bg-gray-50 rounded-lg p-4 mb-3">{children}</View>;
}

function FieldRow({
    label,
    value,
}: {
    label: string;
    value?: React.ReactNode;
}) {
    return (
        <View className="py-1 border-b border-gray-100 last:border-b-0">
            <Text className="text-xs font-medium text-gray-500 mb-0.5 capitalize">
                {label}
            </Text>
            <Text className="text-base text-gray-900 capitalize">
                {value || "—"}
            </Text>
        </View>
    );
}

function ActionButton({
    label,
    icon,
    onPress,
    variant = "primary",
    disabled,
}: {
    label: string;
    icon?: React.ReactNode;
    onPress: () => void;
    variant?: "primary" | "secondary" | "danger";
    disabled?: boolean;
}) {
    const styles =
        variant === "primary"
            ? "bg-blue-500"
            : variant === "danger"
              ? "bg-red-50 border border-red-100"
              : "bg-gray-100";
    const textStyles =
        variant === "primary"
            ? "text-white"
            : variant === "danger"
              ? "text-red-700"
              : "text-gray-900";

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            className={`h-11 px-3 rounded-lg flex-row items-center justify-center ${styles} ${
                disabled ? "opacity-60" : ""
            }`}
        >
            {icon}
            <Text className={`font-semibold ml-2 ${textStyles}`}>{label}</Text>
        </Pressable>
    );
}

function Pill({
    label,
    active,
    onPress,
}: {
    label: string;
    active: boolean;
    onPress: () => void;
}) {
    return (
        <Pressable
            onPress={onPress}
            className={`px-3 py-2 rounded-full border ${
                active
                    ? "bg-blue-500 border-blue-500"
                    : "bg-white border-gray-200"
            }`}
        >
            <Text
                className={`text-sm font-medium capitalize ${
                    active ? "text-white" : "text-gray-700"
                }`}
            >
                {label}
            </Text>
        </Pressable>
    );
}

function FormModal({
    title,
    visible,
    onClose,
    children,
}: {
    title: string;
    visible: boolean;
    onClose: () => void;
    children: React.ReactNode;
}) {
    return (
        <Modal visible={visible} animationType="slide" transparent>
            <KeyboardAvoidingView
                className="flex-1 bg-black/30 justify-end"
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <View className="bg-white rounded-t-3xl max-h-[88%]">
                    <View className="px-5 py-4 border-b border-gray-100 flex-row items-center justify-between">
                        <Text className="text-xl font-bold text-gray-900">
                            {title}
                        </Text>
                        <Pressable
                            onPress={onClose}
                            className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center"
                        >
                            <X size={18} color="#111827" />
                        </Pressable>
                    </View>
                    <ScrollView
                        keyboardShouldPersistTaps="handled"
                        contentContainerClassName="px-5 py-4 pb-8"
                    >
                        {children}
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

function LabeledInput({
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType,
    multiline,
}: {
    label: string;
    value: string;
    onChangeText: (value: string) => void;
    placeholder?: string;
    keyboardType?: "default" | "numeric" | "decimal-pad";
    multiline?: boolean;
}) {
    return (
        <View className="mb-4">
            <Text className="text-gray-700 font-semibold mb-2">{label}</Text>
            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="#9CA3AF"
                keyboardType={keyboardType}
                multiline={multiline}
                className={`border border-gray-300 rounded-lg px-4 py-3 text-base ${
                    multiline ? "min-h-[92px]" : ""
                }`}
            />
        </View>
    );
}

export default function DealDetails() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const dispatch = useAppDispatch();
    const isIOS = Platform.OS === "ios";

    const deal = useAppSelector((state) =>
        id ? selectDealById(id)(state) : undefined,
    );
    const loading = useAppSelector(selectDealLoading);
    const [activeTab, setActiveTab] = useState<TabKey>("Overview");
    const [deleting, setDeleting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);

    const [activityModalVisible, setActivityModalVisible] = useState(false);
    const [paymentModalVisible, setPaymentModalVisible] = useState(false);
    const [revenueEntryModalVisible, setRevenueEntryModalVisible] =
        useState(false);
    const [contributionModalVisible, setContributionModalVisible] =
        useState(false);
    const [documentModalVisible, setDocumentModalVisible] = useState(false);
    const [stageModalVisible, setStageModalVisible] = useState(false);
    const [editingRevenueIndex, setEditingRevenueIndex] = useState<
        number | null
    >(null);

    const [activityForm, setActivityForm] = useState({
        activityType: "",
        note: "",
        date: todayISO(),
        createdBy: "",
    });
    const [paymentForm, setPaymentForm] = useState({
        amount: "",
        paymentDate: todayISO(),
        paymentReference: "",
        notes: "",
    });
    const [paymentFile, setPaymentFile] = useState<PickedFile | null>(null);
    const [revenueEntryForm, setRevenueEntryForm] = useState({
        investorName: "",
        investmentDate: todayISO(),
        investmentAmount: "",
        notes: "",
    });
    const [contributionForm, setContributionForm] = useState({
        contributionType: "",
        description: "",
        valueRating: "",
        date: todayISO(),
        notes: "",
    });
    const [documentForm, setDocumentForm] = useState({
        type: "supporting",
        name: "",
    });
    const [documentFile, setDocumentFile] = useState<PickedFile | null>(null);

    const partnerId = deal?.partnerId;
    const partner = useAppSelector((state) =>
        partnerId ? selectPartnerById(partnerId)(state) : undefined,
    );

    useFocusEffect(
        useCallback(() => {
            if (id) {
                dispatch(fetchDealById(id));
            }
        }, [dispatch, id]),
    );

    useEffect(() => {
        if (partnerId && !partner) {
            dispatch(fetchPartnerById(partnerId));
        }
    }, [partnerId, partner, dispatch]);

    const financial = deal?.financialReconciliation;
    const isRevenueShare = deal?.agreementType === "Revenue Share";
    const revenueSharePercentage = Number(
        financial?.revenueSharePercentage ?? deal?.agreedPercentage ?? 0,
    );
    const revenueEntries = financial?.revenueEntries || [];
    const normalizedRevenueEntries = revenueEntries.map((entry) => {
        const investmentAmount = Number(entry.investmentAmount ?? 0);
        const commissionPercentage = Number(
            entry.commissionPercentage ?? revenueSharePercentage ?? 0,
        );
        const calculatedCommission = Number(
            entry.calculatedCommission ??
                (investmentAmount * commissionPercentage) / 100,
        );

        return {
            ...entry,
            investmentAmount,
            commissionPercentage,
            calculatedCommission,
        };
    });
    const totalRevenueGenerated = Number(
        financial?.totalRevenueGenerated ??
            normalizedRevenueEntries.reduce(
                (sum, entry) => sum + Number(entry.investmentAmount || 0),
                0,
            ),
    );
    const totalPartnerEarnings = Number(
        financial?.totalPartnerEarnings ??
            normalizedRevenueEntries.reduce(
                (sum, entry) => sum + Number(entry.calculatedCommission || 0),
                0,
            ),
    );
    const amountPaid = Number(financial?.amountPaid ?? 0);
    const expectedDealValue = Number(deal?.expectedDealValue ?? 0);
    const financialDealValue = Number(financial?.dealValue);
    const hasFinancialDealValue =
        Number.isFinite(financialDealValue) && financialDealValue > 0;
    const dealValue = hasFinancialDealValue
        ? financialDealValue
        : expectedDealValue;

    const financialAgreedAmount = Number(financial?.agreedAmount);
    const hasFinancialAgreedAmount =
        Number.isFinite(financialAgreedAmount) && financialAgreedAmount > 0;
    const expectedPartnerReturn = Number(deal?.expectedPartnerReturn ?? 0);
    const hasExpectedPartnerReturn =
        Number.isFinite(expectedPartnerReturn) && expectedPartnerReturn > 0;
    const percentageBasedReturn =
        Number(deal?.agreedPercentage ?? 0) > 0 &&
        Number(deal?.expectedDealValue ?? 0) > 0
            ? (Number(deal?.expectedDealValue) *
                  Number(deal?.agreedPercentage)) /
              100
            : 0;

    const agreedAmount =
        deal?.agreementType === "Fixed Fee"
            ? hasFinancialAgreedAmount
                ? financialAgreedAmount
                : Number(deal?.agreedFixedAmount ?? 0)
            : hasFinancialAgreedAmount
              ? financialAgreedAmount
              : hasExpectedPartnerReturn
                ? expectedPartnerReturn
                : percentageBasedReturn;
    const effectiveAgreedAmount = isRevenueShare
        ? totalPartnerEarnings
        : agreedAmount;
    const balanceOutstanding = Math.max(
        Number(
            financial?.balanceOutstanding ?? effectiveAgreedAmount - amountPaid,
        ),
        0,
    );
    const computedPaymentStatus = isRevenueShare
        ? effectiveAgreedAmount <= 0
            ? "Not Paid"
            : amountPaid <= 0
              ? "Not Paid"
              : amountPaid >= effectiveAgreedAmount
                ? "Fully Paid"
                : "Partially Paid"
        : financial?.paymentStatus || "Pending";

    const headerBadges = useMemo(() => {
        if (!deal) return null;
        return (
            <View className="flex-row flex-wrap gap-2 mt-3">
                <View className="px-3 py-1 rounded-full bg-blue-100">
                    <Text className="text-sm font-medium text-blue-800">
                        {deal.stage}
                    </Text>
                </View>
                {deal.agreementType && (
                    <View className="px-3 py-1 rounded-full bg-gray-100">
                        <Text className="text-sm font-medium text-gray-800">
                            {deal.agreementType}
                        </Text>
                    </View>
                )}
                {deal.recurringRevenue && (
                    <View className="px-3 py-1 rounded-full bg-green-100">
                        <Text className="text-sm font-medium text-green-800">
                            Recurring
                        </Text>
                    </View>
                )}
            </View>
        );
    }, [deal]);

    const pickFile = async (setter: (file: PickedFile) => void) => {
        const result = await DocumentPicker.getDocumentAsync({
            copyToCacheDirectory: true,
            multiple: false,
        });
        if (result.canceled || !result.assets?.[0]) return;
        const asset = result.assets[0];
        setter({
            uri: asset.uri,
            name: asset.name || `deal_document_${Date.now()}`,
            type: asset.mimeType || "application/octet-stream",
        });
    };

    const uploadPickedFile = async (file: PickedFile | null) => {
        if (!file) return undefined;
        const uploaded = await dispatch(uploadSingle(file)).unwrap();
        return {
            url: uploaded.url,
            publicId: uploaded.publicId,
            resourceType: (uploaded as any).resourceType,
        };
    };

    const handleDelete = () => {
        if (!deal) return;

        Alert.alert("Delete Deal", `Delete "${deal.title}"?`, [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    setDeleting(true);
                    try {
                        await dispatch(deleteDeal(deal._id)).unwrap();
                        Alert.alert("Success", "Deal deleted successfully");
                        router.back();
                    } catch {
                        Alert.alert("Error", "Failed to delete deal");
                    } finally {
                        setDeleting(false);
                    }
                },
            },
        ]);
    };

    const handleChangeStage = async (stage: (typeof DEAL_STAGES)[number]) => {
        if (!deal || stage === deal.stage) {
            setStageModalVisible(false);
            return;
        }

        setSaving(true);
        try {
            await dispatch(
                updateDeal({
                    id: deal._id,
                    updates: { stage },
                }),
            ).unwrap();
            setStageModalVisible(false);
        } catch (err: any) {
            Alert.alert("Error", err?.message || "Failed to update stage");
        } finally {
            setSaving(false);
        }
    };

    const handleAddActivity = async () => {
        if (
            !deal ||
            !activityForm.activityType.trim() ||
            !activityForm.note.trim()
        ) {
            Alert.alert("Missing details", "Add an activity type and note.");
            return;
        }

        setSaving(true);
        try {
            await dispatch(
                updateDeal({
                    id: deal._id,
                    updates: {
                        activities: [
                            ...(deal.activities || []),
                            {
                                activityType: activityForm.activityType.trim(),
                                note: activityForm.note.trim(),
                                date: activityForm.date || todayISO(),
                                createdBy: activityForm.createdBy.trim(),
                                createdAt: new Date().toISOString(),
                            },
                        ],
                    },
                }),
            ).unwrap();
            setActivityForm({
                activityType: "",
                note: "",
                date: todayISO(),
                createdBy: "",
            });
            setActivityModalVisible(false);
        } catch (err: any) {
            Alert.alert("Error", err?.message || "Failed to add activity");
        } finally {
            setSaving(false);
        }
    };

    const handleAddPayment = async () => {
        if (!deal) return;
        const paymentAmount = parseAmount(paymentForm.amount);
        if (paymentAmount <= 0) {
            Alert.alert("Invalid amount", "Enter a valid payment amount.");
            return;
        }

        setSaving(true);
        try {
            const documentUpload = await uploadPickedFile(paymentFile);
            const documentUrl =
                typeof documentUpload === "string"
                    ? documentUpload
                    : documentUpload?.url;
            const paymentDocumentPublicId =
                typeof documentUpload === "object"
                    ? documentUpload?.publicId
                    : undefined;
            const paymentDocumentResourceType =
                typeof documentUpload === "object"
                    ? documentUpload?.resourceType
                    : undefined;
            const nextAmountPaid = amountPaid + paymentAmount;
            const nextBalance = Math.max(
                effectiveAgreedAmount - nextAmountPaid,
                0,
            );
            const nextPaymentStatus = isRevenueShare
                ? nextBalance <= 0
                    ? "Fully Paid"
                    : nextAmountPaid > 0
                      ? "Partially Paid"
                      : "Not Paid"
                : nextBalance <= 0
                  ? "Fully Paid"
                  : nextAmountPaid > 0
                    ? "Part Paid"
                    : "Pending";

            await dispatch(
                updateDeal({
                    id: deal._id,
                    updates: {
                        documents: documentUrl
                            ? [
                                  ...(deal.documents || []),
                                  {
                                      url: documentUrl,
                                      publicId:
                                          paymentDocumentPublicId || undefined,
                                      resourceType:
                                          paymentDocumentResourceType ||
                                          undefined,
                                      type: "receipt",
                                      name:
                                          paymentForm.paymentReference.trim() ||
                                          `Payment Receipt ${formatDate(
                                              paymentForm.paymentDate ||
                                                  todayISO(),
                                          )}`,
                                      uploadedAt:
                                          paymentForm.paymentDate || todayISO(),
                                  },
                              ]
                            : deal.documents,
                        financialReconciliation: {
                            ...(deal.financialReconciliation || {}),
                            dealValue: isRevenueShare ? undefined : dealValue,
                            agreedAmount: effectiveAgreedAmount,
                            revenueSharePercentage: isRevenueShare
                                ? revenueSharePercentage
                                : undefined,
                            totalRevenueGenerated: isRevenueShare
                                ? totalRevenueGenerated
                                : undefined,
                            totalPartnerEarnings: isRevenueShare
                                ? totalPartnerEarnings
                                : undefined,
                            amountPaid: nextAmountPaid,
                            balanceOutstanding: nextBalance,
                            paymentDate: paymentForm.paymentDate || todayISO(),
                            paymentStatus: nextPaymentStatus,
                            approvalStatus:
                                deal.financialReconciliation?.approvalStatus ||
                                "Pending",
                            receiptUrl:
                                documentUrl ||
                                deal.financialReconciliation?.receiptUrl,
                            payments: [
                                ...(deal.financialReconciliation?.payments ||
                                    []),
                                {
                                    amount: paymentAmount,
                                    paymentDate:
                                        paymentForm.paymentDate || todayISO(),
                                    paymentReference:
                                        paymentForm.paymentReference.trim(),
                                    notes: paymentForm.notes.trim(),
                                    documentUrl,
                                    createdAt: new Date().toISOString(),
                                },
                            ],
                        },
                    },
                }),
            ).unwrap();
            setPaymentForm({
                amount: "",
                paymentDate: todayISO(),
                paymentReference: "",
                notes: "",
            });
            setPaymentFile(null);
            setPaymentModalVisible(false);
        } catch (err: any) {
            Alert.alert("Error", err?.message || "Failed to add payment");
        } finally {
            setSaving(false);
        }
    };

    const handleOpenRevenueEntryModal = (index?: number) => {
        if (typeof index === "number") {
            const entry = normalizedRevenueEntries[index];
            if (entry) {
                setEditingRevenueIndex(index);
                setRevenueEntryForm({
                    investorName: entry.investorName || "",
                    investmentDate: entry.investmentDate || todayISO(),
                    investmentAmount: String(entry.investmentAmount || ""),
                    notes: entry.notes || "",
                });
                setRevenueEntryModalVisible(true);
                return;
            }
        }

        setEditingRevenueIndex(null);
        setRevenueEntryForm({
            investorName: "",
            investmentDate: todayISO(),
            investmentAmount: "",
            notes: "",
        });
        setRevenueEntryModalVisible(true);
    };

    const handleSaveRevenueEntry = async () => {
        if (!deal) return;
        const investorName = revenueEntryForm.investorName.trim();
        const investmentAmount = parseAmount(revenueEntryForm.investmentAmount);

        if (!investorName || investmentAmount <= 0) {
            Alert.alert(
                "Missing details",
                "Investor name and investment amount are required.",
            );
            return;
        }

        const commissionPercentage = Number(revenueSharePercentage || 0);
        const calculatedCommission =
            (investmentAmount * commissionPercentage) / 100;

        const nextEntries = [...normalizedRevenueEntries];
        const nextEntry = {
            investorName,
            investmentDate: revenueEntryForm.investmentDate || todayISO(),
            investmentAmount,
            commissionPercentage,
            calculatedCommission,
            notes: revenueEntryForm.notes.trim(),
            createdAt:
                typeof editingRevenueIndex === "number"
                    ? nextEntries[editingRevenueIndex]?.createdAt ||
                      new Date().toISOString()
                    : new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        if (typeof editingRevenueIndex === "number") {
            nextEntries[editingRevenueIndex] = {
                ...nextEntries[editingRevenueIndex],
                ...nextEntry,
            };
        } else {
            nextEntries.push(nextEntry);
        }

        const nextTotalRevenueGenerated = nextEntries.reduce(
            (sum, entry) => sum + Number(entry.investmentAmount || 0),
            0,
        );
        const nextTotalPartnerEarnings = nextEntries.reduce(
            (sum, entry) => sum + Number(entry.calculatedCommission || 0),
            0,
        );
        const nextBalance = Math.max(nextTotalPartnerEarnings - amountPaid, 0);
        const nextPaymentStatus =
            amountPaid <= 0
                ? "Not Paid"
                : amountPaid >= nextTotalPartnerEarnings
                  ? "Fully Paid"
                  : "Partially Paid";

        setSaving(true);
        try {
            await dispatch(
                updateDeal({
                    id: deal._id,
                    updates: {
                        expectedPartnerReturn: nextTotalPartnerEarnings,
                        agreedPercentage: commissionPercentage,
                        financialReconciliation: {
                            ...(deal.financialReconciliation || {}),
                            dealValue: undefined,
                            agreedAmount: nextTotalPartnerEarnings,
                            revenueSharePercentage: commissionPercentage,
                            totalRevenueGenerated: nextTotalRevenueGenerated,
                            totalPartnerEarnings: nextTotalPartnerEarnings,
                            amountPaid,
                            balanceOutstanding: nextBalance,
                            paymentStatus: nextPaymentStatus,
                            revenueEntries: nextEntries,
                            approvalStatus:
                                deal.financialReconciliation?.approvalStatus ||
                                "Pending",
                        },
                    },
                }),
            ).unwrap();

            setRevenueEntryModalVisible(false);
            setEditingRevenueIndex(null);
            setRevenueEntryForm({
                investorName: "",
                investmentDate: todayISO(),
                investmentAmount: "",
                notes: "",
            });
        } catch (err: any) {
            Alert.alert(
                "Error",
                err?.message || "Failed to save revenue entry",
            );
        } finally {
            setSaving(false);
        }
    };

    const handleAddContribution = async () => {
        if (
            !deal ||
            !contributionForm.contributionType.trim() ||
            !contributionForm.description.trim()
        ) {
            Alert.alert(
                "Missing details",
                "Add a contribution type and description.",
            );
            return;
        }

        const current = deal.nonFinancialContribution || {
            numberOfIntroductions: 0,
            meetingsSecured: 0,
            strategicDoorsOpened: 0,
            referralsConverted: 0,
        };
        const nextContribution = { ...current };
        if (contributionForm.contributionType === "Introduction") {
            nextContribution.numberOfIntroductions =
                (nextContribution.numberOfIntroductions || 0) + 1;
        }
        if (contributionForm.contributionType === "Meeting Secured") {
            nextContribution.meetingsSecured =
                (nextContribution.meetingsSecured || 0) + 1;
        }
        if (contributionForm.contributionType === "Strategic Door") {
            nextContribution.strategicDoorsOpened =
                (nextContribution.strategicDoorsOpened || 0) + 1;
        }
        if (contributionForm.contributionType === "Brand Visibility") {
            nextContribution.brandVisibilityCreated =
                contributionForm.description.trim();
        }
        if (contributionForm.contributionType === "Referral Converted") {
            nextContribution.referralsConverted =
                (nextContribution.referralsConverted || 0) + 1;
        }
        if (contributionForm.contributionType === "Follow-up Support") {
            nextContribution.followUpSupport =
                contributionForm.description.trim();
        }
        if (contributionForm.valueRating) {
            nextContribution.valueRating = contributionForm.valueRating as any;
        }
        nextContribution.contributionNotes = contributionForm.notes.trim();

        setSaving(true);
        try {
            await dispatch(
                updateDeal({
                    id: deal._id,
                    updates: {
                        nonFinancialContribution: nextContribution,
                        contributionLogs: [
                            ...(deal.contributionLogs || []),
                            {
                                contributionType:
                                    contributionForm.contributionType,
                                description:
                                    contributionForm.description.trim(),
                                valueRating:
                                    contributionForm.valueRating as any,
                                date: contributionForm.date || todayISO(),
                                notes: contributionForm.notes.trim(),
                                createdAt: new Date().toISOString(),
                            },
                        ],
                    },
                }),
            ).unwrap();
            setContributionForm({
                contributionType: "",
                description: "",
                valueRating: "",
                date: todayISO(),
                notes: "",
            });
            setContributionModalVisible(false);
        } catch (err: any) {
            Alert.alert("Error", err?.message || "Failed to add contribution");
        } finally {
            setSaving(false);
        }
    };

    const handleUploadDocument = async () => {
        if (!deal || !documentFile) {
            Alert.alert("Select file", "Choose a document to upload.");
            return;
        }

        setSaving(true);
        try {
            const uploadResult = await uploadPickedFile(documentFile);
            const url =
                typeof uploadResult === "string"
                    ? uploadResult
                    : uploadResult?.url;
            const publicId =
                typeof uploadResult === "object"
                    ? uploadResult?.publicId
                    : null;
            const resourceType =
                typeof uploadResult === "object"
                    ? uploadResult?.resourceType
                    : null;

            if (!url) throw new Error("No document URL returned");

            await dispatch(
                updateDeal({
                    id: deal._id,
                    updates: {
                        documents: [
                            ...(deal.documents || []),
                            {
                                url,
                                publicId: publicId || undefined,
                                resourceType: resourceType || undefined,
                                type: documentForm.type as any,
                                name:
                                    documentForm.name.trim() ||
                                    documentFile.name,
                                uploadedAt: new Date().toISOString(),
                            },
                        ],
                    },
                }),
            ).unwrap();
            setDocumentForm({ type: "supporting", name: "" });
            setDocumentFile(null);
            setDocumentModalVisible(false);
        } catch (err: any) {
            Alert.alert("Error", err?.message || "Failed to upload document");
        } finally {
            setSaving(false);
        }
    };

    const extractPublicIdFromUrl = (url: string): string | null => {
        try {
            const uploadIndex = url.indexOf("/upload/");
            if (uploadIndex === -1) return null;

            let after = url.substring(uploadIndex + "/upload/".length);
            const parts = after.split("/");
            if (parts[0].startsWith("v") && /^v\d+$/.test(parts[0])) {
                parts.shift();
            }

            let publicId = parts.join("/").split("?")[0];
            publicId = publicId.replace(/\.[^/.]+$/, "");

            try {
                publicId = decodeURIComponent(publicId);
            } catch {
                // use raw value if decode fails
            }

            return publicId || null;
        } catch {
            return null;
        }
    };

    const buildFinancialFromPayments = (
        payments: NonNullable<
            NonNullable<typeof deal>["financialReconciliation"]
        >["payments"],
    ) => {
        const nextAmountPaid = (payments || []).reduce(
            (sum, item) => sum + Number(item.amount || 0),
            0,
        );
        const nextBalance = Math.max(effectiveAgreedAmount - nextAmountPaid, 0);
        const nextPaymentStatus: NonNullable<
            NonNullable<typeof deal>["financialReconciliation"]
        >["paymentStatus"] = isRevenueShare
            ? effectiveAgreedAmount <= 0
                ? "Not Paid"
                : nextAmountPaid <= 0
                  ? "Not Paid"
                  : nextAmountPaid >= effectiveAgreedAmount
                    ? "Fully Paid"
                    : "Partially Paid"
            : nextBalance <= 0
              ? "Fully Paid"
              : nextAmountPaid > 0
                ? "Part Paid"
                : "Pending";

        return {
            ...(deal?.financialReconciliation || {}),
            dealValue: isRevenueShare ? undefined : dealValue,
            agreedAmount: effectiveAgreedAmount,
            revenueSharePercentage: isRevenueShare
                ? revenueSharePercentage
                : undefined,
            totalRevenueGenerated: isRevenueShare
                ? totalRevenueGenerated
                : undefined,
            totalPartnerEarnings: isRevenueShare
                ? totalPartnerEarnings
                : undefined,
            amountPaid: nextAmountPaid,
            balanceOutstanding: nextBalance,
            paymentStatus: nextPaymentStatus,
            approvalStatus:
                deal?.financialReconciliation?.approvalStatus || "Pending",
            paymentDate:
                payments?.[payments.length - 1]?.paymentDate ||
                deal?.financialReconciliation?.paymentDate ||
                todayISO(),
            payments,
        };
    };

    const deleteCloudinaryDocument = async (document?: {
        url?: string;
        publicId?: string;
        resourceType?: string;
    }) => {
        const docPublicId =
            document?.publicId ||
            (document?.url ? extractPublicIdFromUrl(document.url) : null);
        if (!docPublicId) return;
        try {
            await api.post("/upload/delete", {
                publicId: docPublicId,
                resourceType: document?.resourceType,
            });
        } catch {
            // Ignore cloud delete failures; DB cleanup should still proceed.
        }
    };

    const handleDeleteDocument = async (index: number) => {
        if (!deal) return;

        Alert.alert(
            "Delete document",
            "Are you sure you want to remove this document?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        setSaving(true);
                        try {
                            const document = deal.documents?.[index];
                            let publicId = document?.publicId;
                            if (!publicId && document?.url) {
                                publicId =
                                    extractPublicIdFromUrl(document.url) ||
                                    undefined;
                            }

                            if (publicId) {
                                await deleteCloudinaryDocument({
                                    url: document?.url,
                                    publicId,
                                    resourceType: document?.resourceType,
                                });
                            }

                            const updatedDocs =
                                deal.documents?.filter((_, i) => i !== index) ||
                                [];
                            const existingPayments =
                                deal.financialReconciliation?.payments || [];
                            const updatedPayments = existingPayments.filter(
                                (payment) =>
                                    payment.documentUrl !== document?.url,
                            );
                            await dispatch(
                                updateDeal({
                                    id: deal._id,
                                    updates: {
                                        documents: updatedDocs,
                                        financialReconciliation:
                                            buildFinancialFromPayments(
                                                updatedPayments,
                                            ),
                                    },
                                }),
                            ).unwrap();
                        } catch (err: any) {
                            Alert.alert(
                                "Error",
                                err?.message || "Failed to delete document",
                            );
                        } finally {
                            setSaving(false);
                        }
                    },
                },
            ],
        );
    };

    const handleDeletePayment = async (paymentIndex: number) => {
        if (!deal) return;

        Alert.alert(
            "Delete payment",
            "Are you sure you want to delete this payment entry?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        setSaving(true);
                        try {
                            const payments = [
                                ...(deal.financialReconciliation?.payments ||
                                    []),
                            ];
                            const payment = payments[paymentIndex];
                            if (!payment) return;

                            const linkedDocument = payment.documentUrl
                                ? (deal.documents || []).find(
                                      (doc) => doc.url === payment.documentUrl,
                                  )
                                : undefined;

                            if (payment.documentUrl || linkedDocument?.url) {
                                await deleteCloudinaryDocument({
                                    url:
                                        linkedDocument?.url ||
                                        payment.documentUrl,
                                    publicId: linkedDocument?.publicId,
                                    resourceType: linkedDocument?.resourceType,
                                });
                            }

                            const updatedPayments = payments.filter(
                                (_, i) => i !== paymentIndex,
                            );
                            const updatedDocuments = payment.documentUrl
                                ? (deal.documents || []).filter(
                                      (doc) => doc.url !== payment.documentUrl,
                                  )
                                : deal.documents || [];

                            await dispatch(
                                updateDeal({
                                    id: deal._id,
                                    updates: {
                                        documents: updatedDocuments,
                                        financialReconciliation:
                                            buildFinancialFromPayments(
                                                updatedPayments,
                                            ),
                                    },
                                }),
                            ).unwrap();
                        } catch (err: any) {
                            Alert.alert(
                                "Error",
                                err?.message || "Failed to delete payment",
                            );
                        } finally {
                            setSaving(false);
                        }
                    },
                },
            ],
        );
    };

    const handleDownloadDocument = async (document: any) => {
        try {
            const safeName = String(document?.name || `document_${Date.now()}`)
                .replace(/[\\/:*?"<>|]/g, "_")
                .trim();

            const getExtFromValue = (value?: string) => {
                if (!value) return "";
                const cleaned = decodeURIComponent(value)
                    .split("?")[0]
                    .split("#")[0];
                const match = /\.([a-zA-Z0-9]{1,10})$/.exec(cleaned);
                return match?.[1]?.toLowerCase() || "";
            };

            const extFromName = getExtFromValue(safeName);
            const extFromUrl = getExtFromValue(String(document?.url || ""));
            const inferredExt = extFromName || extFromUrl || "bin";

            const filename = extFromName
                ? safeName
                : `${safeName}.${inferredExt}`;
            const localPath = `${FileSystem.documentDirectory}${filename}`;

            const downloadResult = await FileSystem.downloadAsync(
                document.url,
                localPath,
            );

            if (downloadResult.status < 200 || downloadResult.status >= 300) {
                throw new Error("Failed to download document");
            }

            if (Platform.OS === "ios") {
                await Sharing.shareAsync(localPath, {
                    mimeType: "application/octet-stream",
                    dialogTitle: `Download ${filename}`,
                });
            } else {
                Alert.alert("Downloaded", `Document saved to: ${localPath}`);
            }
        } catch (err: any) {
            Alert.alert(
                "Download failed",
                err?.message || "Unable to download document",
            );
        }
    };

    const handleGenerateDealReport = async () => {
        if (!deal) return;
        setIsGeneratingReport(true);
        try {
            await generateDealReportPdf(deal, partner);
        } catch (err: any) {
            Alert.alert(
                "Report failed",
                err?.message || "Unable to generate deal report.",
            );
        } finally {
            setIsGeneratingReport(false);
        }
    };

    if (loading && !deal) {
        return (
            <SafeAreaView className="flex-1 bg-white justify-center items-center">
                <ActivityIndicator size="large" color="#3b82f6" />
            </SafeAreaView>
        );
    }

    if (!deal) {
        return (
            <SafeAreaView className="flex-1 bg-white justify-center items-center">
                <Text className="text-gray-500">Deal not found</Text>
            </SafeAreaView>
        );
    }

    const showPercentage =
        hasValue(deal.agreedPercentage) && !hasValue(deal.agreedFixedAmount);
    const showFixedAmount =
        hasValue(deal.agreedFixedAmount) && !hasValue(deal.agreedPercentage);

    const renderOverview = () => (
        <View>
            <Card>
                <FieldRow
                    label="Partner"
                    value={partner?.name || deal.partnerId}
                />
                <FieldRow label="Deal source" value={deal.dealSource} />
                <FieldRow
                    label="Introduction type"
                    value={deal.introductionType}
                />
                <FieldRow label="Current stage" value={deal.stage} />
                <FieldRow label="Agreement type" value={deal.agreementType} />
                <FieldRow label="Assigned owner" value={deal.assignedOwner} />
                <FieldRow
                    label="Description / notes"
                    value={deal.description || "No notes added."}
                />
            </Card>

            <Card>
                <Text className="text-base font-bold text-gray-900 mb-3">
                    Recurring Revenue
                </Text>
                <FieldRow
                    label="Recurring"
                    value={deal.recurringRevenue ? "Yes" : "No"}
                />
                <FieldRow label="Frequency" value={deal.recurringFrequency} />
                <FieldRow
                    label="Next action"
                    value={formatDate(deal.nextActionDate)}
                />
                <FieldRow
                    label="Close date"
                    value={formatDate(deal.closeDate)}
                />
            </Card>
        </View>
    );

    const renderActivities = () => (
        <View>
            <View className="mb-4">
                <ActionButton
                    label="Add Activity"
                    icon={<Plus size={18} color="white" />}
                    onPress={() => setActivityModalVisible(true)}
                />
            </View>
            {deal.activities?.length ? (
                [...deal.activities]
                    .sort(
                        (a, b) =>
                            new Date(b.date).getTime() -
                            new Date(a.date).getTime(),
                    )
                    .map((activity, index) => (
                        <Card key={`${activity.date}-${index}`}>
                            <Text className="text-base font-bold text-gray-900">
                                {activity.activityType}
                            </Text>
                            <Text className="text-sm text-gray-500 mt-1">
                                {formatDate(activity.date)} •{" "}
                                {activity.createdBy || "Unassigned"}
                            </Text>
                            <Text className="text-gray-700 mt-3">
                                {activity.note}
                            </Text>
                        </Card>
                    ))
            ) : (
                <Text className="text-gray-500">No activities logged.</Text>
            )}
        </View>
    );

    const renderFinancials = () => (
        <View>
            <View className="flex-row flex-wrap gap-1 mb-4">
                {isRevenueShare ? (
                    <ActionButton
                        label="Add Revenue Entry"
                        icon={<Plus size={18} color="white" />}
                        onPress={() => handleOpenRevenueEntryModal()}
                    />
                ) : null}
                <ActionButton
                    label="Add Payment"
                    icon={<Plus size={18} color="white" />}
                    onPress={() => setPaymentModalVisible(true)}
                />
                {/* <ActionButton
                    label="Upload Receipt/Invoice"
                    icon={<Upload size={18} color="#111827" />}
                    variant="secondary"
                    onPress={() => {
                        setDocumentForm({ type: "receipt", name: "" });
                        setDocumentModalVisible(true);
                    }}
                /> */}
            </View>

            <Card>
                {isRevenueShare ? (
                    <>
                        <FieldRow
                            label="Revenue Share %"
                            value={
                                hasValue(revenueSharePercentage)
                                    ? `${revenueSharePercentage}%`
                                    : "—"
                            }
                        />
                        <FieldRow
                            label="Total Revenue Generated"
                            value={formatAmount(totalRevenueGenerated)}
                        />
                        <FieldRow
                            label="Total Partner Earnings"
                            value={formatAmount(effectiveAgreedAmount)}
                        />
                    </>
                ) : (
                    <>
                        <FieldRow
                            label="Deal value"
                            value={formatAmount(dealValue)}
                        />
                        {showPercentage ? (
                            <FieldRow
                                label="Agreed percentage"
                                value={`${deal.agreedPercentage}%`}
                            />
                        ) : null}
                        {showFixedAmount ? (
                            <FieldRow
                                label="Fixed amount"
                                value={formatAmount(deal.agreedFixedAmount)}
                            />
                        ) : null}
                        <FieldRow
                            label="Expected partner return"
                            value={formatAmount(effectiveAgreedAmount)}
                        />
                    </>
                )}
                <FieldRow
                    label="Amount paid"
                    value={formatAmount(amountPaid)}
                />
                <FieldRow
                    label="Balance outstanding"
                    value={formatAmount(balanceOutstanding)}
                />
                <FieldRow
                    label="Payment status"
                    value={computedPaymentStatus}
                />
            </Card>

            {isRevenueShare ? (
                <>
                    <Text className="text-base font-bold text-gray-900 mb-2">
                        Revenue Entries
                    </Text>
                    {normalizedRevenueEntries.length ? (
                        normalizedRevenueEntries.map((entry, index) => (
                            <Pressable
                                key={`${entry.investmentDate}-${entry.investorName}-${index}`}
                                onPress={() =>
                                    handleOpenRevenueEntryModal(index)
                                }
                            >
                                <Card>
                                    <View className="flex-row items-center justify-between">
                                        <Text className="text-gray-900 font-bold text-base">
                                            {entry.investorName}
                                        </Text>
                                        <Text className="text-xs font-medium text-blue-700">
                                            {entry.commissionPercentage}%
                                        </Text>
                                    </View>
                                    <Text className="text-gray-500 mt-1">
                                        {formatDate(entry.investmentDate)}
                                    </Text>
                                    <View className="mt-3">
                                        <FieldRow
                                            label="Investment Amount"
                                            value={formatAmount(
                                                entry.investmentAmount,
                                            )}
                                        />
                                        <FieldRow
                                            label="Calculated Commission"
                                            value={formatAmount(
                                                entry.calculatedCommission,
                                            )}
                                        />
                                        <FieldRow
                                            label="Notes"
                                            value={entry.notes || "—"}
                                        />
                                    </View>
                                </Card>
                            </Pressable>
                        ))
                    ) : (
                        <Text className="text-gray-500 mb-4">
                            No revenue entries yet.
                        </Text>
                    )}
                </>
            ) : null}

            <Text className="text-base font-bold text-gray-900 mb-2">
                Payment History
            </Text>
            {financial?.payments?.length ? (
                financial.payments.map((payment, index) => (
                    <Card key={`${payment.paymentDate}-${index}`}>
                        <View className="flex-row items-start justify-between gap-3">
                            <View className="flex-1">
                                <Text className="text-gray-900 font-bold">
                                    {formatAmount(payment.amount)}
                                </Text>
                                <Text className="text-gray-500 mt-1">
                                    {formatDate(payment.paymentDate)}
                                    {payment.paymentReference
                                        ? ` • ${payment.paymentReference}`
                                        : ""}
                                </Text>
                                {payment.notes ? (
                                    <Text className="text-gray-700 mt-2">
                                        {payment.notes}
                                    </Text>
                                ) : null}
                            </View>
                            <Pressable
                                onPress={() => handleDeletePayment(index)}
                                disabled={saving}
                                className="p-2"
                            >
                                <Trash2
                                    size={18}
                                    color={saving ? "#d1d5db" : "#dc2626"}
                                />
                            </Pressable>
                        </View>
                    </Card>
                ))
            ) : (
                <Text className="text-gray-500">No payments added.</Text>
            )}
        </View>
    );

    const contribution = deal.nonFinancialContribution;
    const renderContributions = () => (
        <View>
            <View className="mb-4">
                <ActionButton
                    label="Add Contribution"
                    icon={<Plus size={18} color="white" />}
                    onPress={() => setContributionModalVisible(true)}
                />
            </View>
            <Card>
                <FieldRow
                    label="Number of introductions"
                    value={String(contribution?.numberOfIntroductions ?? 0)}
                />
                <FieldRow
                    label="Meetings secured"
                    value={String(contribution?.meetingsSecured ?? 0)}
                />
                <FieldRow
                    label="Strategic doors opened"
                    value={String(contribution?.strategicDoorsOpened ?? 0)}
                />
                <FieldRow
                    label="Brand visibility created"
                    value={contribution?.brandVisibilityCreated}
                />
                <FieldRow
                    label="Referrals converted"
                    value={String(contribution?.referralsConverted ?? 0)}
                />
                <FieldRow
                    label="Follow-up support"
                    value={contribution?.followUpSupport}
                />
                <FieldRow
                    label="Relationship strength"
                    value={contribution?.relationshipStrength}
                />
                <FieldRow
                    label="Value rating"
                    value={contribution?.valueRating}
                />
                <FieldRow
                    label="Contribution notes"
                    value={contribution?.contributionNotes}
                />
            </Card>

            <Text className="text-base font-bold text-gray-900 mb-2">
                Contribution Log
            </Text>
            {deal.contributionLogs?.length ? (
                deal.contributionLogs.map((item, index) => (
                    <Card key={`${item.date}-${index}`}>
                        <Text className="text-gray-900 font-bold">
                            {item.contributionType}
                        </Text>
                        <Text className="text-gray-500 mt-1">
                            {formatDate(item.date)}
                            {item.valueRating ? ` • ${item.valueRating}` : ""}
                        </Text>
                        <Text className="text-gray-700 mt-2">
                            {item.description}
                        </Text>
                        {item.notes ? (
                            <Text className="text-gray-500 mt-2">
                                {item.notes}
                            </Text>
                        ) : null}
                    </Card>
                ))
            ) : (
                <Text className="text-gray-500">
                    No contribution logs added.
                </Text>
            )}
        </View>
    );

    const renderDocuments = () => (
        <View>
            <View className="mb-4">
                <ActionButton
                    label="Upload Document"
                    icon={<Upload size={18} color="white" />}
                    onPress={() => setDocumentModalVisible(true)}
                />
            </View>
            {[
                ...(deal.documents || []).map((document, index) => ({
                    document,
                    key: `doc-${document.url}-${index}`,
                    source: "documents" as const,
                    index,
                })),
                ...((deal.financialReconciliation?.payments || [])
                    .map((payment, paymentIndex) => ({ payment, paymentIndex }))
                    .filter(
                        ({ payment }) =>
                            !!payment.documentUrl &&
                            !(deal.documents || []).some(
                                (doc) => doc.url === payment.documentUrl,
                            ),
                    )
                    .map(({ payment, paymentIndex }) => ({
                        document: {
                            url: payment.documentUrl as string,
                            type: "receipt",
                            name:
                                payment.paymentReference ||
                                `Payment Receipt ${formatDate(payment.paymentDate)}`,
                            uploadedAt:
                                payment.createdAt || payment.paymentDate,
                        },
                        key: `pay-${payment.documentUrl}-${paymentIndex}`,
                        source: "payments" as const,
                        index: paymentIndex,
                    })) || []),
            ].length ? (
                [
                    ...(deal.documents || []).map((document, index) => ({
                        document,
                        key: `doc-${document.url}-${index}`,
                        source: "documents" as const,
                        index,
                    })),
                    ...((deal.financialReconciliation?.payments || [])
                        .map((payment, paymentIndex) => ({
                            payment,
                            paymentIndex,
                        }))
                        .filter(
                            ({ payment }) =>
                                !!payment.documentUrl &&
                                !(deal.documents || []).some(
                                    (doc) => doc.url === payment.documentUrl,
                                ),
                        )
                        .map(({ payment, paymentIndex }) => ({
                            document: {
                                url: payment.documentUrl as string,
                                type: "receipt",
                                name:
                                    payment.paymentReference ||
                                    `Payment Receipt ${formatDate(payment.paymentDate)}`,
                                uploadedAt:
                                    payment.createdAt || payment.paymentDate,
                            },
                            key: `pay-${payment.documentUrl}-${paymentIndex}`,
                            source: "payments" as const,
                            index: paymentIndex,
                        })) || []),
                ].map(({ document, key, source, index }) => (
                    <Pressable
                        key={key}
                        onPress={() => Linking.openURL(document.url)}
                        className="bg-gray-50 rounded-lg p-3 mb-2 flex-row items-center justify-between gap-5"
                    >
                        <View className="flex-1">
                            <Text className="text-gray-900 font-medium">
                                {document.name || document.type || "Document"}
                            </Text>
                            <Text className="text-gray-500 text-sm">
                                {document.type || "supporting"} •{" "}
                                {formatDate(document.uploadedAt)}
                            </Text>
                        </View>
                        <View className="flex-row gap-1 items-center">
                            <Pressable
                                onPress={() => handleDownloadDocument(document)}
                                disabled={saving}
                                className="p-2"
                            >
                                <Download
                                    size={18}
                                    color={saving ? "#d1d5db" : "#10b981"}
                                />
                            </Pressable>
                            <Pressable
                                onPress={() =>
                                    source === "documents"
                                        ? handleDeleteDocument(index)
                                        : handleDeletePayment(index)
                                }
                                disabled={saving}
                                className="p-2"
                            >
                                <Trash2
                                    size={18}
                                    color={saving ? "#d1d5db" : "#dc2626"}
                                />
                            </Pressable>
                            <Pressable
                                onPress={() => Linking.openURL(document.url)}
                                className="p-2"
                            >
                                <ExternalLink size={18} color="#3b82f6" />
                            </Pressable>
                        </View>
                    </Pressable>
                ))
            ) : (
                <Text className="text-gray-500">No documents uploaded.</Text>
            )}
        </View>
    );

    const renderTabContent = () => {
        if (activeTab === "Overview") return renderOverview();
        if (activeTab === "Activities") return renderActivities();
        if (activeTab === "Financials") return renderFinancials();
        if (activeTab === "Contributions") return renderContributions();
        return renderDocuments();
    };

    return (
        <SafeAreaView
            className="flex-1 bg-white"
            edges={
                isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]
            }
        >
            <View className="flex-1 px-4">
                <PlatformAdaptiveHeader
                    title="Deal Details"
                    headerRight={({ tintColor }) => (
                        <View className="flex-row gap-2">
                            <Pressable
                                onPress={() =>
                                    router.push({
                                        pathname:
                                            "/(admin)/partnerships/deals/create",
                                        params: { dealId: deal._id },
                                    })
                                }
                                className="w-10 h-10 rounded-full items-center justify-center"
                            >
                                <Edit2 size={20} color={tintColor} />
                            </Pressable>
                            <Pressable
                                onPress={handleDelete}
                                disabled={deleting}
                                className="w-10 h-10 rounded-full items-center justify-center bg-red-500"
                            >
                                {deleting ? (
                                    <ActivityIndicator
                                        size="small"
                                        color="white"
                                    />
                                ) : (
                                    <Trash2 size={20} color="white" />
                                )}
                            </Pressable>
                        </View>
                    )}
                />

                <ScrollView showsVerticalScrollIndicator={false}>
                    <View className="bg-blue-50 rounded-lg p-4 mb-4">
                        <Text className="text-3xl font-bold text-gray-900 mb-2">
                            {deal.title}
                        </Text>
                        <Text className="text-gray-600 text-lg">
                            Partner: {partner?.name || deal.partnerId}
                        </Text>
                        {headerBadges}
                        <Pressable
                            onPress={() => setStageModalVisible(true)}
                            className="mt-4 h-11 rounded-lg bg-blue-500 items-center justify-center"
                        >
                            <Text className="text-white font-semibold">
                                Change Stage
                            </Text>
                        </Pressable>
                        <View className="mt-3">
                            <ActionButton
                                label={
                                    isGeneratingReport
                                        ? "Generating..."
                                        : "Generate Deal Report"
                                }
                                icon={
                                    isGeneratingReport ? (
                                        <ActivityIndicator
                                            size="small"
                                            color="#111827"
                                        />
                                    ) : (
                                        <Share2 size={18} color="#111827" />
                                    )
                                }
                                variant="secondary"
                                disabled={isGeneratingReport}
                                onPress={handleGenerateDealReport}
                            />
                        </View>
                    </View>

                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        className="mb-4"
                    >
                        <View className="flex-row gap-2">
                            {TABS.map((tab) => (
                                <Pill
                                    key={tab}
                                    label={tab}
                                    active={activeTab === tab}
                                    onPress={() => setActiveTab(tab)}
                                />
                            ))}
                        </View>
                    </ScrollView>

                    {renderTabContent()}

                    <View className="mb-10" />
                </ScrollView>
            </View>

            <FormModal
                title="Change Stage"
                visible={stageModalVisible}
                onClose={() => setStageModalVisible(false)}
            >
                <View className="flex-row flex-wrap gap-2 mb-4">
                    {DEAL_STAGES.map((stage) => (
                        <Pill
                            key={stage}
                            label={stage}
                            active={deal.stage === stage}
                            onPress={() => handleChangeStage(stage)}
                        />
                    ))}
                </View>
                {saving ? (
                    <View className="py-3 items-center">
                        <ActivityIndicator size="small" color="#3b82f6" />
                    </View>
                ) : null}
            </FormModal>

            <FormModal
                title="Add Activity"
                visible={activityModalVisible}
                onClose={() => setActivityModalVisible(false)}
            >
                <LabeledInput
                    label="Activity type"
                    value={activityForm.activityType}
                    onChangeText={(activityType) =>
                        setActivityForm((prev) => ({ ...prev, activityType }))
                    }
                    placeholder="Meeting, follow-up, call..."
                />
                <LabeledInput
                    label="Note / description"
                    value={activityForm.note}
                    onChangeText={(note) =>
                        setActivityForm((prev) => ({ ...prev, note }))
                    }
                    multiline
                />
                <LabeledInput
                    label="Date"
                    value={activityForm.date}
                    onChangeText={(date) =>
                        setActivityForm((prev) => ({ ...prev, date }))
                    }
                    placeholder="YYYY-MM-DD"
                />
                <LabeledInput
                    label="Created by"
                    value={activityForm.createdBy}
                    onChangeText={(createdBy) =>
                        setActivityForm((prev) => ({ ...prev, createdBy }))
                    }
                />
                <ActionButton
                    label={saving ? "Saving..." : "Save Activity"}
                    icon={<Check size={18} color="white" />}
                    disabled={saving}
                    onPress={handleAddActivity}
                />
            </FormModal>

            <FormModal
                title="Add Payment"
                visible={paymentModalVisible}
                onClose={() => setPaymentModalVisible(false)}
            >
                <LabeledInput
                    label="Amount"
                    value={paymentForm.amount}
                    onChangeText={(amount) =>
                        setPaymentForm((prev) => ({
                            ...prev,
                            amount: formatAmountInput(amount),
                        }))
                    }
                    keyboardType="decimal-pad"
                />
                <LabeledInput
                    label="Payment date"
                    value={paymentForm.paymentDate}
                    onChangeText={(paymentDate) =>
                        setPaymentForm((prev) => ({ ...prev, paymentDate }))
                    }
                    placeholder="YYYY-MM-DD"
                />
                <LabeledInput
                    label="Payment reference"
                    value={paymentForm.paymentReference}
                    onChangeText={(paymentReference) =>
                        setPaymentForm((prev) => ({
                            ...prev,
                            paymentReference,
                        }))
                    }
                />
                <LabeledInput
                    label="Notes"
                    value={paymentForm.notes}
                    onChangeText={(notes) =>
                        setPaymentForm((prev) => ({ ...prev, notes }))
                    }
                    multiline
                />
                <View className="mb-4">
                    <ActionButton
                        label={
                            paymentFile
                                ? paymentFile.name
                                : "Attach receipt/invoice"
                        }
                        icon={<FileText size={18} color="#111827" />}
                        variant="secondary"
                        onPress={() => pickFile(setPaymentFile)}
                    />
                </View>
                <ActionButton
                    label={saving ? "Saving..." : "Save Payment"}
                    icon={<Check size={18} color="white" />}
                    disabled={saving}
                    onPress={handleAddPayment}
                />
            </FormModal>

            <FormModal
                title={
                    editingRevenueIndex !== null
                        ? "Update Revenue Entry"
                        : "Add Revenue Entry"
                }
                visible={revenueEntryModalVisible}
                onClose={() => {
                    setRevenueEntryModalVisible(false);
                    setEditingRevenueIndex(null);
                }}
            >
                <LabeledInput
                    label="Investor Name"
                    value={revenueEntryForm.investorName}
                    onChangeText={(investorName) =>
                        setRevenueEntryForm((prev) => ({
                            ...prev,
                            investorName,
                        }))
                    }
                    placeholder="Enter investor name"
                />
                <LabeledInput
                    label="Investment Date"
                    value={revenueEntryForm.investmentDate}
                    onChangeText={(investmentDate) =>
                        setRevenueEntryForm((prev) => ({
                            ...prev,
                            investmentDate,
                        }))
                    }
                    placeholder="YYYY-MM-DD"
                />
                <LabeledInput
                    label="Investment Amount"
                    value={revenueEntryForm.investmentAmount}
                    onChangeText={(investmentAmount) =>
                        setRevenueEntryForm((prev) => ({
                            ...prev,
                            investmentAmount:
                                formatAmountInput(investmentAmount),
                        }))
                    }
                    keyboardType="decimal-pad"
                    placeholder="Enter amount"
                />
                <View className="mb-4 rounded-lg bg-gray-50 px-4 py-3">
                    <Text className="text-xs font-medium text-gray-500">
                        Commission Percentage
                    </Text>
                    <Text className="mt-1 text-base font-semibold text-gray-900">
                        {revenueSharePercentage}%
                    </Text>
                </View>
                <LabeledInput
                    label="Notes"
                    value={revenueEntryForm.notes}
                    onChangeText={(notes) =>
                        setRevenueEntryForm((prev) => ({ ...prev, notes }))
                    }
                    multiline
                    placeholder="Optional notes"
                />
                <ActionButton
                    label={saving ? "Saving..." : "Save Revenue Entry"}
                    icon={<Check size={18} color="white" />}
                    disabled={saving}
                    onPress={handleSaveRevenueEntry}
                />
            </FormModal>

            <FormModal
                title="Add Contribution"
                visible={contributionModalVisible}
                onClose={() => setContributionModalVisible(false)}
            >
                <Text className="text-gray-700 font-semibold mb-2">
                    Contribution type
                </Text>
                <View className="flex-row flex-wrap gap-2 mb-4">
                    {CONTRIBUTION_TYPES.map((type) => (
                        <Pill
                            key={type}
                            label={type}
                            active={contributionForm.contributionType === type}
                            onPress={() =>
                                setContributionForm((prev) => ({
                                    ...prev,
                                    contributionType: type,
                                }))
                            }
                        />
                    ))}
                </View>
                <LabeledInput
                    label="Description"
                    value={contributionForm.description}
                    onChangeText={(description) =>
                        setContributionForm((prev) => ({
                            ...prev,
                            description,
                        }))
                    }
                    multiline
                />
                <Text className="text-gray-700 font-semibold mb-2">
                    Value rating
                </Text>
                <View className="flex-row flex-wrap gap-2 mb-4">
                    {VALUE_RATINGS.map((rating) => (
                        <Pill
                            key={rating}
                            label={rating}
                            active={contributionForm.valueRating === rating}
                            onPress={() =>
                                setContributionForm((prev) => ({
                                    ...prev,
                                    valueRating: rating,
                                }))
                            }
                        />
                    ))}
                </View>
                <LabeledInput
                    label="Date"
                    value={contributionForm.date}
                    onChangeText={(date) =>
                        setContributionForm((prev) => ({ ...prev, date }))
                    }
                    placeholder="YYYY-MM-DD"
                />
                <LabeledInput
                    label="Notes"
                    value={contributionForm.notes}
                    onChangeText={(notes) =>
                        setContributionForm((prev) => ({ ...prev, notes }))
                    }
                    multiline
                />
                <ActionButton
                    label={saving ? "Saving..." : "Save Contribution"}
                    icon={<Check size={18} color="white" />}
                    disabled={saving}
                    onPress={handleAddContribution}
                />
            </FormModal>

            <FormModal
                title="Upload Document"
                visible={documentModalVisible}
                onClose={() => setDocumentModalVisible(false)}
            >
                <Text className="text-gray-700 font-semibold mb-2">
                    Document type
                </Text>
                <View className="flex-row flex-wrap gap-2 mb-4">
                    {DOCUMENT_TYPES.map((type) => (
                        <Pill
                            key={type}
                            label={type}
                            active={documentForm.type === type}
                            onPress={() =>
                                setDocumentForm((prev) => ({ ...prev, type }))
                            }
                        />
                    ))}
                </View>
                <LabeledInput
                    label="Document name"
                    value={documentForm.name}
                    onChangeText={(name) =>
                        setDocumentForm((prev) => ({ ...prev, name }))
                    }
                />
                <View className="mb-4">
                    <ActionButton
                        label={documentFile ? documentFile.name : "Choose file"}
                        icon={<FileText size={18} color="#111827" />}
                        variant="secondary"
                        onPress={() => pickFile(setDocumentFile)}
                    />
                </View>
                <ActionButton
                    label={saving ? "Uploading..." : "Upload Document"}
                    icon={<Upload size={18} color="white" />}
                    disabled={saving}
                    onPress={handleUploadDocument}
                />
            </FormModal>
        </SafeAreaView>
    );
}
