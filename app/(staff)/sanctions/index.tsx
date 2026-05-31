// app/(staff)/sanctions/index.tsx
import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import {
    selectSanctions,
    selectSanctionsLoading,
} from "@/redux/sanctions/sanctions.slice";
import { fetchSanctions } from "@/redux/sanctions/sanctions.thunks";
import { selectUser } from "@/redux/user/user.slice";
import { fetchProfile } from "@/redux/user/user.thunks";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Platform,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type RowStatus = "Active" | "Resolved" | "Pending";
type SanctionRow = {
    id: string;
    date: string;
    reason: string;
    remarks: string;
    status: RowStatus;
};

const PRIMARY = "#4C5FAB";
const COLS = [
    { key: "date", title: "Date", width: 120 },
    { key: "reason", title: "Reason", width: 180 },
    { key: "remarks", title: "Remarks", width: 240 },
    { key: "status", title: "Status", width: 120 },
] as const;
const TABLE_MIN_WIDTH = COLS.reduce((sum, c) => sum + c.width, 0);

function StatusBadge({ value }: { value: RowStatus }) {
    const styles = {
        Active: { bg: "#FEE2E2", text: "#B91C1C" },
        Resolved: { bg: "#DCFCE7", text: "#166534" },
        Pending: { bg: "#FEF9C3", text: "#854D0E" },
    }[value];
    return (
        <View
            className="px-3 h-8 rounded-full items-center justify-center"
            style={{ backgroundColor: styles.bg }}
        >
            <Text
                className="text-xs font-kumbhBold"
                style={{ color: styles.text }}
            >
                {value}
            </Text>
        </View>
    );
}
function Th({ title, width }: { title: string; width: number }) {
    return (
        <View style={{ width }} className="py-3 px-3">
            <Text className="text-[12px] tracking-wide text-gray-600 font-kumbhBold">
                {title}
            </Text>
        </View>
    );
}
function Td({ children, width }: { children: React.ReactNode; width: number }) {
    return (
        <View style={{ width }} className="py-3 px-3">
            <Text
                className="text-[13px] text-gray-900 font-kumbh"
                numberOfLines={2}
            >
                {children}
            </Text>
        </View>
    );
}

const csvEscape = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
async function exportCsv(rows: SanctionRow[]) {
    const header = COLS.map((c) => c.title).join(",");
    const lines = rows.map((r) =>
        [r.date, r.reason, r.remarks, r.status].map(csvEscape).join(","),
    );
    const csv = [header, ...lines].join("\n");
    const fileUri =
        FileSystem.documentDirectory + `sanctions_${Date.now()}.csv`;
    await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
    });
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
        await Sharing.shareAsync(fileUri, {
            mimeType: "text/csv",
            dialogTitle: "Export Sanctions CSV",
        });
    } else {
        Alert.alert("CSV exported", `Saved to: ${fileUri}`);
    }
}

