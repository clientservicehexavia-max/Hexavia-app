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
import { useLocalSearchParams, useRouter } from "expo-router";
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
import React, { useEffect, useMemo, useState } from "react";
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

type TabKey = "Overview" | "Activities" | "Financials" | "Contributions";
// | "Documents";

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
    // "Documents",
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

const parseAmount = (value: string) => {
    const cleaned = value.replace(/,/g, "").replace(/[^\d.]/g, "");
    if (!cleaned) return 0;
    const parsed = Number(cleaned);
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
        <View className="py-2 border-b border-gray-100 last:border-b-0">
            <Text className="text-xs font-medium text-gray-500 mb-1 capitalize">
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
    keyboardType?: "default" | "numeric";
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
    const [contributionModalVisible, setContributionModalVisible] =
        useState(false);
    const [documentModalVisible, setDocumentModalVisible] = useState(false);
    const [stageModalVisible, setStageModalVisible] = useState(false);

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

    useEffect(() => {
        if (id && !deal) {
            dispatch(fetchDealById(id));
        }
    }, [id, deal, dispatch]);

    useEffect(() => {
        if (partnerId && !partner) {
            dispatch(fetchPartnerById(partnerId));
        }
    }, [partnerId, partner, dispatch]);

    const financial = deal?.financialReconciliation;
    const amountPaid = Number(financial?.amountPaid ?? 0);
    const dealValue = Number(
        financial?.dealValue ?? deal?.expectedDealValue ?? 0,
    );
    const agreedAmount = Number(
        financial?.agreedAmount ??
            deal?.expectedPartnerReturn ??
            deal?.agreedFixedAmount ??
            (deal?.agreedPercentage && deal?.expectedDealValue
                ? (deal.expectedDealValue * deal.agreedPercentage) / 100
                : 0),
    );
    const balanceOutstanding = Math.max(
        Number(financial?.balanceOutstanding ?? agreedAmount - amountPaid),
        0,
    );
    const commissionApproved = financial?.approvalStatus === "Approved";

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
            const nextAmountPaid = amountPaid + paymentAmount;
            const nextBalance = Math.max(agreedAmount - nextAmountPaid, 0);
            const nextPaymentStatus =
                nextBalance <= 0
                    ? "Fully Paid"
                    : nextAmountPaid > 0
                      ? "Part Paid"
                      : "Pending";

            await dispatch(
                updateDeal({
                    id: deal._id,
                    updates: {
                        financialReconciliation: {
                            ...(deal.financialReconciliation || {}),
                            dealValue,
                            agreedAmount,
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

    const handleToggleCommissionApproval = async () => {
        if (!deal) return;
        const nextApprovalStatus = commissionApproved ? "Pending" : "Approved";
        setSaving(true);
        try {
            await dispatch(
                updateDeal({
                    id: deal._id,
                    updates: {
                        financialReconciliation: {
                            ...(deal.financialReconciliation || {}),
                            dealValue,
                            agreedAmount,
                            amountPaid,
                            balanceOutstanding,
                            paymentStatus:
                                deal.financialReconciliation?.paymentStatus ||
                                "Pending",
                            approvalStatus: nextApprovalStatus,
                        },
                    },
                }),
            ).unwrap();
        } catch (err: any) {
            Alert.alert(
                "Error",
                err?.message || "Failed to update commission approval",
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
                                try {
                                    await api.post("/upload/delete", {
                                        publicId,
                                        resourceType: document?.resourceType,
                                    });
                                } catch {
                                    // Continue removing from deal even if Cloudinary delete fails
                                }
                            }

                            const updatedDocs =
                                deal.documents?.filter((_, i) => i !== index) ||
                                [];
                            await dispatch(
                                updateDeal({
                                    id: deal._id,
                                    updates: { documents: updatedDocs },
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
        deal.agreementType === "Percentage Commission" ||
        (deal.agreementType !== "Fixed Fee" && hasValue(deal.agreedPercentage));
    const showFixedAmount =
        !showPercentage &&
        (deal.agreementType === "Fixed Fee" ||
            hasValue(deal.agreedFixedAmount));

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
                <ActionButton
                    label={
                        commissionApproved
                            ? "Disapprove Commission"
                            : "Approve Commission"
                    }
                    icon={<Check size={18} color="#111827" />}
                    variant="secondary"
                    disabled={saving}
                    onPress={handleToggleCommissionApproval}
                />
            </View>

            <Card>
                <FieldRow label="Deal value" value={formatAmount(dealValue)} />
                <FieldRow
                    label="Agreed percentage"
                    value={
                        showPercentage && hasValue(deal.agreedPercentage)
                            ? `${deal.agreedPercentage}%`
                            : "—"
                    }
                />
                <FieldRow
                    label="Fixed amount"
                    value={
                        showFixedAmount
                            ? formatAmount(deal.agreedFixedAmount)
                            : "—"
                    }
                />
                <FieldRow
                    label="Expected partner return"
                    value={formatAmount(agreedAmount)}
                />
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
                    value={financial?.paymentStatus || "Not Due"}
                />
                <FieldRow
                    label="Approval status"
                    value={financial?.approvalStatus || "Pending"}
                />
            </Card>

            <Text className="text-base font-bold text-gray-900 mb-2">
                Payment History
            </Text>
            {financial?.payments?.length ? (
                financial.payments.map((payment, index) => (
                    <Card key={`${payment.paymentDate}-${index}`}>
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
            {deal.documents?.length ? (
                deal.documents.map((document, index) => (
                    <Pressable
                        key={`${document.url}-${index}`}
                        onPress={() => Linking.openURL(document.url)}
                        className="bg-gray-50 rounded-lg p-3 mb-2 flex-row items-center justify-between"
                    >
                        <View className="flex-1 pr-3">
                            <Text className="text-gray-900 font-medium">
                                {document.name || document.type || "Document"}
                            </Text>
                            <Text className="text-gray-500 text-sm">
                                {document.type || "supporting"} •{" "}
                                {formatDate(document.uploadedAt)}
                            </Text>
                            <Text
                                className="text-gray-500 text-sm"
                                numberOfLines={1}
                            >
                                {document.url}
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
                                onPress={() => handleDeleteDocument(index)}
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
                        setPaymentForm((prev) => ({ ...prev, amount }))
                    }
                    keyboardType="numeric"
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
