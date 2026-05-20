import { api } from "@/api/axios";
import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import { selectUser } from "@/redux/user/user.slice";
import { getToken as getStoredToken } from "@/storage/auth";
import { useAppSelector } from "@/store/hooks";
import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import { Save, Share2 } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Platform,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ReportParams = {
    channelId?: string;
    pdfPath?: string;
    title?: string;
    saved?: string;
};

type SummaryEntry = {
    summaryText: string;
    pdfPath: string;
};

type ChannelResponse = {
    _id: string;
    name: string;
    summaries?: SummaryEntry[];
};

function resolvePdfUrl(pathOrUrl: string) {
    if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
    const base = (api.defaults.baseURL ?? "").replace(/\/+$/, "");
    const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
    return `${base}${path}`;
}

function cleanReportFilename(value: string) {
    return String(value ?? "")
        .trim()
        .replace(/^\d+_/, "");
}

function formatReportDate(date: Date) {
    const year = date.getFullYear();
    const month = date.toLocaleString("en-US", { month: "short" });
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function sanitizeFilenamePart(value: string) {
    return String(value ?? "")
        .trim()
        .replace(/[\\\/\?%*:|"<>]/g, "-")
        .replace(/\s+/g, " ");
}

function buildReportFilename(
    channelName: string | undefined,
    date: Date = new Date(),
) {
    const namePart = sanitizeFilenamePart(channelName || "Project");
    return `Hexavia-${namePart} Summary Report - ${formatReportDate(date)}.pdf`;
}

function getProjectName(channelName: string | undefined): string {
    if (!channelName) return "Project";
    return channelName.replace(/^Hexavia-\s*/i, "").trim();
}

function renderInlineSegments(text: string) {
    const segments: Array<{ text: string; bold?: boolean; italic?: boolean }> =
        [];
    const tokens = text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g);

    tokens.forEach((token) => {
        if (!token) return;
        if (/^\*\*[^*]+\*\*$/.test(token)) {
            segments.push({ text: token.slice(2, -2), bold: true });
            return;
        }
        if (/^_[^_]+_$/.test(token)) {
            segments.push({ text: token.slice(1, -1), italic: true });
            return;
        }
        segments.push({ text: token });
    });

    return segments;
}

function FormattedText({ text }: { text: string }) {
    const lines = String(text ?? "").split(/\r?\n/);

    return (
        <View>
            {lines.map((line, lineIndex) => {
                const trimmed = line.trim();
                const isRule = /^-{3,}$/.test(trimmed);
                const isBullet = /^[-*]\s+/.test(trimmed);
                const bulletText = isBullet
                    ? trimmed.replace(/^[-*]\s+/, "")
                    : trimmed;
                const headingLevel = trimmed.startsWith("#### ")
                    ? 4
                    : trimmed.startsWith("### ")
                      ? 3
                      : trimmed.startsWith("## ")
                        ? 2
                        : trimmed.startsWith("# ")
                          ? 1
                          : 0;
                const content = headingLevel
                    ? trimmed.replace(/^#{1,4}\s+/, "")
                    : bulletText;

                const lineStyle =
                    headingLevel === 1
                        ? "font-kumbhBold text-sm text-black"
                        : headingLevel === 2
                          ? "font-kumbhBold text-base text-black"
                          : headingLevel === 3
                            ? "font-kumbhBold text-lg text-black"
                            : headingLevel === 4
                              ? "font-kumbhBold text-xl text-black"
                              : "font-kumbh leading-6 text-gray-800";

                return (
                    <View
                        key={`${lineIndex}-${content.slice(0, 12)}`}
                        className={lineIndex > 0 ? "mt-1" : undefined}
                    >
                        {isRule ? (
                            <View className=" h-px w-full bg-gray-200" />
                        ) : isBullet ? (
                            <View className="flex-row items-start">
                                <Text className="mr-2 font-kumbh leading-6 text-gray-800">
                                    •
                                </Text>
                                <Text className={lineStyle}>
                                    {renderInlineSegments(content).map(
                                        (segment, index) => (
                                            <Text
                                                key={`${lineIndex}-${index}-${segment.text.slice(0, 12)}`}
                                                className={[
                                                    segment.bold
                                                        ? "font-kumbhBold"
                                                        : "",
                                                    segment.italic
                                                        ? "italic"
                                                        : "",
                                                ]
                                                    .filter(Boolean)
                                                    .join(" ")}
                                            >
                                                {segment.text}
                                            </Text>
                                        ),
                                    )}
                                </Text>
                            </View>
                        ) : (
                            <Text className={lineStyle}>
                                {renderInlineSegments(content).map(
                                    (segment, index) => (
                                        <Text
                                            key={`${lineIndex}-${index}-${segment.text.slice(0, 12)}`}
                                            className={[
                                                segment.bold
                                                    ? "font-kumbhBold"
                                                    : "",
                                                segment.italic ? "italic" : "",
                                            ]
                                                .filter(Boolean)
                                                .join(" ")}
                                        >
                                            {segment.text}
                                        </Text>
                                    ),
                                )}
                            </Text>
                        )}
                    </View>
                );
            })}
        </View>
    );
}

export default function ReportViewerScreen() {
    const isIOS = Platform.OS === "ios";
    const params = useLocalSearchParams<ReportParams>();

    const channelId = Array.isArray(params.channelId)
        ? params.channelId[0]
        : params.channelId;
    const pdfPathParam = Array.isArray(params.pdfPath)
        ? params.pdfPath[0]
        : params.pdfPath;
    const titleParam = Array.isArray(params.title)
        ? params.title[0]
        : params.title;
    const savedParam = Array.isArray(params.saved)
        ? params.saved[0]
        : params.saved;

    const reportTitle = useMemo(
        () =>
            titleParam ? decodeURIComponent(titleParam) : "Generated Report",
        [titleParam],
    );
    const reportPdfPath = useMemo(
        () => (pdfPathParam ? decodeURIComponent(pdfPathParam) : null),
        [pdfPathParam],
    );
    const reportDownloadUrl = useMemo(() => {
        if (reportPdfPath) return resolvePdfUrl(reportPdfPath);
        if (!channelId) return null;
        return resolvePdfUrl(`/channel/${channelId}/summary-pdf/download`);
    }, [channelId, reportPdfPath]);

    const [loading, setLoading] = useState(true);
    const [channel, setChannel] = useState<ChannelResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(savedParam === "1");

    const user = useAppSelector(selectUser);
    const authToken = useAppSelector((s: any) => s.user.token as string | null);
    const isAdmin = user?.role === "admin";

    const summaries = useMemo(
        () => channel?.summaries ?? [],
        [channel?.summaries],
    );
    const latestSummary = summaries[0] ?? null;

    const fetchChannel = useCallback(async () => {
        if (!channelId) {
            setError("Missing channel id.");
            setLoading(false);
            return;
        }

        try {
            setError(null);
            const { data } = await api.get<{ channel: ChannelResponse }>(
                `/channel/${channelId}`,
            );
            setChannel(data.channel);
        } catch (err: any) {
            setError(err?.message ?? "Failed to load report text.");
        } finally {
            setLoading(false);
        }
    }, [channelId]);

    useEffect(() => {
        fetchChannel();
    }, [fetchChannel]);

    const displayText = useMemo(() => {
        if (latestSummary?.summaryText) return latestSummary.summaryText;
        if (reportPdfPath) return `PDF path: ${reportPdfPath}`;
        return "No summary available.";
    }, [latestSummary?.summaryText, reportPdfPath]);

    const saveReport = useCallback(async () => {
        if (!channelId || saving || isSaved) return;

        try {
            setSaving(true);
            const baseFilename = buildReportFilename(
                getProjectName(channel?.name ?? reportTitle),
            );
            const { data } = await api.post<{ success: boolean }>(
                "/reports/save",
                {
                    channelId,
                    filename: baseFilename,
                },
            );

            if (data.success) {
                setIsSaved(true);
                Alert.alert("Saved", "Report saved successfully.");
            } else {
                Alert.alert("Save report", "Unable to save report.");
            }
        } catch (err: any) {
            Alert.alert(
                "Save report",
                err?.message ?? "Failed to save report.",
            );
        } finally {
            setSaving(false);
        }
    }, [channelId, reportTitle, saving, isSaved]);

    const shareReport = useCallback(async () => {
        if (!reportDownloadUrl) return;

        try {
            const pdfUrl = reportDownloadUrl;
            const storedToken = await getStoredToken();
            const token = storedToken ?? authToken;
            const pdfUrlWithToken = token
                ? `${pdfUrl}${pdfUrl.includes("?") ? "&" : "?"}hexaviaAccessToken=${encodeURIComponent(token)}`
                : pdfUrl;

            // Derive a clean project name for the filename:
            // - Prefer the channel name when available
            // - Otherwise extract left side before 'Summary Report' from the passed title
            // - Strip any accidental embedded '.pdf' occurrences
            let projectName: string | undefined = undefined;
            if (channel?.name) projectName = getProjectName(channel.name);
            else if (reportTitle) {
                const t = reportTitle.replace(/\.pdf/gi, "").trim();
                if (/summary report/i.test(t)) {
                    projectName = getProjectName(
                        t.split(/summary report/i)[0].trim(),
                    );
                } else {
                    projectName = getProjectName(t);
                }
            }

            const filename = cleanReportFilename(
                buildReportFilename(projectName ?? reportTitle),
            );
            const localPath = `${FileSystem.cacheDirectory}${filename}`;

            const downloadResult = await FileSystem.downloadAsync(
                pdfUrlWithToken,
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

            await Sharing.shareAsync(localPath, {
                UTI: "com.adobe.pdf",
                mimeType: "application/pdf",
            });
        } catch (err: any) {
            Alert.alert("Share report", err?.message ?? "Failed to share.");
        }
    }, [reportDownloadUrl, reportTitle, authToken]);

    return (
        <SafeAreaView
            className="flex-1 bg-white"
            edges={isIOS ? ["left", "right"] : ["top", "left", "right"]}
        >
            <PlatformAdaptiveHeader
                title="Preview"
                headerRight={({ tintColor }) => (
                    <View className="flex-row items-center gap-2">
                        {isAdmin && channelId && !isSaved ? (
                            <Pressable
                                onPress={saveReport}
                                disabled={saving}
                                className="h-10 w-10 items-center justify-center"
                            >
                                {saving ? (
                                    <ActivityIndicator size="small" />
                                ) : (
                                    <Save size={25} color={tintColor} />
                                )}
                            </Pressable>
                        ) : null}

                        <Pressable
                            onPress={shareReport}
                            className="h-10 w-10 items-center justify-center"
                        >
                            <Share2 size={22} color={tintColor} />
                        </Pressable>
                    </View>
                )}
            />
            <View className="flex-row items-center justify-between border-b border-gray-200 px-5 py-4">
                <View className="flex-1 pr-3">
                    <Text className="font-kumbhBold text-lg text-black">
                        {reportTitle}
                    </Text>
                    <Text className="mt-1 font-kumbh text-xs text-gray-500">
                        Text preview
                    </Text>
                </View>
            </View>

            <ScrollView
                className="flex-1 p-2"
                contentContainerClassName="pb-10"
            >
                {loading && (
                    <View className="mt-10 items-center justify-center rounded-3xl border border-gray-200 bg-gray-50 py-16">
                        <ActivityIndicator size="large" />
                        <Text className="mt-3 font-kumbh text-gray-500">
                            Loading report text...
                        </Text>
                    </View>
                )}

                {!loading && error ? (
                    <View className="mt-10 rounded-3xl border border-red-200 bg-red-50 p-4">
                        <Text className="font-kumbhBold text-red-700">
                            Unable to load report
                        </Text>
                        <Text className="mt-2 font-kumbh text-red-600">
                            {error}
                        </Text>
                    </View>
                ) : (
                    <View className="bg-white p-3">
                        <Text className="font-kumbhBold text-xl text-black">
                            {channel?.name ?? reportTitle}
                        </Text>
                        <Text className="mt-2 font-kumbh text-gray-500">
                            Generated summary text
                        </Text>

                        <View className="mt-5">
                            <FormattedText text={displayText} />
                        </View>

                        {channelId &&
                            (isSaved ? (
                                <Text className="mt-4 text-center font-kumbh text-emerald-600">
                                    Saved report
                                </Text>
                            ) : null)}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
