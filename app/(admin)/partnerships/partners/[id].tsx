import { api } from "@/api/axios";
import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import { CustomTextInput } from "@/components/ui/CustomInput";
import { selectAllDeals } from "@/redux/deal/deal.selectors";
import { fetchDeals } from "@/redux/deal/deal.thunks";
import {
    selectPartnerById,
    selectPartnerLoading,
} from "@/redux/partner/partner.selectors";
import {
    deletePartner,
    fetchPartnerById,
    updatePartner,
} from "@/redux/partner/partner.thunks";
import { uploadSingle } from "@/redux/upload/upload.thunks";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { dialPhone, openEmail } from "@/utils/contact";
import { generatePartnerReportPdf } from "@/utils/partnershipReports";
import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    BriefcaseBusiness,
    Building2,
    CalendarDays,
    Check,
    Edit2,
    ExternalLink,
    FileText,
    Mail,
    MapPin,
    Phone,
    Share2,
    Trash2,
    Upload,
    X,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
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
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type TabKey = "Overview" | "Deals" | "Documents";

type PickedFile = {
    uri: string;
    name: string;
    type?: string;
};

const TABS: TabKey[] = ["Overview", "Deals", "Documents"];

const formatDate = (value?: string | null) => {
    if (!value) return "—";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString();
};

function Section({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <View className="mb-5">
            <Text className="mb-2.5 text-[12px] font-kumbhBold uppercase tracking-wider text-[#6B7280]">
                {title}
            </Text>
            {children}
        </View>
    );
}

function StatCard({ label, value }: { label: string; value: string }) {
    return (
        <View className="flex-1 rounded-[22px] border border-gray-100 bg-white p-4">
            <Text className="text-[12px] font-kumbh text-[#6B7280]">{label}</Text>
            <Text className="mt-1.5 text-[18px] font-kumbhBold text-[#111827]">
                {value}
            </Text>
        </View>
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
            className={`flex-1 h-9 rounded-xl items-center justify-center ${
                active ? "bg-[#4C5FAB]" : ""
            }`}
        >
            <Text
                className={`text-xs font-kumbhBold ${
                    active ? "text-white" : "text-[#6B7280]"
                }`}
            >
                {label}
            </Text>
        </Pressable>
    );
}

