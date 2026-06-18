// app/(app)/tasks/StatusScreen.tsx
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft, ChevronDown, Upload, X } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as XLSX from "xlsx";

import BoardCard from "@/components/client/tasks/BoardCard";
import OptionSheet from "@/components/common/OptionSheet";
import FabCreate from "@/components/staff/tasks/FabCreate";
import CreateTaskModal from "@/components/staff/tasks/modals/CreateTaskModal";
import TaskDetailModal from "@/components/staff/tasks/modals/TaskDetailModal";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

import { showError } from "@/components/ui/toast";
import {
    ChannelStatusKey,
    ChannelTask,
    makeSelectChannelTasksByChannelId,
    makeSelectChannelTasksByStatus,
    makeSelectDefaultChannelId,
    selectChannelById,
    selectStatus as selectChannelsStatus,
} from "@/redux/channels/channels.selectors";
import {
    fetchChannelById,
    fetchChannelTasks,
    importChannelTasks,
} from "@/redux/channels/channels.thunks";
import { selectUser } from "@/redux/user/user.slice";
import { fetchProfile } from "@/redux/user/user.thunks";

import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import { SwipeableTabView } from "@/components/ui/SwipeableTabView";
import { STATUS_META } from "@/features/staff/types";
import { formatDateLabel, getDateKey } from "@/utils/format";

const PRIMARY = "#4C5FAB";

// Tabs you want to show
const TABS: { key: ChannelStatusKey; label: string }[] = [
    { key: "not-started", label: "Not started" },
    { key: "in-progress", label: "In progress" },
    { key: "completed", label: "Completed" },
    { key: "canceled", label: "Canceled" },
];

const SPREADSHEET_MIME_TYPES = [
    "text/csv",
    "application/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

type PickedSpreadsheet = {
    uri: string;
    name?: string | null;
    mimeType?: string | null;
    file?: { arrayBuffer: () => Promise<ArrayBuffer> };
};

type ImportedTaskDraft = {
    name: string;
    description: string;
    alreadyExists: boolean;
    status: ChannelStatusKey;
};

type SheetTaskDraft = {
    description: string;
    status: ChannelStatusKey;
};

const STATUS_OPTIONS = TABS.map((tab) => ({
    label: tab.label,
    value: tab.key,
}));

type SheetOption = {
    label: string;
    value: string;
};

const generateTaskTitle = (description: string, index: number) => {
    const normalized = description
        .replace(/\s+/g, " ")
        .replace(/^([-*]|\d+[.)])\s*/, "")
        .trim();
    const firstClause = normalized.split(/[.;:]/)[0]?.trim() || normalized;
    const words = firstClause.split(" ").filter(Boolean);
    const title = words.slice(0, 8).join(" ").trim();

    if (!title) return `Task ${index + 1}`;
    return words.length > 8 ? `${title}...` : title;
};

const taskIdentityKey = (title?: string | null, description?: string | null) =>
    `${String(title ?? "")
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase()}::${String(description ?? "")
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase()}`;

const indexedExcelColors: Record<number, string> = {
    3: "FF0000",
    4: "00FF00",
    6: "FFFF00",
    10: "FF0000",
    11: "00FF00",
    13: "FFFF00",
    17: "00FF00",
    50: "00FF00",
};

const normalizeRgb = (value?: string | number | null) => {
    if (value === undefined || value === null) return null;
    const raw = String(value).replace(/[^a-fA-F0-9]/g, "");
    if (raw.length < 6) return null;
    return raw.slice(-6).toUpperCase();
};

const statusFromRgb = (rgb?: string | null): ChannelStatusKey => {
    const normalized = normalizeRgb(rgb);
    if (!normalized) return "not-started";

    const r = Number.parseInt(normalized.slice(0, 2), 16);
    const g = Number.parseInt(normalized.slice(2, 4), 16);
    const b = Number.parseInt(normalized.slice(4, 6), 16);

    if (r >= 130 && r - g >= 25 && r - b >= 25) return "not-started";
    if (r >= 130 && g >= 120 && r - b >= 35 && g - b >= 35) {
        return "in-progress";
    }
    if (g >= 110 && g - r >= 20 && g - b >= 20) return "completed";

    return "not-started";
};

