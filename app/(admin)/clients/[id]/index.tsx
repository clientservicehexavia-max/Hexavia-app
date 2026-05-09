import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import {
    Check,
    ChevronDown,
    ClipboardCheck,
    Share2,
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
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
    phoneNumber?: string;
    fullname?: string;
    username?: string;
    role: "client" | "staff" | "admin" | "super-admin";
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

    const handleRemoveDocument = useCallback(() => {
        setDocumentFile(null);
        setDocumentName("");
        setDocumentRemoved(true);
    }, []);

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
        const baseIndustry = (baseUser.industry ?? "").trim();
        const baseJoined = toIsoDateInput(baseUser.createdAt);

        return (
            name !== baseName ||
            email !== baseEmail ||
            phoneNumber !== basePhone ||
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [baseUser._id]);

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

    const saveDisabled = !dirty || mutationLoading;

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
                headerRight={({ tintColor }) => (
                    <Pressable
                        disabled={saveDisabled}
                        onPress={onSave}
                        className="w-10 h-10 rounded-full items-center justify-center"
                        // style={{
                        //     marginLeft: mutationLoading ? 8 : 4,
                        // }}
                    >
                        {mutationLoading ? (
                            <ActivityIndicator size="small" color={tintColor} />
                        ) : (
                            <Check
                                size={28}
                                color={saveDisabled ? "#9CA3AF" : tintColor}
                            />
                        )}
                    </Pressable>
                )}
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
                    <KeyboardAvoidingWidget>
                        <ScrollView
                            contentContainerStyle={{
                                paddingBottom: 24,
                                paddingHorizontal: 14,
                            }}
                        >
                            <View className="mt-3">
                                {/* Name */}
                                <FieldLabel>Name</FieldLabel>
                                <Input value={name} onChangeText={setName} />

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

                                {/* Industry | Staff Size */}
                                <View className="mt-4">
                                    <TwoCol>
                                        <View style={{ flex: 1 }}>
                                            <FieldLabel>Industry</FieldLabel>
                                            <Pressable
                                                onPress={() =>
                                                    setShowIndustrySheet(true)
                                                }
                                                className="rounded-2xl px-4 py-3 flex-row items-center justify-between"
                                                style={{
                                                    backgroundColor: BG_INPUT,
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
                                            <FieldLabel>Staff Size</FieldLabel>
                                            <Pressable
                                                onPress={() =>
                                                    setShowStaffSizeSheet(true)
                                                }
                                                className="rounded-2xl px-4 py-3 flex-row items-center justify-between"
                                                style={{
                                                    backgroundColor: BG_INPUT,
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
                                                          )?.label ?? staffSize)
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
                                        <FieldLabel>Other Industry</FieldLabel>
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
                                    <FieldLabel>Engagement Offered</FieldLabel>
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
                                                        ? parseMoney(payable)
                                                        : formatGroupedMoneyInput(
                                                              payable,
                                                          )
                                                }
                                                onChangeText={(t) =>
                                                    setPayable(
                                                        sanitizeMoneyInput(t),
                                                    )
                                                }
                                                onFocus={() =>
                                                    setPayableFocused(true)
                                                }
                                                onBlur={() => {
                                                    setPayable(
                                                        moneyToInput(
                                                            parseMoney(payable),
                                                        ),
                                                    );
                                                    setPayableFocused(false);
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
                                                    backgroundColor: BG_INPUT,
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
                                                toIsoDateOrUndefined(joined),
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
                                        style={{ backgroundColor: BG_INPUT }}
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
                                                    backgroundColor: PRIMARY,
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
                                                onPress={handleAttachDocument}
                                                disabled={uploadingDocument}
                                                className="flex-1 rounded-2xl px-3 py-3 items-center border"
                                                style={{
                                                    borderColor: PRIMARY,
                                                    backgroundColor:
                                                        "transparent",
                                                    opacity: uploadingDocument
                                                        ? 0.6
                                                        : 1,
                                                }}
                                            >
                                                <Text
                                                    className="font-kumbhBold"
                                                    style={{ color: PRIMARY }}
                                                >
                                                    {documentFile
                                                        ? "Replace"
                                                        : "Upload"}
                                                </Text>
                                            </Pressable>
                                        </View>
                                        <Pressable
                                            onPress={handleRemoveDocument}
                                            disabled={
                                                !documentLink && !documentFile
                                            }
                                            className="mt-3 rounded-2xl px-3 py-3 items-center border"
                                            style={{
                                                borderColor: "#DC2626",
                                                backgroundColor: "transparent",
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
                                                Remove Document
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
                                                    params: { clientId: id },
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
                                            opacity: mutationLoading ? 0.7 : 1,
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
