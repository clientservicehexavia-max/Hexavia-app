// app/(admin)/team/sanctions/[staffId].tsx
import { useLocalSearchParams } from "expo-router";
import {
    Calendar,
    Pencil,
    Plus,
    ShieldAlert,
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
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    Switch,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import { showError, showSuccess } from "@/components/ui/toast";
import {
    selectSanctions,
    selectSanctionsError,
    selectSanctionsLoading,
    selectSanctionsUpdating,
} from "@/redux/sanctions/sanctions.slice";
import {
    createSanction,
    deleteSanction,
    fetchSanctions,
    updateSanction,
} from "@/redux/sanctions/sanctions.thunks";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

type RowStatus = "Active" | "Resolved";

export default function StaffSanctions() {
    const isIOS = Platform.OS === "ios";
    const { staffId, name } = useLocalSearchParams();
    const staffIdValue = Array.isArray(staffId) ? staffId[0] : staffId;
    const staffName = Array.isArray(name) ? name[0] : name;
    const dispatch = useAppDispatch();

    const rawRows = useAppSelector(selectSanctions);
    const loading = useAppSelector(selectSanctionsLoading);
    const updating = useAppSelector(selectSanctionsUpdating);
    const error = useAppSelector(selectSanctionsError) ?? null;

    const [filter, setFilter] = useState<RowStatus | "All">("All");
    const [refreshing, setRefreshing] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // edit modal state
    const [editOpen, setEditOpen] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [editReason, setEditReason] = useState<string>("");
    const [editActive, setEditActive] = useState<boolean>(true);

    // create modal state
    const [createOpen, setCreateOpen] = useState(false);
    const [createReason, setCreateReason] = useState("");
    const createReasonRef = useRef("");
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (!staffIdValue) {
            dispatch(fetchSanctions() as any);
            return;
        }
        dispatch(fetchSanctions({ userId: String(staffIdValue) }) as any);
    }, [dispatch, staffIdValue]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            if (!staffIdValue) {
                await dispatch(fetchSanctions() as any).unwrap();
            } else {
                await dispatch(
                    fetchSanctions({ userId: String(staffIdValue) }) as any,
                ).unwrap();
            }
        } finally {
            setRefreshing(false);
        }
    }, [dispatch, staffIdValue]);

    const userSanctions = useMemo(() => {
        const sourceRows = Array.isArray(rawRows) ? rawRows : [];
        return sourceRows.filter((r: any) => {
            const uid = r?.sanctionUser?._id || r?.user?._id || r?.userId;
            return String(uid ?? "") === String(staffIdValue ?? "");
        });
    }, [rawRows, staffIdValue]);

    const data = useMemo(() => {
        return userSanctions
            .map((r: any) => {
                const dateStr = r?.date || r?.createdAt || "";
                const status: RowStatus = r?.isActive ? "Active" : "Resolved";
                return {
                    id: r._id,
                    date: dateStr,
                    reason: r?.reason ?? "—",
                    status,
                    raw: r,
                };
            })
            .filter((r) => (filter === "All" ? true : r.status === filter));
    }, [userSanctions, filter]);

    const openEdit = useCallback((item: any) => {
        setEditId(item.id);
        setEditReason(item.raw?.reason ?? "");
        setEditActive(!!item.raw?.isActive);
        setEditOpen(true);
    }, []);

    const closeEdit = useCallback(() => {
        setEditOpen(false);
        setEditId(null);
    }, []);

    const handleSave = useCallback(async () => {
        if (!editId) return;

        try {
            await dispatch(
                updateSanction({
                    sanctionId: editId,
                    reason: editReason?.trim() || undefined,
                    isActive: editActive,
                }) as any,
            ).unwrap();
            setEditOpen(false);
        } catch (err: any) {
            showError(String(err ?? "Failed to update sanction"));
        }
    }, [dispatch, editId, editReason, editActive]);

    const handleCreate = useCallback(async () => {
        if (!staffIdValue) {
            showError("Missing staff id");
            return;
        }

        const reason = createReasonRef.current.trim();
        if (!reason) {
            showError("Enter a reason");
            return;
        }

        try {
            setCreating(true);
            await dispatch(
                createSanction({
                    userId: String(staffIdValue),
                    reason,
                    type: "warning",
                    silent: true,
                }) as any,
            ).unwrap();

            showSuccess("Sanction created");
            setCreateReason("");
            createReasonRef.current = "";
            setCreateOpen(false);
        } catch (err: any) {
            showError(String(err ?? "Failed to create sanction"));
        } finally {
            setCreating(false);
        }
    }, [dispatch, staffIdValue]);

    const handleDelete = useCallback(
        async (sanctionId: string) => {
            try {
                setDeletingId(sanctionId);
                await dispatch(deleteSanction({ sanctionId }) as any).unwrap();
            } catch (err: any) {
                showError(String(err ?? "Failed to delete sanction"));
            } finally {
                setDeletingId(null);
            }
        },
        [dispatch],
    );

    const confirmDelete = useCallback(
        (sanctionId: string) => {
            Alert.alert(
                "Delete sanction",
                "This sanction will be permanently removed.",
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Delete",
                        style: "destructive",
                        onPress: () => {
                            void handleDelete(sanctionId);
                        },
                    },
                ],
            );
        },
        [handleDelete],
    );

    return (
        <SafeAreaView
            edges={
                isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]
            }
            className="flex-1 bg-white px-4"
        >
            {/* Header */}
            <PlatformAdaptiveHeader
                title={staffName ? `${staffName}'s Sanctions` : "Sanctions"}
                headerRight={({ tintColor }) => (
                    <Pressable
                        onPress={() => {
                            setCreateReason("");
                            createReasonRef.current = "";
                            setCreateOpen(true);
                        }}
                        className="w-10 h-10 rounded-full items-center justify-center"
                        hitSlop={8}
                    >
                        <Plus size={30} color={tintColor} />
                    </Pressable>
                )}
            />

            {/* Pills */}
            <View className="flex-row gap-2 mt-3">
                {(["All", "Active", "Resolved"] as const).map((tab) => (
                    <Pressable
                        key={tab}
                        onPress={() => setFilter(tab)}
                        className={`px-4 py-2 rounded-full border ${
                            filter === tab
                                ? "bg-primary border-primary"
                                : "bg-white border-gray-200"
                        }`}
                    >
                        <Text
                            className={`text-sm font-kumbhBold ${
                                filter === tab ? "text-white" : "text-gray-700"
                            }`}
                        >
                            {tab}
                        </Text>
                    </Pressable>
                ))}
            </View>

            {/* List */}
            {loading && userSanctions.length === 0 ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator color="#7C3AED" />
                    <Text className="mt-2 text-gray-500 font-kumbh">
                        Loading sanctions…
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={data}
                    keyExtractor={(i) => i.id}
                    contentContainerClassName="pt-4 pb-10"
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                        />
                    }
                    ItemSeparatorComponent={() => <View className="h-3" />}
                    renderItem={({ item }) => (
                        <Card>
                            <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center gap-2">
                                    <ShieldBadge status={item.status} />
                                </View>
                                <View className="flex-row items-center gap-2">
                                    <Pressable
                                        onPress={() => openEdit(item)}
                                        className="px-3 py-2 rounded-xl bg-gray-100 active:bg-gray-200"
                                    >
                                        <View className="flex-row items-center gap-1">
                                            <Pencil size={16} color="#374151" />
                                            <Text className="text-gray-800 font-kumbhBold text-xs">
                                                Edit
                                            </Text>
                                        </View>
                                    </Pressable>
                                    <Pressable
                                        disabled={deletingId === item.id}
                                        onPress={() => confirmDelete(item.id)}
                                        className={`px-3 py-2 rounded-xl active:bg-red-100 ${
                                            deletingId === item.id
                                                ? "bg-red-100/60"
                                                : "bg-red-50"
                                        }`}
                                    >
                                        <View className="flex-row items-center gap-1">
                                            <Trash2 size={16} color="#B91C1C" />
                                            <Text className="text-red-700 font-kumbhBold text-xs">
                                                {deletingId === item.id
                                                    ? "Deleting…"
                                                    : "Delete"}
                                            </Text>
                                        </View>
                                    </Pressable>
                                </View>
                            </View>

                            <Divider />

                            <Row icon={<Calendar size={16} color="#6366F1" />}>
                                <Label>Date</Label>
                                <Value>{formatDate(item.date)}</Value>
                            </Row>

                            <Row
                                icon={<ShieldAlert size={16} color="#6366F1" />}
                            >
                                <Label>Reason</Label>
                                <Value>{item.reason}</Value>
                            </Row>
                        </Card>
                    )}
                    ListEmptyComponent={
                        <View className="px-5 py-12">
                            <Text className="text-center text-gray-500 font-kumbh">
                                {error
                                    ? `Error: ${error}`
                                    : "No sanctions found for this staff."}
                            </Text>
                        </View>
                    }
                />
            )}

            {/* Create Modal */}
            <Modal
                transparent
                visible={createOpen}
                animationType="slide"
                onRequestClose={() => setCreateOpen(false)}
            >
                <View className="flex-1 bg-black/40 items-center justify-end">
                    <View className="w-full rounded-t-3xl bg-white p-5">
                        <View className="items-center mb-3">
                            <View className="w-12 h-1.5 rounded-full bg-gray-300" />
                        </View>

                        <Text className="text-gray-900 font-kumbhBold text-lg mb-3">
                            Create Sanction
                        </Text>

                        <Text className="text-gray-700 font-kumbh mb-2">
                            Reason
                        </Text>
                        <TextInput
                            placeholder="Enter reason"
                            placeholderTextColor="#9CA3AF"
                            value={createReason}
                            onChangeText={(text) => {
                                createReasonRef.current = text;
                                setCreateReason(text);
                            }}
                            onEndEditing={(e) => {
                                createReasonRef.current = e.nativeEvent.text;
                                setCreateReason(e.nativeEvent.text);
                            }}
                            className="bg-gray-50 text-gray-900 rounded-xl px-4 py-3 font-kumbh mb-6 border border-gray-200"
                            multiline
                        />

                        <View className="flex-row gap-3">
                            <Pressable
                                onPress={() => {
                                    setCreateOpen(false);
                                }}
                                className="flex-1 rounded-2xl bg-gray-100 py-3 items-center"
                            >
                                <Text className="text-gray-800 font-kumbhBold">
                                    Cancel
                                </Text>
                            </Pressable>
                            <Pressable
                                disabled={creating}
                                onPress={handleCreate}
                                className={`flex-1 rounded-2xl py-3 items-center ${
                                    creating
                                        ? "bg-[#7C3AED]/60"
                                        : "bg-[#7C3AED]"
                                }`}
                            >
                                <Text className="text-white font-kumbhBold">
                                    {creating ? "Creating…" : "Create"}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Edit Modal */}
            <Modal
                transparent
                visible={editOpen}
                animationType="slide"
                onRequestClose={closeEdit}
            >
                <KeyboardAvoidingView
                    className="flex-1"
                    behavior={Platform.select({
                        ios: "padding",
                        android: "height",
                    })}
                >
                    <View className="flex-1 bg-black/40">
                        <ScrollView
                            keyboardShouldPersistTaps="handled"
                            contentContainerStyle={{
                                flexGrow: 1,
                                justifyContent: "flex-end",
                            }}
                        >
                            <View className="w-full rounded-t-3xl bg-white p-5 pb-8">
                                <View className="items-center mb-3">
                                    <View className="w-12 h-1.5 rounded-full bg-gray-300" />
                                </View>

                                <Text className="text-gray-900 font-kumbhBold text-lg mb-3">
                                    Update Sanction
                                </Text>

                                <Text className="text-gray-700 font-kumbh mb-2">
                                    Reason
                                </Text>
                                <TextInput
                                    placeholder="Enter reason"
                                    placeholderTextColor="#9CA3AF"
                                    value={editReason}
                                    onChangeText={setEditReason}
                                    className="bg-gray-50 text-gray-900 rounded-xl px-4 py-3 font-kumbh mb-4 border border-gray-200"
                                    multiline
                                />

                                <View className="flex-row items-center justify-between mb-6">
                                    <Text className="text-gray-700 font-kumbh">
                                        Active
                                    </Text>
                                    <Switch
                                        value={editActive}
                                        onValueChange={setEditActive}
                                        trackColor={{
                                            true: "#7C3AED",
                                            false: "#D1D5DB",
                                        }}
                                    />
                                </View>

                                <View className="flex-row gap-3">
                                    <Pressable
                                        onPress={closeEdit}
                                        className="flex-1 rounded-2xl bg-gray-100 py-3 items-center"
                                    >
                                        <Text className="text-gray-800 font-kumbhBold">
                                            Cancel
                                        </Text>
                                    </Pressable>
                                    <Pressable
                                        disabled={updating}
                                        onPress={handleSave}
                                        className={`flex-1 rounded-2xl py-3 items-center ${
                                            updating
                                                ? "bg-[#7C3AED]/60"
                                                : "bg-[#7C3AED]"
                                        }`}
                                    >
                                        <Text className="text-white font-kumbhBold">
                                            {updating ? "Saving…" : "Save"}
                                        </Text>
                                    </Pressable>
                                </View>
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

