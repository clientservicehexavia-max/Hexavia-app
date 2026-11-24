import DatePickerModal from "@/components/admin/DatePickerModal";
import OptionSheet from "@/components/common/OptionSheet";
import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import CustomTextInput from "@/components/ui/CustomInput";
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
    Clock,
    Download,
    Mail,
    MapPin,
    Pencil,
    Phone,
    Trash2,
    Upload,
    UserRound,
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Linking,
    Platform,
    Pressable,
    ScrollView,
    Text,
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

    const candidateInitials = useMemo(() => {
        const parts = (candidate?.fullName || "")
            .trim()
            .split(/\s+/)
            .filter(Boolean);
        if (parts.length === 0) return "?";
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }, [candidate?.fullName]);

    if (!candidate) {
        return (
            <SafeAreaView
                edges={
                    isIOS
                        ? ["left", "right"]
                        : ["top", "left", "right", "bottom"]
                }
                className="flex-1 bg-[#F5F7FB]"
            >
                <PlatformAdaptiveHeader
                    title="Candidate Details"
                    backgroundColor="#F5F7FB"
                />
                <View className="flex-1 items-center justify-center px-6">
                    <View className="w-full items-center rounded-[24px] border border-gray-100 bg-white p-8">
                        <View className="mb-3 h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF2FF]">
                            <UserRound size={22} color="#4C5FAB" />
                        </View>
                        <Text className="text-base font-kumbhBold text-[#111827]">
                            Candidate not found
                        </Text>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView
            edges={
                isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]
            }
            className="flex-1 bg-[#F5F7FB]"
        >
            <PlatformAdaptiveHeader
                title="Candidate Details"
                backgroundColor="#F5F7FB"
                headerRight={() =>
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
                            className="h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white"
                            hitSlop={8}
                        >
                            <Pencil size={18} color="#4C5FAB" />
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
            <ScrollView
                className="flex-1"
                contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingTop: 12,
                    paddingBottom: 36,
                }}
                showsVerticalScrollIndicator={false}
            >
                <View className="mb-4 rounded-[28px] border border-gray-100 bg-white p-5">
                    <View className="flex-row items-center justify-between gap-3">
                        <View className="flex-1 flex-row items-center">
                            <View className="mr-3.5 h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF2FF]">
                                <Text className="text-base font-kumbhBold text-[#4C5FAB]">
                                    {candidateInitials}
                                </Text>
                            </View>
                            <View className="flex-1">
                                <Text
                                    className="text-xl font-kumbhBold text-[#111827]"
                                    numberOfLines={2}
                                >
                                    {candidate.fullName}
                                </Text>
                                {candidate.recruiter ? (
                                    <Text className="mt-0.5 text-xs font-kumbh text-[#6B7280]">
                                        Recruiter: {candidate.recruiter}
                                    </Text>
                                ) : null}
                            </View>
                        </View>
                        <View className="rounded-full bg-[#EEF2FF] px-3 py-1.5">
                            <Text className="text-xs font-kumbhBold text-[#4C5FAB]">
                                {workflowStage}
                            </Text>
                        </View>
                    </View>

                    <View className="mt-4 gap-2.5 rounded-2xl bg-[#F5F7FB] p-4">
                        <View className="flex-row items-center justify-between gap-3">
                            <View className="flex-row items-center gap-2">
                                <Mail size={14} color="#6B7280" />
                                <Text className="text-xs font-kumbh text-[#6B7280]">
                                    Email
                                </Text>
                            </View>
                            <Text
                                className="flex-1 text-right text-xs font-kumbhBold text-[#111827]"
                                numberOfLines={1}
                            >
                                {candidate.email || "No email"}
                            </Text>
                        </View>

                        <View className="flex-row items-center justify-between gap-3">
                            <View className="flex-row items-center gap-2">
                                <Phone size={14} color="#6B7280" />
                                <Text className="text-xs font-kumbh text-[#6B7280]">
                                    Phone
                                </Text>
                            </View>
                            <Text className="text-xs font-kumbhBold text-[#111827]">
                                {candidate.phone || "—"}
                            </Text>
                        </View>

                        <View className="flex-row items-center justify-between gap-3">
                            <View className="flex-row items-center gap-2">
                                <MapPin size={14} color="#6B7280" />
                                <Text className="text-xs font-kumbh text-[#6B7280]">
                                    Location
                                </Text>
                            </View>
                            <Text className="text-xs font-kumbhBold text-[#111827]">
                                {candidate.location || "—"}
                            </Text>
                        </View>

                        <View className="flex-row items-center justify-between gap-3">
                            <View className="flex-row items-center gap-2">
                                <UserRound size={14} color="#6B7280" />
                                <Text className="text-xs font-kumbh text-[#6B7280]">
                                    Age
                                </Text>
                            </View>
                            <Text className="text-xs font-kumbhBold text-[#111827]">
                                {candidate.age || "—"}
                            </Text>
                        </View>

                        <View className="flex-row items-center justify-between gap-3">
                            <View className="flex-row items-center gap-2">
                                <Clock size={14} color="#6B7280" />
                                <Text className="text-xs font-kumbh text-[#6B7280]">
                                    Experience
                                </Text>
                            </View>
                            <Text className="text-xs font-kumbhBold text-[#111827]">
                                {candidate.yearsExperience
                                    ? `${candidate.yearsExperience} yrs`
                                    : "—"}
                            </Text>
                        </View>
                    </View>
                </View>

                <View className="mb-4 rounded-[24px] border border-gray-100 bg-white p-4">
                    <Text className="text-base font-kumbhBold text-[#111827]">
                        Current Stage
                    </Text>
                    <Text className="mb-3 mt-1 text-xs font-kumbh text-[#6B7280]">
                        Choose the candidate's overall stage in the hiring
                        pipeline. This is the main status shown in the
                        candidates list.
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                        {overallStageOptions.map((status) => {
                            const active = workflowStage === status;
                            return (
                                <Pressable
                                    key={status}
                                    onPress={() => setWorkflowStage(status)}
                                    className={`rounded-full border px-3.5 py-2 ${
                                        active
                                            ? "border-[#4C5FAB] bg-[#4C5FAB]"
                                            : "border-gray-200 bg-[#F5F7FB]"
                                    }`}
                                >
                                    <Text
                                        className={`text-xs font-kumbhBold ${
                                            active
                                                ? "text-white"
                                                : "text-[#374151]"
                                        }`}
                                    >
                                        {status}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                </View>

                <View className="mb-4 rounded-[24px] border border-gray-100 bg-white p-4">
                    <Text className="text-base font-kumbhBold text-[#111827]">
                        Recruitment Workflow
                    </Text>
                    <Text className="mb-3 mt-1 text-xs font-kumbh text-[#6B7280]">
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
                                className="mb-2.5 overflow-hidden rounded-2xl border border-gray-200 bg-white"
                            >
                                <Pressable
                                    onPress={() =>
                                        setOpenSection(isOpen ? null : section)
                                    }
                                    className="flex-row items-center justify-between bg-[#F5F7FB] px-4 py-3.5"
                                >
                                    <Text className="text-sm font-kumbhBold text-[#111827]">
                                        {section}
                                    </Text>
                                    {isOpen ? (
                                        <ChevronUp size={16} color="#4C5FAB" />
                                    ) : (
                                        <ChevronDown
                                            size={16}
                                            color="#6B7280"
                                        />
                                    )}
                                </Pressable>
                                {isOpen ? (
                                    <View className="border-t border-gray-100 bg-white p-4">
                                        {section === "Initial Contact" ? (
                                            <>
                                                <Text className="mb-2 text-xs font-kumbhBold text-[#6B7280]">
                                                    Status
                                                </Text>
                                                <Pressable
                                                    onPress={() =>
                                                        openStatusPicker(
                                                            "contactStatus",
                                                            initialContactStatusOptions,
                                                        )
                                                    }
                                                    className="h-12 flex-row items-center justify-between rounded-2xl border border-gray-200 bg-[#F5F7FB] px-4"
                                                >
                                                    <Text
                                                        className={`text-sm font-kumbh ${workflowDraft.contactStatus ? "text-[#111827]" : "text-[#9CA3AF]"}`}
                                                    >
                                                        {workflowDraft.contactStatus ||
                                                            "Select status"}
                                                    </Text>
                                                    <ChevronDown
                                                        size={16}
                                                        color="#6B7280"
                                                    />
                                                </Pressable>
                                                <Text className="mb-2 mt-3 text-xs font-kumbhBold text-[#6B7280]">
                                                    Notes
                                                </Text>
                                                <View className="min-h-[88px] rounded-2xl border border-gray-200 bg-[#F5F7FB] px-4 py-3">
                                                    <CustomTextInput
                                                        className="font-kumbh text-sm text-[#111827]"
                                                        multiline
                                                        textAlignVertical="top"
                                                        placeholder="Initial contact notes"
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
                                                </View>
                                            </>
                                        ) : null}

                                        {section === "Virtual Interview 1" ? (
                                            <>
                                                <Text className="mb-2 text-xs font-kumbhBold text-[#6B7280]">
                                                    Invitation Date
                                                </Text>
                                                <Pressable
                                                    onPress={() =>
                                                        openDatePicker(
                                                            "interview1InviteDate",
                                                        )
                                                    }
                                                    className="h-12 flex-row items-center justify-between rounded-2xl border border-gray-200 bg-[#F5F7FB] px-4"
                                                >
                                                    <Text
                                                        className={`text-sm font-kumbh ${workflowDraft.interview1InviteDate ? "text-[#111827]" : "text-[#9CA3AF]"}`}
                                                    >
                                                        {workflowDraft.interview1InviteDate ||
                                                            "Select date"}
                                                    </Text>
                                                    <Calendar
                                                        size={16}
                                                        color="#4C5FAB"
                                                    />
                                                </Pressable>
                                                <Text className="mb-2 mt-3 text-xs font-kumbhBold text-[#6B7280]">
                                                    Candidate Response
                                                </Text>
                                                <Pressable
                                                    onPress={() =>
                                                        openStatusPicker(
                                                            "interview1Response",
                                                            interviewResponseOptions,
                                                        )
                                                    }
                                                    className="h-12 flex-row items-center justify-between rounded-2xl border border-gray-200 bg-[#F5F7FB] px-4"
                                                >
                                                    <Text
                                                        className={`text-sm font-kumbh ${workflowDraft.interview1Response ? "text-[#111827]" : "text-[#9CA3AF]"}`}
                                                    >
                                                        {workflowDraft.interview1Response ||
                                                            "Select status"}
                                                    </Text>
                                                    <ChevronDown
                                                        size={16}
                                                        color="#6B7280"
                                                    />
                                                </Pressable>
                                                <Text className="mb-2 mt-3 text-xs font-kumbhBold text-[#6B7280]">
                                                    Interview Status
                                                </Text>
                                                <Pressable
                                                    onPress={() =>
                                                        openStatusPicker(
                                                            "interview1Status",
                                                            interviewStatusOptions,
                                                        )
                                                    }
                                                    className="h-12 flex-row items-center justify-between rounded-2xl border border-gray-200 bg-[#F5F7FB] px-4"
                                                >
                                                    <Text
                                                        className={`text-sm font-kumbh ${workflowDraft.interview1Status ? "text-[#111827]" : "text-[#9CA3AF]"}`}
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
                                                <Text className="mb-2 text-xs font-kumbhBold text-[#6B7280]">
                                                    Invitation Date
                                                </Text>
                                                <Pressable
                                                    onPress={() =>
                                                        openDatePicker(
                                                            "interview2InviteDate",
                                                        )
                                                    }
                                                    className="h-12 flex-row items-center justify-between rounded-2xl border border-gray-200 bg-[#F5F7FB] px-4"
                                                >
                                                    <Text
                                                        className={`text-sm font-kumbh ${workflowDraft.interview2InviteDate ? "text-[#111827]" : "text-[#9CA3AF]"}`}
                                                    >
                                                        {workflowDraft.interview2InviteDate ||
                                                            "Select date"}
                                                    </Text>
                                                    <Calendar
                                                        size={16}
                                                        color="#4C5FAB"
                                                    />
                                                </Pressable>
                                                <Text className="mb-2 mt-3 text-xs font-kumbhBold text-[#6B7280]">
                                                    Candidate Response
                                                </Text>
                                                <Pressable
                                                    onPress={() =>
                                                        openStatusPicker(
                                                            "interview2Response",
                                                            interviewResponseOptions,
                                                        )
                                                    }
                                                    className="h-12 flex-row items-center justify-between rounded-2xl border border-gray-200 bg-[#F5F7FB] px-4"
                                                >
                                                    <Text
                                                        className={`text-sm font-kumbh ${workflowDraft.interview2Response ? "text-[#111827]" : "text-[#9CA3AF]"}`}
                                                    >
                                                        {workflowDraft.interview2Response ||
                                                            "Select status"}
                                                    </Text>
                                                    <ChevronDown
                                                        size={16}
                                                        color="#6B7280"
                                                    />
                                                </Pressable>
                                                <Text className="mb-2 mt-3 text-xs font-kumbhBold text-[#6B7280]">
                                                    Interview Status
                                                </Text>
                                                <Pressable
                                                    onPress={() =>
                                                        openStatusPicker(
                                                            "interview2Status",
                                                            interviewStatusOptions,
                                                        )
                                                    }
                                                    className="h-12 flex-row items-center justify-between rounded-2xl border border-gray-200 bg-[#F5F7FB] px-4"
                                                >
                                                    <Text
                                                        className={`text-sm font-kumbh ${workflowDraft.interview2Status ? "text-[#111827]" : "text-[#9CA3AF]"}`}
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
                                                <Text className="mb-2 text-xs font-kumbhBold text-[#6B7280]">
                                                    Interview Date
                                                </Text>
                                                <Pressable
                                                    onPress={() =>
                                                        openDatePicker(
                                                            "physicalInterviewDate",
                                                        )
                                                    }
                                                    className="h-12 flex-row items-center justify-between rounded-2xl border border-gray-200 bg-[#F5F7FB] px-4"
                                                >
                                                    <Text
                                                        className={`text-sm font-kumbh ${workflowDraft.physicalInterviewDate ? "text-[#111827]" : "text-[#9CA3AF]"}`}
                                                    >
                                                        {workflowDraft.physicalInterviewDate ||
                                                            "Select date"}
                                                    </Text>
                                                    <Calendar
                                                        size={16}
                                                        color="#4C5FAB"
                                                    />
                                                </Pressable>
                                                <Text className="mb-2 mt-3 text-xs font-kumbhBold text-[#6B7280]">
                                                    Candidate Response
                                                </Text>
                                                <Pressable
                                                    onPress={() =>
                                                        openStatusPicker(
                                                            "physicalInterviewResponse",
                                                            interviewResponseOptions,
                                                        )
                                                    }
                                                    className="h-12 flex-row items-center justify-between rounded-2xl border border-gray-200 bg-[#F5F7FB] px-4"
                                                >
                                                    <Text
                                                        className={`text-sm font-kumbh ${workflowDraft.physicalInterviewResponse ? "text-[#111827]" : "text-[#9CA3AF]"}`}
                                                    >
                                                        {workflowDraft.physicalInterviewResponse ||
                                                            "Select status"}
                                                    </Text>
                                                    <ChevronDown
                                                        size={16}
                                                        color="#6B7280"
                                                    />
                                                </Pressable>
                                                <Text className="mb-2 mt-3 text-xs font-kumbhBold text-[#6B7280]">
                                                    Interview Status
                                                </Text>
                                                <Pressable
                                                    onPress={() =>
                                                        openStatusPicker(
                                                            "physicalInterviewStatus",
                                                            interviewStatusOptions,
                                                        )
                                                    }
                                                    className="h-12 flex-row items-center justify-between rounded-2xl border border-gray-200 bg-[#F5F7FB] px-4"
                                                >
                                                    <Text
                                                        className={`text-sm font-kumbh ${workflowDraft.physicalInterviewStatus ? "text-[#111827]" : "text-[#9CA3AF]"}`}
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
                                                <Text className="mb-2 text-xs font-kumbhBold text-[#6B7280]">
                                                    Candidate Salary Expectation
                                                </Text>
                                                <View className="h-12 justify-center rounded-2xl border border-gray-200 bg-[#F5F7FB] px-4">
                                                    <CustomTextInput
                                                        className="font-kumbh text-sm text-[#111827]"
                                                        placeholder="Expected salary"
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
                                                </View>
                                                <Text className="mb-2 mt-3 text-xs font-kumbhBold text-[#6B7280]">
                                                    Company Offer
                                                </Text>
                                                <View className="h-12 justify-center rounded-2xl border border-gray-200 bg-[#F5F7FB] px-4">
                                                    <CustomTextInput
                                                        className="font-kumbh text-sm text-[#111827]"
                                                        placeholder="Offered amount"
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
                                                </View>
                                                <Text className="mb-2 mt-3 text-xs font-kumbhBold text-[#6B7280]">
                                                    Final Agreed Salary
                                                </Text>
                                                <View className="h-12 justify-center rounded-2xl border border-gray-200 bg-[#F5F7FB] px-4">
                                                    <CustomTextInput
                                                        className="font-kumbh text-sm text-[#111827]"
                                                        placeholder="Agreed salary"
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
                                                </View>
                                                <Text className="mb-2 mt-3 text-xs font-kumbhBold text-[#6B7280]">
                                                    Status
                                                </Text>
                                                <Pressable
                                                    onPress={() =>
                                                        openStatusPicker(
                                                            "salaryStatus",
                                                            salaryStatusOptions,
                                                        )
                                                    }
                                                    className="h-12 flex-row items-center justify-between rounded-2xl border border-gray-200 bg-[#F5F7FB] px-4"
                                                >
                                                    <Text
                                                        className={`text-sm font-kumbh ${workflowDraft.salaryStatus ? "text-[#111827]" : "text-[#9CA3AF]"}`}
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
                                                <Text className="mb-2 text-xs font-kumbhBold text-[#6B7280]">
                                                    Employment Status
                                                </Text>
                                                <Pressable
                                                    onPress={() =>
                                                        openStatusPicker(
                                                            "employmentStatus",
                                                            employmentStatusOptions,
                                                        )
                                                    }
                                                    className="h-12 flex-row items-center justify-between rounded-2xl border border-gray-200 bg-[#F5F7FB] px-4"
                                                >
                                                    <Text
                                                        className={`text-sm font-kumbh ${workflowDraft.employmentStatus ? "text-[#111827]" : "text-[#9CA3AF]"}`}
                                                    >
                                                        {workflowDraft.employmentStatus ||
                                                            "Select status"}
                                                    </Text>
                                                    <ChevronDown
                                                        size={16}
                                                        color="#6B7280"
                                                    />
                                                </Pressable>
                                                <Text className="mb-2 mt-3 text-xs font-kumbhBold text-[#6B7280]">
                                                    Start Date
                                                </Text>
                                                <Pressable
                                                    onPress={() =>
                                                        openDatePicker(
                                                            "employmentStartDate",
                                                        )
                                                    }
                                                    className="h-12 flex-row items-center justify-between rounded-2xl border border-gray-200 bg-[#F5F7FB] px-4"
                                                >
                                                    <Text
                                                        className={`text-sm font-kumbh ${workflowDraft.employmentStartDate ? "text-[#111827]" : "text-[#9CA3AF]"}`}
                                                    >
                                                        {workflowDraft.employmentStartDate ||
                                                            "Select date"}
                                                    </Text>
                                                    <Calendar
                                                        size={16}
                                                        color="#4C5FAB"
                                                    />
                                                </Pressable>
                                                <Text className="mb-2 mt-3 text-xs font-kumbhBold text-[#6B7280]">
                                                    Notes
                                                </Text>
                                                <View className="min-h-[88px] rounded-2xl border border-gray-200 bg-[#F5F7FB] px-4 py-3">
                                                    <CustomTextInput
                                                        className="font-kumbh text-sm text-[#111827]"
                                                        multiline
                                                        textAlignVertical="top"
                                                        placeholder="Employment notes"
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
                                                </View>
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
                            className={`mt-2 h-12 flex-row items-center justify-center rounded-2xl ${
                                !hasWorkflowChanges || isSavingWorkflow
                                    ? "bg-gray-200"
                                    : "bg-[#4C5FAB]"
                            }`}
                        >
                            {isSavingWorkflow ? (
                                <ActivityIndicator
                                    size="small"
                                    color="#FFFFFF"
                                />
                            ) : (
                                <Text
                                    className={`font-kumbhBold ${
                                        !hasWorkflowChanges
                                            ? "text-[#6B7280]"
                                            : "text-white"
                                    }`}
                                >
                                    Save Workflow
                                </Text>
                            )}
                        </Pressable>
                    ) : null}
                </View>

                <View className="mb-4 rounded-[24px] border border-gray-100 bg-white p-4">
                    <Text className="mb-3 text-base font-kumbhBold text-[#111827]">
                        Notes
                    </Text>
                    {canAddCandidateNotes(role) ? (
                        <>
                            <View className="min-h-[96px] rounded-2xl border border-gray-200 bg-[#F5F7FB] px-4 py-3">
                                <CustomTextInput
                                    className="font-kumbh text-sm text-[#111827]"
                                    multiline
                                    textAlignVertical="top"
                                    value={note}
                                    onChangeText={setNote}
                                    placeholder="Add a note about this candidate..."
                                />
                            </View>
                            <Pressable
                                onPress={onAddNote}
                                className="mt-3 h-12 items-center justify-center rounded-2xl bg-[#4C5FAB]"
                            >
                                <Text className="font-kumbhBold text-white">
                                    Add Note
                                </Text>
                            </Pressable>
                        </>
                    ) : null}
                    <View className="mt-3 gap-2.5">
                        {(candidate.notes || []).map((entry) => (
                            <View
                                key={
                                    entry._id ||
                                    `${entry.createdAt}-${entry.note}`
                                }
                                className="rounded-2xl border border-gray-100 bg-[#F5F7FB] p-3.5"
                            >
                                <Text className="text-[11px] font-kumbh text-[#6B7280]">
                                    {entry.createdBy || "Unknown"} •{" "}
                                    {entry.createdAt
                                        ? new Date(
                                              entry.createdAt,
                                          ).toLocaleString()
                                        : ""}
                                </Text>
                                <Text className="mt-1.5 text-sm font-kumbh text-[#111827]">
                                    {entry.note}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>

                <View className="mb-4 rounded-[24px] border border-gray-100 bg-white p-4">
                    <Text className="mb-3 text-base font-kumbhBold text-[#111827]">
                        Documents
                    </Text>
                    <View className="mb-3 flex-row flex-wrap gap-2">
                        {docTypes.map((type) => (
                            <Pressable
                                key={type}
                                onPress={() => onUploadDocument(type)}
                                className="flex-row items-center rounded-full border border-[#4C5FAB]/20 bg-[#EEF2FF] px-3.5 py-2"
                            >
                                <Upload size={14} color="#4C5FAB" />
                                <Text className="ml-1.5 text-xs font-kumbhBold text-[#4C5FAB]">
                                    Upload {type}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                    <View className="gap-2.5">
                        {(candidate.documents || []).map((doc) => (
                            <View
                                key={
                                    doc._id ||
                                    `${doc.fileUrl}-${doc.uploadedAt}`
                                }
                                className="rounded-2xl border border-gray-100 bg-[#F5F7FB] p-3.5"
                            >
                                <View className="flex-row items-start justify-between gap-2">
                                    <View className="flex-1">
                                        <Text className="text-sm font-kumbhBold text-[#111827]">
                                            {doc.type || "Document"}
                                        </Text>
                                        <Text
                                            className="mt-1 text-xs font-kumbh text-[#4C5FAB]"
                                            numberOfLines={1}
                                        >
                                            {doc.fileUrl}
                                        </Text>
                                        <Text className="mt-1 text-[11px] font-kumbh text-[#6B7280]">
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
                                            className="h-9 w-9 items-center justify-center rounded-xl bg-[#EEF2FF]"
                                        >
                                            <Download
                                                size={16}
                                                color="#4C5FAB"
                                            />
                                        </Pressable>
                                        {canUploadCandidateDocuments(role) ? (
                                            <Pressable
                                                onPress={() =>
                                                    onDeleteDocument(doc)
                                                }
                                                className="h-9 w-9 items-center justify-center rounded-xl bg-red-50"
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

                <View className="mb-4 rounded-[24px] border border-gray-100 bg-white p-4">
                    <Text className="mb-3 text-base font-kumbhBold text-[#111827]">
                        Activity Log
                    </Text>
                    <View className="gap-2.5">
                        {(candidate.activityLog || []).map((entry, index) => {
                            const { timestampLabel, message } =
                                formatActivityLogEntry(entry);

                            return (
                                <View
                                    key={`${entry}-${index}`}
                                    className="rounded-2xl border border-gray-100 bg-[#F5F7FB] p-3.5"
                                >
                                    <Text className="text-[11px] font-kumbhBold text-[#6B7280]">
                                        {timestampLabel}
                                    </Text>
                                    {message ? (
                                        <Text className="mt-1 text-sm font-kumbh text-[#111827]">
                                            {message}
                                        </Text>
                                    ) : null}
                                </View>
                            );
                        })}
                        {!candidate.activityLog?.length ? (
                            <Text className="text-sm font-kumbh text-[#6B7280]">
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