function ActionButton({
    label,
    icon,
    onPress,
    disabled,
    variant = "primary",
}: {
    label: string;
    icon?: React.ReactNode;
    onPress: () => void;
    disabled?: boolean;
    variant?: "primary" | "secondary";
}) {
    const rootClass =
        variant === "primary"
            ? "h-12 px-4 rounded-2xl bg-[#4C5FAB] flex-row items-center justify-center"
            : "h-12 px-4 rounded-2xl bg-[#F9FAFB] border border-gray-200 flex-row items-center justify-center";
    const textClass =
        variant === "primary"
            ? "font-kumbhBold text-[14px] ml-2 text-white"
            : "font-kumbhBold text-[14px] ml-2 text-[#111827]";

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            className={`${rootClass} ${disabled ? "opacity-60" : ""}`}
        >
            {icon}
            <Text className={textClass}>{label}</Text>
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
                className="flex-1 bg-black/40 justify-end"
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <View className="bg-white rounded-t-[28px] pt-3 max-h-[88%]">
                    <View className="w-10 h-1 rounded-full bg-gray-200 self-center mb-3" />
                    <View className="px-5 pb-3.5 border-b border-gray-100 flex-row items-center justify-between">
                        <Text className="text-[18px] font-kumbhBold text-[#111827]">
                            {title}
                        </Text>
                        <Pressable
                            onPress={onClose}
                            className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center"
                        >
                            <X size={17} color="#374151" />
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

function ContactRow({
    icon,
    label,
    value,
    onPress,
}: {
    icon: React.ReactNode;
    label: string;
    value?: string;
    onPress?: () => void;
}) {
    const Wrapper = onPress ? Pressable : View;
    return (
        <Wrapper
            onPress={onPress}
            className="mb-2.5 flex-row items-center rounded-[22px] bg-white border border-gray-100 p-3.5"
        >
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-2xl bg-[#EEF2FF]">
                {icon}
            </View>
            <View className="flex-1">
                <Text className="text-[11px] font-kumbh text-[#6B7280]">
                    {label}
                </Text>
                <Text
                    className={`mt-0.5 text-[14px] font-kumbhBold ${
                        onPress ? "text-[#4C5FAB]" : "text-[#111827]"
                    }`}
                    numberOfLines={2}
                >
                    {value || "—"}
                </Text>
            </View>
        </Wrapper>
    );
}

export default function PartnerDetailScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const dispatch = useAppDispatch();
    const isIOS = Platform.OS === "ios";

    const partnerId = params.id as string;
    const partner = useAppSelector((state) =>
        selectPartnerById(partnerId)(state),
    );
    const deals = useAppSelector(selectAllDeals);
    const loading = useAppSelector(selectPartnerLoading);

    const [deleting, setDeleting] = useState(false);
    const [generatingReport, setGeneratingReport] = useState(false);
    const [activeTab, setActiveTab] = useState<TabKey>("Overview");
    const [documentModalVisible, setDocumentModalVisible] = useState(false);
    const [documentName, setDocumentName] = useState("");
    const [documentFile, setDocumentFile] = useState<PickedFile | null>(null);
    const [uploadingDocument, setUploadingDocument] = useState(false);
    const [deletingDocumentIndex, setDeletingDocumentIndex] = useState<
        number | null
    >(null);

    useEffect(() => {
        if (partnerId && !partner) {
            dispatch(fetchPartnerById(partnerId));
        }
    }, [partnerId, partner, dispatch]);

    useEffect(() => {
        if (partnerId) {
            dispatch(fetchDeals({ partnerId, page: 1, limit: 100 }));
        }
    }, [partnerId, dispatch]);

    const handleDelete = () => {
        Alert.alert(
            "Delete Partner",
            `Are you sure you want to delete ${partner?.name}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    onPress: async () => {
                        setDeleting(true);
                        try {
                            await dispatch(deletePartner(partnerId)).unwrap();
                            Alert.alert("Success", "Partner deleted");
                            router.back();
                        } catch {
                            Alert.alert("Error", "Failed to delete partner");
                        } finally {
                            setDeleting(false);
                        }
                    },
                    style: "destructive",
                },
            ],
        );
    };

    const handleGeneratePartnerReport = async () => {
        if (!partner) return;
        setGeneratingReport(true);
        try {
            await generatePartnerReportPdf(
                partner,
                deals.filter((deal) => deal.partnerId === partnerId),
            );
        } catch (err: any) {
            Alert.alert(
                "Report failed",
                err?.message || "Unable to generate partner report.",
            );
        } finally {
            setGeneratingReport(false);
        }
    };

    const partnerDeals = deals.filter((deal) => deal.partnerId === partnerId);

    const pickFile = async () => {
        const result = await DocumentPicker.getDocumentAsync({
            copyToCacheDirectory: true,
            multiple: false,
        });
        if (result.canceled || !result.assets?.[0]) return;

        const asset = result.assets[0];
        setDocumentFile({
            uri: asset.uri,
            name: asset.name || "partner_document",
            type: asset.mimeType || "application/octet-stream",
        });
    };

    const getDocLabel = (url: string) => {
        console.log(url);
        try {
            const pathPart = decodeURIComponent(url.split("?")[0]);
            const filename = pathPart.split("/").pop();
            if (filename) return filename;
        } catch {
            // fallback label below
        }
        return "Document";
    };

    const extractPublicIdFromUrl = (url?: string) => {
        if (!url) return null;
        try {
            const uploadIndex = url.indexOf("/upload/");
            if (uploadIndex === -1) return null;

            let after = url.substring(uploadIndex + "/upload/".length);
            const parts = after.split("/");
            if (parts[0]?.startsWith("v") && /^v\d+$/.test(parts[0])) {
                parts.shift();
            }

            let publicId = parts.join("/").split("?")[0];
            publicId = publicId.replace(/\.[^/.]+$/, "");

            try {
                publicId = decodeURIComponent(publicId);
            } catch {
                // keep raw value
            }

            return publicId || null;
        } catch {
            return null;
        }
    };

    const buildUploadFilename = (originalName: string, customName: string) => {
        const trimmed = customName.trim();
        if (!trimmed) return originalName;

        const cleaned = trimmed
            .replace(/[<>:"/\\|?*]+/g, "")
            .replace(/\s+/g, " ")
            .trim();
        if (!cleaned) return originalName;

        return cleaned;
    };

    const handleUploadDocument = async () => {
        if (!partner || !documentFile) {
            Alert.alert("Select file", "Choose a document to upload.");
            return;
        }

        setUploadingDocument(true);
        try {
            const uploadPayload: PickedFile = {
                ...documentFile,
                name: buildUploadFilename(documentFile.name, documentName),
            };
            const uploaded = await dispatch(
                uploadSingle(uploadPayload),
            ).unwrap();
            if (!uploaded?.url) {
                throw new Error("No document URL returned");
            }

            const nextDocuments = [...(partner.documents || []), uploaded.url];

            await dispatch(
                updatePartner({
                    id: partner._id,
                    updates: {
                        documents: nextDocuments,
                    },
                }),
            ).unwrap();

            setDocumentName("");
            setDocumentFile(null);
            setDocumentModalVisible(false);
        } catch (err: any) {
            Alert.alert("Error", err?.message || "Failed to upload document");
        } finally {
            setUploadingDocument(false);
        }
    };

    const handleDeleteDocument = (index: number) => {
        if (!partner?.documents?.[index]) return;

        Alert.alert(
            "Delete document",
            "Are you sure you want to delete this document?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        const targetUrl = partner.documents?.[index];
                        if (!targetUrl) return;

                        setDeletingDocumentIndex(index);
                        try {
                            const publicId = extractPublicIdFromUrl(targetUrl);
                            if (publicId) {
                                try {
                                    await api.post("/upload/delete", {
                                        publicId,
                                    });
                                } catch {
                                    // Continue removing record even if cloud delete fails.
                                }
                            }

                            const nextDocuments = (
                                partner.documents || []
                            ).filter((_, i) => i !== index);

                            await dispatch(
                                updatePartner({
                                    id: partner._id,
                                    updates: {
                                        documents: nextDocuments,
                                    },
                                }),
                            ).unwrap();
                        } catch (err: any) {
                            Alert.alert(
                                "Error",
                                err?.message || "Failed to delete document",
                            );
                        } finally {
                            setDeletingDocumentIndex(null);
                        }
                    },
                },
            ],
        );
    };

    if (loading && !partner) {
        return (
            <SafeAreaView className="flex-1 items-center justify-center bg-[#F5F7FB]">
                <ActivityIndicator size="large" color="#4C5FAB" />
            </SafeAreaView>
        );
    }

    if (!partner) {
        return (
            <SafeAreaView className="flex-1 items-center justify-center bg-[#F5F7FB]">
                <Text className="text-[#6B7280] font-kumbh">
                    Partner not found
                </Text>
            </SafeAreaView>
        );
    }

    const dealLabel =
        (partner.dealCount ?? 0) === 1
            ? "1 deal"
            : `${partner.dealCount ?? 0} deals`;

    const renderOverview = () => (
        <View>
            <Section title="Contact Information">
                <ContactRow
                    icon={<Mail size={18} color="#4C5FAB" />}
                    label="Email"
                    value={partner.contactEmail}
                    onPress={
                        partner.contactEmail
                            ? () => openEmail(partner.contactEmail!)
                            : undefined
                    }
                />
                <ContactRow
                    icon={<Phone size={18} color="#4C5FAB" />}
                    label="Phone"
                    value={partner.contactPhone}
                    onPress={
                        partner.contactPhone
                            ? () => dialPhone(partner.contactPhone!)
                            : undefined
                    }
                />
                <ContactRow
                    icon={<CalendarDays size={18} color="#4C5FAB" />}
                    label="Date of Birth"
                    value={formatDate(partner.dateOfBirth)}
                />
                <ContactRow
                    icon={<MapPin size={18} color="#4C5FAB" />}
                    label="Address"
                    value={partner.address}
                />
                <ContactRow
                    icon={<Mail size={18} color="#4C5FAB" />}
                    label="Alternate Email"
                    value={partner.alternateContactEmail}
                    onPress={
                        partner.alternateContactEmail
                            ? () => openEmail(partner.alternateContactEmail!)
                            : undefined
                    }
                />
                <ContactRow
                    icon={<Phone size={18} color="#4C5FAB" />}
                    label="Alternate Phone"
                    value={partner.alternateContactPhone}
                    onPress={
                        partner.alternateContactPhone
                            ? () => dialPhone(partner.alternateContactPhone!)
                            : undefined
                    }
                />
            </Section>

            {partner.engagementTags?.length ? (
                <Section title="Engagement Tags">
                    <View className="flex-row flex-wrap gap-2">
                        {partner.engagementTags.map((tag) => (
                            <View
                                key={tag}
                                className="rounded-full bg-[#EEF2FF] px-3 py-1.5"
                            >
                                <Text className="text-xs font-kumbhBold text-[#4C5FAB]">
                                    {tag}
                                </Text>
                            </View>
                        ))}
                    </View>
                </Section>
            ) : null}

            <Section title="Notes">
                <View className="rounded-[22px] bg-white border border-gray-100 p-4">
                    <Text className="font-kumbh text-[14px] leading-5 text-[#4B5563]">
                        {partner.notes || "No notes added."}
                    </Text>
                </View>
            </Section>

            <Section title="Metadata">
                <View className="rounded-[22px] bg-white border border-gray-100 p-4">
                    <Text className="mb-2 text-[13px] font-kumbh text-[#6B7280]">
                        Created: {formatDate(partner.createdAt)}
                    </Text>
                    <Text className="text-[13px] font-kumbh text-[#6B7280]">
                        Last Updated: {formatDate(partner.updatedAt)}
                    </Text>
                </View>
            </Section>
        </View>
    );

    const renderDeals = () => (
        <View>
            {partnerDeals.length ? (
                partnerDeals.map((deal) => (
                    <Pressable
                        key={deal._id}
                        onPress={() =>
                            router.push(
                                `/(admin)/partnerships/deals/${deal._id}`,
                            )
                        }
                        className="mb-3 rounded-[24px] border border-gray-100 bg-white p-4 active:opacity-85"
                    >
                        <View className="flex-row items-start justify-between gap-3">
                            <View className="flex-1">
                                <Text
                                    className="text-[15px] font-kumbhBold text-[#111827]"
                                    numberOfLines={2}
                                >
                                    {deal.title}
                                </Text>
                                <Text className="mt-1 text-[13px] font-kumbh text-[#6B7280]">
                                    {deal.introductionType ||
                                        "No introduction type"}
                                </Text>
                                <Text className="mt-2 text-[11px] font-kumbh text-[#9CA3AF]">
                                    Updated: {formatDate(deal.updatedAt)}
                                </Text>
                            </View>
                            <View className="rounded-full bg-[#EEF2FF] px-3 py-1">
                                <Text className="text-[11px] font-kumbhBold text-[#4C5FAB]">
                                    {deal.stage}
                                </Text>
                            </View>
                        </View>
                    </Pressable>
                ))
            ) : (
                <View className="rounded-[24px] bg-white border border-gray-100 px-5 py-8 items-center">
                    <Text className="text-[#6B7280] font-kumbh text-[13px]">
                        No deals connected yet.
                    </Text>
                </View>
            )}
        </View>
    );

    const renderDocuments = () => (
        <View>
            <View className="mb-4">
                <ActionButton
                    label="Upload Document"
                    icon={<Upload size={17} color="white" />}
                    onPress={() => setDocumentModalVisible(true)}
                />
            </View>
            {partner.documents?.length ? (
                partner.documents.map((url, index) => (
                    <View
                        key={`${url}-${index}`}
                        className="bg-white border border-gray-100 rounded-[22px] p-4 mb-2.5 flex-row items-center justify-between gap-3"
                    >
                        <View className="flex-1">
                            <Text
                                className="text-[#111827] font-kumbhBold text-[14px]"
                                numberOfLines={2}
                            >
                                {getDocLabel(url)}
                            </Text>
                            <Text className="text-[#6B7280] font-kumbh text-[12px] mt-0.5">
                                Uploaded document
                            </Text>
                        </View>
                        <View className="flex-row items-center gap-1.5">
                            <Pressable
                                onPress={() => handleDeleteDocument(index)}
                                disabled={
                                    deletingDocumentIndex === index ||
                                    uploadingDocument
                                }
                                className="h-9 w-9 rounded-full bg-red-50 items-center justify-center"
                            >
                                <Trash2
                                    size={16}
                                    color={
                                        deletingDocumentIndex === index
                                            ? "#d1d5db"
                                            : "#dc2626"
                                    }
                                />
                            </Pressable>
                            <Pressable
                                onPress={() => Linking.openURL(url)}
                                className="h-9 w-9 rounded-full bg-[#EEF2FF] items-center justify-center"
                            >
                                <ExternalLink size={16} color="#4C5FAB" />
                            </Pressable>
                        </View>
                    </View>
                ))
            ) : (
                <View className="rounded-[24px] bg-white border border-gray-100 px-5 py-8 items-center">
                    <Text className="text-[#6B7280] font-kumbh text-[13px]">
                        No partner documents uploaded.
                    </Text>
                </View>
            )}
        </View>
    );

    const renderTabContent = () => {
        if (activeTab === "Overview") return renderOverview();
        if (activeTab === "Deals") return renderDeals();
        return renderDocuments();
    };

    return (
        <>
            <SafeAreaView
                className="flex-1 bg-[#F5F7FB]"
                edges={
                    isIOS
                        ? ["left", "right"]
                        : ["top", "left", "right", "bottom"]
                }
            >
                <PlatformAdaptiveHeader
                    title="Partner Details"
                    backgroundColor="#F5F7FB"
                    headerRight={() => (
                        <View className="flex-row gap-2 ios:mr-3">
                            <Pressable
                                onPress={() =>
                                    router.push({
                                        pathname:
                                            "/(admin)/partnerships/partners/create",
                                        params: { partnerId },
                                    })
                                }
                                className="h-9 w-9 items-center justify-center rounded-full bg-white border border-gray-200"
                            >
                                <Edit2 size={16} color="#4C5FAB" />
                            </Pressable>
                            <Pressable
                                onPress={handleDelete}
                                disabled={deleting}
                                className="h-9 w-9 items-center justify-center rounded-full bg-red-50 border border-red-100"
                            >
                                {deleting ? (
                                    <ActivityIndicator
                                        size="small"
                                        color="#DC2626"
                                    />
                                ) : (
                                    <Trash2 size={16} color="#DC2626" />
                                )}
                            </Pressable>
                        </View>
                    )}
                />

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerClassName="px-4 pt-3 pb-12"
                >
                    <View className="mb-4 rounded-[28px] bg-white border border-gray-100 p-5">
                        <View className="flex-row items-start justify-between">
                            <View className="flex-1 pr-3">
                                <Text
                                    className="text-[22px] font-kumbhBold text-[#111827]"
                                    numberOfLines={2}
                                >
                                    {partner.name}
                                </Text>
                                <Text
                                    className="mt-1 text-[14px] font-kumbh text-[#6B7280]"
                                    numberOfLines={2}
                                >
                                    {partner.company || "No company added"}
                                </Text>
                            </View>
                            <View
                                className={`rounded-full px-3 py-1 ${
                                    partner.status === "active"
                                        ? "bg-emerald-50"
                                        : "bg-slate-100"
                                }`}
                            >
                                <Text
                                    className={`text-xs capitalize font-kumbhBold ${
                                        partner.status === "active"
                                            ? "text-emerald-700"
                                            : "text-slate-700"
                                    }`}
                                >
                                    {partner.status}
                                </Text>
                            </View>
                        </View>

                        <View className="mt-3.5 flex-row flex-wrap gap-2">
                            {partner.partnerType ? (
                                <View className="flex-row items-center rounded-full bg-[#EEF2FF] px-3 py-1">
                                    <BriefcaseBusiness
                                        size={13}
                                        color="#4C5FAB"
                                    />
                                    <Text className="ml-1.5 text-xs capitalize font-kumbhBold text-[#4C5FAB]">
                                        {partner.partnerType}
                                    </Text>
                                </View>
                            ) : null}
                            {partner.industry ? (
                                <View className="flex-row items-center rounded-full bg-[#EEF2FF] px-3 py-1">
                                    <Building2 size={13} color="#4C5FAB" />
                                    <Text className="ml-1.5 text-xs capitalize font-kumbhBold text-[#4C5FAB]">
                                        {partner.industry}
                                    </Text>
                                </View>
                            ) : null}
                        </View>

                        <Pressable
                            onPress={handleGeneratePartnerReport}
                            disabled={generatingReport}
                            className="mt-4 h-12 flex-row items-center justify-center rounded-2xl bg-[#EEF2FF]"
                        >
                            {generatingReport ? (
                                <ActivityIndicator
                                    size="small"
                                    color="#4C5FAB"
                                />
                            ) : (
                                <Share2 size={17} color="#4C5FAB" />
                            )}
                            <Text className="ml-2 text-sm font-kumbhBold text-[#4C5FAB]">
                                {generatingReport
                                    ? "Generating..."
                                    : "Generate Partner Report"}
                            </Text>
                        </Pressable>
                    </View>

                    <View className="mb-4 flex-row gap-3">
                        <StatCard label="Deals" value={dealLabel} />
                        <StatCard
                            label="Documents"
                            value={String(partner.documents?.length ?? 0)}
                        />
                    </View>

                    <View className="mb-5 h-11 flex-row rounded-2xl border border-gray-200 bg-white p-1">
                        {TABS.map((tab) => (
                            <Pill
                                key={tab}
                                label={tab}
                                active={activeTab === tab}
                                onPress={() => setActiveTab(tab)}
                            />
                        ))}
                    </View>

                    {renderTabContent()}
                </ScrollView>
            </SafeAreaView>

            <FormModal
                title="Upload Partner Document"
                visible={documentModalVisible}
                onClose={() => {
                    setDocumentModalVisible(false);
                    setDocumentName("");
                    setDocumentFile(null);
                }}
            >
                <View className="mb-4">
                    <Text className="text-sm text-[#374151] font-kumbhBold mb-2">
                        Document name
                    </Text>
                    <View className="h-12 justify-center rounded-2xl border border-gray-200 bg-[#F9FAFB] px-4">
                        <CustomTextInput
                            value={documentName}
                            onChangeText={setDocumentName}
                            placeholder="Optional"
                        />
                    </View>
                </View>
                <View className="mb-4">
                    <ActionButton
                        label={documentFile ? documentFile.name : "Choose file"}
                        icon={<FileText size={17} color="#4C5FAB" />}
                        variant="secondary"
                        onPress={pickFile}
                    />
                </View>
                <ActionButton
                    label={
                        uploadingDocument ? "Uploading..." : "Upload Document"
                    }
                    icon={<Check size={17} color="white" />}
                    disabled={uploadingDocument}
                    onPress={handleUploadDocument}
                />
            </FormModal>
        </>
    );
}