const getCellFillDebug = (cell: any) => {
    const style = cell?.s;
    const fill = style?.fill ?? style;
    const fgColor = fill?.fgColor ?? fill?.foregroundColor;
    const bgColor = fill?.bgColor ?? fill?.backgroundColor;
    const color = fgColor ?? bgColor;

    return {
        fill,
        fgColor,
        bgColor,
        selectedColor: color,
        normalizedRgb:
            normalizeRgb(color?.rgb) ??
            (typeof color?.indexed === "number"
                ? (indexedExcelColors[color.indexed] ?? null)
                : null),
    };
};

const readSpreadsheetWorkbook = async (file: PickedSpreadsheet) => {
    const name = file.name ?? "spreadsheet";
    const lowerName = name.toLowerCase();

    if (Platform.OS === "web" && file.file) {
        const buffer = await file.file.arrayBuffer();
        return XLSX.read(buffer, {
            type: "array",
            raw: false,
            cellStyles: true,
        });
    }

    if (lowerName.endsWith(".csv") || file.mimeType === "text/csv") {
        const csv = await FileSystem.readAsStringAsync(file.uri, {
            encoding: FileSystem.EncodingType.UTF8,
        });
        return XLSX.read(csv, {
            type: "string",
            raw: false,
            cellStyles: true,
        });
    }

    const base64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
    });
    return XLSX.read(base64, {
        type: "base64",
        raw: false,
        cellStyles: true,
    });
};

const getSheetTaskDrafts = (
    workbook: XLSX.WorkBook,
    sheetName: string,
): SheetTaskDraft[] => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return [];

    const range = sheet["!ref"] ? XLSX.utils.decode_range(sheet["!ref"]) : null;
    if (!range) return [];

    const drafts: SheetTaskDraft[] = [];
    for (let row = range.s.r; row <= range.e.r; row += 1) {
        const cell = sheet[XLSX.utils.encode_cell({ r: row, c: 0 })];
        const description = String(cell?.w ?? cell?.v ?? "").trim();
        if (!description) continue;
        const fillDebug = getCellFillDebug(cell);
        const status = statusFromRgb(fillDebug.normalizedRgb);

        console.log("[task-import] detected cell color", {
            sheetName,
            cell: XLSX.utils.encode_cell({ r: row, c: 0 }),
            value: description,
            ...fillDebug,
            mappedStatus: status,
        });

        drafts.push({
            description,
            status,
        });
    }

    return drafts;
};

const buildSheetOptions = (workbook: XLSX.WorkBook): SheetOption[] =>
    workbook.SheetNames.map((sheetName) => {
        const count = getSheetTaskDrafts(workbook, sheetName).length;
        const suffix = count === 1 ? "task" : "tasks";
        return {
            label: `${sheetName} (${count} ${suffix})`,
            value: sheetName,
        };
    });

