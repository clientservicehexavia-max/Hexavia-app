import { api } from "@/api/axios";
import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
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
    TextInput,
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

const formatDate = (value?: string) => {
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
        <View className="mb-6">
            <Text className="mb-3 text-lg font-kumbhBold text-gray-900">
                {title}
            </Text>
            {children}
        </View>
    );
}

function StatCard({ label, value }: { label: string; value: string }) {
    return (
        <View className="flex-1 rounded-xl border border-blue-100 bg-blue-50 p-3">
            <Text className="text-xs font-kumbh text-gray-500">{label}</Text>
            <Text className="mt-2 text-xl font-kumbhBold text-gray-900">
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
            className={`px-3 py-2 rounded-full border ${
                active
                    ? "bg-blue-500 border-blue-500"
                    : "bg-white border-gray-200"
            }`}
        >
            <Text
                className={`text-sm font-medium ${
                    active ? "text-white" : "text-gray-700"
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
            ? "h-11 px-3 rounded-lg bg-blue-500 flex-row items-center justify-center"
            : "h-11 px-3 rounded-lg bg-gray-100 flex-row items-center justify-center";
    const textClass =
        variant === "primary"
            ? "font-semibold ml-2 text-white"
            : "font-semibold ml-2 text-gray-900";

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
            className="mb-2 flex-row items-center rounded-xl bg-gray-50 p-3"
        >
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-white">
                {icon}
            </View>
            <View className="flex-1">
                <Text className="text-xs font-kumbh text-gray-500">
                    {label}
                </Text>
                <Text
                    className={`mt-1 text-sm font-kumbh ${
                        onPress ? "text-[#4C5FAB]" : "text-gray-900"
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
            <SafeAreaView className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator size="large" color="#4C5FAB" />
            </SafeAreaView>
        );
    }

    if (!partner) {
        return (
            <SafeAreaView className="flex-1 items-center justify-center bg-white">
                <Text className="text-gray-500">Partner not found</Text>
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
                                className="rounded-full bg-blue-100 px-3 py-1"
                            >
                                <Text className="text-sm font-kumbhBold text-blue-800">
                                    {tag}
                                </Text>
                            </View>
                        ))}
                    </View>
                </Section>
            ) : null}

            <Section title="Notes">
                <View className="rounded-xl bg-gray-50 p-4">
                    <Text className="font-kumbh text-gray-700">
                        {partner.notes || "No notes added."}
                    </Text>
                </View>
            </Section>

            <Section title="Metadata">
                <View className="rounded-xl bg-gray-50 p-4">
                    <Text className="mb-2 text-sm font-kumbh text-gray-600">
                        Created: {formatDate(partner.createdAt)}
                    </Text>
                    <Text className="text-sm font-kumbh text-gray-600">
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
                        className="mb-3 rounded-xl border border-gray-200 bg-white p-4"
                    >
                        <View className="flex-row items-start justify-between gap-3">
                            <View className="flex-1">
                                <Text
                                    className="text-base font-kumbhBold text-gray-900"
                                    numberOfLines={2}
                                >
                                    {deal.title}
                                </Text>
                                <Text className="mt-1 text-sm font-kumbh text-gray-500">
                                    {deal.introductionType ||
                                        "No introduction type"}
                                </Text>
                                <Text className="mt-2 text-xs font-kumbh text-[#4C5FAB]">
                                    Updated: {formatDate(deal.updatedAt)}
                                </Text>
                            </View>
                            <View className="rounded-full bg-blue-50 px-3 py-1">
                                <Text className="text-xs font-kumbhBold text-blue-700">
                                    {deal.stage}
                                </Text>
                            </View>
                        </View>
                    </Pressable>
                ))
            ) : (
                <Text className="text-gray-500">No deals connected yet.</Text>
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
            {partner.documents?.length ? (
                partner.documents.map((url, index) => (
                    <View
                        key={`${url}-${index}`}
                        className="bg-gray-50 rounded-lg p-3 mb-2 flex-row items-center justify-between gap-4"
                    >
                        <View className="flex-1">
                            <Text
                                className="text-gray-900 font-medium"
                                numberOfLines={2}
                            >
                                {getDocLabel(url)}
                            </Text>
                            <Text className="text-gray-500 text-sm">
                                Uploaded document
                            </Text>
                        </View>
                        <View className="flex-row items-center">
                            <Pressable
                                onPress={() => handleDeleteDocument(index)}
                                disabled={
                                    deletingDocumentIndex === index ||
                                    uploadingDocument
                                }
                                className="p-2"
                            >
                                <Trash2
                                    size={18}
                                    color={
                                        deletingDocumentIndex === index
                                            ? "#d1d5db"
                                            : "#dc2626"
                                    }
                                />
                            </Pressable>
                            <Pressable
                                onPress={() => Linking.openURL(url)}
                                className="p-2"
                            >
                                <ExternalLink size={18} color="#3b82f6" />
                            </Pressable>
                        </View>
                    </View>
                ))
            ) : (
                <Text className="text-gray-500">
                    No partner documents uploaded.
                </Text>
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
                className="flex-1 bg-white"
                edges={
                    isIOS
                        ? ["left", "right"]
                        : ["top", "left", "right", "bottom"]
                }
            >
                <View className="flex-1 px-4">
                    <PlatformAdaptiveHeader
                        title="Partner Details"
                        headerRight={({ tintColor }) => (
                            <View className="flex-row gap-2">
                                <Pressable
                                    onPress={() =>
                                        router.push({
                                            pathname:
                                                "/(admin)/partnerships/partners/create",
                                            params: { partnerId },
                                        })
                                    }
                                    className="h-10 w-10 items-center justify-center rounded-full"
                                >
                                    <Edit2 size={20} color={tintColor} />
                                </Pressable>
                                <Pressable
                                    onPress={handleDelete}
                                    disabled={deleting}
                                    className="h-10 w-10 items-center justify-center rounded-full bg-red-500"
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
                        <View className="mb-5 rounded-2xl bg-blue-50 p-4">
                            <View className="flex-row items-start justify-between">
                                <View className="flex-1 pr-3">
                                    <Text
                                        className="text-3xl font-kumbhBold text-gray-900"
                                        numberOfLines={2}
                                    >
                                        {partner.name}
                                    </Text>
                                    <Text
                                        className="mt-2 text-base font-kumbh text-gray-600"
                                        numberOfLines={2}
                                    >
                                        {partner.company || "No company added"}
                                    </Text>
                                </View>
                                <View
                                    className={`rounded-full px-3 py-1 ${
                                        partner.status === "active"
                                            ? "bg-emerald-100"
                                            : "bg-slate-100"
                                    }`}
                                >
                                    <Text
                                        className={`text-sm capitalize font-kumbhBold ${
                                            partner.status === "active"
                                                ? "text-emerald-700"
                                                : "text-slate-700"
                                        }`}
                                    >
                                        {partner.status}
                                    </Text>
                                </View>
                            </View>

                            <View className="mt-4 flex-row flex-wrap gap-2">
                                {partner.partnerType ? (
                                    <View className="flex-row items-center rounded-full bg-white px-3 py-1">
                                        <BriefcaseBusiness
                                            size={13}
                                            color="#4C5FAB"
                                        />
                                        <Text className="ml-1 text-sm capitalize font-kumbhBold text-[#4C5FAB]">
                                            {partner.partnerType}
                                        </Text>
                                    </View>
                                ) : null}
                                {partner.industry ? (
                                    <View className="flex-row items-center rounded-full bg-white px-3 py-1">
                                        <Building2 size={13} color="#4C5FAB" />
                                        <Text className="ml-1 text-sm capitalize font-kumbhBold text-[#4C5FAB]">
                                            {partner.industry}
                                        </Text>
                                    </View>
                                ) : null}
                            </View>

                            <Pressable
                                onPress={handleGeneratePartnerReport}
                                disabled={generatingReport}
                                className="mt-4 h-12 flex-row items-center justify-center rounded-xl bg-white"
                            >
                                {generatingReport ? (
                                    <ActivityIndicator
                                        size="small"
                                        color="#4C5FAB"
                                    />
                                ) : (
                                    <Share2 size={18} color="#4C5FAB" />
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
                    <Text className="text-gray-700 font-semibold mb-2">
                        Document name
                    </Text>
                    <TextInput
                        value={documentName}
                        onChangeText={setDocumentName}
                        placeholder="Optional"
                        placeholderTextColor="#9CA3AF"
                        className="border border-gray-300 rounded-lg px-4 py-3 text-base"
                    />
                </View>
                <View className="mb-4">
                    <ActionButton
                        label={documentFile ? documentFile.name : "Choose file"}
                        icon={<FileText size={18} color="#111827" />}
                        variant="secondary"
                        onPress={pickFile}
                    />
                </View>
                <ActionButton
                    label={
                        uploadingDocument ? "Uploading..." : "Upload Document"
                    }
                    icon={<Check size={18} color="white" />}
                    disabled={uploadingDocument}
                    onPress={handleUploadDocument}
                />
            </FormModal>
        </>
    );
}