/* ───────── light-themed building blocks ───────── */

function Card({ children }: { children: React.ReactNode }) {
    return (
        <View className="rounded-2xl bg-white border border-gray-200 p-4 shadow-sm">
            {children}
        </View>
    );
}
function Divider() {
    return <View className="h-px bg-gray-100 my-3" />;
}
function Row({
    children,
    icon,
}: {
    children: React.ReactNode;
    icon?: React.ReactNode;
}) {
    return (
        <View className="flex-row items-center justify-between py-1">
            <View className="flex-row items-center gap-2 flex-1">
                {icon}
                <View className="flex-row items-center flex-1">{children}</View>
            </View>
        </View>
    );
}
function Label({ children }: { children: React.ReactNode }) {
    return <Text className="text-gray-600 font-kumbh">{children}</Text>;
}
function Value({
    children,
    numberOfLines,
}: {
    children: React.ReactNode;
    numberOfLines?: number;
}) {
    return (
        <Text
            numberOfLines={numberOfLines}
            className="text-gray-900 font-kumbhBold ml-auto max-w-[60%] text-right"
        >
            {children}
        </Text>
    );
}

function ShieldBadge({ status }: { status: RowStatus }) {
    const map = {
        Active: { bg: "bg-red-50", dot: "bg-red-500", text: "text-red-700" },
        Resolved: {
            bg: "bg-green-50",
            dot: "bg-green-600",
            text: "text-green-700",
        },
    } as const;
    const s = map[status];
    return (
        <View
            className={`px-2 py-1 rounded-lg flex-row items-center gap-1 ${s.bg}`}
        >
            <View className={`w-2 h-2 rounded-full ${s.dot}`} />
            <Text className={`text-xs font-kumbhBold ${s.text}`}>{status}</Text>
        </View>
    );
}

function formatDate(d?: string) {
    if (!d) return "—";
    try {
        const dt = new Date(d);
        return dt.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    } catch {
        return d;
    }
}
