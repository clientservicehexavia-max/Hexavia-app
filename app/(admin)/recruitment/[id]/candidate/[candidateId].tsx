import DatePickerModal from "@/components/admin/DatePickerModal";
import OptionSheet from "@/components/common/OptionSheet";
import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import { selectSelectedRecruitment } from "@/redux/recruitment/recruitment.selectors";
import {
    addRecruitmentCandidateDocument,
    addRecruitmentCandidateNote,
    deleteRecruitmentCandidateDocument,
    fetchRecruitmentById,
    updateRecruitmentCandidate,
} from "@/redux/recruitment/recruitment.thunks";
import { uploadSingle } from "@/redux/upload/upload.thunks";
import type { RootState } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
    canAddCandidate,
    canAddCandidateNotes,
    canUpdateCandidateProgress,
    canUploadCandidateDocuments,
} from "@/utils/recruitmentPermissions";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import {
    Calendar,
    ChevronDown,
    ChevronUp,
    Download,
    Pencil,
    Trash2,
    Upload,
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Linking,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const sections = [
    "Initial Contact",
    "Virtual Interview 1",
    "Virtual Interview 2",
    "Physical Interview",
    "Salary Negotiation",
    "Employment",
] as const;

type SectionName = (typeof sections)[number];

const overallStageOptions = [
    "New",
    "Contacted",
    "Interview 1",
    "Interview 2",
    "Physical Interview",
    "Salary Negotiation",
    "Offered",
    "Employed",
    "Rejected",
    "On Hold",
];

const docTypes = [
    "CV",
    "Certificates",
    "Offer Letter",
    "Employment Contract",
    "Other Documents",
];

const initialContactStatusOptions = [
    "Pending",
    "In Progress",
    "Completed",
    "Not Interested",
];
const interviewResponseOptions = ["Acknowledge", "No Response"];
const interviewStatusOptions = ["Passed", "Average", "Failed"];
const salaryStatusOptions = ["Pending", "In Progress", "Accepted", "Rejected"];
const employmentStatusOptions = ["Not Employed", "Trial", "Employed"];

const formatYMD = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const getDocumentFilename = (doc: { fileUrl?: string; type?: string }) => {
    const urlPart = doc.fileUrl?.split("?")[0] || "";
    const fromUrl = urlPart.split("/").pop();
    if (fromUrl) return decodeURIComponent(fromUrl);

    const label = (doc.type || "document").toLowerCase().replace(/\s+/g, "-");
    return `${label}-${Date.now()}`;
};

const formatActivityLogEntry = (entry: string) => {
    const separatorIndex = entry.indexOf(" - ");
    if (separatorIndex === -1) {
        return { timestampLabel: entry, message: "" };
    }

    const rawTimestamp = entry.slice(0, separatorIndex);
    const message = entry.slice(separatorIndex + 3).trim();
    const parsedDate = new Date(rawTimestamp);

    if (Number.isNaN(parsedDate.getTime())) {
        return { timestampLabel: rawTimestamp, message };
    }

    return {
        timestampLabel: new Intl.DateTimeFormat(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
        }).format(parsedDate),
        message,
    };
};

