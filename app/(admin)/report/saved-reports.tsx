import { api } from "@/api/axios";
import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { FileText, RefreshCw, Share2, Trash2 } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Platform,
    Pressable,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type SavedReport = {
    _id: string;
    channelId: string;
    pdfPath: string;
    filename: string;
    createdBy: {
        _id: string;
        fullname: string;
        email: string;
    };
    createdAt: string;
};

function resolvePdfUrl(pathOrUrl: string) {
    if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
    const base = (api.defaults.baseURL ?? "").replace(/\/+$/, "");
    const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
    return `${base}${path}`;
}

function cleanReportFilename(value: string) {
    const name = String(value ?? "")
        .trim()
        .replace(/^\d+_/, "");
    return name;
}

function formatDate(isoString: string) {
    try {
        const date = new Date(isoString);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    } catch {
        return "Unknown";
    }
}

export default function SavedReportsScreen() {
    const router = useRouter();
    const isIOS = Platform.OS === "ios";
    const params = useLocalSearchParams<any>();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [reports, setReports] = useState<SavedReport[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);

    const fetchSavedReports = useCallback(async () => {
        try {
            setError(null);
            const { data } = await api.get<{
                success: boolean;
                data: SavedReport[];
            }>("/reports/saved");
            if (data.success) {
                setReports(data.data || []);
            }
        } catch (err: any) {
            setError(err?.message ?? "Failed to load saved reports.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchSavedReports();
    }, [fetchSavedReports]);

    const openReportViewer = useCallback(
        (report: SavedReport) => {
            router.push({
                pathname: "/(admin)/report/[channelId]",
                params: {
                    channelId: report.channelId,
                    pdfPath: encodeURIComponent(report.pdfPath),
                    title: cleanReportFilename(report.filename),
                    saved: "1",
                },
            });
        },
        [router],
    );

    const sharePdf = useCallback(async (pdfPath: string, filename: string) => {
        try {
            const url = resolvePdfUrl(pdfPath);
            const cleanFilename = cleanReportFilename(filename);
            const fileExt = cleanFilename.endsWith(".pdf") ? "" : ".pdf";
            const localPath = `${FileSystem.documentDirectory}${cleanFilename}${fileExt}`;

            const downloadResult = await FileSystem.downloadAsync(
                url,
                localPath,
            );
            if (downloadResult.status < 200 || downloadResult.status >= 300) {
                throw new Error("Failed to download PDF for sharing.");
            }

            const canShare = await Sharing.isAvailableAsync();
            if (!canShare) {
                Alert.alert(
                    "Sharing",
                    "Sharing is not available on this device.",
                );
                return;
            }

            await Sharing.shareAsync(localPath);
        } catch (err: any) {
            Alert.alert("Share", err?.message ?? "Failed to share PDF.");
        }
    }, []);

    const deleteReport = useCallback(async (reportId: string) => {
        Alert.alert(
            "Delete Report",
            "Are you sure you want to delete this saved report?",
            [
                { text: "Cancel", onPress: () => {} },
                {
                    text: "Delete",
                    onPress: async () => {
                        try {
                            setDeleting(reportId);
                            await api.delete(`/reports/${reportId}`);
                            setReports((prev) =>
                                prev.filter((r) => r._id !== reportId),
                            );
                            Alert.alert("Success", "Report deleted.");
                        } catch (err: any) {
                            Alert.alert(
                                "Error",
                                err?.message ?? "Failed to delete report.",
                            );
                        } finally {
                            setDeleting(null);
                        }
                    },
                    style: "destructive",
                },
            ],
        );
    }, []);

    const renderReport = useCallback(
        ({ item }: { item: SavedReport }) => (
            <Pressable
                className="mb-1 flex-row rounded-xl border border-gray-200 bg-white p-3"
                onPress={() => openReportViewer(item)}
            >
                <View className="flex-row flex-1 items-center justify-between">
                    <View className="flex-1">
                        <Text className="font-kumbhBold text-base text-black">
                            {
                                cleanReportFilename(item.filename).split(
                                    "Summary Report",
                                )[0]
                            }
                        </Text>
                        <Text className="mt-1 font-kumbh text-xs text-gray-500">
                            Saved by {item.createdBy?.fullname} on{" "}
                            {formatDate(item.createdAt)}
                        </Text>
                    </View>
                </View>

                <View className="flex-row gap-2">
                    <Pressable
                        onPress={() => sharePdf(item.pdfPath, item.filename)}
                        className="rounded-2xl border border-gray-200 bg-white size-12 justify-center items-center"
                    >
                        <Share2 size={18} color="#111827" />
                    </Pressable>

                    <Pressable
                        onPress={() => deleteReport(item._id)}
                        disabled={deleting === item._id}
                        className={`rounded-2xl border border-red-200 ${
                            deleting === item._id ? "bg-red-50" : "bg-white"
                        } size-12 justify-center items-center`}
                    >
                        {deleting === item._id ? (
                            <ActivityIndicator size="small" color="#dc2626" />
                        ) : (
                            <Trash2 size={18} color="#dc2626" />
                        )}
                    </Pressable>
                </View>
            </Pressable>
        ),
        [deleting, openReportViewer, sharePdf, deleteReport],
    );

    return (
        <SafeAreaView
            className="flex-1 bg-white"
            edges={isIOS ? ["left", "right"] : ["top", "left", "right"]}
        >
            <PlatformAdaptiveHeader
                title="Saved Reports"
                headerRight={({ tintColor }) => (
                    <Pressable
                        onPress={async () => {
                            setRefreshing(true);
                            await fetchSavedReports();
                        }}
                        disabled={refreshing}
                        className="w-10 h-10 rounded-full items-center justify-center"
                    >
                        {refreshing ? (
                            <ActivityIndicator size="small" color={tintColor} />
                        ) : (
                            <RefreshCw
                                size={20}
                                color={refreshing ? "#9CA3AF" : tintColor}
                            />
                        )}
                    </Pressable>
                )}
            />

            <View className="flex-1">
                {loading ? (
                    <View className="flex-1 items-center justify-center rounded-3xl border border-gray-200 bg-gray-50 m-5 py-16">
                        <ActivityIndicator size="large" />
                        <Text className="mt-3 font-kumbh text-gray-500">
                            Loading saved reports...
                        </Text>
                    </View>
                ) : error ? (
                    <View className="m-5 rounded-3xl border border-red-200 bg-red-50 p-4">
                        <Text className="font-kumbhBold text-red-700">
                            Unable to load reports
                        </Text>
                        <Text className="mt-2 font-kumbh text-red-600">
                            {error}
                        </Text>
                    </View>
                ) : reports.length === 0 ? (
                    <View className="flex-1 items-center justify-center px-5">
                        <View className="h-16 w-16 items-center justify-center rounded-3xl bg-gray-100">
                            <FileText size={32} color="#9CA3AF" />
                        </View>
                        <Text className="mt-4 text-center font-kumbhBold text-lg text-gray-700">
                            No saved reports yet
                        </Text>
                        <Text className="mt-2 text-center font-kumbh text-gray-500">
                            Generate and save reports to see them here.
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={reports}
                        renderItem={renderReport}
                        keyExtractor={(item) => item._id}
                        contentContainerStyle={{
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                        }}
                    />
                )}
            </View>

            <View className="border-t border-gray-200 px-5 py-4">
                <Pressable
                    onPress={() => router.push("/(admin)/report")}
                    className="rounded-2xl bg-primary py-4"
                >
                    <Text className="text-center font-kumbhBold text-white">
                        Generate a new report
                    </Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}
