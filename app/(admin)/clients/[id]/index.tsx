import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import {
    Check,
    ChevronDown,
    ClipboardCheck,
    Pencil,
    Plus,
    Share2,
    Trash2,
} from "lucide-react-native";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
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
import * as XLSX from "xlsx";

import { api } from "@/api/axios";
import DatePickerModal from "@/components/admin/DatePickerModal";
import OptionSheet from "@/components/common/OptionSheet";

import { selectAdminUsers } from "@/redux/admin/admin.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import {
    makeSelectClientById,
    selectClientDetailLoading,
    selectClientMutationLoading,
} from "@/redux/client/client.selectors";
import {
    deleteClient,
    fetchClientById,
    updateClient,
} from "@/redux/client/client.thunks";
import type { Client } from "@/redux/client/client.types";

type AdminUser = {
    _id: string;
    email: string;
    source?:
        | "Lujo heights"
        | "Boing"
        | "Moses Okoh"
        | "TMI"
        | "Private jet"
        | string;
    phoneNumber?: string;
    fullname?: string;
    username?: string;
    role:
        | "client"
        | "staff"
        | "supervisor"
        | "clientservice"
        | "admin"
        | "super-admin";
    isSuspended?: boolean;
    createdAt?: string;
    projectName?: string;
    industry?: string;
    staffSize?: number | string;
    description?: string;
    problems?: string;
    strength?: string;
    opportunities?: string;
    weakness?: string;
    threats?: string;
    engagement?: string;
    deliverables?: string;
    payableAmount?: number;
    status?:
        | "active"
        | "pending"
        | "closed"
        | "current"
        | "completed"
        | "past"
        | "Active";
};

type ApiStatus = "active" | "pending" | "closed";
type BaseUser = AdminUser & { statusApi: ApiStatus };
type ClientNote = NonNullable<Client["notes"]>[number];

const BG_INPUT = "#F7F9FC";
const BORDER = "#E5E7EB";
const PRIMARY = "#4C5FAB";
const DOCUMENT_TYPES: string[] = ["application/pdf"];

const STATUS_OPTIONS: {
    value: ApiStatus;
    label: "Active" | "Pending" | "Closed";
}[] = [
    { value: "active", label: "Active" },
    { value: "pending", label: "Pending" },
    { value: "closed", label: "Closed" },
];

const normalizeApiStatus = (status?: unknown): ApiStatus => {
    const s = String(status ?? "").toLowerCase();
    if (s === "active" || s === "current") return "active";
    if (s === "closed" || s === "completed" || s === "past") {
        return "closed";
    }
    return "pending";
};

const STAFF_SIZE_OPTIONS = [
    { label: "0-5", value: 5 },
    { label: "5-20", value: 20 },
    { label: "20-100", value: 100 },
    { label: "100-150", value: 150 },
    { label: "150+", value: 151 },
];

const SOURCE_OPTIONS = [
    { label: "Lujo heights", value: "Lujo heights" },
    { label: "Boing", value: "Boing" },
    { label: "Moses Okoh", value: "Moses Okoh" },
    { label: "TMI", value: "TMI" },
    { label: "Private jet", value: "Private jet" },
    { label: "Others", value: "Others" },
] as const;

type SourceType = (typeof SOURCE_OPTIONS)[number]["value"] | "";

const normalizeSource = (value?: unknown): SourceType => {
    const trimmed = String(value ?? "").trim();
    if (!trimmed) {
        return "";
    }
    const directMatch = SOURCE_OPTIONS.find(
        (option) =>
            option.value.toLowerCase() === trimmed.toLowerCase() &&
            option.value !== "Others",
    );
    return directMatch ? (directMatch.value as SourceType) : "Others";
};

const normalizeSourceOther = (value?: unknown): string => {
    const trimmed = String(value ?? "").trim();
    if (!trimmed) {
        return "";
    }
    const isKnownSource = SOURCE_OPTIONS.some(
        (option) =>
            option.value !== "Others" &&
            option.value.toLowerCase() === trimmed.toLowerCase(),
    );
    return isKnownSource ? "" : trimmed;
};

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

const toUiLabel = (s?: ApiStatus) =>
    STATUS_OPTIONS.find((x) => x.value === s)?.label ?? "Pending";

function escapeHtml(input?: string | number | null) {
    if (input === null || input === undefined) return "";
    return String(input)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function FieldLabel({ children }: { children: React.ReactNode }) {
    return (
        <Text className="font-kumbh text-[13px] text-[#111827] mb-2">
            {children}
        </Text>
    );
}

function Input({
    value,
    onChangeText,
    placeholder = "—",
    multiline = false,
    keyboardType,
    onBlur,
    onFocus,
}: {
    value?: string | number | null;
    onChangeText: (t: string) => void;
    placeholder?: string;
    multiline?: boolean;
    keyboardType?: React.ComponentProps<typeof TextInput>["keyboardType"];
    onBlur?: () => void;
    onFocus?: () => void;
}) {
    return (
        <TextInput
            value={value == null ? "" : String(value)}
            onChangeText={onChangeText}
            onBlur={onBlur}
            onFocus={onFocus}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            multiline={multiline}
            keyboardType={keyboardType}
            className="rounded-2xl px-4 py-3 font-kumbh text-[#111827]"
            style={{
                backgroundColor: BG_INPUT,
                minHeight: multiline ? 64 : undefined,
            }}
        />
    );
}

function TwoCol({ children }: { children: React.ReactNode }) {
    return (
        <View className="flex-row" style={{ gap: 12 }}>
            {children}
        </View>
    );
}

function PillButton({
    icon,
    label,
    onPress,
    variant = "primary",
    disabled = false,
}: {
    icon: React.ReactNode;
    label: string;
    onPress?: () => void;
    variant?: "primary" | "outline";
    disabled?: boolean;
}) {
    const isPrimary = variant === "primary";
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            className="flex-row items-center justify-center rounded-2xl px-4 py-4"
            style={{
                backgroundColor: isPrimary ? PRIMARY : "transparent",
                borderWidth: isPrimary ? 0 : 1,
                borderColor: isPrimary ? "transparent" : PRIMARY,
                gap: 10,
                opacity: disabled ? 0.5 : 1,
            }}
            android_ripple={disabled ? undefined : { color: "#ffffff20" }}
        >
            <View
                className="w-7 h-7 rounded-full items-center justify-center"
                style={{
                    backgroundColor: isPrimary
                        ? "rgba(255,255,255,0.2)"
                        : "transparent",
                }}
            >
                {icon}
            </View>
            <Text
                className="font-kumbh text-[13px]"
                style={{ color: isPrimary ? "#fff" : PRIMARY }}
            >
                {label}
            </Text>
        </Pressable>
    );
}

