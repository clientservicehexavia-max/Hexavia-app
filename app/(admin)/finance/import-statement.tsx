// app/(admin)/finance/import-statement.tsx
import React, { useState, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import clsx from "clsx";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Check,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  FileUp,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react-native";

import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import { showError, showSuccess } from "@/components/ui/toast";
import { useAppDispatch } from "@/store/hooks";
import {
  parseBankStatement,
  confirmBankStatementImport,
  fetchFinance,
} from "@/redux/finance/finance.thunks";
import { fetchClients } from "@/redux/client/client.thunks";
import type {
  StatementInfo,
  StatementSummary,
  StatementTransaction,
} from "@/redux/finance/finance.types";

const NGN = (n: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(n);

const MONTH_NAMES_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatDisplayDate(dateInput?: string | Date) {
  try {
    if (!dateInput) return "";
    const d = new Date(dateInput);
    if (Number.isNaN(d.getTime())) return "";
    const month = MONTH_NAMES_SHORT[d.getMonth()];
    const day = d.getDate();
    const year = d.getFullYear();
    return `${month} ${day}, ${year}`;
  } catch {
    return "";
  }
}

const RECEIVABLE_SOURCE_OPTIONS = [
  "Consulting",
  "Inner Circle",
  "BWE",
  "Partnerships",
  "Retreat",
  "Books",
  "Internal Transfer",
  "Others",
] as const;

type Step = "upload" | "processing" | "review" | "success";
type FilterTab = "all" | "receivables" | "expenses" | "duplicates" | "excluded";

export default function ImportStatementScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const isIOS = Platform.OS === "ios";

  // Step state
  const [step, setStep] = useState<Step>("upload");

  // Upload state
  const [selectedFile, setSelectedFile] = useState<{
    uri: string;
    name: string;
    size?: number;
    type?: string;
  } | null>(null);

  // Parsed Data state
  const [importId, setImportId] = useState<string>("");
  const [statementInfo, setStatementInfo] = useState<StatementInfo | null>(
    null,
  );
  const [_summary, setSummary] = useState<StatementSummary | null>(null);
  const [transactions, setTransactions] = useState<StatementTransaction[]>([]);

  // Review & Filter state
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Editing modal state
  const [editingTxn, setEditingTxn] = useState<StatementTransaction | null>(
    null,
  );
  const [editAmount, setEditAmount] = useState("");
  const [editNarration, setEditNarration] = useState("");
  const [editClientName, setEditClientName] = useState("");
  const [editCompanyName, setEditCompanyName] = useState("");
  const [editSource, setEditSource] = useState<string>("Others");
  const [editType, setEditType] = useState<"receivable" | "expense">("expense");

  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmedSummary, setConfirmedSummary] = useState<{
    totalImported: number;
    expensesCount: number;
    receivablesCount: number;
    totalExpenseAmount: number;
    totalReceivableAmount: number;
    excludedCount: number;
  } | null>(null);

  // Pick document handler
  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf"],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          name: asset.name,
          size: asset.size,
          type: asset.mimeType || "application/pdf",
        });
      }
    } catch (err: any) {
      showError(
        "Failed to select document: " + (err?.message || "Unknown error"),
      );
    }
  };

  // Parse statement handler
  const handleStartProcessing = async () => {
    if (!selectedFile) {
      return showError("Please select a bank statement PDF first");
    }

    try {
      setStep("processing");

      const res = await dispatch(
        parseBankStatement({
          uri: selectedFile.uri,
          name: selectedFile.name,
          type: selectedFile.type,
        }),
      ).unwrap();

      if (res.success && res.data) {
        setImportId(res.data.importId);
        setStatementInfo(res.data.statementInfo);
        setSummary(res.data.summary);
        setTransactions(res.data.transactions || []);
        setStep("review");
        showSuccess(
          `Extracted ${res.data.transactions?.length || 0} transactions`,
        );
      } else {
        setStep("upload");
        showError(res.message || "Failed to parse bank statement");
      }
    } catch (err: any) {
      setStep("upload");
      showError(err?.message || "Error processing bank statement");
    }
  };

  // Toggle Exclude
  const handleToggleExclude = (tempId: string) => {
    setTransactions((prev) =>
      prev.map((t) =>
        t.tempId === tempId ? { ...t, excluded: !t.excluded } : t,
      ),
    );
  };

  // Toggle Type (Receivable <-> Expense)
  const handleToggleType = (tempId: string) => {
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.tempId === tempId) {
          const nextType = t.type === "receivable" ? "expense" : "receivable";
          return {
            ...t,
            type: nextType,
            source:
              nextType === "receivable" ? t.source || "Others" : undefined,
          };
        }
        return t;
      }),
    );
  };

  // Exclude all duplicates
  const handleExcludeAllDuplicates = () => {
    setTransactions((prev) =>
      prev.map((t) => (t.isDuplicate ? { ...t, excluded: true } : t)),
    );
    showSuccess("All duplicate transactions marked as excluded");
  };

  // Include all
  const handleIncludeAll = () => {
    setTransactions((prev) => prev.map((t) => ({ ...t, excluded: false })));
    showSuccess("All transactions marked as included");
  };

  // Delete single transaction from review
  const handleDeleteTxn = (tempId: string) => {
    setTransactions((prev) => prev.filter((t) => t.tempId !== tempId));
  };

  // Open Edit Modal
  const handleOpenEdit = (item: StatementTransaction) => {
    setEditingTxn(item);
    setEditAmount(String(item.amount));
    setEditNarration(item.narration);
    setEditClientName(item.clientName || "");
    setEditCompanyName(item.companyName || "");
    setEditSource(item.source || "Others");
    setEditType(item.type);
  };

  // Save Edit Modal
  const handleSaveEdit = () => {
    if (!editingTxn) return;
    const parsedAmount = parseFloat(editAmount.replace(/,/g, ""));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return showError("Please enter a valid amount");
    }

    setTransactions((prev) =>
      prev.map((t) => {
        if (t.tempId === editingTxn.tempId) {
          return {
            ...t,
            amount: parsedAmount,
            narration: editNarration.trim(),
            type: editType,
            clientName:
              editType === "receivable" ? editClientName.trim() : undefined,
            companyName:
              editType === "receivable" ? editCompanyName.trim() : undefined,
            source: editType === "receivable" ? editSource : undefined,
          };
        }
        return t;
      }),
    );

    setEditingTxn(null);
    showSuccess("Transaction updated");
  };

  // Confirm & Submit Import
  const handleConfirmImport = async () => {
    if (!importId) return;

    try {
      setIsConfirming(true);
      const activeTxns = transactions.filter((t) => !t.excluded);

      if (activeTxns.length === 0) {
        setIsConfirming(false);
        setShowConfirmModal(false);
        return showError("No transactions selected for import (all excluded).");
      }

      const res = await dispatch(
        confirmBankStatementImport({
          importId,
          transactions,
        }),
      ).unwrap();

      if (res.success && res.data) {
        setConfirmedSummary(res.data.summary);
        setShowConfirmModal(false);
        setStep("success");
        showSuccess("Bank statement import completed!");

        // Refresh finance and clients in background
        dispatch(fetchFinance());
        dispatch(fetchClients({ page: 1, limit: 100 }));
      } else {
        showError(res.message || "Failed to confirm import");
      }
    } catch (err: any) {
      showError(err?.message || "Failed to confirm import");
    } finally {
      setIsConfirming(false);
    }
  };

  // Active metrics computed from current state
  const metrics = useMemo(() => {
    const total = transactions.length;
    const active = transactions.filter((t) => !t.excluded);
    const excluded = transactions.filter((t) => t.excluded);
    const duplicates = transactions.filter((t) => t.isDuplicate);

    const recs = active.filter((t) => t.type === "receivable");
    const exps = active.filter((t) => t.type === "expense");

    const totalRecAmount = recs.reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalExpAmount = exps.reduce((sum, t) => sum + (t.amount || 0), 0);

    return {
      total,
      activeCount: active.length,
      excludedCount: excluded.length,
      duplicatesCount: duplicates.length,
      receivablesCount: recs.length,
      expensesCount: exps.length,
      totalRecAmount,
      totalExpAmount,
    };
  }, [transactions]);

  // Filtered transactions for review list
  const filteredTransactions = useMemo(() => {
    let list = transactions;

    if (filterTab === "receivables") {
      list = list.filter((t) => t.type === "receivable" && !t.excluded);
    } else if (filterTab === "expenses") {
      list = list.filter((t) => t.type === "expense" && !t.excluded);
    } else if (filterTab === "duplicates") {
      list = list.filter((t) => t.isDuplicate);
    } else if (filterTab === "excluded") {
      list = list.filter((t) => t.excluded);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (t) =>
          (t.narration || "").toLowerCase().includes(q) ||
          (t.clientName || "").toLowerCase().includes(q) ||
          (t.companyName || "").toLowerCase().includes(q) ||
          (t.reference || "").toLowerCase().includes(q) ||
          String(t.amount).includes(q),
      );
    }

    return list;
  }, [transactions, filterTab, searchQuery]);

  return (
    <SafeAreaView
      className="flex-1 bg-white"
      edges={isIOS ? ["left", "right"] : ["top", "left", "right"]}
    >
      <PlatformAdaptiveHeader
        title={
          step === "upload"
            ? "Import Bank Statement"
            : step === "processing"
              ? "Processing Statement"
              : step === "review"
                ? "Review Transactions"
                : "Import Summary"
        }
        onBackPress={() => {
          if (step === "review") {
            Alert.alert(
              "Discard Import?",
              "Are you sure you want to go back? Extracted transactions will not be saved.",
              [
                { text: "Continue Reviewing", style: "cancel" },
                {
                  text: "Discard",
                  style: "destructive",
                  onPress: () => router.back(),
                },
              ],
            );
          } else {
            router.back();
          }
        }}
      />

      {/* ───────── STEP 1: UPLOAD VIEW ───────── */}
      {step === "upload" && (
        <ScrollView
          className="flex-1 px-5 pt-4 pb-10"
          showsVerticalScrollIndicator={false}
        >
          {/* Header info */}
          <View className="mb-6">
            <Text className="text-2xl font-kumbhBold text-[#111827] mb-2">
              Upload Bank Statement
            </Text>
            <Text className="text-sm font-kumbh text-gray-500 leading-5">
              Upload your official bank statement PDF. Income credits will be
              classified as Receivables, and debits as Expenses.
            </Text>
          </View>

          {/* Upload Card */}
          <Pressable
            onPress={handlePickDocument}
            className={clsx(
              "rounded-3xl border-2 border-dashed p-8 items-center justify-center mb-6",
              selectedFile
                ? "border-[#4C5FAB] bg-[#4C5FAB]/5"
                : "border-gray-300 bg-white",
            )}
          >
            <View
              className={clsx(
                "w-16 h-16 rounded-full items-center justify-center mb-4",
                selectedFile ? "bg-[#4C5FAB]/15" : "bg-gray-100",
              )}
            >
              {selectedFile ? (
                <FileText size={32} color="#4C5FAB" />
              ) : (
                <FileUp size={32} color="#6B7280" />
              )}
            </View>

            {selectedFile ? (
              <View className="items-center">
                <Text
                  className="text-base font-kumbhBold text-[#111827] text-center mb-1"
                  numberOfLines={1}
                >
                  {selectedFile.name}
                </Text>
                <Text className="text-xs font-kumbh text-gray-500 mb-3">
                  {selectedFile.size
                    ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready`
                    : "Ready for processing"}
                </Text>
                <View className="flex-row items-center gap-2 bg-[#4C5FAB]/10 px-3 py-1.5 rounded-full">
                  <Check size={14} color="#4C5FAB" />
                  <Text className="text-xs font-kumbhBold text-[#4C5FAB]">
                    Tap to change file
                  </Text>
                </View>
              </View>
            ) : (
              <View className="items-center">
                <Text className="text-base font-kumbhBold text-[#111827] mb-1">
                  Select Statement PDF
                </Text>
                <Text className="text-xs font-kumbh text-gray-400 text-center mb-4">
                  Supports multi-page bank statements (up to 50MB)
                </Text>
                <View className="bg-[#4C5FAB] px-5 py-2.5 rounded-2xl flex-row items-center gap-2 shadow-sm">
                  <Upload size={16} color="#FFFFFF" />
                  <Text className="text-white font-kumbhBold text-sm">
                    Browse Files
                  </Text>
                </View>
              </View>
            )}
          </Pressable>

          {/* Action Button */}
          <Pressable
            onPress={handleStartProcessing}
            disabled={!selectedFile}
            className={clsx(
              "h-14 rounded-2xl items-center justify-center flex-row gap-2 shadow-sm mb-6",
              selectedFile ? "bg-[#4C5FAB] active:opacity-90" : "bg-gray-300",
            )}
          >
            <FileSpreadsheet size={20} color="#FFFFFF" />
            <Text className="text-white font-kumbhBold text-base">
              Process Bank Statement
            </Text>
          </Pressable>
        </ScrollView>
      )}

      {/* ───────── STEP 2: PROCESSING VIEW ───────── */}
      {step === "processing" && (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-20 h-20 rounded-full bg-[#4C5FAB]/10 items-center justify-center mb-6">
            <ActivityIndicator size="large" color="#4C5FAB" />
          </View>
          <Text className="text-xl font-kumbhBold text-[#111827] text-center mb-2">
            Extracting Transactions…
          </Text>
          <Text className="text-sm font-kumbh text-gray-500 text-center mb-8">
            Reading PDF pages, categorizing credits into receivables, debits
            into expenses, and checking for duplicates.
          </Text>

          <View className="w-full bg-white rounded-2xl p-4 border border-gray-100 shadow-xs">
            <View className="flex-row items-center gap-3 py-2 border-b border-gray-100">
              <CheckCircle2 size={18} color="#059669" />
              <Text className="text-xs font-kumbh text-gray-700">
                Validating document structure
              </Text>
            </View>
            <View className="flex-row items-center gap-3 py-2 border-b border-gray-100">
              <ActivityIndicator size="small" color="#4C5FAB" />
              <Text className="text-xs font-kumbhBold text-[#4C5FAB]">
                Parsing transaction table & narrations
              </Text>
            </View>
            <View className="flex-row items-center gap-3 py-2">
              <View className="w-4 h-4 rounded-full border-2 border-gray-300" />
              <Text className="text-xs font-kumbh text-gray-400">
                Checking against existing database records
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* ───────── STEP 3: REVIEW TRANSACTIONS VIEW ───────── */}
      {step === "review" && (
        <View className="flex-1">
          {/* Statement Overview Header Card */}
          <View className="px-5 pt-2 pb-3 bg-white border-b border-gray-100 shadow-xs">
            {statementInfo && (
              <View className="flex-row items-center justify-between mb-2">
                <View>
                  <Text className="text-xs font-kumbhBold text-[#4C5FAB] uppercase tracking-wider">
                    {statementInfo.bankName || "Moniepoint MFB"}
                  </Text>
                  <Text className="text-sm font-kumbhBold text-[#111827]">
                    {statementInfo.accountName || "Hexavia Consulting Limited"}
                  </Text>
                </View>
                {statementInfo.accountNumber ? (
                  <View className="bg-gray-100 px-2.5 py-1 rounded-lg">
                    <Text className="text-xs font-kumbhBold text-gray-600">
                      #{statementInfo.accountNumber}
                    </Text>
                  </View>
                ) : null}
              </View>
            )}

            {/* Metric Counters */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="flex-row mt-1"
              contentContainerClassName="gap-2"
            >
              <View className="bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-xl">
                <Text className="text-[10px] font-kumbhBold text-emerald-700 uppercase">
                  Receivables ({metrics.receivablesCount})
                </Text>
                <Text className="text-sm font-kumbhBold text-emerald-800">
                  {NGN(metrics.totalRecAmount)}
                </Text>
              </View>

              <View className="bg-rose-50 border border-rose-100 px-3 py-2 rounded-xl">
                <Text className="text-[10px] font-kumbhBold text-rose-700 uppercase">
                  Expenses ({metrics.expensesCount})
                </Text>
                <Text className="text-sm font-kumbhBold text-rose-800">
                  {NGN(metrics.totalExpAmount)}
                </Text>
              </View>

              {metrics.duplicatesCount > 0 && (
                <View className="bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl">
                  <Text className="text-[10px] font-kumbhBold text-amber-700 uppercase">
                    Duplicates ({metrics.duplicatesCount})
                  </Text>
                  <Text className="text-xs font-kumbh text-amber-800">
                    Flagged & Excluded
                  </Text>
                </View>
              )}

              <View className="bg-gray-100 px-3 py-2 rounded-xl">
                <Text className="text-[10px] font-kumbhBold text-gray-600 uppercase">
                  Excluded ({metrics.excludedCount})
                </Text>
                <Text className="text-xs font-kumbh text-gray-500">
                  Will not import
                </Text>
              </View>
            </ScrollView>

            {/* Search and Filter Row */}
            <View className="mt-3 flex-row items-center gap-2">
              <View className="flex-1 bg-gray-50 rounded-xl px-3 ios:py-2 flex-row items-center border border-gray-200">
                <Search size={16} color="#9CA3AF" />
                <TextInput
                  placeholder="Search extracted transactions…"
                  placeholderTextColor="#9CA3AF"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  className="ml-2 font-kumbh text-xs text-[#111827] flex-1"
                />
                {searchQuery ? (
                  <Pressable onPress={() => setSearchQuery("")}>
                    <X size={14} color="#9CA3AF" />
                  </Pressable>
                ) : null}
              </View>

              {metrics.duplicatesCount > 0 && (
                <Pressable
                  onPress={handleExcludeAllDuplicates}
                  className="bg-amber-100 px-2.5 py-2 rounded-xl border border-amber-200"
                >
                  <Text className="text-xs font-kumbhBold text-amber-800">
                    Skip Dupes
                  </Text>
                </Pressable>
              )}

              {metrics.excludedCount > 0 && (
                <Pressable
                  onPress={handleIncludeAll}
                  className="bg-gray-100 px-2.5 py-2 rounded-xl border border-gray-300"
                >
                  <Text className="text-xs font-kumbhBold text-gray-700">
                    Include All
                  </Text>
                </Pressable>
              )}
            </View>

            {/* Category Filter Tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="flex-row gap-1.5 mt-2.5"
            >
              {(
                [
                  ["all", `All (${metrics.total})`],
                  ["receivables", `Receivables (${metrics.receivablesCount})`],
                  ["expenses", `Expenses (${metrics.expensesCount})`],
                  ...(metrics.duplicatesCount > 0
                    ? [
                        [
                          "duplicates",
                          `Duplicates (${metrics.duplicatesCount})`,
                        ],
                      ]
                    : []),
                  ["excluded", `Excluded (${metrics.excludedCount})`],
                ] as [FilterTab, string][]
              ).map(([tabKey, label]) => {
                const active = filterTab === tabKey;
                return (
                  <Pressable
                    key={tabKey}
                    onPress={() => setFilterTab(tabKey)}
                    className={clsx(
                      "px-3 py-1.5 rounded-full border",
                      active
                        ? "bg-[#4C5FAB] border-[#4C5FAB]"
                        : "bg-gray-100 border-transparent",
                    )}
                  >
                    <Text
                      className={clsx(
                        "text-xs font-kumbhBold",
                        active ? "text-white" : "text-gray-600",
                      )}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Transaction List */}
          <FlatList
            data={filteredTransactions}
            keyExtractor={(item) => item.tempId}
            contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
            ListEmptyComponent={
              <View className="py-12 items-center">
                <FileText size={36} color="#9CA3AF" />
                <Text className="mt-3 text-sm font-kumbhBold text-gray-500">
                  No transactions match your filter
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const isRec = item.type === "receivable";
              return (
                <View
                  className={clsx(
                    "bg-white rounded-2xl p-4 mb-3 border",
                    item.excluded
                      ? "border-gray-200 opacity-60 bg-gray-50"
                      : item.isDuplicate
                        ? "border-amber-300 bg-amber-50/20"
                        : isRec
                          ? "border-emerald-200"
                          : "border-gray-200",
                  )}
                >
                  {/* Top Row: Type Badge + Switcher + Exclude Checkbox */}
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center gap-2">
                      {/* Type pill / toggle */}
                      <Pressable
                        onPress={() => handleToggleType(item.tempId)}
                        className={clsx(
                          "flex-row items-center gap-1 px-2.5 py-1 rounded-full",
                          isRec ? "bg-emerald-100" : "bg-rose-100",
                        )}
                      >
                        {isRec ? (
                          <ArrowDownLeft size={13} color="#059669" />
                        ) : (
                          <ArrowUpRight size={13} color="#E11D48" />
                        )}
                        <Text
                          className={clsx(
                            "text-xs font-kumbhBold",
                            isRec ? "text-emerald-800" : "text-rose-800",
                          )}
                        >
                          {isRec ? "Receivable" : "Expense"}
                        </Text>
                        <Text className="text-[10px] text-gray-400 font-kumbh ml-0.5">
                          (switch)
                        </Text>
                      </Pressable>

                      {/* Source badge for receivables */}
                      {isRec && item.source && (
                        <View className="bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                          <Text className="text-[11px] font-kumbhBold text-indigo-700">
                            {item.source}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Right actions: Exclude & Delete */}
                    <View className="flex-row items-center gap-2">
                      <Pressable
                        onPress={() => handleToggleExclude(item.tempId)}
                        className={clsx(
                          "px-2.5 py-1 rounded-lg border",
                          item.excluded
                            ? "bg-gray-200 border-gray-300"
                            : "bg-emerald-50 border-emerald-300",
                        )}
                      >
                        <Text
                          className={clsx(
                            "text-xs font-kumbhBold",
                            item.excluded
                              ? "text-gray-600"
                              : "text-emerald-700",
                          )}
                        >
                          {item.excluded ? "+ Include" : "✓ Included"}
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => handleDeleteTxn(item.tempId)}
                        className="w-7 h-7 rounded-lg items-center justify-center bg-gray-100 active:bg-rose-100"
                      >
                        <Trash2 size={13} color="#6B7280" />
                      </Pressable>
                    </View>
                  </View>

                  {/* Duplicate Alert Banner */}
                  {item.isDuplicate && (
                    <View className="bg-amber-100/70 border border-amber-300 rounded-xl px-2.5 py-1.5 flex-row items-center gap-1.5 mb-2">
                      <AlertTriangle size={13} color="#B45309" />
                      <Text className="text-xs font-kumbhBold text-amber-900 flex-1">
                        {item.duplicateReason || "Potential duplicate detected"}
                      </Text>
                    </View>
                  )}

                  {/* Middle: Amount & Date */}
                  <View className="flex-row items-center justify-between mb-1.5">
                    <Text
                      className={clsx(
                        "text-lg font-kumbhBold",
                        isRec ? "text-emerald-700" : "text-[#111827]",
                        item.excluded && "line-through text-gray-400",
                      )}
                    >
                      {NGN(item.amount)}
                    </Text>

                    <View className="flex-row items-center gap-1 text-gray-500">
                      <Calendar size={12} color="#6B7280" />
                      <Text className="text-xs font-kumbh text-gray-500">
                        {formatDisplayDate(item.date)}
                      </Text>
                    </View>
                  </View>

                  {/* Narration */}
                  <Text
                    className={clsx(
                      "text-xs font-kumbh text-gray-700 mb-2",
                      item.excluded && "text-gray-400",
                    )}
                    numberOfLines={2}
                  >
                    {item.narration}
                  </Text>

                  {/* Receivable Details: Client, Company */}
                  {isRec && (
                    <View className="bg-gray-50 rounded-xl p-2.5 mb-2 border border-gray-100">
                      <View className="flex-row items-center justify-between mb-1">
                        <Text className="text-[11px] font-kumbhBold text-gray-400 uppercase">
                          Client Name:
                        </Text>
                        <Text className="text-xs font-kumbhBold text-gray-800">
                          {item.clientName || "—"}
                        </Text>
                      </View>
                      {item.companyName ? (
                        <View className="flex-row items-center justify-between mb-1">
                          <Text className="text-[11px] font-kumbhBold text-gray-400 uppercase">
                            Company:
                          </Text>
                          <Text className="text-xs font-kumbh text-gray-700">
                            {item.companyName}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  )}

                  {/* Bottom row: Edit button */}
                  <View className="flex-row items-center justify-end pt-1 border-t border-gray-100">
                    <Pressable
                      onPress={() => handleOpenEdit(item)}
                      className="flex-row items-center gap-1"
                    >
                      <Text className="text-xs font-kumbhBold text-[#4C5FAB]">
                        Edit details
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            }}
          />

          {/* Bottom Sticky Action Bar */}
          <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-5 py-4 shadow-lg flex-row items-center justify-between">
            <View>
              <Text className="text-xs font-kumbh text-gray-500">
                Ready to import:
              </Text>
              <Text className="text-sm font-kumbhBold text-[#111827]">
                {metrics.activeCount} transactions
              </Text>
            </View>

            <Pressable
              onPress={() => setShowConfirmModal(true)}
              disabled={metrics.activeCount === 0}
              className={clsx(
                "px-6 h-12 rounded-2xl items-center justify-center flex-row gap-2 shadow-sm",
                metrics.activeCount > 0
                  ? "bg-[#4C5FAB] active:opacity-90"
                  : "bg-gray-300",
              )}
            >
              <Check size={18} color="#FFFFFF" />
              <Text className="text-white font-kumbhBold text-sm">
                Import {metrics.activeCount} Records
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ───────── EDIT TRANSACTION MODAL ───────── */}
      <Modal
        visible={!!editingTxn}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingTxn(null)}
      >
        <KeyboardAvoidingView
          behavior={isIOS ? "padding" : undefined}
          className="flex-1 bg-black/40 justify-end"
        >
          <View className="bg-white rounded-t-3xl px-5 pt-5 pb-8 max-h-[85vh]">
            <View className="items-center mb-3">
              <View className="w-16 h-1.5 rounded-full bg-gray-300" />
            </View>

            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-kumbhBold text-[#111827]">
                Edit Transaction
              </Text>
              <Pressable onPress={() => setEditingTxn(null)}>
                <X size={20} color="#6B7280" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Type selector */}
              <Text className="text-xs font-kumbhBold text-gray-500 uppercase mb-2">
                Classification Type
              </Text>
              <View className="flex-row gap-3 mb-4">
                <Pressable
                  onPress={() => setEditType("receivable")}
                  className={clsx(
                    "flex-1 py-3 rounded-2xl items-center border",
                    editType === "receivable"
                      ? "bg-emerald-50 border-emerald-400"
                      : "bg-gray-50 border-gray-200",
                  )}
                >
                  <Text
                    className={clsx(
                      "text-sm font-kumbhBold",
                      editType === "receivable"
                        ? "text-emerald-700"
                        : "text-gray-500",
                    )}
                  >
                    Receivable (Income)
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setEditType("expense")}
                  className={clsx(
                    "flex-1 py-3 rounded-2xl items-center border",
                    editType === "expense"
                      ? "bg-rose-50 border-rose-400"
                      : "bg-gray-50 border-gray-200",
                  )}
                >
                  <Text
                    className={clsx(
                      "text-sm font-kumbhBold",
                      editType === "expense"
                        ? "text-rose-700"
                        : "text-gray-500",
                    )}
                  >
                    Expense (Debit)
                  </Text>
                </Pressable>
              </View>

              {/* Amount */}
              <Text className="text-xs font-kumbhBold text-gray-500 uppercase mb-1">
                Amount (₦)
              </Text>
              <View className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 mb-4">
                <TextInput
                  keyboardType="numeric"
                  value={editAmount}
                  onChangeText={setEditAmount}
                  className="font-kumbhBold text-[#111827] text-base"
                />
              </View>

              {/* Narration */}
              <Text className="text-xs font-kumbhBold text-gray-500 uppercase mb-1">
                Narration / Description
              </Text>
              <View className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 mb-4">
                <TextInput
                  multiline
                  numberOfLines={3}
                  value={editNarration}
                  onChangeText={setEditNarration}
                  className="font-kumbh text-[#111827] text-sm"
                />
              </View>

              {/* Fields for Receivable only */}
              {editType === "receivable" && (
                <>
                  <Text className="text-xs font-kumbhBold text-gray-500 uppercase mb-1">
                    Client Name
                  </Text>
                  <View className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 mb-4">
                    <TextInput
                      value={editClientName}
                      onChangeText={setEditClientName}
                      placeholder="Client or payer name"
                      className="font-kumbh text-[#111827] text-sm"
                    />
                  </View>

                  <Text className="text-xs font-kumbhBold text-gray-500 uppercase mb-1">
                    Company Name (Optional)
                  </Text>
                  <View className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 mb-4">
                    <TextInput
                      value={editCompanyName}
                      onChangeText={setEditCompanyName}
                      placeholder="Company / business entity"
                      className="font-kumbh text-[#111827] text-sm"
                    />
                  </View>

                  <Text className="text-xs font-kumbhBold text-gray-500 uppercase mb-2">
                    Finance Source
                  </Text>
                  <View className="flex-row flex-wrap gap-2 mb-6">
                    {RECEIVABLE_SOURCE_OPTIONS.map((src) => {
                      const active = editSource === src;
                      return (
                        <Pressable
                          key={src}
                          onPress={() => setEditSource(src)}
                          className={clsx(
                            "px-3 py-1.5 rounded-full border",
                            active
                              ? "bg-[#4C5FAB] border-[#4C5FAB]"
                              : "bg-gray-100 border-gray-200",
                          )}
                        >
                          <Text
                            className={clsx(
                              "text-xs font-kumbhBold",
                              active ? "text-white" : "text-gray-700",
                            )}
                          >
                            {src}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              )}

              {/* Save Button */}
              <Pressable
                onPress={handleSaveEdit}
                className="h-14 rounded-2xl bg-[#4C5FAB] items-center justify-center shadow-sm mb-4"
              >
                <Text className="text-white font-kumbhBold text-base">
                  Save Changes
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ───────── CONFIRMATION MODAL ───────── */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View className="flex-1 bg-black/50 items-center justify-center px-5">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
            <View className="w-14 h-14 rounded-full bg-[#4C5FAB]/10 items-center justify-center mb-4 self-center">
              <FileSpreadsheet size={28} color="#4C5FAB" />
            </View>

            <Text className="text-xl font-kumbhBold text-[#111827] text-center mb-2">
              Confirm Statement Import
            </Text>
            <Text className="text-xs font-kumbh text-gray-500 text-center mb-5">
              You are about to batch-create financial records from this bank
              statement:
            </Text>

            <View className="bg-gray-50 rounded-2xl p-4 border border-gray-100 mb-6 space-y-2">
              <View className="flex-row items-center justify-between py-1 border-b border-gray-200">
                <Text className="text-xs font-kumbh text-gray-500">
                  Receivables:
                </Text>
                <Text className="text-xs font-kumbhBold text-emerald-700">
                  {metrics.receivablesCount} ({NGN(metrics.totalRecAmount)})
                </Text>
              </View>
              <View className="flex-row items-center justify-between py-1 border-b border-gray-200">
                <Text className="text-xs font-kumbh text-gray-500">
                  Expenses:
                </Text>
                <Text className="text-xs font-kumbhBold text-rose-700">
                  {metrics.expensesCount} ({NGN(metrics.totalExpAmount)})
                </Text>
              </View>
              <View className="flex-row items-center justify-between py-1">
                <Text className="text-xs font-kumbh text-gray-500">
                  Excluded (Skipped):
                </Text>
                <Text className="text-xs font-kumbh text-gray-600">
                  {metrics.excludedCount}
                </Text>
              </View>
            </View>

            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setShowConfirmModal(false)}
                disabled={isConfirming}
                className="flex-1 h-12 rounded-2xl border border-gray-300 items-center justify-center"
              >
                <Text className="text-sm font-kumbhBold text-gray-700">
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={handleConfirmImport}
                disabled={isConfirming}
                className="flex-1 h-12 rounded-2xl bg-[#4C5FAB] items-center justify-center flex-row gap-2"
              >
                {isConfirming ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-sm font-kumbhBold text-white">
                    Confirm
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ───────── STEP 4: SUCCESS SUMMARY VIEW ───────── */}
      {step === "success" && confirmedSummary && (
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-20 h-20 rounded-full bg-emerald-100 items-center justify-center mb-6">
            <CheckCircle2 size={44} color="#059669" />
          </View>

          <Text className="text-2xl font-kumbhBold text-[#111827] text-center mb-2">
            Import Successful!
          </Text>
          <Text className="text-sm font-kumbh text-gray-500 text-center mb-8">
            The bank statement transactions have been saved directly to your
            Finance section.
          </Text>

          {/* Summary Cards */}
          <View className="w-full bg-white rounded-3xl p-5 border border-gray-100 shadow-xs mb-8">
            <View className="flex-row items-center justify-between py-2.5 border-b border-gray-100">
              <Text className="text-sm font-kumbh text-gray-600">
                Total Imported
              </Text>
              <Text className="text-sm font-kumbhBold text-[#111827]">
                {confirmedSummary.totalImported} records
              </Text>
            </View>

            <View className="flex-row items-center justify-between py-2.5 border-b border-gray-100">
              <View className="flex-row items-center gap-2">
                <View className="w-3 h-3 rounded-full bg-emerald-500" />
                <Text className="text-sm font-kumbh text-gray-600">
                  Receivables Added
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-sm font-kumbhBold text-emerald-700">
                  {confirmedSummary.receivablesCount} records
                </Text>
                <Text className="text-xs font-kumbh text-gray-400">
                  {NGN(confirmedSummary.totalReceivableAmount)}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center justify-between py-2.5 border-b border-gray-100">
              <View className="flex-row items-center gap-2">
                <View className="w-3 h-3 rounded-full bg-rose-500" />
                <Text className="text-sm font-kumbh text-gray-600">
                  Expenses Added
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-sm font-kumbhBold text-rose-700">
                  {confirmedSummary.expensesCount} records
                </Text>
                <Text className="text-xs font-kumbh text-gray-400">
                  {NGN(confirmedSummary.totalExpenseAmount)}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center justify-between py-2.5">
              <Text className="text-sm font-kumbh text-gray-600">
                Skipped (Excluded)
              </Text>
              <Text className="text-sm font-kumbh text-gray-500">
                {confirmedSummary.excludedCount} records
              </Text>
            </View>
          </View>

          {/* Back to Finance Button */}
          <Pressable
            onPress={() => router.replace("/(admin)/finance")}
            className="w-full h-14 rounded-2xl bg-[#4C5FAB] items-center justify-center shadow-sm"
          >
            <Text className="text-white font-kumbhBold text-base">
              Go to Finance
            </Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}
