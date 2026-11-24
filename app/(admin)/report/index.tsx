import DatePickerModal from "@/components/admin/DatePickerModal";
import Field from "@/components/admin/Field";
import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import { selectAllChannels } from "@/redux/channels/channels.slice";
import { fetchChannels } from "@/redux/channels/channels.thunks";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { generateChannelSummaryReport } from "@/utils/channelSummary";
import { yupResolver } from "@hookform/resolvers/yup";
import { useRouter } from "expo-router";
import {
    Calendar,
    Check,
    ChevronDown,
    ChevronRight,
    FileText,
    Sparkles,
    X,
} from "lucide-react-native";
import { default as React, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
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
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as yup from "yup";

/* ───────── types ───────── */
type Channel = {
    _id: string;
    name: string;
    tasks?: {
        _id: string;
        name: string;
        description?: string | null;
        createdAt: string;
        updatedAt?: string;
        status: "not-started" | "in-progress" | "completed" | string;
        dueDate?: string;
        due_date?: string;
    }[];
};

type FormValues = {
    projectName: string;
    channelIds: string[];
    startDate: Date | null;
    endDate: Date | null;
};

/* ───────── validation ───────── */
const schema: yup.ObjectSchema<FormValues> = yup
    .object({
        projectName: yup.string().trim().default(""),
        channelIds: yup
            .array(yup.string().trim().required())
            .min(1, "Please select a project")
            .max(1, "Please select only one project")
            .required("Please select a project"),
        startDate: yup
            .date()
            .nullable()
            .default(null)
            .test(
                "valid",
                "Invalid start date",
                (v) => !v || !isNaN(v.getTime()),
            ),
        endDate: yup
            .date()
            .nullable()
            .default(null)
            .test("valid", "Invalid end date", (v) => !v || !isNaN(v.getTime()))
            .test(
                "after-start",
                "End date must be on/after start date",
                function (end) {
                    const start = this.parent.startDate as Date | null;
                    if (!start || !end) return true;
                    return end.getTime() >= start.getTime();
                },
            ),
    })
    .required();

/* ───────── helpers ───────── */
function fmt(d?: string | Date | null) {
    if (!d) return "";
    const date = typeof d === "string" ? new Date(d) : d;
    if (!date || isNaN(date.getTime())) return "";
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

function slugFileName(s: string) {
    return (s || "project")
        .trim()
        .replace(/\s+/g, "_")
        .replace(/[^\w\-]+/g, "") // remove weird chars
        .slice(0, 80);
}

function yyyymmdd(d: Date) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

/* ───────── component ───────── */
export default function CreateReportScreen() {
    const dispatch = useAppDispatch();

    const router = useRouter();
    const channels = useAppSelector(selectAllChannels) as Channel[];
    const isIOS = Platform.OS === "ios";

    const {
        control,
        handleSubmit,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({
        resolver: yupResolver(schema),
        defaultValues: {
            projectName: "",
            channelIds: [],
            startDate: null,
            endDate: null,
        },
        mode: "onBlur",
    });

    const selectedIds = watch("channelIds");
    const startDateValue = watch("startDate");
    const endDateValue = watch("endDate");

    /* date picker state */
    const [activeDateField, setActiveDateField] = useState<
        "start" | "end" | null
    >(null);
    const [tempDate, setTempDate] = useState<Date | null>(null);
    const [showDate, setShowDate] = useState(false);
    const [channelOpen, setChannelOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    const openDatePicker = (which: "start" | "end", current?: Date | null) => {
        setActiveDateField(which);
        setTempDate(current ?? new Date());
        setShowDate(true);
    };
    const closeDatePicker = () => {
        setShowDate(false);
        setActiveDateField(null);
    };
    const confirmDate = () => {
        if (tempDate && activeDateField) {
            setValue(
                activeDateField === "start" ? "startDate" : "endDate",
                tempDate,
                {
                    shouldValidate: true,
                },
            );
        }
        setShowDate(false);
        setActiveDateField(null);
    };
    const handleDateChange = (date: Date) => {
        setTempDate(date);
        if (Platform.OS === "ios" || !activeDateField) return;

        setValue(activeDateField === "start" ? "startDate" : "endDate", date, {
            shouldValidate: true,
        });
    };
    const handleDateDone = () => {
        if (Platform.OS === "ios") {
            confirmDate();
            return;
        }

        closeDatePicker();
    };

    useEffect(() => {
        dispatch(fetchChannels());
    }, [dispatch]);

    /* maps / selections */
    const idToName = useMemo(() => {
        const map = new Map<string, string>();
        channels.forEach((c) => map.set(c._id, c.name));
        return map;
    }, [channels]);

    const selectedNames = useMemo(
        () => selectedIds.map((id) => idToName.get(id) ?? id),
        [selectedIds, idToName],
    );
    const selectedChannelId = selectedIds[0] ?? null;

    const toggleId = (id: string) => {
        const current = watch("channelIds");
        const next = current.includes(id) ? [] : [id];
        setValue("channelIds", next, {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true,
        });
    };

    const clearAll = () => {
        setValue("channelIds", [], {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true,
        });
    };

    const formatDate = (d: Date | null) => (d ? fmt(d) : "DD/MM/YYYY");
    /* ───────── generate PDF ───────── */

    const onGenerate = handleSubmit(async (values) => {
        setIsGenerating(true);

        try {
            const channelId = values.channelIds?.[0];
            if (!channelId) {
                Alert.alert("Generate Report", "Please select a project.");
                return;
            }

            await generateChannelSummaryReport({
                channelId,
                startDate: values.startDate
                    ? yyyymmdd(values.startDate)
                    : undefined,
                endDate: values.endDate
                    ? yyyymmdd(values.endDate)
                    : undefined,
            });

            router.push({
                pathname: "/(admin)/report/[channelId]",
                params: {
                    channelId,
                    title:
                        values.projectName?.trim() ||
                        selectedNames[0] ||
                        "Generated Report",
                },
            });
        } catch (err: any) {
            console.error(err);
            Alert.alert(
                "Generate Report",
                err?.message ?? "Failed to generate.",
            );
        } finally {
            setIsGenerating(false);
        }
    });

    /* ───────── UI ───────── */
    return (
        <SafeAreaView
            className="flex-1 bg-[#F5F7FB]"
            edges={
                isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]
            }
        >
            {/* Header */}
            <PlatformAdaptiveHeader
                title="Create Report"
                backgroundColor="#F5F7FB"
            />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
            >
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{
                        paddingHorizontal: 16,
                        paddingTop: 12,
                        paddingBottom: 40,
                    }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <Text className="mb-5 font-kumbh text-sm leading-5 text-[#6B7280]">
                        Generate and export an AI summary PDF for a project
                        channel.
                    </Text>

                    <View className="gap-4">
                        {/* Channel (single) */}
                        <View>
                            <Field label="Project">
                                <Controller
                                    control={control}
                                    name="channelIds"
                                    render={({ field: { value } }) => (
                                        <Pressable
                                            onPress={() => setChannelOpen(true)}
                                            className="min-h-14 w-full flex-row items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3"
                                        >
                                            <View className="flex-1 pr-2">
                                                {value.length === 0 ? (
                                                    <Text className="font-kumbh text-base text-[#9CA3AF]">
                                                        Select Project
                                                    </Text>
                                                ) : (
                                                    <View className="flex-row flex-wrap gap-2">
                                                        {selectedNames.map(
                                                            (n) => (
                                                                <View
                                                                    key={n}
                                                                    className="rounded-full bg-[#EEF2FF] px-3 py-1"
                                                                >
                                                                    <Text className="font-kumbhBold text-xs text-[#4C5FAB]">
                                                                        {n}
                                                                    </Text>
                                                                </View>
                                                            ),
                                                        )}
                                                    </View>
                                                )}
                                            </View>
                                            <ChevronDown
                                                size={18}
                                                color="#6B7280"
                                            />
                                        </Pressable>
                                    )}
                                />
                            </Field>
                            {errors.channelIds && (
                                <Text className="mt-1.5 font-kumbh text-xs text-red-500">
                                    {String(errors.channelIds.message)}
                                </Text>
                            )}
                        </View>

                        {/* Date Range */}
                        <View>
                            <Text className="mb-2 font-kumbhBold text-sm text-[#374151]">
                                Report Period
                            </Text>
                            <View className="flex-row gap-3">
                                {/* Start Date */}
                                <View className="flex-1">
                                    <Text className="mb-1.5 font-kumbh text-xs text-[#6B7280]">
                                        Start Date
                                    </Text>
                                    <Controller
                                        control={control}
                                        name="startDate"
                                        render={() => (
                                            <Pressable
                                                onPress={() =>
                                                    openDatePicker(
                                                        "start",
                                                        startDateValue,
                                                    )
                                                }
                                                className="h-14 w-full flex-row items-center justify-between rounded-2xl border border-gray-200 bg-white px-4"
                                            >
                                                <Text
                                                    className={`font-kumbh text-sm ${
                                                        startDateValue
                                                            ? "text-[#111827]"
                                                            : "text-[#9CA3AF]"
                                                    }`}
                                                >
                                                    {formatDate(startDateValue)}
                                                </Text>
                                                <Calendar
                                                    size={17}
                                                    color="#4C5FAB"
                                                />
                                            </Pressable>
                                        )}
                                    />
                                    {errors.startDate && (
                                        <Text className="mt-1.5 font-kumbh text-xs text-red-500">
                                            {
                                                errors.startDate
                                                    .message as string
                                            }
                                        </Text>
                                    )}
                                </View>

                                {/* End Date */}
                                <View className="flex-1">
                                    <Text className="mb-1.5 font-kumbh text-xs text-[#6B7280]">
                                        End Date
                                    </Text>
                                    <Controller
                                        control={control}
                                        name="endDate"
                                        render={() => (
                                            <Pressable
                                                onPress={() =>
                                                    openDatePicker(
                                                        "end",
                                                        endDateValue,
                                                    )
                                                }
                                                className="h-14 w-full flex-row items-center justify-between rounded-2xl border border-gray-200 bg-white px-4"
                                            >
                                                <Text
                                                    className={`font-kumbh text-sm ${
                                                        endDateValue
                                                            ? "text-[#111827]"
                                                            : "text-[#9CA3AF]"
                                                    }`}
                                                >
                                                    {formatDate(endDateValue)}
                                                </Text>
                                                <Calendar
                                                    size={17}
                                                    color="#4C5FAB"
                                                />
                                            </Pressable>
                                        )}
                                    />
                                    {errors.endDate && (
                                        <Text className="mt-1.5 font-kumbh text-xs text-red-500">
                                            {errors.endDate.message as string}
                                        </Text>
                                    )}
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Footer buttons */}
                    <View className="mt-8 gap-3">
                        <Pressable
                            disabled={isSubmitting || isGenerating}
                            onPress={onGenerate}
                            className="h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-[#4C5FAB] active:opacity-90 disabled:opacity-60"
                        >
                            <Sparkles size={18} color="#FFFFFF" />
                            <Text className="font-kumbhBold text-base text-white">
                                {isGenerating ? "Generating..." : "AI Generate"}
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={() =>
                                router.push("/(admin)/report/saved-reports")
                            }
                            className="flex-row items-center justify-between rounded-[22px] border border-gray-100 bg-white p-4 active:opacity-90"
                        >
                            <View className="flex-row items-center gap-3">
                                <View className="h-10 w-10 items-center justify-center rounded-2xl bg-[#EEF2FF]">
                                    <FileText size={18} color="#4C5FAB" />
                                </View>
                                <View>
                                    <Text className="font-kumbhBold text-sm text-[#111827]">
                                        View Saved Reports
                                    </Text>
                                    <Text className="mt-0.5 font-kumbh text-xs text-[#6B7280]">
                                        Browse previously generated summaries
                                    </Text>
                                </View>
                            </View>
                            <ChevronRight size={18} color="#9CA3AF" />
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Channel Picker Modal */}
            <BottomSheetModal
                visible={channelOpen}
                onRequestClose={() => setChannelOpen(false)}
                showActionRow={false}
            >
                <View className="mb-4 flex-row items-center justify-between">
                    <View>
                        <Text className="text-xl font-kumbhBold text-[#111827]">
                            Select Project
                        </Text>
                        <Text className="mt-1 font-kumbh text-xs text-[#6B7280]">
                            Choose a project channel for this report
                        </Text>
                    </View>
                    <View className="flex-row items-center gap-2">
                        {selectedIds.length > 0 ? (
                            <Pressable
                                onPress={clearAll}
                                className="rounded-full bg-[#EEF2FF] px-3 py-1.5"
                            >
                                <Text className="font-kumbhBold text-xs text-[#4C5FAB]">
                                    Clear
                                </Text>
                            </Pressable>
                        ) : null}
                        <Pressable
                            onPress={() => setChannelOpen(false)}
                            className="h-9 w-9 items-center justify-center rounded-full bg-[#F5F7FB]"
                        >
                            <X size={17} color="#374151" />
                        </Pressable>
                    </View>
                </View>

                <FlatList
                    data={channels}
                    keyExtractor={(i) => i._id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
                    renderItem={({ item }) => {
                        const checked = selectedIds.includes(item._id);
                        return (
                            <Pressable
                                onPress={() => toggleId(item._id)}
                                className={`flex-row items-center justify-between rounded-2xl border px-4 py-3.5 ${
                                    checked
                                        ? "border-[#4C5FAB] bg-[#EEF2FF]"
                                        : "border-gray-100 bg-[#F5F7FB]"
                                }`}
                            >
                                <Text
                                    className={`flex-1 pr-3 font-kumbhBold text-sm ${
                                        checked
                                            ? "text-[#4C5FAB]"
                                            : "text-[#111827]"
                                    }`}
                                >
                                    {item.name}
                                </Text>
                                <View
                                    className={`h-6 w-6 items-center justify-center rounded-full border ${
                                        checked
                                            ? "border-[#4C5FAB] bg-[#4C5FAB]"
                                            : "border-gray-300 bg-white"
                                    }`}
                                >
                                    {checked ? (
                                        <Check size={14} color="#FFFFFF" />
                                    ) : null}
                                </View>
                            </Pressable>
                        );
                    }}
                    style={{ maxHeight: 380 }}
                />

                <Pressable
                    onPress={() => setChannelOpen(false)}
                    className="mt-4 h-12 items-center justify-center rounded-2xl bg-[#4C5FAB]"
                >
                    <Text className="font-kumbhBold text-sm text-white">
                        Done
                    </Text>
                </Pressable>

                <View className="h-2" />
            </BottomSheetModal>

            <DatePickerModal
                visible={showDate}
                value={tempDate ?? new Date()}
                onCancel={closeDatePicker}
                onDone={handleDateDone}
                onDateChange={handleDateChange}
            />

            {/* Generating overlay */}
            <Modal visible={isGenerating} transparent animationType="fade">
                <View className="flex-1 items-center justify-center bg-black/40 px-6">
                    <View className="items-center rounded-[24px] border border-gray-100 bg-white px-7 py-6">
                        <View className="mb-3 h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF2FF]">
                            <ActivityIndicator size="small" color="#4C5FAB" />
                        </View>
                        <Text className="font-kumbhBold text-base text-[#111827]">
                            Generating summary...
                        </Text>
                        <Text className="mt-1 font-kumbh text-xs text-[#6B7280]">
                            Preparing your AI report PDF
                        </Text>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