function formatMoneyNaira(v?: number) {
    if (typeof v !== "number" || !isFinite(v)) return "₦ 0.00";
    try {
        return (
            "₦ " +
            new Intl.NumberFormat("en-NG", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(v)
        );
    } catch {
        return `₦ ${v.toFixed(2)}`;
    }
}

function moneyToInput(v?: number) {
    if (typeof v !== "number" || !isFinite(v)) return "0.00";
    return v.toFixed(2);
}

function formatGroupedMoneyInput(input: string) {
    const n = parseMoney(input);
    try {
        return new Intl.NumberFormat("en-NG", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(n);
    } catch {
        return n.toFixed(2);
    }
}

function sanitizeMoneyInput(input: string) {
    const cleaned = input.replace(/[^\d.]/g, "");
    const [whole = "", ...rest] = cleaned.split(".");
    if (rest.length === 0) return whole;
    return `${whole}.${rest.join("").slice(0, 2)}`;
}

function parseMoney(input: string): number {
    const cleaned = input.replace(/[^\d.]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
}
function formatDate(d?: string) {
    if (!d) return "—";
    try {
        return new Date(d).toLocaleDateString();
    } catch {
        return d;
    }
}

function toIsoDateInput(d?: string) {
    if (!d) return "";
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "";
    return dt.toISOString().slice(0, 10);
}

function toIsoDateOrUndefined(input?: string) {
    const raw = String(input ?? "").trim();
    if (!raw) return undefined;
    const dt = new Date(raw);
    if (Number.isNaN(dt.getTime())) return undefined;
    return dt.toISOString();
}

function parseDateOrNow(input?: string) {
    const dt = input ? new Date(input) : new Date();
    return Number.isNaN(dt.getTime()) ? new Date() : dt;
}

const INDUSTRY_VALUES = new Set(INDUSTRY_OPTIONS.map((opt) => opt.value));
function resolveIndustrySelection(value?: string) {
    const trimmed = value?.trim() ?? "";
    if (!trimmed) return { selection: "", other: "" };
    if (INDUSTRY_VALUES.has(trimmed) && trimmed !== "Other") {
        return { selection: trimmed, other: "" };
    }
    return { selection: "Other", other: trimmed === "Other" ? "" : trimmed };
}

const extractPublicIdFromUrl = (url?: string) => {
    if (!url) return null;
    try {
        const uploadIndex = url.indexOf("/upload/");
        if (uploadIndex === -1) return null;

        const after = url.substring(uploadIndex + "/upload/".length);
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

export default function ClientDetails() {
    const router = useRouter();
    const isIOS = Platform.OS === "ios";

    const { id } = useLocalSearchParams<{ id: string }>();
    const dispatch = useAppDispatch();

    const users = useAppSelector(selectAdminUsers);

    const selectClient = useMemo(
        () => (id ? makeSelectClientById(String(id)) : () => null),
        [id],
    );
    const clientFromStore = useAppSelector(selectClient) as Client | null;
    const documentLink = clientFromStore?.document;

    const detailLoading = useAppSelector(selectClientDetailLoading);
    const mutationLoading = useAppSelector(selectClientMutationLoading);

    const lastFetchRef = useRef<number>(0);
    useEffect(() => {
        if (!id) return;
        const now = Date.now();
        const STALE_MS = 30_000;
        if (clientFromStore && now - lastFetchRef.current < STALE_MS) return;
        lastFetchRef.current = now;
        dispatch(fetchClientById(String(id)));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch, id]);

    const fallbackUser: BaseUser = {
        _id: String(id ?? "unknown"),
        email: "unknown@example.com",
        phoneNumber: "",
        fullname: "Unknown User",
        username: "unknown",
        role: "client",
        isSuspended: false,
        createdAt: new Date().toISOString(),
        projectName: "Ogba  Milk App",
        source: "",
        industry: "Food",
        staffSize: 12,
        description: "All good",
        problems: "A lot",
        strength: "unknown",
        opportunities: "unknown",
        weakness: "unknown",
        threats: "unknown",
        engagement: "Core Consulting",
        deliverables: "UI Screens",
        payableAmount: 240573.04,
        status: "pending",
        statusApi: "pending",
    };

    const baseUser = useMemo<BaseUser>(() => {
        if (clientFromStore) {
            return {
                _id: clientFromStore._id,
                email: (clientFromStore as any).email ?? "",
                phoneNumber: (clientFromStore as any).phoneNumber ?? "",
                fullname: clientFromStore.name,
                username: clientFromStore.name,
                role: "client",
                isSuspended: false,
                createdAt: clientFromStore.createdAt,
                projectName: clientFromStore.projectName,
                source: String((clientFromStore as any).source ?? ""),
                industry: clientFromStore.industry,
                staffSize: clientFromStore.staffSize,
                description: clientFromStore.description,
                problems: clientFromStore.problems,
                strength: clientFromStore.strength,
                weakness: clientFromStore.weakness,
                opportunities: clientFromStore.opportunities,
                threats: clientFromStore.threats,
                engagement: clientFromStore.engagement,
                deliverables: clientFromStore.deliverables,
                payableAmount: clientFromStore.payableAmount,
                status: normalizeApiStatus(clientFromStore.status),
                statusApi: normalizeApiStatus(clientFromStore.status),
            };
        }
        if (id) {
            const fromAdmin = users.find((u: any) => u._id === id);
            if (fromAdmin) {
                return {
                    ...(fromAdmin as AdminUser),
                    statusApi: normalizeApiStatus(fromAdmin.status),
                } as BaseUser;
            }
        }
        return fallbackUser;
    }, [clientFromStore, users, id]);
    const resolvedIndustry = useMemo(
        () => resolveIndustrySelection(baseUser.industry),
        [baseUser.industry],
    );

    const [name, setName] = useState(
        baseUser.fullname || baseUser.username || baseUser.email || "",
    );
    const [email, setEmail] = useState(baseUser.email ?? "");
    const [phoneNumber, setPhoneNumber] = useState(baseUser.phoneNumber ?? "");

    const [projectName, setProjectName] = useState(baseUser.projectName ?? "");
    const [source, setSource] = useState<SourceType>(
        normalizeSource(baseUser.source),
    );
    const [sourceOther, setSourceOther] = useState(
        normalizeSourceOther(baseUser.source),
    );
    const [industry, setIndustry] = useState(resolvedIndustry.selection);
    const [industryOther, setIndustryOther] = useState(resolvedIndustry.other);
    const [staffSize, setstaffSize] = useState(
        String(baseUser.staffSize ?? ""),
    );
    const [description, setDescription] = useState(baseUser.description ?? "");
    const [problems, setProblems] = useState(baseUser.problems ?? "");
    const [strength, setStrength] = useState(baseUser.strength ?? "");
    const [opportunities, setOpportunities] = useState(
        baseUser.opportunities ?? "",
    );
    const [weakness, setWeakness] = useState(baseUser.weakness ?? "");
    const [threats, setThreats] = useState(baseUser.threats ?? "");
    const [engagement, setEngagement] = useState(baseUser.engagement ?? "");
    const [deliverables, setDeliverables] = useState(
        baseUser.deliverables ?? "",
    );
    const [payable, setPayable] = useState(
        moneyToInput(baseUser.payableAmount),
    );
    const [payableFocused, setPayableFocused] = useState(false);
    const [statusApi, setStatusApi] = useState<ApiStatus>(baseUser.statusApi);
    const [statusOpen, setStatusOpen] = useState(false);
    const [showIndustrySheet, setShowIndustrySheet] = useState(false);
    const [showSourceSheet, setShowSourceSheet] = useState(false);
    const [showStaffSizeSheet, setShowStaffSizeSheet] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [documentName, setDocumentName] = useState("");
    const [documentFile, setDocumentFile] = useState<{
        uri: string;
        name: string;
        type?: string;
    } | null>(null);
    const [uploadingDocument, setUploadingDocument] = useState(false);
    const [documentRemoved, setDocumentRemoved] = useState(false);
    const [showJoinedDatePicker, setShowJoinedDatePicker] = useState(false);
    const [activeTab, setActiveTab] = useState<"details" | "notes">("details");
    const [clientNotes, setClientNotes] = useState<ClientNote[]>(
        clientFromStore?.notes ?? [],
    );
    const [noteTitle, setNoteTitle] = useState("");
    const [noteDescription, setNoteDescription] = useState("");
    const [savingNote, setSavingNote] = useState(false);
    const [exportingNotes, setExportingNotes] = useState(false);
    const [editingNoteIndex, setEditingNoteIndex] = useState<number | null>(
        null,
    );
    const [showNoteModal, setShowNoteModal] = useState(false);
    const effectiveSource =
        source === "Others" ? sourceOther.trim() : source.trim();
    const effectiveIndustry =
        industry === "Other" ? industryOther.trim() : industry.trim();
    const documentLabel =
        documentName ||
        (documentLink ? documentLink.split("/").pop() : undefined) ||
        "No document uploaded";
    const [joined, setJoined] = useState(toIsoDateInput(baseUser.createdAt));
    const [joinedPickerDate, setJoinedPickerDate] = useState<Date>(
        parseDateOrNow(baseUser.createdAt),
    );

    const handleSaveDocument = useCallback(async () => {
        if (!documentLink && !documentFile) return;
        try {
            if (Platform.OS === "web") {
                if (documentLink) {
                    await Linking.openURL(documentLink);
                }
                return;
            }

            const safeName =
                documentName ||
                documentFile?.name ||
                (documentLink
                    ? documentLink.split("/").pop()
                    : "document.pdf") ||
                "document.pdf";
            const filename = safeName.toLowerCase().endsWith(".pdf")
                ? safeName
                : `${safeName}.pdf`;
            const dest = `${FileSystem.cacheDirectory}${filename}`;

            if (documentFile?.uri) {
                await FileSystem.copyAsync({
                    from: documentFile.uri,
                    to: dest,
                });
            } else if (documentLink) {
                await FileSystem.downloadAsync(documentLink, dest);
            }

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(dest, {
                    UTI: "com.adobe.pdf",
                    mimeType: "application/pdf",
                    dialogTitle: "Save document",
                });
            } else {
                Alert.alert(
                    "Sharing unavailable",
                    "Sharing is not available on this device.",
                );
            }
        } catch {
            Alert.alert("Unable to save document", "Please try again.");
        }
    }, [documentFile, documentLink, documentName]);

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
            setDocumentRemoved(false);
        } catch {
            Alert.alert(
                "Upload failed",
                "Unable to attach document. Please try again.",
            );
        } finally {
            setUploadingDocument(false);
        }
    }, [uploadingDocument]);

    const handleDeleteDocument = useCallback(() => {
        if (!id || (!documentLink && !documentFile)) return;

        Alert.alert(
            "Delete Document",
            "Are you sure you want to delete this document? This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            if (documentLink) {
                                const publicId =
                                    extractPublicIdFromUrl(documentLink);
                                if (publicId) {
                                    await api.post("/upload/delete", {
                                        publicId,
                                    });
                                }

                                await dispatch(
                                    updateClient({
                                        id: String(id),
                                        body: {
                                            document: null,
                                            documentUrl: null,
                                        },
                                    }),
                                ).unwrap();
                            }

                            setDocumentFile(null);
                            setDocumentName("");
                            setDocumentRemoved(false);
                            Alert.alert(
                                "Deleted",
                                "Document deleted successfully.",
                            );
                        } catch (err: any) {
                            Alert.alert(
                                "Delete failed",
                                err?.message || "Unable to delete document.",
                            );
                        }
                    },
                },
            ],
        );
    }, [id, documentLink, documentFile, dispatch]);

    const handleShareClientPdf = useCallback(async () => {
        const displayName = name.trim() || baseUser.fullname || "Client";
        const safeProjectName = projectName.trim() || "Untitled Project";
        const payableAmount = parseMoney(payable);
        const generatedAt = new Date();
        const joinedLabel = formatDate(toIsoDateOrUndefined(joined));

        const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Client Detail Report</title>
<style>
  body {
    font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, "Helvetica Neue", Arial, sans-serif;
    background: #eef2ff;
    color: #111827;
    margin: 0;
  }
  .page {
    width: 100%;
    padding: 32px 24px 48px;
  }
  .report-surface {
    max-width: 980px;
    margin: 0 auto;
    background: #fff;
    border-radius: 32px;
    padding: 32px;
    box-shadow: 0 25px 60px rgba(15, 23, 42, 0.15);
  }
  .report-header {
    display: flex;
    justify-content: space-between;
    gap: 24px;
    align-items: flex-start;
  }
  .h1 {
    font-size: 26px;
    margin: 0;
    font-weight: 700;
  }
  .brand-subtitle {
    margin-top: 4px;
    color: #6b7280;
    font-size: 14px;
  }
  .header-chips {
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: flex-end;
  }
  .chip {
    border-radius: 999px;
    padding: 6px 14px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    background: #eef2ff;
    color: #312e81;
  }
  .chip.subtle {
    background: #f3f4f6;
    color: #4b5563;
  }
  .report-meta {
    margin-top: 24px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 12px 20px;
    font-size: 13px;
    color: #475467;
  }
  .stat-grid {
    margin-top: 24px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 14px;
  }
  .stat-card {
    border: 1px solid #e5e7eb;
    border-radius: 20px;
    padding: 16px;
    background: #f9fafb;
  }
  .stat-card .label {
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #6b7280;
  }
  .stat-card .value {
    margin-top: 8px;
    font-size: 22px;
    font-weight: 700;
    color: #111827;
  }
  .section {
    margin-top: 30px;
  }
  .section-heading {
    font-weight: 600;
    font-size: 16px;
    margin-bottom: 12px;
  }
  .table-wrapper {
    border-radius: 18px;
    overflow: hidden;
    border: 1px solid #e5e7eb;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  thead {
    background: #111827;
    color: #fff;
  }
  th {
    padding: 12px;
    text-align: left;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  td {
    padding: 11px 12px;
    border-bottom: 1px solid #e5e7eb;
    color: #1f2937;
    vertical-align: top;
  }
  tbody tr:nth-child(odd) {
    background: #f8fafc;
  }
  .k {
    width: 33%;
    font-weight: 600;
    color: #0f172a;
  }
  .footer {
    margin-top: 32px;
    font-size: 11px;
    color: #6b7280;
    letter-spacing: 0.08em;
    text-align: right;
  }
</style>
</head>
<body>
  <div class="page">
    <div class="report-surface">
      <div class="report-header">
        <div>
          <div class="h1">Client Detail Report</div>
          <div class="brand-subtitle">${escapeHtml(displayName)} • ${escapeHtml(
              safeProjectName,
          )}</div>
        </div>
        <div class="header-chips">
          <div class="chip">HEXAVIA</div>
          <div class="chip subtle">${escapeHtml(toUiLabel(statusApi))}</div>
        </div>
      </div>

                <div class="report-meta">
        <div><strong>Generated:</strong> ${escapeHtml(
            generatedAt.toLocaleDateString(),
        )}</div>
                <div><strong>Joined:</strong> ${escapeHtml(joinedLabel)}</div>
        <div><strong>Email:</strong> ${escapeHtml(email || "—")}</div>
        <div><strong>Phone:</strong> ${escapeHtml(phoneNumber || "—")}</div>
      </div>

      <div class="stat-grid">
        <div class="stat-card">
          <div class="label">Industry</div>
          <div class="value">${escapeHtml(effectiveIndustry || "—")}</div>
        </div>
        <div class="stat-card">
          <div class="label">Staff Size</div>
          <div class="value">${escapeHtml(staffSize || "—")}</div>
        </div>
        <div class="stat-card">
          <div class="label">Payable Amount</div>
          <div class="value">${escapeHtml(formatMoneyNaira(payableAmount))}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-heading">Client Information</div>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr><th>Field</th><th>Value</th></tr>
            </thead>
            <tbody>
              <tr><td class="k">Name</td><td>${escapeHtml(displayName)}</td></tr>
              <tr><td class="k">Project Name</td><td>${escapeHtml(
                  safeProjectName,
              )}</td></tr>
              <tr><td class="k">Status</td><td>${escapeHtml(
                  toUiLabel(statusApi),
              )}</td></tr>
              <tr><td class="k">Industry</td><td>${escapeHtml(
                  effectiveIndustry || "—",
              )}</td></tr>
              <tr><td class="k">Staff Size</td><td>${escapeHtml(
                  staffSize || "—",
              )}</td></tr>
              <tr><td class="k">Description</td><td>${escapeHtml(
                  description || "—",
              )}</td></tr>
              <tr><td class="k">Problems Faced</td><td>${escapeHtml(
                  problems || "—",
              )}</td></tr>
              <tr><td class="k">Strengths</td><td>${escapeHtml(
                  strength || "—",
              )}</td></tr>
              <tr><td class="k">Weakness</td><td>${escapeHtml(
                  weakness || "—",
              )}</td></tr>
              <tr><td class="k">Opportunities</td><td>${escapeHtml(
                  opportunities || "—",
              )}</td></tr>
              <tr><td class="k">Threats</td><td>${escapeHtml(
                  threats || "—",
              )}</td></tr>
              <tr><td class="k">Engagement Offered</td><td>${escapeHtml(
                  engagement || "—",
              )}</td></tr>
              <tr><td class="k">Deliverables</td><td>${escapeHtml(
                  deliverables || "—",
              )}</td></tr>
              <tr><td class="k">Document</td><td>${escapeHtml(
                  documentLink || "No document uploaded",
              )}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="footer">Hexavia • Auto-generated client report</div>
    </div>
  </div>
</body>
</html>`;

        setIsGeneratingPdf(true);
        try {
            if (Platform.OS === "web") {
                await Print.printAsync({ html });
                return;
            }

            const file = await Print.printToFileAsync({ html });
            const canShare = await Sharing.isAvailableAsync();

            if (!canShare) {
                Alert.alert(
                    "Share unavailable",
                    "Sharing is not available on this device.",
                );
                return;
            }

            const dialogTitle = `Client Report - ${displayName}`;
            await Sharing.shareAsync(file.uri, {
                UTI: "com.adobe.pdf",
                mimeType: "application/pdf",
                dialogTitle,
            });
        } catch (err: any) {
            Alert.alert(
                "Share failed",
                err?.message ?? "Unable to generate PDF.",
            );
        } finally {
            setIsGeneratingPdf(false);
        }
    }, [
        baseUser.fullname,
        deliverables,
        description,
        documentLink,
        effectiveIndustry,
        email,
        engagement,
        joined,
        name,
        opportunities,
        payable,
        phoneNumber,
        problems,
        projectName,
        staffSize,
        statusApi,
        strength,
        threats,
        weakness,
    ]);

    const dirty = useMemo(() => {
        const basePay = moneyToInput(baseUser.payableAmount);
        const baseName =
            baseUser.fullname || baseUser.username || baseUser.email || "";
        const baseEmail = baseUser.email ?? "";
        const basePhone = baseUser.phoneNumber ?? "";
        const baseSource = String(baseUser.source ?? "").trim();
        const baseIndustry = (baseUser.industry ?? "").trim();
        const baseJoined = toIsoDateInput(baseUser.createdAt);

        return (
            name !== baseName ||
            email !== baseEmail ||
            phoneNumber !== basePhone ||
            effectiveSource !== baseSource ||
            projectName !== (baseUser.projectName ?? "") ||
            effectiveIndustry !== baseIndustry ||
            staffSize !== String(baseUser.staffSize ?? "") ||
            description !== (baseUser.description ?? "") ||
            problems !== (baseUser.problems ?? "") ||
            strength !== (baseUser.strength ?? "") ||
            weakness !== (baseUser.weakness ?? "") ||
            opportunities !== (baseUser.opportunities ?? "") ||
            threats !== (baseUser.threats ?? "") ||
            engagement !== (baseUser.engagement ?? "") ||
            deliverables !== (baseUser.deliverables ?? "") ||
            payable !== basePay ||
            statusApi !== baseUser.statusApi ||
            joined !== baseJoined ||
            documentRemoved ||
            !!documentFile
        );
    }, [
        baseUser,
        name,
        email,
        phoneNumber,
        effectiveSource,
        projectName,
        effectiveIndustry,
        staffSize,
        description,
        problems,
        strength,
        weakness,
        opportunities,
        threats,
        engagement,
        deliverables,
        payable,
        statusApi,
        joined,
        documentRemoved,
        documentFile,
    ]);

    useEffect(() => {
        setName(baseUser.fullname || baseUser.username || baseUser.email || "");
        setProjectName(baseUser.projectName ?? "");
        setEmail(baseUser.email ?? "");
        setPhoneNumber(baseUser.phoneNumber ?? "");
        setSource(normalizeSource(baseUser.source));
        setSourceOther(normalizeSourceOther(baseUser.source));
        setIndustry(resolvedIndustry.selection);
        setIndustryOther(resolvedIndustry.other);
        setstaffSize(String(baseUser.staffSize ?? ""));
        setDescription(baseUser.description ?? "");
        setProblems(baseUser.problems ?? "");
        setStrength(baseUser.strength ?? "");
        setWeakness(baseUser.weakness ?? "");
        setOpportunities(baseUser.opportunities ?? "");
        setThreats(baseUser.threats ?? "");
        setEngagement(baseUser.engagement ?? "");
        setDeliverables(baseUser.deliverables ?? "");
        setPayable(moneyToInput(baseUser.payableAmount));
        setPayableFocused(false);
        setStatusApi(baseUser.statusApi);
        setJoined(toIsoDateInput(baseUser.createdAt));
        setJoinedPickerDate(parseDateOrNow(baseUser.createdAt));
        setDocumentFile(null);
        setDocumentName("");
        setDocumentRemoved(false);
        setClientNotes(clientFromStore?.notes ?? []);
        setNoteTitle("");
        setNoteDescription("");
        setEditingNoteIndex(null);
        setShowNoteModal(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [baseUser._id]);

    const handleAddNote = useCallback(async () => {
        if (!id) return;
        const title = noteTitle.trim();
        const description = noteDescription.trim();

        if (!title || !description) {
            Alert.alert(
                "Missing fields",
                "Please enter note title and description.",
            );
            return;
        }

        const now = new Date().toISOString();
        const nextNotes: ClientNote[] =
            editingNoteIndex === null
                ? [
                      {
                          title,
                          description,
                          createdAt: now,
                          updatedAt: now,
                      },
                      ...(clientNotes || []),
                  ]
                : (clientNotes || []).map((note, idx) =>
                      idx === editingNoteIndex
                          ? {
                                ...note,
                                title,
                                description,
                                updatedAt: now,
                            }
                          : note,
                  );

        setSavingNote(true);
        try {
            const updated = await dispatch(
                updateClient({
                    id: String(id),
                    body: { notes: nextNotes },
                }),
            ).unwrap();

            setClientNotes((updated as Client).notes ?? nextNotes);
            setNoteTitle("");
            setNoteDescription("");
            setEditingNoteIndex(null);
            setShowNoteModal(false);
        } catch (err: any) {
            Alert.alert(
                "Unable to save note",
                err?.message || "Please try again.",
            );
        } finally {
            setSavingNote(false);
        }
    }, [
        id,
        noteTitle,
        noteDescription,
        clientNotes,
        editingNoteIndex,
        dispatch,
    ]);

    const handleEditNote = useCallback((note: ClientNote, index: number) => {
        setEditingNoteIndex(index);
        setNoteTitle(note.title || "");
        setNoteDescription(note.description || "");
        setShowNoteModal(true);
    }, []);

    const handleDeleteNote = useCallback(
        (index: number) => {
            if (!id) return;

            Alert.alert(
                "Delete Note",
                "Are you sure you want to delete this note?",
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Delete",
                        style: "destructive",
                        onPress: async () => {
                            const nextNotes = (clientNotes || []).filter(
                                (_, idx) => idx !== index,
                            );

                            setSavingNote(true);
                            try {
                                const updated = await dispatch(
                                    updateClient({
                                        id: String(id),
                                        body: { notes: nextNotes },
                                    }),
                                ).unwrap();

                                setClientNotes(
                                    (updated as Client).notes ?? nextNotes,
                                );

                                if (editingNoteIndex === index) {
                                    setEditingNoteIndex(null);
                                    setNoteTitle("");
                                    setNoteDescription("");
                                } else if (
                                    editingNoteIndex !== null &&
                                    editingNoteIndex > index
                                ) {
                                    setEditingNoteIndex(editingNoteIndex - 1);
                                }
                            } catch (err: any) {
                                Alert.alert(
                                    "Unable to delete note",
                                    err?.message || "Please try again.",
                                );
                            } finally {
                                setSavingNote(false);
                            }
                        },
                    },
                ],
            );
        },
        [id, clientNotes, editingNoteIndex, dispatch],
    );

    const handleExportNotes = useCallback(async () => {
        if (!clientNotes.length) {
            Alert.alert("No notes", "Add at least one note before exporting.");
            return;
        }

        setExportingNotes(true);
        try {
            const rows = clientNotes.map((note, idx) => ({
                S_N: idx + 1,
                Title: note.title,
                Description: note.description,
                Created_At: formatDate(note.createdAt),
                Updated_At: formatDate(note.updatedAt),
            }));

            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(rows);
            XLSX.utils.book_append_sheet(workbook, worksheet, "Client Notes");

            const fileName = `client-notes-${String(id)}-${Date.now()}.xlsx`;

            if (Platform.OS === "web") {
                XLSX.writeFile(workbook, fileName);
                return;
            }

            const base64 = XLSX.write(workbook, {
                type: "base64",
                bookType: "xlsx",
            });
            const destination = `${FileSystem.cacheDirectory}${fileName}`;

            await FileSystem.writeAsStringAsync(destination, base64, {
                encoding: FileSystem.EncodingType.Base64,
            });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(destination, {
                    mimeType:
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    UTI: "org.openxmlformats.spreadsheetml.sheet",
                    dialogTitle: "Export Client Notes",
                });
            } else {
                Alert.alert(
                    "Sharing unavailable",
                    "Exported file is ready, but sharing is not supported on this device.",
                );
            }
        } catch (err: any) {
            Alert.alert(
                "Export failed",
                err?.message || "Unable to export notes right now.",
            );
        } finally {
            setExportingNotes(false);
        }
    }, [clientNotes, id]);

    const onSave = async () => {
        if (!id || !dirty) return;

        const toNullableText = (value: string) => {
            const v = value.trim();
            return v.length ? v : null;
        };

        const parsedStaffSize = Number(staffSize);
        const hasStaffSize =
            String(staffSize).trim().length > 0 &&
            Number.isFinite(parsedStaffSize);

        const payableRaw = String(payable ?? "").trim();
        const parsedPayable = payableRaw.length ? parseMoney(payableRaw) : null;

        const body: any = {
            name: toNullableText(name),
            projectName: toNullableText(projectName),
            email: toNullableText(email),
            phoneNumber: toNullableText(phoneNumber),
            source: toNullableText(effectiveSource),
            industry: toNullableText(effectiveIndustry),
            staffSize: hasStaffSize ? parsedStaffSize : null,
            description: toNullableText(description),
            problems: toNullableText(problems),
            strength: toNullableText(strength),
            weakness: toNullableText(weakness),
            opportunities: toNullableText(opportunities),
            threats: toNullableText(threats),
            engagement: toNullableText(engagement),
            deliverables: toNullableText(deliverables),
            payableAmount: parsedPayable,
            status: statusApi,
            createdAt: toIsoDateOrUndefined(joined),
            document: documentRemoved ? null : undefined,
            documentFile: documentRemoved
                ? undefined
                : (documentFile ?? undefined),
        };

        try {
            await dispatch(updateClient({ id: String(id), body })).unwrap();
            // Alert.alert("Saved", "Client info updated successfully.");
            router.back();
        } catch (e: any) {
            Alert.alert("Update failed", e?.message || "Please try again.");
        }
    };

    const saveDisabled = activeTab !== "details" || !dirty || mutationLoading;

    const onDelete = () => {
        if (!id) return;
        Alert.alert(
            "Delete Client",
            "This action cannot be undone. Are you sure you want to delete this client?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await dispatch(deleteClient(String(id))).unwrap();
                            Alert.alert("Deleted", "Client has been removed.");
                            router.back();
                        } catch (e: any) {
                            Alert.alert(
                                "Delete failed",
                                e?.message || "Please try again.",
                            );
                        }
                    },
                },
            ],
        );
    };

    return (
        <SafeAreaView
            edges={
                isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]
            }
            className="flex-1 bg-white"
            // style={{ paddingTop: Platform.select({ ios: 8, android: 0 }) }}
        >
            {/* Header */}
            <PlatformAdaptiveHeader
                title="Client Details"
                headerRight={({ tintColor }) =>
                    activeTab === "notes" ? (
                        <View
                            className="flex-row items-center"
                            style={{ gap: 8 }}
                        >
                            <Pressable
                                onPress={handleExportNotes}
                                disabled={exportingNotes}
                                className="w-10 h-10 rounded-full items-center justify-center"
                                style={{ opacity: exportingNotes ? 0.6 : 1 }}
                            >
                                {exportingNotes ? (
                                    <ActivityIndicator
                                        size="small"
                                        color={tintColor}
                                    />
                                ) : (
                                    <Share2 size={22} color={tintColor} />
                                )}
                            </Pressable>
                            <Pressable
                                onPress={() => {
                                    setEditingNoteIndex(null);
                                    setNoteTitle("");
                                    setNoteDescription("");
                                    setShowNoteModal(true);
                                }}
                                className="w-10 h-10 bg-primary rounded-full items-center justify-center"
                            >
                                <Plus size={28} color="#FFFFFF" />
                            </Pressable>
                        </View>
                    ) : (
                        <Pressable
                            disabled={saveDisabled}
                            onPress={onSave}
                            className="w-10 h-10 rounded-full items-center justify-center"
                        >
                            {mutationLoading ? (
                                <ActivityIndicator
                                    size="small"
                                    color={tintColor}
                                />
                            ) : (
                                <Check
                                    size={28}
                                    color={saveDisabled ? "#9CA3AF" : tintColor}
                                />
                            )}
                        </Pressable>
                    )
                }
            />
            {detailLoading && !clientFromStore ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator />
                    <Text className="mt-2 text-gray-500 font-kumbh">
                        Loading client…
                    </Text>
                </View>
            ) : (
                <>
                    <View className="px-4 mt-2 mb-1">
                        <View
                            className="rounded-2xl p-1 flex-row border"
                            style={{
                                backgroundColor: "#F8FAFC",
                                borderColor: "#E2E8F0",
                            }}
                        >
                            <Pressable
                                onPress={() => setActiveTab("details")}
                                className="flex-1 rounded-xl py-2.5 items-center"
                                style={{
                                    backgroundColor:
                                        activeTab === "details"
                                            ? "#4C5FAB"
                                            : "transparent",
                                }}
                            >
                                <Text
                                    className="font-kumbhBold"
                                    style={{
                                        color:
                                            activeTab === "details"
                                                ? "#FFFFFF"
                                                : "#374151",
                                    }}
                                >
                                    Details
                                </Text>
                            </Pressable>
                            <Pressable
                                onPress={() => setActiveTab("notes")}
                                className="flex-1 rounded-xl py-2.5 items-center"
                                style={{
                                    backgroundColor:
                                        activeTab === "notes"
                                            ? "#4C5FAB"
                                            : "transparent",
                                }}
                            >
                                <Text
                                    className="font-kumbhBold"
                                    style={{
                                        color:
                                            activeTab === "notes"
                                                ? "#FFFFFF"
                                                : "#374151",
                                    }}
                                >
                                    Notes
                                </Text>
                            </Pressable>
                        </View>
                    </View>

                    <KeyboardAvoidingWidget>
                        <ScrollView
                            contentContainerStyle={{
                                paddingBottom: 24,
                                paddingHorizontal: 14,
                            }}
                        >
                            {activeTab === "details" ? (
                                <View className="mt-3">
                                    {/* Name */}
                                    <FieldLabel>Name</FieldLabel>
                                    <Input
                                        value={name}
                                        onChangeText={setName}
                                    />

                                    {/* Project Name */}
                                    <View className="mt-4">
                                        <FieldLabel>Project Name</FieldLabel>
                                        <Input
                                            value={projectName}
                                            onChangeText={setProjectName}
                                        />
                                    </View>

                                    {/* Email */}
                                    <View className="mt-4">
                                        <FieldLabel>Email</FieldLabel>
                                        <Input
                                            value={email}
                                            onChangeText={setEmail}
                                            placeholder="example@domain.com"
                                        />
                                    </View>

                                    {/* Phone Number */}
                                    <View className="mt-4">
                                        <FieldLabel>Phone Number</FieldLabel>
                                        <Input
                                            value={phoneNumber}
                                            onChangeText={setPhoneNumber}
                                            placeholder="080..."
                                            keyboardType="numeric"
                                        />
                                    </View>

                                    {/* Source */}
                                    <View className="mt-4">
                                        <FieldLabel>Source</FieldLabel>
                                        <Pressable
                                            onPress={() =>
                                                setShowSourceSheet(true)
                                            }
                                            className="rounded-2xl px-4 py-3 flex-row items-center justify-between"
                                            style={{
                                                backgroundColor: BG_INPUT,
                                                borderColor: BORDER,
                                            }}
                                        >
                                            <Text className="font-kumbh text-[#111827] capitalize flex-1">
                                                {source || "Select Source"}
                                            </Text>
                                            <ChevronDown
                                                size={18}
                                                color="#111827"
                                            />
                                        </Pressable>
                                    </View>
                                    {source === "Others" ? (
                                        <View className="mt-4">
                                            <FieldLabel>
                                                Other Source
                                            </FieldLabel>
                                            <Input
                                                value={sourceOther}
                                                onChangeText={setSourceOther}
                                                placeholder="Enter Source"
                                            />
                                        </View>
                                    ) : null}

                                    {/* Industry | Staff Size */}
                                    <View className="mt-4">
                                        <TwoCol>
                                            <View style={{ flex: 1 }}>
                                                <FieldLabel>
                                                    Industry
                                                </FieldLabel>
                                                <Pressable
                                                    onPress={() =>
                                                        setShowIndustrySheet(
                                                            true,
                                                        )
                                                    }
                                                    className="rounded-2xl px-4 py-3 flex-row items-center justify-between"
                                                    style={{
                                                        backgroundColor:
                                                            BG_INPUT,
                                                        borderColor: BORDER,
                                                    }}
                                                >
                                                    <Text className="font-kumbh text-[#111827]">
                                                        {industry
                                                            ? industry
                                                            : "Select Industry"}
                                                    </Text>
                                                    <ChevronDown
                                                        size={18}
                                                        color="#111827"
                                                    />
                                                </Pressable>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <FieldLabel>
                                                    Staff Size
                                                </FieldLabel>
                                                <Pressable
                                                    onPress={() =>
                                                        setShowStaffSizeSheet(
                                                            true,
                                                        )
                                                    }
                                                    className="rounded-2xl px-4 py-3 flex-row items-center justify-between"
                                                    style={{
                                                        backgroundColor:
                                                            BG_INPUT,
                                                        borderColor: BORDER,
                                                    }}
                                                >
                                                    <Text className="font-kumbh text-[#111827]">
                                                        {staffSize
                                                            ? (STAFF_SIZE_OPTIONS.find(
                                                                  (opt) =>
                                                                      opt.value ===
                                                                      Number(
                                                                          staffSize,
                                                                      ),
                                                              )?.label ??
                                                              staffSize)
                                                            : "Select Staff Size"}
                                                    </Text>
                                                    <ChevronDown
                                                        size={18}
                                                        color="#111827"
                                                    />
                                                </Pressable>
                                            </View>
                                        </TwoCol>
                                    </View>
                                    {industry === "Other" ? (
                                        <View className="mt-4">
                                            <FieldLabel>
                                                Other Industry
                                            </FieldLabel>
                                            <Input
                                                value={industryOther}
                                                onChangeText={setIndustryOther}
                                                placeholder="Enter industry"
                                            />
                                        </View>
                                    ) : null}

                                    {/* Description */}
                                    <View className="mt-4">
                                        <FieldLabel>Description</FieldLabel>
                                        <Input
                                            value={description}
                                            onChangeText={setDescription}
                                            multiline
                                        />
                                    </View>

                                    {/* Problems Faced */}
                                    <View className="mt-4">
                                        <FieldLabel>Problems Faced</FieldLabel>
                                        <Input
                                            value={problems}
                                            onChangeText={setProblems}
                                            multiline
                                        />
                                    </View>

                                    {/* Strengths */}
                                    <View className="mt-4">
                                        <FieldLabel>Strengths</FieldLabel>
                                        <Input
                                            value={strength}
                                            onChangeText={setStrength}
                                            multiline
                                        />
                                    </View>

                                    {/* Weakness */}
                                    <View className="mt-4">
                                        <FieldLabel>Weakness</FieldLabel>
                                        <Input
                                            value={weakness}
                                            onChangeText={setWeakness}
                                            multiline
                                        />
                                    </View>

                                    {/* Opportunities */}
                                    <View className="mt-4">
                                        <FieldLabel>Opportunities</FieldLabel>
                                        <Input
                                            value={opportunities}
                                            onChangeText={setOpportunities}
                                            multiline
                                        />
                                    </View>

                                    {/* Threats */}
                                    <View className="mt-4">
                                        <FieldLabel>Threats</FieldLabel>
                                        <Input
                                            value={threats}
                                            onChangeText={setThreats}
                                            multiline
                                        />
                                    </View>

                                    {/* Engagement Offered */}
                                    <View className="mt-4">
                                        <FieldLabel>
                                            Engagement Offered
                                        </FieldLabel>
                                        <Input
                                            value={engagement}
                                            onChangeText={setEngagement}
                                        />
                                    </View>

                                    {/* Deliverables */}
                                    <View className="mt-4">
                                        <FieldLabel>Deliverables</FieldLabel>
                                        <Input
                                            value={deliverables}
                                            onChangeText={setDeliverables}
                                        />
                                    </View>

                                    {/* Payable Amount | Status */}
                                    <View className="mt-4">
                                        <TwoCol>
                                            <View style={{ flex: 1 }}>
                                                <FieldLabel>
                                                    Payable Amount
                                                </FieldLabel>
                                                <Input
                                                    value={
                                                        payableFocused
                                                            ? parseMoney(
                                                                  payable,
                                                              )
                                                            : formatGroupedMoneyInput(
                                                                  payable,
                                                              )
                                                    }
                                                    onChangeText={(t) =>
                                                        setPayable(
                                                            sanitizeMoneyInput(
                                                                t,
                                                            ),
                                                        )
                                                    }
                                                    onFocus={() =>
                                                        setPayableFocused(true)
                                                    }
                                                    onBlur={() => {
                                                        setPayable(
                                                            moneyToInput(
                                                                parseMoney(
                                                                    payable,
                                                                ),
                                                            ),
                                                        );
                                                        setPayableFocused(
                                                            false,
                                                        );
                                                    }}
                                                    keyboardType={
                                                        Platform.OS === "ios"
                                                            ? "decimal-pad"
                                                            : "numeric"
                                                    }
                                                />
                                            </View>

                                            <View style={{ flex: 1 }}>
                                                <FieldLabel>Status</FieldLabel>
                                                <Pressable
                                                    onPress={() =>
                                                        setStatusOpen(true)
                                                    }
                                                    className="rounded-2xl px-4 py-3 flex-row items-center justify-between"
                                                    style={{
                                                        backgroundColor:
                                                            BG_INPUT,
                                                        borderColor: BORDER,
                                                    }}
                                                >
                                                    <Text className="font-kumbh text-[#111827]">
                                                        {toUiLabel(statusApi)}
                                                    </Text>
                                                    <ChevronDown
                                                        size={18}
                                                        color="#111827"
                                                    />
                                                </Pressable>
                                            </View>
                                        </TwoCol>
                                    </View>

                                    {/* tiny footer note */}
                                    {/* <View className="items-center mt-3">
                  <Text className="text-[12px] text-[#6B7280] font-kumbh">
                    Generate Invoice
                  </Text>
                </View> */}

                                    {/* Joined (read-only) */}
                                    <View className="mt-6">
                                        <FieldLabel>Joined</FieldLabel>
                                        <Pressable
                                            onPress={() => {
                                                setJoinedPickerDate(
                                                    parseDateOrNow(joined),
                                                );
                                                setShowJoinedDatePicker(true);
                                            }}
                                            className="rounded-2xl px-4 py-3"
                                            style={{
                                                backgroundColor: BG_INPUT,
                                                borderColor: BORDER,
                                            }}
                                        >
                                            <Text className="font-kumbh text-[#111827]">
                                                {formatDate(
                                                    toIsoDateOrUndefined(
                                                        joined,
                                                    ),
                                                )}
                                            </Text>
                                        </Pressable>
                                    </View>

                                    {/* Client Document */}
                                    <View className="mt-6">
                                        <FieldLabel>
                                            Client Document (PDF)
                                        </FieldLabel>
                                        <View
                                            className="rounded-2xl border border-gray-200 p-4"
                                            style={{
                                                backgroundColor: BG_INPUT,
                                            }}
                                        >
                                            <Text className="font-kumbh text-[#111827]">
                                                {documentLabel}
                                            </Text>
                                            <View
                                                className="mt-3 flex-row"
                                                style={{ gap: 10 }}
                                            >
                                                <Pressable
                                                    onPress={handleSaveDocument}
                                                    disabled={
                                                        !documentLink &&
                                                        !documentFile
                                                    }
                                                    className="flex-1 rounded-2xl px-3 py-3 items-center"
                                                    style={{
                                                        backgroundColor:
                                                            PRIMARY,
                                                        opacity:
                                                            !documentLink &&
                                                            !documentFile
                                                                ? 0.5
                                                                : 1,
                                                    }}
                                                >
                                                    <Text className="font-kumbhBold text-white">
                                                        Save PDF
                                                    </Text>
                                                </Pressable>
                                                <Pressable
                                                    onPress={
                                                        handleAttachDocument
                                                    }
                                                    disabled={uploadingDocument}
                                                    className="flex-1 rounded-2xl px-3 py-3 items-center border"
                                                    style={{
                                                        borderColor: PRIMARY,
                                                        backgroundColor:
                                                            "transparent",
                                                        opacity:
                                                            uploadingDocument
                                                                ? 0.6
                                                                : 1,
                                                    }}
                                                >
                                                    <Text
                                                        className="font-kumbhBold"
                                                        style={{
                                                            color: PRIMARY,
                                                        }}
                                                    >
                                                        {documentFile
                                                            ? "Replace"
                                                            : "Upload"}
                                                    </Text>
                                                </Pressable>
                                            </View>
                                            <Pressable
                                                onPress={handleDeleteDocument}
                                                disabled={
                                                    !documentLink &&
                                                    !documentFile
                                                }
                                                className="mt-3 rounded-2xl px-3 py-3 items-center border"
                                                style={{
                                                    borderColor: "#DC2626",
                                                    backgroundColor:
                                                        "transparent",
                                                    opacity:
                                                        !documentLink &&
                                                        !documentFile
                                                            ? 0.5
                                                            : 1,
                                                }}
                                            >
                                                <Text
                                                    className="font-kumbhBold"
                                                    style={{ color: "#DC2626" }}
                                                >
                                                    Delete Document
                                                </Text>
                                            </Pressable>
                                        </View>
                                    </View>

                                    {/* Buttons row */}
                                    <View
                                        className="mt-6 flex-row"
                                        style={{ gap: 12 }}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <PillButton
                                                variant="primary"
                                                icon={
                                                    <ClipboardCheck
                                                        size={16}
                                                        color="#fff"
                                                    />
                                                }
                                                label="Client Installment"
                                                onPress={() => {
                                                    router.push({
                                                        pathname:
                                                            "/(admin)/clients/installments",
                                                        params: {
                                                            clientId: id,
                                                        },
                                                    });
                                                }}
                                            />
                                        </View>
                                    </View>
                                    <View className="mt-3">
                                        <PillButton
                                            variant="outline"
                                            icon={
                                                isGeneratingPdf ? (
                                                    <ActivityIndicator
                                                        size="small"
                                                        color={PRIMARY}
                                                    />
                                                ) : (
                                                    <Share2
                                                        size={16}
                                                        color={PRIMARY}
                                                    />
                                                )
                                            }
                                            label={
                                                isGeneratingPdf
                                                    ? "Generating..."
                                                    : "Share Client PDF"
                                            }
                                            disabled={isGeneratingPdf}
                                            onPress={handleShareClientPdf}
                                        />
                                    </View>

                                    {/* Delete */}
                                    <View className="mt-6">
                                        <Pressable
                                            disabled={mutationLoading}
                                            onPress={onDelete}
                                            className="rounded-2xl py-4 items-center border"
                                            style={{
                                                borderColor: mutationLoading
                                                    ? "#FCA5A5"
                                                    : "#DC2626",
                                                backgroundColor: mutationLoading
                                                    ? "#FEE2E2"
                                                    : "#FEE2E2",
                                                opacity: mutationLoading
                                                    ? 0.7
                                                    : 1,
                                            }}
                                        >
                                            <Text
                                                className="font-kumbhBold"
                                                style={{ color: "#B91C1C" }}
                                            >
                                                {mutationLoading
                                                    ? "Processing..."
                                                    : "Delete Client"}
                                            </Text>
                                        </Pressable>
                                    </View>
                                </View>
                            ) : (
                                <View className="mt-3">
                                    <View>
                                        <View className="flex-row items-center justify-between mb-2">
                                            <Text className="font-kumbhBold text-[#0F172A] text-base">
                                                Saved Notes
                                            </Text>

                                            <Text className="font-kumbh text-[#64748B]">
                                                {clientNotes.length} total
                                            </Text>
                                        </View>

                                        <View style={{ gap: 10 }}>
                                            {clientNotes.length === 0 ? (
                                                <View
                                                    className="rounded-2xl p-5 border"
                                                    style={{
                                                        backgroundColor:
                                                            "#F9FAFB",
                                                        borderColor: "#E5E7EB",
                                                    }}
                                                >
                                                    <Text className="font-kumbhBold text-[#334155] text-sm">
                                                        No Notes Yet
                                                    </Text>
                                                    <Text className="font-kumbh text-gray-500 mt-1">
                                                        No notes added yet for
                                                        this client.
                                                    </Text>
                                                </View>
                                            ) : (
                                                clientNotes.map(
                                                    (note, index) => (
                                                        <View
                                                            key={`${note.createdAt || "note"}-${index}`}
                                                            className="rounded-2xl p-4 border"
                                                            style={{
                                                                borderColor:
                                                                    "#E2E8F0",
                                                                backgroundColor:
                                                                    "#FFFFFF",
                                                            }}
                                                        >
                                                            <View className="flex-row items-center justify-between">
                                                                <Text className="font-kumbhBold text-[#111827] text-base flex-1 pr-3">
                                                                    {note.title}
                                                                </Text>
                                                                <View
                                                                    className="flex-row items-center"
                                                                    style={{
                                                                        gap: 8,
                                                                    }}
                                                                >
                                                                    <Pressable
                                                                        onPress={() =>
                                                                            handleEditNote(
                                                                                note,
                                                                                index,
                                                                            )
                                                                        }
                                                                        className="w-9 h-9 rounded-full items-center justify-center"
                                                                        style={{
                                                                            backgroundColor:
                                                                                "#EEF2FF",
                                                                        }}
                                                                    >
                                                                        <Pencil
                                                                            size={
                                                                                16
                                                                            }
                                                                            color="#4338CA"
                                                                        />
                                                                    </Pressable>
                                                                    <Pressable
                                                                        onPress={() =>
                                                                            handleDeleteNote(
                                                                                index,
                                                                            )
                                                                        }
                                                                        className="w-9 h-9 rounded-full items-center justify-center"
                                                                        style={{
                                                                            backgroundColor:
                                                                                "#FEE2E2",
                                                                        }}
                                                                    >
                                                                        <Trash2
                                                                            size={
                                                                                16
                                                                            }
                                                                            color="#B91C1C"
                                                                        />
                                                                    </Pressable>
                                                                </View>
                                                            </View>
                                                            <Text className="mt-2 font-kumbh text-gray-700">
                                                                {
                                                                    note.description
                                                                }
                                                            </Text>
                                                            <Text className="mt-3 font-kumbh text-xs text-gray-500">
                                                                {formatDate(
                                                                    note.createdAt,
                                                                )}
                                                            </Text>
                                                        </View>
                                                    ),
                                                )
                                            )}
                                        </View>
                                    </View>
                                </View>
                            )}
                        </ScrollView>
                    </KeyboardAvoidingWidget>

                    <OptionSheet
                        visible={showStaffSizeSheet}
                        onClose={() => setShowStaffSizeSheet(false)}
                        onSelect={(value) => {
                            setstaffSize(String(value));
                            setShowStaffSizeSheet(false);
                        }}
                        title="Select Staff Size"
                        options={STAFF_SIZE_OPTIONS}
                        selectedValue={
                            staffSize ? Number(staffSize) : undefined
                        }
                    />

                    <OptionSheet
                        visible={showIndustrySheet}
                        onClose={() => setShowIndustrySheet(false)}
                        onSelect={(value) => {
                            setIndustry(value as string);
                            if (value !== "Other") {
                                setIndustryOther("");
                            }
                            setShowIndustrySheet(false);
                        }}
                        title="Select Industry"
                        options={INDUSTRY_OPTIONS}
                        selectedValue={industry}
                    />

                    <OptionSheet
                        visible={showSourceSheet}
                        onClose={() => setShowSourceSheet(false)}
                        onSelect={(value) => {
                            setSource(value as SourceType);
                            if (value !== "Others") {
                                setSourceOther("");
                            }
                            setShowSourceSheet(false);
                        }}
                        title="Select Source"
                        options={
                            SOURCE_OPTIONS as unknown as Array<{
                                label: string;
                                value: string;
                            }>
                        }
                        selectedValue={source}
                    />

                    <OptionSheet
                        visible={statusOpen}
                        onClose={() => setStatusOpen(false)}
                        onSelect={(value) => {
                            setStatusApi(value as ApiStatus);
                            setStatusOpen(false);
                        }}
                        title="Select Status"
                        options={STATUS_OPTIONS}
                        selectedValue={statusApi}
                    />

                    <DatePickerModal
                        visible={showJoinedDatePicker}
                        value={joinedPickerDate}
                        onCancel={() => setShowJoinedDatePicker(false)}
                        onDone={() => setShowJoinedDatePicker(false)}
                        onDateChange={(d) => {
                            setJoinedPickerDate(d);
                            setJoined(toIsoDateInput(d.toISOString()));
                        }}
                    />

                    <Modal
                        visible={showNoteModal}
                        transparent
                        animationType="slide"
                        onRequestClose={() => setShowNoteModal(false)}
                    >
                        <View className="flex-1 bg-black/40 justify-end">
                            <KeyboardAvoidingView
                                behavior={
                                    Platform.OS === "ios"
                                        ? "padding"
                                        : undefined
                                }
                            >
                                <View className="bg-white rounded-t-3xl px-5 pt-5 pb-6">
                                    <View className="items-center mb-3">
                                        <View className="w-14 h-1.5 rounded-full bg-gray-300" />
                                    </View>

                                    <Text className="font-kumbhBold text-[#111827] text-lg">
                                        {editingNoteIndex === null
                                            ? "Add Note"
                                            : "Edit Note"}
                                    </Text>
                                    <Text className="font-kumbh text-xs text-[#64748B] mt-1 mb-4">
                                        Capture important context for this
                                        client.
                                    </Text>

                                    <FieldLabel>Title</FieldLabel>
                                    <Input
                                        value={noteTitle}
                                        onChangeText={setNoteTitle}
                                        placeholder="Enter note title"
                                    />

                                    <View className="mt-4">
                                        <FieldLabel>Description</FieldLabel>
                                        <Input
                                            value={noteDescription}
                                            onChangeText={setNoteDescription}
                                            placeholder="Enter note details"
                                            multiline
                                        />
                                    </View>

                                    <View
                                        className="flex-row mt-5"
                                        style={{ gap: 10 }}
                                    >
                                        <Pressable
                                            onPress={() => {
                                                setShowNoteModal(false);
                                                setEditingNoteIndex(null);
                                                setNoteTitle("");
                                                setNoteDescription("");
                                            }}
                                            className="flex-1 rounded-2xl py-3.5 items-center border"
                                            style={{
                                                borderColor: "#CBD5E1",
                                                backgroundColor: "#FFFFFF",
                                            }}
                                        >
                                            <Text className="font-kumbhBold text-[#334155]">
                                                Cancel
                                            </Text>
                                        </Pressable>
                                        <Pressable
                                            onPress={handleAddNote}
                                            disabled={savingNote}
                                            className="flex-1 rounded-2xl py-3.5 items-center"
                                            style={{
                                                backgroundColor: PRIMARY,
                                                opacity: savingNote ? 0.7 : 1,
                                            }}
                                        >
                                            <Text className="font-kumbhBold text-white">
                                                {savingNote
                                                    ? "Saving..."
                                                    : editingNoteIndex === null
                                                      ? "Add Note"
                                                      : "Save Changes"}
                                            </Text>
                                        </Pressable>
                                    </View>
                                </View>
                            </KeyboardAvoidingView>
                        </View>
                    </Modal>
                </>
            )}
        </SafeAreaView>
    );
}

function KeyboardAvoidingWidget({ children }: { children: React.ReactNode }) {
    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.select({ ios: "padding", android: undefined })}
            keyboardVerticalOffset={
                Platform.select({ ios: 70, android: 0 }) ?? 0
            }
        >
            {children}
        </KeyboardAvoidingView>
    );
}
