import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import {
    Calendar,
    Check,
    Share2,
    Trash2,
    Upload,
    X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Linking,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/api/axios";
import DatePickerModal from "@/components/admin/DatePickerModal";
import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import {
    selectPartnershipLoading,
    selectSelectedPartnership,
} from "@/redux/partnership/partnership.selectors";
import {
    createPartnership,
    deletePartnership,
    getPartnership,
    updatePartnership,
} from "@/redux/partnership/partnership.thunks";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import clsx from "clsx";

type FormData = {
    name: string;
    clientName: string;
    email: string;
    phoneNumber: string;
    description: string;
    partnershipAgreement: string;
    deliverables: string;
    documents: string;
    createdAtDate: string;
    isFinance: boolean;
    terms: string;
    notes: string;
};

type DocumentFile = {
    uri: string;
    name: string;
    type: string;
};

function toDateInputValue(value: string) {
    if (!value) return new Date();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export default function PartnershipFormScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const dispatch = useAppDispatch();
    const isIOS = Platform.OS === "ios";

    const partnership = useAppSelector(selectSelectedPartnership);
    const loading = useAppSelector(selectPartnershipLoading);

    const isEditing = params.id ? true : false;
    const partnerId = params.id as string;

    const [form, setForm] = useState<FormData>({
        name: "",
        clientName: "",
        email: "",
        phoneNumber: "",
        description: "",
        partnershipAgreement: "",
        deliverables: "",
        documents: "",
        createdAtDate: new Date().toISOString().split("T")[0],
        isFinance: false,
        terms: "",
        notes: "",
    });

    const [submitting, setSubmitting] = useState(false);
    const [documentUploading, setDocumentUploading] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<DocumentFile | null>(null);
    const [showCreatedDatePicker, setShowCreatedDatePicker] = useState(false);
    const [createdPickerDate, setCreatedPickerDate] = useState<Date>(
        new Date(),
    );

    useEffect(() => {
        if (isEditing && partnerId) {
            dispatch(getPartnership(partnerId));
        }
    }, [isEditing, partnerId, dispatch]);

    useEffect(() => {
        if (partnership && isEditing) {
            setForm({
                name: partnership.name || "",
                clientName: partnership.clientName || "",
                email: partnership.email || "",
                phoneNumber: partnership.phoneNumber || "",
                description: partnership.description || "",
                partnershipAgreement: partnership.partnershipAgreement || "",
                deliverables: partnership.deliverables || "",
                documents: partnership.documentsLink || "",
                createdAtDate: partnership.createdAt
                    ? new Date(partnership.createdAt)
                          .toISOString()
                          .split("T")[0]
                    : new Date().toISOString().split("T")[0],
                isFinance: partnership.isFinance || false,
                terms: partnership.terms || "",
                notes: partnership.notes || "",
            });
        }
    }, [partnership, isEditing]);

    useEffect(() => {
        setCreatedPickerDate(toDateInputValue(form.createdAtDate));
    }, [form.createdAtDate]);

    const handleSubmit = useCallback(async () => {
        if (!form.name.trim()) {
            Alert.alert("Validation", "Partnership name is required");
            return;
        }

        setSubmitting(true);
        try {
            let documentsLink = form.documents.trim();

            if (uploadedFile) {
                setDocumentUploading(true);
                const uploadForm = new FormData();
                uploadForm.append("file", {
                    uri: uploadedFile.uri,
                    name: uploadedFile.name,
                    type: uploadedFile.type || "application/pdf",
                } as any);

                const uploadResponse = await api.post(
                    "/partnerships/upload-document",
                    uploadForm,
                    {
                        headers: { Accept: "application/json" },
                        transformRequest: (value) => value,
                    },
                );

                documentsLink =
                    uploadResponse.data?.data?.url ||
                    uploadResponse.data?.url ||
                    "";

                if (!documentsLink) {
                    throw new Error(
                        "Upload succeeded but no file URL returned.",
                    );
                }

                setForm((current) => ({
                    ...current,
                    documents: documentsLink,
                }));
            }

            // Map form fields to backend field names
            const payload = {
                name: form.name,
                clientName: form.clientName,
                email: form.email,
                phoneNumber: form.phoneNumber,
                description: form.description,
                partnershipAgreement: form.partnershipAgreement,
                deliverables: form.deliverables,
                documentsLink: documentsLink,
                isFinance: form.isFinance,
                terms: form.terms,
                notes: form.notes,
                createdAt: isEditing ? new Date(form.createdAtDate) : undefined,
            };

            if (isEditing && partnerId) {
                await dispatch(
                    updatePartnership({
                        id: partnerId,
                        updates: payload,
                    }),
                ).unwrap();
            } else {
                await dispatch(createPartnership(payload)).unwrap();
            }
            Alert.alert(
                "Success",
                isEditing
                    ? "Partnership updated successfully"
                    : "Partnership created successfully",
            );
            router.back();
        } catch (err: any) {
            Alert.alert("Error", err || "Failed to save partnership");
        } finally {
            setDocumentUploading(false);
            setSubmitting(false);
        }
    }, [form, isEditing, partnerId, dispatch, router, uploadedFile]);
    const handlePickDocument = useCallback(async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: "application/pdf",
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const file = result.assets[0];
                setUploadedFile({
                    uri: file.uri,
                    name: file.name || "partnership-document.pdf",
                    type: file.mimeType || "application/pdf",
                });
            }
        } catch (err) {
            Alert.alert("Error", "Failed to pick document");
        }
    }, []);

    const handleClearDocument = useCallback(() => {
        setUploadedFile(null);
    }, []);
    const handleSharePDF = useCallback(async () => {
        if (!isEditing) {
            Alert.alert("Validation", "Please save partnership first");
            return;
        }

        const documentUrl = form.documents.trim();
        if (!documentUrl) {
            Alert.alert("Validation", "No document link found to share");
            return;
        }

        try {
            if (Platform.OS === "web") {
                await Linking.openURL(documentUrl);
                return;
            }

            if (!(await Sharing.isAvailableAsync())) {
                Alert.alert(
                    "Sharing unavailable",
                    "Sharing is not available on this device.",
                );
                return;
            }

            const decodedName = decodeURIComponent(
                documentUrl.split("/").pop() || "partnership-document.pdf",
            );
            const safeName = decodedName.toLowerCase().endsWith(".pdf")
                ? decodedName
                : `${decodedName}.pdf`;
            const localFile = new File(Paths.cache, safeName);
            await File.downloadFileAsync(documentUrl, localFile, {
                idempotent: true,
            });

            await Sharing.shareAsync(localFile.uri, {
                UTI: "com.adobe.pdf",
                mimeType: "application/pdf",
                dialogTitle: "Share Partnership PDF",
            });
        } catch (error: any) {
            Alert.alert(
                "Share Partnership",
                error?.message || "Failed to share partnership PDF",
            );
        }
    }, [form.documents, isEditing]);

    const handleDelete = useCallback(() => {
        Alert.alert(
            "Delete Partnership",
            `Are you sure you want to delete "${form.name || "this partnership"}"? This action cannot be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setSubmitting(true);
                            await dispatch(
                                deletePartnership(partnerId),
                            ).unwrap();
                            Alert.alert(
                                "Success",
                                "Partnership deleted successfully",
                            );
                            router.back();
                        } catch (err: any) {
                            Alert.alert(
                                "Error",
                                err || "Failed to delete partnership",
                            );
                        } finally {
                            setSubmitting(false);
                        }
                    },
                },
            ],
        );
    }, [form.name, partnerId, dispatch, router]);

    if (loading && isEditing) {
        return (
            <SafeAreaView className="flex-1 bg-white">
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#4c5fab" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView
            className="flex-1 bg-white"
            edges={isIOS ? ["left", "right"] : ["top", "left", "right"]}
        >
            <PlatformAdaptiveHeader
                title={isEditing ? "Edit Partnership" : "Create Partnership"}
                headerRight={({ tintColor }) => (
                    <Pressable
                        onPress={handleSubmit}
                        disabled={submitting || loading || documentUploading}
                        className="w-10 h-10 rounded-full items-center justify-center"
                    >
                        {submitting || loading || documentUploading ? (
                            <ActivityIndicator size="small" color={tintColor} />
                        ) : (
                            <Check
                                size={28}
                                color={
                                    submitting || loading || documentUploading
                                        ? "#9CA3AF"
                                        : tintColor
                                }
                            />
                        )}
                    </Pressable>
                )}
            />

            <KeyboardAvoidingView
                behavior={isIOS ? "padding" : "height"}
                className="flex-1"
                keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 20}
            >
                <ScrollView className="flex-1 px-4 py-4">
                    <Text className="mb-2 font-kumbhBold text-gray-700">
                        Partnership Name
                    </Text>
                    <TextInput
                        className="h-12 mb-4 rounded-lg border border-gray-300 bg-white px-3 font-kumbh text-gray-800"
                        placeholder="Enter partnership name"
                        value={form.name}
                        onChangeText={(text) =>
                            setForm({ ...form, name: text })
                        }
                        editable={!submitting}
                    />

                    <Text className="mb-2 font-kumbhBold text-gray-700">
                        Client Name
                    </Text>
                    <TextInput
                        className="h-12 mb-4 rounded-lg border border-gray-300 bg-white px-3 font-kumbh text-gray-800"
                        placeholder="Enter client/company name"
                        value={form.clientName}
                        onChangeText={(text) =>
                            setForm({ ...form, clientName: text })
                        }
                        editable={!submitting}
                    />

                    <Text className="mb-2 font-kumbhBold text-gray-700">
                        Email
                    </Text>
                    <TextInput
                        className="h-12 mb-4 rounded-lg border border-gray-300 bg-white px-3 font-kumbh text-gray-800"
                        placeholder="Enter email"
                        value={form.email}
                        onChangeText={(text) =>
                            setForm({ ...form, email: text })
                        }
                        keyboardType="email-address"
                        editable={!submitting}
                    />

                    <Text className="mb-2 font-kumbhBold text-gray-700">
                        Phone Number
                    </Text>
                    <TextInput
                        className="h-12 mb-4 rounded-lg border border-gray-300 bg-white px-3 font-kumbh text-gray-800"
                        placeholder="Enter phone number"
                        value={form.phoneNumber}
                        onChangeText={(text) =>
                            setForm({ ...form, phoneNumber: text })
                        }
                        editable={!submitting}
                    />

                    <Text className="mb-2 font-kumbhBold text-gray-700">
                        Description
                    </Text>
                    <TextInput
                        className="h-12 mb-4 rounded-lg border border-gray-300 bg-white px-3 py-2 font-kumbh text-gray-800"
                        placeholder="Enter partnership description"
                        value={form.description}
                        onChangeText={(text) =>
                            setForm({ ...form, description: text })
                        }
                        multiline
                        numberOfLines={4}
                        editable={!submitting}
                    />

                    <Text className="mb-2 font-kumbhBold text-gray-700">
                        Partnership Agreement/Offer
                    </Text>
                    <TextInput
                        className="h-12 mb-4 rounded-lg border border-gray-300 bg-white px-3 py-2 font-kumbh text-gray-800"
                        placeholder="Enter partnership agreement or offer details"
                        value={form.partnershipAgreement}
                        onChangeText={(text) =>
                            setForm({ ...form, partnershipAgreement: text })
                        }
                        multiline
                        numberOfLines={4}
                        editable={!submitting}
                    />

                    <Text className="mb-2 font-kumbhBold text-gray-700">
                        Deliverables
                    </Text>
                    <TextInput
                        className="h-12 mb-4 rounded-lg border border-gray-300 bg-white px-3 py-2 font-kumbh text-gray-800"
                        placeholder="Enter what each party will deliver"
                        value={form.deliverables}
                        onChangeText={(text) =>
                            setForm({ ...form, deliverables: text })
                        }
                        multiline
                        numberOfLines={4}
                        editable={!submitting}
                    />

                    <Text className="mb-2 font-kumbhBold text-gray-700">
                        Date Created
                    </Text>
                    <Pressable
                        onPress={() => setShowCreatedDatePicker(true)}
                        disabled={submitting}
                        className="h-12 mb-4 rounded-lg border border-gray-300 bg-white px-3 flex-row items-center justify-between"
                    >
                        <Text className="font-kumbh text-gray-800">
                            {form.createdAtDate || "YYYY-MM-DD"}
                        </Text>
                        <Calendar size={18} color="#111827" />
                    </Pressable>

                    <Text className="mb-2 font-kumbhBold text-gray-700">
                        Documents
                    </Text>
                    <TextInput
                        className="h-12 mb-2 rounded-lg border border-gray-300 bg-white px-3 font-kumbh text-gray-800"
                        placeholder="Enter link to documents (URL)"
                        value={form.documents}
                        onChangeText={(text) =>
                            setForm({ ...form, documents: text })
                        }
                        keyboardType="url"
                        editable={!submitting}
                    />

                    <View className="mb-4 flex-row gap-2">
                        <Pressable
                            onPress={handlePickDocument}
                            disabled={submitting || documentUploading}
                            className="flex-1 flex-row items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary bg-primary-50 py-3"
                        >
                            <Upload size={18} color="#4c5fab" />
                            <Text className="font-kumbhBold text-primary">
                                Upload PDF
                            </Text>
                        </Pressable>
                        {uploadedFile && (
                            <Pressable
                                onPress={handleClearDocument}
                                disabled={submitting || documentUploading}
                                className="items-center justify-center rounded-lg bg-red-50 px-3"
                            >
                                <X size={20} color="#ef4444" />
                            </Pressable>
                        )}
                    </View>
                    {uploadedFile && (
                        <View className="mb-4 rounded-lg bg-green-50 p-2">
                            <Text className="font-kumbhBold text-xs text-green-700">
                                ✓ {uploadedFile.name}
                            </Text>
                        </View>
                    )}

                    <View className="mb-4 flex-row items-center gap-2">
                        <Pressable
                            onPress={() =>
                                setForm({ ...form, isFinance: !form.isFinance })
                            }
                            disabled={submitting}
                            className={clsx(
                                "h-6 w-6 rounded-md border-2",
                                form.isFinance
                                    ? "border-primary bg-primary"
                                    : "border-gray-300 bg-white",
                            )}
                        >
                            {form.isFinance ? (
                                <Text className="text-center font-kumbhBold text-white">
                                    ✓
                                </Text>
                            ) : null}
                        </Pressable>
                        <Text className="font-kumbh text-gray-700">
                            Finance Partnership
                        </Text>
                    </View>

                    <Text className="mb-2 font-kumbhBold text-gray-700">
                        Terms
                    </Text>
                    <TextInput
                        className="h-12 mb-4 rounded-lg border border-gray-300 bg-white px-3 py-2 font-kumbh text-gray-800"
                        placeholder="Enter partnership terms"
                        value={form.terms}
                        onChangeText={(text) =>
                            setForm({ ...form, terms: text })
                        }
                        multiline
                        numberOfLines={3}
                        editable={!submitting}
                    />

                    <Text className="mb-2 font-kumbhBold text-gray-700">
                        Notes
                    </Text>
                    <TextInput
                        className="h-12 mb-6 rounded-lg border border-gray-300 bg-white px-3 py-2 font-kumbh text-gray-800"
                        placeholder="Enter additional notes"
                        value={form.notes}
                        onChangeText={(text) =>
                            setForm({ ...form, notes: text })
                        }
                        multiline
                        numberOfLines={4}
                        editable={!submitting}
                    />

                    {isEditing && (
                        <Pressable
                            onPress={handleSharePDF}
                            disabled={submitting}
                            className="mb-4 flex-row items-center justify-center gap-2 rounded-lg border border-primary bg-primary-100 py-3"
                        >
                            <Share2 size={18} color="#4c5fab" />
                            <Text className="font-kumbhBold text-primary">
                                Share Partnership PDF
                            </Text>
                        </Pressable>
                    )}

                    {isEditing && (
                        <Pressable
                            onPress={handleDelete}
                            disabled={submitting}
                            className="mb-6 flex-row items-center justify-center gap-2 rounded-lg border border-red-300 bg-red-50 py-3"
                        >
                            <Trash2 size={18} color="#dc2626" />
                            <Text className="font-kumbhBold text-red-600">
                                Delete Partnership
                            </Text>
                        </Pressable>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>

            <DatePickerModal
                visible={showCreatedDatePicker}
                value={createdPickerDate}
                onCancel={() => setShowCreatedDatePicker(false)}
                onDone={() => setShowCreatedDatePicker(false)}
                onDateChange={(d) => {
                    setCreatedPickerDate(d);
                    setForm({
                        ...form,
                        createdAtDate: d.toISOString().split("T")[0],
                    });
                }}
            />
        </SafeAreaView>
    );
}