export default function StatusScreen() {
    type TaskListItem =
        | { type: "date"; key: string; ts: number }
        | { type: "task"; key: string; task: ChannelTask };
    const params = useLocalSearchParams<{
        status?: ChannelStatusKey;
        channelId?: string;
    }>();
    const statusKey: ChannelStatusKey =
        (params.status as ChannelStatusKey) || "in-progress";
    const paramChannelId = (params.channelId as string) || null;
    const isIOS = Platform.OS === "ios";
    const routes = useMemo(
        () =>
            TABS.map((tab) => ({
                key: tab.key,
                title: tab.label,
            })),
        [],
    );
    const initialTabIndex = Math.max(
        0,
        TABS.findIndex((tab) => tab.key === statusKey),
    );
    const [tabIndex, setTabIndex] = useState(initialTabIndex);

    const dispatch = useAppDispatch();

    // ensure we have user (for default channel calculation)
    const user = useAppSelector(selectUser);
    useEffect(() => {
        if (!user?._id) dispatch(fetchProfile());
    }, [dispatch, user?._id]);

    const defaultChannelId = useAppSelector(
        makeSelectDefaultChannelId(user?._id ?? null, "recent"),
    );
    const channelId = paramChannelId || defaultChannelId || null;

    // fetch the chosen channel when id becomes known
    useEffect(() => {
        if (!channelId) return;
        dispatch(fetchChannelById(String(channelId)));
        dispatch(fetchChannelTasks(String(channelId)));
    }, [dispatch, channelId]);

    const channelsStatus = useAppSelector(selectChannelsStatus);

    // derive tasks
    const selectAllChannelTasks = useMemo(
        () => makeSelectChannelTasksByChannelId(channelId),
        [channelId],
    );
    const selectChannelTasksByStatus = useMemo(
        () => makeSelectChannelTasksByStatus(channelId, statusKey),
        [channelId, statusKey],
    );

    const allChannelTasks = useAppSelector(selectAllChannelTasks);
    const list = useAppSelector(selectChannelTasksByStatus);
    const channel = useAppSelector(selectChannelById(channelId ?? ""));

    const memberLookup = useMemo(() => {
        const map = new Map<string, string>();
        const rawMembers = Array.isArray((channel as any)?.members)
            ? (channel as any).members
            : [];
        rawMembers.forEach((m: any, idx: number) => {
            const base = typeof m === "string" ? { _id: m } : (m ?? {});
            const entry = base?.user ?? base?.member ?? base ?? {};
            const profile =
                entry?._id && typeof entry._id === "object" ? entry._id : entry;
            const rawId =
                profile?._id ??
                profile?.id ??
                entry?._id ??
                entry?.id ??
                base?.userId ??
                base?.memberId ??
                base?._id ??
                base?.id ??
                (typeof m === "string" ? m : null) ??
                `member-${idx}`;
            const name =
                profile?.fullname ??
                profile?.name ??
                profile?.username ??
                profile?.email ??
                entry?.name ??
                entry?.username ??
                base?.name ??
                base?.email ??
                null;
            const id = rawId ? String(rawId) : "";
            if (id && name && !map.has(id)) map.set(id, String(name));
        });
        return map;
    }, [channel]);

    // modals
    const [showCreate, setShowCreate] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [pickedFileName, setPickedFileName] = useState<string | null>(null);
    const [pendingWorkbook, setPendingWorkbook] =
        useState<XLSX.WorkBook | null>(null);
    const [pendingFileName, setPendingFileName] = useState<string | null>(null);
    const [sheetOptions, setSheetOptions] = useState<SheetOption[]>([]);
    const [showSheetPicker, setShowSheetPicker] = useState(false);
    const [importedTasks, setImportedTasks] = useState<ImportedTaskDraft[]>([]);
    const [statusPickerIndex, setStatusPickerIndex] = useState<number | null>(
        null,
    );
    const [pickingFile, setPickingFile] = useState(false);
    const [importingTasks, setImportingTasks] = useState(false);
    const [edit, setEdit] = useState(null);

    const isLoading = channelsStatus === "loading" && !allChannelTasks.length;

    const listData = useMemo<TaskListItem[]>(() => {
        const out: TaskListItem[] = [];
        let lastDateKey: string | null = null;
        for (const task of list) {
            const ts =
                typeof task.createdAt === "number" ? task.createdAt : NaN;
            if (Number.isFinite(ts)) {
                const dateKey = getDateKey(ts);
                if (dateKey !== lastDateKey) {
                    out.push({ type: "date", key: `d-${dateKey}`, ts });
                    lastDateKey = dateKey;
                }
            }
            out.push({ type: "task", key: `t-${task.id}`, task });
        }
        return out;
    }, [list]);

    useEffect(() => {
        setTabIndex(initialTabIndex);
    }, [initialTabIndex]);

    const goTab = (key: ChannelStatusKey) => {
        router.setParams({ status: key, channelId: channelId ?? undefined });
    };

    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(async () => {
        if (!channelId) return;
        try {
            setRefreshing(true);
            await dispatch(fetchChannelById(String(channelId))).unwrap();
            await dispatch(fetchChannelTasks(String(channelId))).unwrap();
        } catch {
        } finally {
            setRefreshing(false);
        }
    }, [dispatch, channelId]);

    const resetImport = useCallback(() => {
        setPickedFileName(null);
        setPendingWorkbook(null);
        setPendingFileName(null);
        setSheetOptions([]);
        setShowSheetPicker(false);
        setImportedTasks([]);
        setStatusPickerIndex(null);
    }, []);

    const closeImport = useCallback(() => {
        if (pickingFile || importingTasks) return;
        setShowImport(false);
        resetImport();
    }, [importingTasks, pickingFile, resetImport]);

    const finishImport = useCallback(() => {
        setShowImport(false);
        resetImport();
    }, [resetImport]);

    const openImportPreview = useCallback(
        (fileName: string, sheetName: string, drafts: SheetTaskDraft[]) => {
            const seenTaskKeys = new Set(
                allChannelTasks.map((task) =>
                    taskIdentityKey(task.title, task.description),
                ),
            );

            setPickedFileName(`${fileName} • ${sheetName}`);
            setImportedTasks(
                drafts.map((draft, index) => {
                    const { description } = draft;
                    const name = generateTaskTitle(description, index);
                    const key = taskIdentityKey(name, description);
                    const alreadyExists = seenTaskKeys.has(key);
                    seenTaskKeys.add(key);

                    return {
                        name,
                        description,
                        alreadyExists,
                        status: draft.status,
                    };
                }),
            );
            setShowImport(true);
        },
        [allChannelTasks],
    );

    const closeSheetPicker = useCallback(() => {
        setShowSheetPicker(false);
    }, []);

    const pickTaskSheet = useCallback(async () => {
        try {
            setPickingFile(true);
            const result = await DocumentPicker.getDocumentAsync({
                type: SPREADSHEET_MIME_TYPES,
                copyToCacheDirectory: true,
                multiple: false,
            });

            if (result.canceled) return;

            const asset = result.assets?.[0];
            if (!asset?.uri) {
                showError("Could not read the selected file.");
                return;
            }

            const fileName = asset.name ?? "Selected spreadsheet";
            const workbook = await readSpreadsheetWorkbook({
                uri: asset.uri,
                name: asset.name,
                mimeType: asset.mimeType,
                file: (asset as any).file,
            });

            if (!workbook.SheetNames.length) {
                showError("No sheets found in this file.");
                return;
            }

            if (workbook.SheetNames.length > 1) {
                setPendingWorkbook(workbook);
                setPendingFileName(fileName);
                setSheetOptions(buildSheetOptions(workbook));
                setShowSheetPicker(true);
                return;
            }

            const sheetName = workbook.SheetNames[0];
            const drafts = sheetName
                ? getSheetTaskDrafts(workbook, sheetName)
                : [];

            if (!drafts.length) {
                showError("No tasks found in column A.");
                return;
            }

            openImportPreview(fileName, sheetName ?? "Sheet 1", drafts);
        } catch (err: any) {
            showError(
                "Could not import spreadsheet.",
                err?.message ?? "Please choose a valid CSV, XLS, or XLSX file.",
            );
        } finally {
            setPickingFile(false);
        }
    }, [openImportPreview]);

    const handleSheetSelect = useCallback(
        (value: string | number) => {
            if (!pendingWorkbook || !pendingFileName) return;

            const sheetName = String(value);
            const drafts = getSheetTaskDrafts(pendingWorkbook, sheetName);

            if (!drafts.length) {
                showError(`No tasks found in column A on ${sheetName}.`);
                return;
            }

            openImportPreview(pendingFileName, sheetName, drafts);
        },
        [openImportPreview, pendingFileName, pendingWorkbook],
    );

    const submitTaskImport = useCallback(async () => {
        if (!channelId) {
            showError("Project not loaded yet.");
            return;
        }

        if (!importedTasks.length) {
            showError("No tasks found to import.");
            return;
        }

        try {
            setImportingTasks(true);
            const existingTaskKeys = new Set(
                allChannelTasks.map((task) =>
                    taskIdentityKey(task.title, task.description),
                ),
            );
            const tasksToImport = importedTasks.filter((task) => {
                const key = taskIdentityKey(task.name, task.description);
                if (existingTaskKeys.has(key)) return false;
                existingTaskKeys.add(key);
                return true;
            });

            if (!tasksToImport.length) {
                showError("All selected tasks already exist.");
                return;
            }

            await dispatch(
                importChannelTasks({
                    channelId: String(channelId),
                    tasks: tasksToImport.map((task) => ({
                        name: task.name,
                        description: task.description,
                        status: task.status,
                    })),
                }),
            ).unwrap();
            await dispatch(fetchChannelTasks(String(channelId))).unwrap();
            finishImport();
            const nextStatus =
                tasksToImport.find((task) => task.status === "not-started")
                    ?.status ??
                tasksToImport[0]?.status ??
                "not-started";
            router.setParams({
                status: nextStatus,
                channelId: channelId ?? undefined,
            });
        } catch {
            // Thunks surface import errors.
        } finally {
            setImportingTasks(false);
        }
    }, [allChannelTasks, channelId, dispatch, finishImport, importedTasks]);

    const handleImportedTaskStatusSelect = useCallback(
        (value: ChannelStatusKey) => {
            if (statusPickerIndex == null) return;
            setImportedTasks((current) =>
                current.map((task, index) =>
                    index === statusPickerIndex
                        ? { ...task, status: value }
                        : task,
                ),
            );
            setStatusPickerIndex(null);
        },
        [statusPickerIndex],
    );

    const removeImportedTask = useCallback((removeIndex: number) => {
        setImportedTasks((current) =>
            current.filter((_, index) => index !== removeIndex),
        );
        setStatusPickerIndex((current) => {
            if (current == null) return null;
            if (current === removeIndex) return null;
            return current > removeIndex ? current - 1 : current;
        });
    }, []);

    const canReturnToSheetPicker =
        !!pendingWorkbook && !!pendingFileName && sheetOptions.length > 1;

    const returnToSheetPicker = useCallback(() => {
        if (!canReturnToSheetPicker || importingTasks) return;
        setShowImport(false);
        setPickedFileName(null);
        setImportedTasks([]);
        setStatusPickerIndex(null);
        setShowSheetPicker(true);
    }, [canReturnToSheetPicker, importingTasks]);

    return (
        <SafeAreaView
            edges={
                isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]
            }
            className="flex-1 bg-white"
        >
            <StatusBar style="dark" />

            {/* Header */}
            <PlatformAdaptiveHeader
                title="Task Boards"
                headerRight={({ tintColor }) => (
                    <Pressable
                        disabled={pickingFile || showSheetPicker || !channelId}
                        onPress={pickTaskSheet}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel="Import tasks from sheet"
                        className="w-10 h-10 rounded-full items-center justify-center"
                        style={{
                            opacity:
                                pickingFile || showSheetPicker || !channelId
                                    ? 0.55
                                    : 1,
                        }}
                    >
                        {pickingFile ? (
                            <ActivityIndicator size="small" color={PRIMARY} />
                        ) : (
                            <Upload size={21} color={tintColor} />
                        )}
                    </Pressable>
                )}
            />

            {/* Swipeable Tabs */}
            <SwipeableTabView
                navigationState={{ index: tabIndex, routes }}
                scrollEnabled={true}
                onIndexChange={(index) => {
                    setTabIndex(index);
                    const nextStatus = TABS[index]?.key;
                    if (nextStatus && nextStatus !== statusKey) {
                        goTab(nextStatus);
                    }
                }}
                tabBarProps={{
                    activeColor: PRIMARY,
                    inactiveColor: "#6B7280",
                    style: {
                        paddingHorizontal: 16,
                    },
                    tabStyle: {
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                    },
                }}
                renderScene={({ route }) => {
                    const activeTabIndex = TABS.findIndex(
                        (tab) => tab.key === route.key,
                    );
                    const isActive = route.key === statusKey;
                    const sceneData =
                        activeTabIndex >= 0 && route.key === statusKey
                            ? listData
                            : [];

                    return (
                        <View className="flex-1">
                            {isLoading && isActive ? (
                                <View className="flex-1 items-center justify-center px-5">
                                    <ActivityIndicator
                                        size="small"
                                        color={PRIMARY}
                                    />
                                    <Text className="mt-3 text-[#6B7280] font-kumbh">
                                        Loading tasks...
                                    </Text>
                                </View>
                            ) : (
                                <FlatList
                                    contentContainerStyle={{
                                        paddingBottom: 120,
                                        paddingTop: 12,
                                    }}
                                    data={sceneData}
                                    keyExtractor={(i) => i.key}
                                    renderItem={({ item }) => {
                                        if (item.type === "date") {
                                            return (
                                                <View className="px-5 items-center">
                                                    <View className="px-3 py-1.5 rounded-full bg-white border border-gray-100">
                                                        <Text className="text-[11px] text-gray-600 font-kumbhBold">
                                                            {formatDateLabel(
                                                                item.ts,
                                                            )}
                                                        </Text>
                                                    </View>
                                                </View>
                                            );
                                        }
                                        const task = item.task;
                                        return (
                                            <Pressable
                                                onPress={() =>
                                                    setEdit(task as any)
                                                }
                                            >
                                                <BoardCard
                                                    project={
                                                        task.channelCode || "—"
                                                    }
                                                    title={task.title}
                                                    description={
                                                        task.description || ""
                                                    }
                                                    assignees={
                                                        (task.assignees || [])
                                                            .map(
                                                                (assignee) =>
                                                                    assignee.name ??
                                                                    assignee.email ??
                                                                    (assignee.id
                                                                        ? memberLookup.get(
                                                                              assignee.id,
                                                                          )
                                                                        : null) ??
                                                                    assignee.id ??
                                                                    null,
                                                            )
                                                            .filter(
                                                                Boolean,
                                                            ) as string[]
                                                    }
                                                    statusLabel={
                                                        TABS.find(
                                                            (t) =>
                                                                t.key ===
                                                                task.status,
                                                        )?.label ?? task.status
                                                    }
                                                    cardBg={
                                                        STATUS_META[task.status]
                                                            .bgColor
                                                    }
                                                    pillBg={
                                                        STATUS_META[task.status]
                                                            .arrowBg
                                                    }
                                                />
                                            </Pressable>
                                        );
                                    }}
                                    ListEmptyComponent={
                                        <View className="px-5 mt-8">
                                            <Text className="font-kumbhBold text-[#6B7280] text-center">
                                                No tasks in this category yet.
                                            </Text>
                                        </View>
                                    }
                                    refreshing={
                                        refreshing ||
                                        (channelsStatus === "loading" &&
                                            !!allChannelTasks.length)
                                    }
                                    onRefresh={onRefresh}
                                />
                            )}
                        </View>
                    );
                }}
            />

            <FabCreate onPress={() => setShowCreate(true)} />

            {/* Modals */}
            <Modal
                visible={showImport}
                animationType="slide"
                transparent
                presentationStyle="overFullScreen"
                onRequestClose={closeImport}
            >
                <View className="flex-1 justify-end bg-black/40">
                    <View className="max-h-[82%] rounded-t-3xl bg-white px-3 pb-8 pt-6">
                        <View
                            className="flex-row items-center justify-between"
                            style={{ gap: 8 }}
                        >
                            {canReturnToSheetPicker && (
                                <Pressable
                                    disabled={importingTasks}
                                    onPress={returnToSheetPicker}
                                    hitSlop={8}
                                    accessibilityRole="button"
                                    accessibilityLabel="Back to sheet selection"
                                    className="h-12 w-12 items-center justify-center rounded-full bg-[#F3F4F6]"
                                >
                                    <ArrowLeft size={22} color="#111827" />
                                </Pressable>
                            )}
                            <View className="flex-1">
                                <Text className="font-kumbhBold text-[20px] text-[#111827]">
                                    Import Tasks
                                </Text>
                                <Text className="mt-1 font-kumbh text-[12px] text-[#6B7280]">
                                    {pickedFileName ?? "Selected spreadsheet"}
                                </Text>
                            </View>
                            {/* <Pressable
                                disabled={importingTasks}
                                onPress={closeImport}
                                className="h-9 w-9 items-center justify-center rounded-full bg-[#F3F4F6]"
                            >
                                <X size={18} color="#111827" />
                            </Pressable> */}
                        </View>

                        <View className="mt-4 rounded-xl bg-[#F7F8FB] px-4 py-3">
                            <Text className="font-kumbhBold text-[#111827]">
                                {importedTasks.length} task
                                {importedTasks.length === 1 ? "" : "s"} found
                            </Text>
                            <Text className="mt-1 font-kumbh text-[12px] text-[#6B7280]">
                                {
                                    'Every task starts as "Not Started" unless you change it below.'
                                }
                            </Text>
                        </View>

                        <ScrollView
                            className="mt-4"
                            style={{ maxHeight: 360 }}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 8 }}
                        >
                            {importedTasks.map((task, index) => (
                                <View
                                    key={`${task.name}-${index}`}
                                    className={`mb-2 rounded-xl border p-3 ${
                                        task.alreadyExists
                                            ? "border-amber-200 bg-amber-50"
                                            : "border-gray-100 bg-white"
                                    }`}
                                >
                                    <View
                                        className="flex-row items-start justify-between"
                                        style={{ gap: 12 }}
                                    >
                                        <Text className="flex-1 font-kumbh text-[#111827]">
                                            {index + 1}. {task.name}
                                        </Text>
                                        {task.alreadyExists ? (
                                            <View className="rounded-full bg-amber-100 px-2 py-1">
                                                <Text className="font-kumbhBold text-[10px] text-amber-700">
                                                    Already exists
                                                </Text>
                                            </View>
                                        ) : null}
                                        <Pressable
                                            disabled={importingTasks}
                                            onPress={() =>
                                                removeImportedTask(index)
                                            }
                                            hitSlop={8}
                                            accessibilityRole="button"
                                            accessibilityLabel={`Remove ${task.name}`}
                                            className="h-9 w-9 items-center justify-center rounded-full bg-[#F3F4F6]"
                                        >
                                            <X size={18} color="#f00" />
                                        </Pressable>
                                    </View>
                                    <Text className="mt-1 font-kumbh text-[12px] text-[#6B7280]">
                                        {task.description}
                                    </Text>
                                    <Pressable
                                        disabled={importingTasks}
                                        onPress={() =>
                                            setStatusPickerIndex((current) =>
                                                current === index
                                                    ? null
                                                    : index,
                                            )
                                        }
                                        className="mt-3 flex-row items-center justify-between rounded-xl bg-[#F3F4F6] px-3 py-2"
                                    >
                                        <View>
                                            <Text className="font-kumbh text-[11px] text-[#6B7280]">
                                                Status
                                            </Text>
                                            <Text className="font-kumbhBold text-[#111827]">
                                                {STATUS_META[task.status]
                                                    ?.title ??
                                                    task.status.replace(
                                                        "-",
                                                        " ",
                                                    )}
                                            </Text>
                                        </View>
                                        <ChevronDown
                                            size={18}
                                            color="#4C5FAB"
                                        />
                                    </Pressable>
                                    {statusPickerIndex === index && (
                                        <View className="mt-2 overflow-hidden rounded-xl border border-gray-100 bg-[#F9FAFB]">
                                            {STATUS_OPTIONS.map((option) => {
                                                const optionValue =
                                                    option.value as ChannelStatusKey;
                                                const selected =
                                                    task.status === optionValue;

                                                return (
                                                    <Pressable
                                                        key={option.value}
                                                        disabled={
                                                            importingTasks
                                                        }
                                                        onPress={() =>
                                                            handleImportedTaskStatusSelect(
                                                                optionValue,
                                                            )
                                                        }
                                                        className="flex-row items-center justify-between border-b border-gray-100 px-3 py-3 last:border-b-0"
                                                        style={{
                                                            backgroundColor:
                                                                selected
                                                                    ? "#EEF2FF"
                                                                    : "#F9FAFB",
                                                        }}
                                                    >
                                                        <Text
                                                            className="font-kumbh text-[13px]"
                                                            style={{
                                                                color: selected
                                                                    ? PRIMARY
                                                                    : "#111827",
                                                            }}
                                                        >
                                                            {option.label}
                                                        </Text>
                                                        {selected && (
                                                            <Text className="font-kumbhBold text-[12px] text-[#4C5FAB]">
                                                                Selected
                                                            </Text>
                                                        )}
                                                    </Pressable>
                                                );
                                            })}
                                        </View>
                                    )}
                                </View>
                            ))}
                            {!importedTasks.length && (
                                <View className="rounded-xl bg-[#F7F8FB] px-4 py-6">
                                    <Text className="text-center font-kumbhBold text-[#6B7280]">
                                        No tasks left to import.
                                    </Text>
                                </View>
                            )}
                        </ScrollView>

                        <View
                            className="mt-5 flex-row items-center justify-end"
                            style={{ gap: 12 }}
                        >
                            <Pressable
                                disabled={importingTasks}
                                onPress={closeImport}
                            >
                                <Text className="font-kumbh text-[#6B7280]">
                                    Cancel
                                </Text>
                            </Pressable>
                            <Pressable
                                disabled={
                                    importingTasks || !importedTasks.length
                                }
                                onPress={submitTaskImport}
                                className="min-w-[126px] items-center rounded-xl px-5 py-3"
                                style={{
                                    backgroundColor: importingTasks
                                        ? "#4C5FAB99"
                                        : "#4C5FAB",
                                }}
                            >
                                <Text className="font-kumbhBold text-white">
                                    {importingTasks ? "Importing..." : "Import"}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
            <OptionSheet
                visible={showSheetPicker}
                onClose={closeSheetPicker}
                onSelect={handleSheetSelect}
                title="Select sheet"
                options={sheetOptions}
                emptyText="No sheets found"
            />
            <CreateTaskModal
                visible={showCreate}
                onClose={() => setShowCreate(false)}
                defaultChannelId={channelId}
            />
            {edit && (
                <TaskDetailModal
                    visible={!!edit}
                    onClose={() => setEdit(null)}
                    task={edit as any}
                />
            )}
        </SafeAreaView>
    );
}