export default function SanctionsScreen() {
    const dispatch = useAppDispatch();
    const isIOS = Platform.OS === "ios";

    // Adjust to your actual auth selector shape
    const user = useAppSelector(selectUser);
    useEffect(() => {
        dispatch(fetchProfile());
    }, [dispatch]);
    const userId = user?._id ?? null;
    const apiRows = useAppSelector(selectSanctions);
    const loading = useAppSelector(selectSanctionsLoading);

    useEffect(() => {
        if (userId) {
            dispatch(fetchSanctions({ userId: userId as any })); // fetch for current user
        } else {
            // fallback: fetch all if userId missing (optional)
            dispatch(fetchSanctions());
        }
    }, [dispatch, userId]);

    // Map API rows -> table rows
    const rows: SanctionRow[] = useMemo(() => {
        return apiRows.map((s: any) => {
            const created = s.createdAt ? new Date(s.createdAt) : new Date();
            const dateStr = created.toLocaleDateString(undefined, {
                day: "2-digit",
                month: "short",
                year: "numeric",
            });

            // Naive status derivation with available fields
            let status: RowStatus = "Pending";
            if (s.isActive === false) status = "Resolved";
            else if (s.isActive === true) status = "Active";
            else if (s.duration && s.duration > 0) status = "Active";

            return {
                id: s._id,
                date: dateStr,
                reason: s.reason,
                remarks: s.type.toUpperCase(), // use "type" as remarks until you add a server "remarks"
                status,
            };
        });
    }, [apiRows]);

    const viewStyle = {
        flex: 1,
        // marginTop: Platform.select({ ios: 60, android: 40 }),
    };

    return (
        <SafeAreaView
            edges={
                isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]
            }
            className="flex-1 bg-white"
        >
            {/* Header */}
            <PlatformAdaptiveHeader title="Sanctions" />
            <StatusBar style="dark" />
            <View style={viewStyle}>
                {/* <BackHeader title="Sanction Grid" /> */}

                <View
                    className="mx-4 mt-2 mb-6 rounded-3xl bg-white overflow-hidden"
                    style={{
                        shadowColor: "#000",
                        shadowOpacity: 0.08,
                        shadowRadius: 16,
                        shadowOffset: { width: 0, height: 4 },
                        elevation: 3,
                    }}
                >
                    {loading ? (
                        <View className="py-12 items-center justify-center">
                            <ActivityIndicator size="small" color={PRIMARY} />
                            <Text className="mt-2 text-gray-500 font-kumbh text-sm">
                                Loading sanctions…
                            </Text>
                        </View>
                    ) : (
                        <>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{
                                    minWidth: TABLE_MIN_WIDTH,
                                }}
                            >
                                <View className="w-full">
                                    {/* Header */}
                                    <View
                                        className="flex-row items-center"
                                        style={{ backgroundColor: "#F6F8FA" }}
                                    >
                                        {COLS.map((col) => (
                                            <Th
                                                key={col.key}
                                                title={col.title}
                                                width={col.width}
                                            />
                                        ))}
                                    </View>

                                    {/* Rows */}
                                    <FlatList
                                        data={rows}
                                        keyExtractor={(i) => i.id}
                                        renderItem={({ item, index }) => {
                                            const zebra =
                                                index % 2 === 0
                                                    ? "bg-white"
                                                    : "bg-gray-50";
                                            return (
                                                <View
                                                    className={`flex-row items-center ${zebra}`}
                                                >
                                                    <Td width={COLS[0].width}>
                                                        {item.date}
                                                    </Td>
                                                    <Td width={COLS[1].width}>
                                                        {item.reason}
                                                    </Td>
                                                    <Td width={COLS[2].width}>
                                                        {item.remarks}
                                                    </Td>
                                                    <View
                                                        style={{
                                                            width: COLS[3]
                                                                .width,
                                                        }}
                                                        className="py-2 px-3"
                                                    >
                                                        <StatusBadge
                                                            value={item.status}
                                                        />
                                                    </View>
                                                </View>
                                            );
                                        }}
                                        ItemSeparatorComponent={() => (
                                            <View
                                                style={{
                                                    height: 1,
                                                    backgroundColor: "#EEF0F3",
                                                }}
                                            />
                                        )}
                                        ListEmptyComponent={
                                            <View className="py-8 items-center">
                                                <Text className="text-gray-500 font-kumbh">
                                                    No sanctions found.
                                                </Text>
                                            </View>
                                        }
                                        ListFooterComponent={
                                            <View style={{ height: 4 }} />
                                        }
                                    />
                                </View>
                            </ScrollView>

                            {/* Footer actions */}
                            <View className="flex-row items-center justify-end px-4 pb-4 pt-1">
                                <Pressable
                                    className="flex-row items-center px-3 py-2 rounded-lg"
                                    style={{
                                        borderWidth: 1,
                                        borderColor: "#E5E7EB",
                                    }}
                                    onPress={() =>
                                        exportCsv(rows).catch((e) =>
                                            Alert.alert(
                                                "Export failed",
                                                String(e),
                                            ),
                                        )
                                    }
                                >
                                    <Ionicons
                                        name="download-outline"
                                        size={16}
                                        color="#111827"
                                    />
                                    <Text className="ml-1 text-[13px] font-kumbh">
                                        Export CSV
                                    </Text>
                                </Pressable>
                            </View>
                        </>
                    )}
                </View>
            </View>
        </SafeAreaView>
    );
}