export default function CandidateDetailScreen() {
    const isIOS = Platform.OS === "ios";
    const router = useRouter();
    const params = useLocalSearchParams();
    const dispatch = useAppDispatch();
    const recruitment = useAppSelector(selectSelectedRecruitment);
    const role = useAppSelector((state: RootState) => state.auth.user?.role);
    const userEmail = useAppSelector(
        (state: RootState) => state.auth.user?.email,
    );
    const [openSection, setOpenSection] = useState<SectionName | null>(
        "Initial Contact",
    );
    const [note, setNote] = useState("");
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [activeStatusField, setActiveStatusField] = useState<string | null>(
        null,
    );
    const [pickerOptions, setPickerOptions] = useState<string[]>([]);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [activeDateField, setActiveDateField] = useState<string | null>(null);
    const [pickerDate, setPickerDate] = useState(new Date());
    const [workflowDraft, setWorkflowDraft] = useState<Record<string, any>>({});
    const [workflowStage, setWorkflowStage] = useState("New");
    const [isSavingWorkflow, setIsSavingWorkflow] = useState(false);

    const recruitmentId = params.id as string;
    const candidateId = params.candidateId as string;

    useEffect(() => {
        if (recruitmentId) {
            dispatch(fetchRecruitmentById(recruitmentId));
        }
    }, [dispatch, recruitmentId]);

    const candidate = useMemo(() => {
        return (recruitment?.candidates || []).find(
            (item) => item._id === candidateId,
        );
    }, [recruitment?.candidates, candidateId]);

    useEffect(() => {
        if (!candidate?._id) return;
        setWorkflowDraft({ ...(candidate.progress || {}) });
        setWorkflowStage(
            candidate.overallStatus || candidate.currentStage || "New",
        );
    }, [candidate?._id]);

    const updateProgress = async (updates: Record<string, any>) => {
        if (!canUpdateCandidateProgress(role)) return;
        try {
            await dispatch(
                updateRecruitmentCandidate({
                    recruitmentId,
                    candidateId,
                    payload: updates,
                }),
            ).unwrap();
            await dispatch(fetchRecruitmentById(recruitmentId));
        } catch (error: any) {
            Alert.alert(
                "Error",
                error?.message || "Failed to update candidate",
            );
        }
    };

    const onUploadDocument = async (type: string) => {
        if (!canUploadCandidateDocuments(role)) return;

        const pick = await DocumentPicker.getDocumentAsync({
            type: "*/*",
            copyToCacheDirectory: true,
        });
        if (pick.canceled || !pick.assets?.[0]) return;

        const asset = pick.assets[0];
        try {
            const uploaded = await dispatch(
                uploadSingle({
                    uri: asset.uri,
                    name: asset.name || `${Date.now()}-${type}`,
                    type: asset.mimeType || undefined,
                }),
            ).unwrap();

            await dispatch(
                addRecruitmentCandidateDocument({
                    recruitmentId,
                    candidateId,
                    payload: {
                        type,
                        fileUrl: uploaded.url,
                        uploadedBy: userEmail,
                        publicId: uploaded.publicId,
                        assetId: uploaded.assetId,
                        resourceType: uploaded.resourceType,
                    },
                }),
            ).unwrap();
            await dispatch(fetchRecruitmentById(recruitmentId));
            Alert.alert(
                "Document saved",
                "The document was saved to this candidate.",
            );
        } catch (error: any) {
            Alert.alert(
                "Upload failed",
                error?.message || "Unable to upload document",
            );
        }
    };

    const onDeleteDocument = async (doc: {
        _id?: string;
        fileUrl?: string;
    }) => {
        if (!canUploadCandidateDocuments(role) || !doc._id) return;

        Alert.alert(
            "Delete document",
            "Are you sure you want to delete this uploaded document?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await dispatch(
                                deleteRecruitmentCandidateDocument({
                                    recruitmentId,
                                    candidateId,
                                    documentId: doc._id!,
                                }),
                            ).unwrap();
                            await dispatch(fetchRecruitmentById(recruitmentId));
                        } catch (error: any) {
                            Alert.alert(
                                "Delete failed",
                                error?.message || "Unable to delete document",
                            );
                        }
                    },
                },
            ],
        );
    };

    const onDownloadDocument = async (doc: {
        fileUrl?: string;
        type?: string;
    }) => {
        if (!doc.fileUrl) {
            Alert.alert("No document", "This document has no file URL.");
            return;
        }

        try {
            if (Platform.OS === "web") {
                await Linking.openURL(doc.fileUrl);
                return;
            }

            const baseDir =
                FileSystem.cacheDirectory || FileSystem.documentDirectory;
            if (!baseDir) {
                throw new Error(
                    "No local storage directory available for download",
                );
            }

            const filename = getDocumentFilename(doc);
            const destination = `${baseDir}${Date.now()}-${filename}`;
            const result = await FileSystem.downloadAsync(
                doc.fileUrl,
                destination,
            );

            if (result.status < 200 || result.status >= 300) {
                throw new Error("Failed to download document");
            }

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(result.uri, {
                    dialogTitle: `Download ${filename}`,
                });
            } else {
                Alert.alert("Downloaded", `File saved to: ${result.uri}`);
            }
        } catch (error: any) {
            Alert.alert(
                "Download failed",
                error?.message || "Unable to download document",
            );
        }
    };

    const onAddNote = async () => {
        if (!canAddCandidateNotes(role) || !note.trim()) return;
        try {
            await dispatch(
                addRecruitmentCandidateNote({
                    recruitmentId,
                    candidateId,
                    payload: {
                        note: note.trim(),
                        createdBy: userEmail,
                    },
                }),
            ).unwrap();
            setNote("");
            await dispatch(fetchRecruitmentById(recruitmentId));
        } catch (error: any) {
            Alert.alert("Error", error?.message || "Failed to add note");
        }
    };

    const openStatusPicker = (fieldName: string, options: string[]) => {
        setActiveStatusField(fieldName);
        setPickerOptions(options);
        setShowStatusModal(true);
    };

    const handleStatusSelect = (value: string | number) => {
        if (!activeStatusField || !canUpdateCandidateProgress(role)) return;
        setShowStatusModal(false);
        setWorkflowDraft((prev) => ({
            ...prev,
            [activeStatusField]: String(value),
        }));
        setActiveStatusField(null);
        setPickerOptions([]);
    };

    const openDatePicker = (fieldName: string) => {
        const currentValue =
            (workflowDraft[fieldName] as string | undefined) || "";
        const parsed = new Date(currentValue);
        setActiveDateField(fieldName);
        setPickerDate(Number.isNaN(parsed.getTime()) ? new Date() : parsed);
        setShowDatePicker(true);
    };

    const handleDateSave = (date: Date) => {
        if (!activeDateField || !canUpdateCandidateProgress(role)) return;
        setShowDatePicker(false);
        setWorkflowDraft((prev) => ({
            ...prev,
            [activeDateField]: formatYMD(date),
        }));
        setActiveDateField(null);
    };

    const hasWorkflowChanges = useMemo(() => {
        const currentProgress = JSON.stringify(candidate?.progress || {});
        const draftProgress = JSON.stringify(workflowDraft || {});
        const currentStage =
            candidate?.overallStatus || candidate?.currentStage || "New";
        return (
            currentProgress !== draftProgress || workflowStage !== currentStage
        );
    }, [
        candidate?.progress,
        candidate?.overallStatus,
        candidate?.currentStage,
        workflowDraft,
        workflowStage,
    ]);

    const onSaveWorkflow = async () => {
        if (!canUpdateCandidateProgress(role)) return;
        if (!hasWorkflowChanges) return;

        setIsSavingWorkflow(true);
        try {
            await dispatch(
                updateRecruitmentCandidate({
                    recruitmentId,
                    candidateId,
                    payload: {
                        overallStatus: workflowStage,
                        currentStage: workflowStage,
                        progress: workflowDraft,
                    },
                }),
            ).unwrap();
            await dispatch(fetchRecruitmentById(recruitmentId));
            Alert.alert("Saved", "Workflow changes saved successfully.");
        } catch (error: any) {
            Alert.alert(
                "Save failed",
                error?.message || "Unable to save workflow changes",
            );
        } finally {
            setIsSavingWorkflow(false);
        }
    };

    const selectedStatusValue = activeStatusField
        ? (workflowDraft?.[activeStatusField] as string | undefined)
        : undefined;

    const dropdownPickerOptions = pickerOptions.map((option) => ({
        label: option,
        value: option,
    }));

    if (!candidate) {
        return (
            <SafeAreaView
                edges={
                    isIOS
                        ? ["left", "right"]
                        : ["top", "left", "right", "bottom"]
                }
                className="flex-1 bg-white"
            >
                <PlatformAdaptiveHeader title="Candidate Details" />
                <View className="flex-1 items-center justify-center px-4">
                    <Text className="text-gray-600">Candidate not found</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView
            edges={
                isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]
            }
            className="flex-1 bg-white"
        >
            <PlatformAdaptiveHeader
                title="Candidate Details"
                headerRight={({ tintColor }) =>
                    canAddCandidate(role) ? (
                        <Pressable
                            onPress={() =>
                                router.push({
                                    pathname:
                                        "/(admin)/recruitment/[id]/candidate/create",
                                    params: {
                                        id: recruitmentId,
                                        candidateId,
                                    },
                                })
                            }
                            className="h-10 w-10 items-center justify-center rounded-full"
                            hitSlop={8}
                        >
                            <Pencil size={22} color={tintColor} />
                        </Pressable>
                    ) : null
                }
            />
            <OptionSheet
                visible={showStatusModal}
                title="Select an option"
                options={dropdownPickerOptions}
                selectedValue={selectedStatusValue}
                onClose={() => {
                    setShowStatusModal(false);
                    setActiveStatusField(null);
                    setPickerOptions([]);
                }}
                onSelect={handleStatusSelect}
            />
            <ScrollView className="flex-1 px-3 pb-8 mt-3">
                <View className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-3 gap-2">
                    <Text className="text-xl font-kumbhBold text-gray-900">
                        {candidate.fullName}
                    </Text>
                    <View className="gap-1.5">
                        <Text className="text-gray-600">
                            Email: {candidate.email || "No email"}
                        </Text>
                        <Text className="text-gray-600">
                            Phone: {candidate.phone || "—"}
                        </Text>
                        <Text className="text-gray-600">
                            Location: {candidate.location || "—"}
                        </Text>
                        <Text className="text-gray-600">
                            Age: {candidate.age || "—"}
                        </Text>
                        <Text className="text-gray-600">
                            Years of Experience:{" "}
                            {candidate.yearsExperience || "—"}
                        </Text>
                    </View>
                </View>

                <View className="mb-4 rounded-xl border border-gray-200 p-3">
                    <Text className="text-lg font-kumbhBold text-gray-900">
                        Current Stage
                    </Text>
                    <Text className="mb-3 mt-1 text-sm text-gray-600">
                        Choose the candidate's overall stage in the hiring
                        pipeline. This is the main status shown in the
                        candidates list.
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                        {overallStageOptions.map((status) => (
                            <Pressable
                                key={status}
                                onPress={() => setWorkflowStage(status)}
                                className={`rounded-full px-3 py-1.5 ${
                                    workflowStage === status
                                        ? "bg-[#4C5FAB]"
                                        : "bg-gray-100"
                                }`}
                            >
                                <Text
                                    className={`text-sm ${
                                        workflowStage === status
                                            ? "text-white"
                                            : "text-gray-700"
                                    }`}
                                >
                                    {status}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                </View>

                <View className="mb-4 rounded-xl border border-gray-200 p-3">
                    <Text className="text-lg font-kumbhBold text-gray-900">
                        Recruitment Workflow
                    </Text>
                    <Text className="mb-3 mt-1 text-sm text-gray-600">
                        Track the candidate through each hiring step. Open a
                        section to log updates, dates, responses, or notes for
                        that stage. Changes are only saved when you tap Save
                        Workflow.
                    </Text>
                    {sections.map((section) => {
                        const isOpen = openSection === section;
                        return (
                            <View
                                key={section}
                                className="mb-2 overflow-hidden rounded-lg border border-gray-100"
                            >
                                <Pressable
                                    onPress={() =>
                                        setOpenSection(isOpen ? null : section)
                                    }
                                    className="flex-row items-center justify-between bg-gray-50 px-3 py-3"
                                >
                                    <Text className="font-kumbhBold text-gray-800">
                                        {section}
                                    </Text>
                                    {isOpen ? (
                                        <ChevronUp size={16} color="#6B7280" />
                                    ) : (
                                        <ChevronDown
                                            size={16}
                                            color="#6B7280"
                                        />
                                    )}
                                </Pressable>
                                {isOpen ? (
                                    <View className="bg-white px-3 py-3">
                                        {section === "Initial Contact" ? (
                                            <>
                                                <Text className="mb-2 text-xs text-gray-500">
                                                    Status
                                                </Text>
                                                <Pressable
                                                    onPress={() =>
                                                        openStatusPicker(
                                                            "contactStatus",
                                                            initialContactStatusOptions,
                                                        )
                                                    }
                                                    className="flex-row items-center justify-between rounded-lg bg-gray-100 px-3 py-3"
                                                >
                                                    <Text
                                                        className={`text-sm ${workflowDraft.contactStatus ? "text-gray-900" : "text-gray-400"}`}
                                                    >
                                                        {workflowDraft.contactStatus ||
                                                            "Select status"}
                                                    </Text>
                                                    <ChevronDown
                                                        size={16}
                                                        color="#6B7280"
                                                    />
                                                </Pressable>
                                                <Text className="mb-2 mt-3 text-xs text-gray-500">
                                                    Notes
                                                </Text>
                                                <TextInput
                                                    className="min-h-[80px] rounded-lg bg-gray-100 px-3 py-2"
                                                    multiline
                                                    value={
                                                        workflowDraft.contactNotes ||
                                                        ""
                                                    }
                                                    onChangeText={(text) =>
                                                        setWorkflowDraft(
                                                            (prev) => ({
                                                                ...prev,
                                                                contactNotes:
                                                                    text,
                                                            }),
                                                        )
                                                    }
                                                />
                                            </>
                                        ) : null}

                                        {section === "Virtual Interview 1" ? (
                                            <>
                                                <Text className="mb-2 text-xs text-gray-500">
                                                    Invitation Date
                                                </Text>
                                                <Pressable
                                                    onPress={() =>
                                                        openDatePicker(
                                                            "interview1InviteDate",
                                                        )
                                                    }
                                                    className="flex-row items-center justify-between rounded-lg bg-gray-100 px-3 py-3"
                                                >
                                                    <Text
                                                        className={`text-sm ${workflowDraft.interview1InviteDate ? "text-gray-900" : "text-gray-400"}`}
                                                    >
                                                        {workflowDraft.interview1InviteDate ||
                                                            "Select date"}
                                                    </Text>
                                                    <Calendar
                                                        size={16}
                                                        color="#4C5FAB"
                                                    />
                                                </Pressable>
                                                <Text className="mb-2 mt-3 text-xs text-gray-500">
                                                    Candidate Response
                                                </Text>
                                                <Pressable
                                                    onPress={() =>
                                                        openStatusPicker(
                                                            "interview1Response",
                                                            interviewResponseOptions,
                                                        )
                                                    }
                                                    className="flex-row items-center justify-between rounded-lg bg-gray-100 px-3 py-3"
                                                >
                                                    <Text
                                                        className={`text-sm ${workflowDraft.interview1Response ? "text-gray-900" : "text-gray-400"}`}
                                                    >
                                                        {workflowDraft.interview1Response ||
                                                            "Select status"}
                                                    </Text>
                                                    <ChevronDown
                                                        size={16}
                                                        color="#6B7280"
                                                    />
                                                </Pressable>
                                                <Text className="mb-2 mt-3 text-xs text-gray-500">
                                                    Interview Status
                                                </Text>
                                                <Pressable
                                                    onPress={() =>
                                                        openStatusPicker(
                                                            "interview1Status",
                                                            interviewStatusOptions,
                                                        )
                                                    }
                                                    className="flex-row items-center justify-between rounded-lg bg-gray-100 px-3 py-3"
                                                >
                                                    <Text
                                                        className={`text-sm ${workflowDraft.interview1Status ? "text-gray-900" : "text-gray-400"}`}
                                                    >
                                                        {workflowDraft.interview1Status ||
                                                            "Select status"}
                                                    </Text>
                                                    <ChevronDown
                                                        size={16}
                                                        color="#6B7280"
                                                    />
                                                </Pressable>
                                            </>
                                        ) : null}

                                        {section === "Virtual Interview 2" ? (
                                            <>
                                                <Text className="mb-2 text-xs text-gray-500">
                                                    Invitation Date
                                                </Text>
                                                <Pressable
                                                    onPress={() =>
                                                        openDatePicker(
                                                            "interview2InviteDate",
                                                        )
                                                    }
                                                    className="flex-row items-center justify-between rounded-lg bg-gray-100 px-3 py-3"
                                                >
                                                    <Text
                                                        className={`text-sm ${workflowDraft.interview2InviteDate ? "text-gray-900" : "text-gray-400"}`}
                                                    >
                                                        {workflowDraft.interview2InviteDate ||
                                                            "Select date"}
                                                    </Text>
                                                    <Calendar
                                                        size={16}
                                                        color="#4C5FAB"
                                                    />
                                                </Pressable>
                                                <Text className="mb-2 mt-3 text-xs text-gray-500">
                                                    Candidate Response
                                                </Text>
                                                <Pressable
                                                    onPress={() =>
                                                        openStatusPicker(
                                                            "interview2Response",
                                                            interviewResponseOptions,
                                                        )
                                                    }
                                                    className="flex-row items-center justify-between rounded-lg bg-gray-100 px-3 py-3"
                                                >
                                                    <Text
                                                        className={`text-sm ${workflowDraft.interview2Response ? "text-gray-900" : "text-gray-400"}`}
                                                    >
                                                        {workflowDraft.interview2Response ||
                                                            "Select status"}
                                                    </Text>
                                                    <ChevronDown
                                                        size={16}
                                                        color="#6B7280"
                                                    />
                                                </Pressable>
                                                <Text className="mb-2 mt-3 text-xs text-gray-500">
                                                    Interview Status
                                                </Text>
                                                <Pressable
                                                    onPress={() =>
                                                        openStatusPicker(
                                                            "interview2Status",
                                                            interviewStatusOptions,
                                                        )
                                                    }
                                                    className="flex-row items-center justify-between rounded-lg bg-gray-100 px-3 py-3"
                                                >
                                                    <Text
                                                        className={`text-sm ${workflowDraft.interview2Status ? "text-gray-900" : "text-gray-400"}`}
                                                    >
                                                        {workflowDraft.interview2Status ||
                                                            "Select status"}
                                                    </Text>
                                                    <ChevronDown
                                                        size={16}
                                                        color="#6B7280"
                                                    />
                                                </Pressable>
                                            </>
                                        ) : null}

                                        {section === "Physical Interview" ? (
                                            <>
                                                <Text className="mb-2 text-xs text-gray-500">
                                                    Interview Date
                                                </Text>
                                                <Pressable
                                                    onPress={() =>
                                                        openDatePicker(
                                                            "physicalInterviewDate",
                                                        )
                                                    }
                                                    className="flex-row items-center justify-between rounded-lg bg-gray-100 px-3 py-3"
                                                >
                                                    <Text
                                                        className={`text-sm ${workflowDraft.physicalInterviewDate ? "text-gray-900" : "text-gray-400"}`}
                                                    >
                                                        {workflowDraft.physicalInterviewDate ||
                                                            "Select date"}
                                                    </Text>
                                                    <Calendar
                                                        size={16}
                                                        color="#4C5FAB"
                                                    />
                                                </Pressable>
                                                <Text className="mb-2 mt-3 text-xs text-gray-500">
                                                    Candidate Response
                                                </Text>
                                                <Pressable
                                                    onPress={() =>
                                                        openStatusPicker(
                                                            "physicalInterviewResponse",
                                                            interviewResponseOptions,
                                                        )
                                                    }
                                                    className="flex-row items-center justify-between rounded-lg bg-gray-100 px-3 py-3"
                                                >
                                                    <Text
                                                        className={`text-sm ${workflowDraft.physicalInterviewResponse ? "text-gray-900" : "text-gray-400"}`}
                                                    >
                                                        {workflowDraft.physicalInterviewResponse ||
                                                            "Select status"}
                                                    </Text>
                                                    <ChevronDown
                                                        size={16}
                                                        color="#6B7280"
                                                    />
                                                </Pressable>
                                                <Text className="mb-2 mt-3 text-xs text-gray-500">
                                                    Interview Status
                                                </Text>
                                                <Pressable
                                                    onPress={() =>
                                                        openStatusPicker(
                                                            "physicalInterviewStatus",
                                                            interviewStatusOptions,
                                                        )
                                                    }
                                                    className="flex-row items-center justify-between rounded-lg bg-gray-100 px-3 py-3"
                                                >
                                                    <Text
                                                        className={`text-sm ${workflowDraft.physicalInterviewStatus ? "text-gray-900" : "text-gray-400"}`}
                                                    >
                                                        {workflowDraft.physicalInterviewStatus ||
                                                            "Select status"}
                                                    </Text>
                                                    <ChevronDown
                                                        size={16}
                                                        color="#6B7280"
                                                    />
                                                </Pressable>
                                            </>
                                        ) : null}

                                        {section === "Salary Negotiation" ? (
                                            <>
                                                <Text className="mb-2 text-xs text-gray-500">
                                                    Candidate Salary Expectation
                                                </Text>
                                                <TextInput
                                                    className="rounded-lg bg-gray-100 px-3 py-2"
                                                    value={
                                                        workflowDraft.salaryExpectation ||
                                                        ""
                                                    }
                                                    onChangeText={(text) =>
                                                        setWorkflowDraft(
                                                            (prev) => ({
                                                                ...prev,
                                                                salaryExpectation:
                                                                    text,
                                                            }),
                                                        )
                                                    }
                                                />
                                                <Text className="mb-2 mt-3 text-xs text-gray-500">
                                                    Company Offer
                                                </Text>
                                                <TextInput
                                                    className="rounded-lg bg-gray-100 px-3 py-2"
                                                    value={
                                                        workflowDraft.companyOffer ||
                                                        ""
                                                    }
                                                    onChangeText={(text) =>
                                                        setWorkflowDraft(
                                                            (prev) => ({
                                                                ...prev,
                                                                companyOffer:
                                                                    text,
                                                            }),
                                                        )
                                                    }
                                                />
                                                <Text className="mb-2 mt-3 text-xs text-gray-500">
                                                    Final Agreed Salary
                                                </Text>
                                                <TextInput
                                                    className="rounded-lg bg-gray-100 px-3 py-2"
                                                    value={
                                                        workflowDraft.agreedSalary ||
                                                        ""
                                                    }
                                                    onChangeText={(text) =>
                                                        setWorkflowDraft(
                                                            (prev) => ({
                                                                ...prev,
                                                                agreedSalary:
                                                                    text,
                                                            }),
                                                        )
                                                    }
                                                />
                                                <Text className="mb-2 mt-3 text-xs text-gray-500">
                                                    Status
                                                </Text>
                                                <Pressable
                                                    onPress={() =>
                                                        openStatusPicker(
                                                            "salaryStatus",
                                                            salaryStatusOptions,
                                                        )
                                                    }
                                                    className="flex-row items-center justify-between rounded-lg bg-gray-100 px-3 py-3"
                                                >
                                                    <Text
                                                        className={`text-sm ${workflowDraft.salaryStatus ? "text-gray-900" : "text-gray-400"}`}
                                                    >
                                                        {workflowDraft.salaryStatus ||
                                                            "Select status"}
                                                    </Text>
                                                    <ChevronDown
                                                        size={16}
                                                        color="#6B7280"
                                                    />
                                                </Pressable>
                                            </>
                                        ) : null}

                                        {section === "Employment" ? (
                                            <>
                                                <Text className="mb-2 text-xs text-gray-500">
                                                    Employment Status
                                                </Text>
                                                <Pressable
                                                    onPress={() =>
                                                        openStatusPicker(
                                                            "employmentStatus",
                                                            employmentStatusOptions,
                                                        )
                                                    }
                                                    className="flex-row items-center justify-between rounded-lg bg-gray-100 px-3 py-3"
                                                >
                                                    <Text
                                                        className={`text-sm ${workflowDraft.employmentStatus ? "text-gray-900" : "text-gray-400"}`}
                                                    >
                                                        {workflowDraft.employmentStatus ||
                                                            "Select status"}
                                                    </Text>
                                                    <ChevronDown
                                                        size={16}
                                                        color="#6B7280"
                                                    />
                                                </Pressable>
                                                <Text className="mb-2 mt-3 text-xs text-gray-500">
                                                    Start Date
                                                </Text>
                                                <Pressable
                                                    onPress={() =>
                                                        openDatePicker(
                                                            "employmentStartDate",
                                                        )
                                                    }
                                                    className="flex-row items-center justify-between rounded-lg bg-gray-100 px-3 py-3"
                                                >
                                                    <Text
                                                        className={`text-sm ${workflowDraft.employmentStartDate ? "text-gray-900" : "text-gray-400"}`}
                                                    >
                                                        {workflowDraft.employmentStartDate ||
                                                            "Select date"}
                                                    </Text>
                                                    <Calendar
                                                        size={16}
                                                        color="#4C5FAB"
                                                    />
                                                </Pressable>
                                                <Text className="mb-2 mt-3 text-xs text-gray-500">
                                                    Notes
                                                </Text>
                                                <TextInput
                                                    className="min-h-[80px] rounded-lg bg-gray-100 px-3 py-2"
                                                    multiline
                                                    value={
                                                        workflowDraft.employmentNotes ||
                                                        ""
                                                    }
                                                    onChangeText={(text) =>
                                                        setWorkflowDraft(
                                                            (prev) => ({
                                                                ...prev,
                                                                employmentNotes:
                                                                    text,
                                                            }),
                                                        )
                                                    }
                                                />
                                            </>
                                        ) : null}
                                    </View>
                                ) : null}
                            </View>
                        );
                    })}
                    {canUpdateCandidateProgress(role) ? (
                        <Pressable
                            onPress={onSaveWorkflow}
                            disabled={!hasWorkflowChanges || isSavingWorkflow}
                            className={`mt-2 rounded-lg p-3 ${
                                !hasWorkflowChanges || isSavingWorkflow
                                    ? "bg-gray-300"
                                    : "bg-[#4C5FAB]"
                            }`}
                        >
                            <Text className="text-center font-kumbhBold text-white">
                                {isSavingWorkflow
                                    ? "Saving Workflow..."
                                    : "Save Workflow"}
                            </Text>
                        </Pressable>
                    ) : null}
                </View>

                <View className="mb-4 rounded-xl border border-gray-200 px-3 py-2">
                    <Text className="mb-1 text-lg font-kumbhBold text-gray-900">
                        Notes
                    </Text>
                    {canAddCandidateNotes(role) ? (
                        <>
                            <TextInput
                                className="min-h-[90px] rounded-lg bg-gray-100 px-3 py-2"
                                multiline
                                value={note}
                                onChangeText={setNote}
                                placeholder="Add note"
                            />
                            <Pressable
                                onPress={onAddNote}
                                className="mt-3 rounded-lg bg-[#4C5FAB] p-3"
                            >
                                <Text className="text-center font-kumbhBold text-white">
                                    Add Note
                                </Text>
                            </Pressable>
                        </>
                    ) : null}
                    <View className="mt-3 gap-2">
                        {(candidate.notes || []).map((entry) => (
                            <View
                                key={
                                    entry._id ||
                                    `${entry.createdAt}-${entry.note}`
                                }
                                className="rounded-lg border border-gray-100 bg-gray-50 p-3"
                            >
                                <Text className="text-xs text-gray-500">
                                    {entry.createdBy || "Unknown"} •{" "}
                                    {entry.createdAt
                                        ? new Date(
                                              entry.createdAt,
                                          ).toLocaleString()
                                        : ""}
                                </Text>
                                <Text className="mt-1 text-sm text-gray-800">
                                    {entry.note}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>

                <View className="mb-4 rounded-xl border border-gray-200 p-3">
                    <Text className="mb-3 text-lg font-kumbhBold text-gray-900">
                        Documents
                    </Text>
                    <View className="mb-3 flex-row flex-wrap gap-2">
                        {docTypes.map((type) => (
                            <Pressable
                                key={type}
                                onPress={() => onUploadDocument(type)}
                                className="flex-row items-center rounded-full bg-gray-100 px-3 py-2"
                            >
                                <Upload size={14} color="#4C5FAB" />
                                <Text className="ml-1 text-xs text-gray-700">
                                    Upload {type}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                    <View className="gap-2">
                        {(candidate.documents || []).map((doc) => (
                            <View
                                key={
                                    doc._id ||
                                    `${doc.fileUrl}-${doc.uploadedAt}`
                                }
                                className="rounded-xl border border-gray-100 bg-gray-50 p-3"
                            >
                                <View className="flex-row items-start justify-between gap-2">
                                    <View className="flex-1">
                                        <Text className="text-sm font-kumbhBold text-gray-900">
                                            {doc.type || "Document"}
                                        </Text>
                                        <Text
                                            className="mt-1 text-xs text-blue-700"
                                            numberOfLines={1}
                                        >
                                            {doc.fileUrl}
                                        </Text>
                                        <Text className="mt-1 text-xs text-gray-500">
                                            {doc.uploadedBy || "Unknown"} •{" "}
                                            {doc.uploadedAt
                                                ? new Date(
                                                      doc.uploadedAt,
                                                  ).toLocaleString()
                                                : ""}
                                        </Text>
                                    </View>
                                    <View className="flex-row items-center gap-2">
                                        <Pressable
                                            onPress={() =>
                                                onDownloadDocument(doc)
                                            }
                                            className="rounded-lg bg-blue-50 p-2"
                                        >
                                            <Download
                                                size={16}
                                                color="#1D4ED8"
                                            />
                                        </Pressable>
                                        {canUploadCandidateDocuments(role) ? (
                                            <Pressable
                                                onPress={() =>
                                                    onDeleteDocument(doc)
                                                }
                                                className="rounded-lg bg-red-50 p-2"
                                            >
                                                <Trash2
                                                    size={16}
                                                    color="#DC2626"
                                                />
                                            </Pressable>
                                        ) : null}
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                <View className="mb-8 rounded-xl border border-gray-200 p-3">
                    <Text className="mb-1 text-lg font-kumbhBold text-gray-900">
                        Activity Log
                    </Text>
                    <View className="gap-2">
                        {(candidate.activityLog || []).map((entry, index) => {
                            const { timestampLabel, message } =
                                formatActivityLogEntry(entry);

                            return (
                                <View
                                    key={`${entry}-${index}`}
                                    className="rounded-lg bg-gray-50 p-3"
                                >
                                    <Text className="text-xs font-medium text-gray-500">
                                        {timestampLabel}
                                    </Text>
                                    {message ? (
                                        <Text className="mt-1 text-sm text-gray-700">
                                            {message}
                                        </Text>
                                    ) : null}
                                </View>
                            );
                        })}
                        {!candidate.activityLog?.length ? (
                            <Text className="text-sm text-gray-500">
                                No activity yet
                            </Text>
                        ) : null}
                    </View>
                </View>
            </ScrollView>

            <DatePickerModal
                visible={showDatePicker}
                value={pickerDate}
                onCancel={() => {
                    setShowDatePicker(false);
                    setActiveDateField(null);
                }}
                onDone={() => {
                    void handleDateSave(pickerDate);
                }}
                onDateChange={(date: Date) => {
                    setPickerDate(date);
                }}
            />
        </SafeAreaView>
    );
}
