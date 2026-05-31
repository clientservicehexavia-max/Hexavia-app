import { api } from "@/api/axios";
import DatePickerModal from "@/components/admin/DatePickerModal";
import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import { selectAllChannels } from "@/redux/channels/channels.slice";
import { fetchChannels } from "@/redux/channels/channels.thunks";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { yupResolver } from "@hookform/resolvers/yup";
import { useRouter } from "expo-router";
import { Check, ChevronDown } from "lucide-react-native";
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

type SummaryPdfResponse = {
    success?: boolean;
    pdfUrl?: string;
    summaryText?: string;
    message?: string;
    filename?: string;
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

            await api.post<SummaryPdfResponse>(
                `/channel/${channelId}/summary-pdf`,
                {
                    startDate: values.startDate
                        ? yyyymmdd(values.startDate)
                        : undefined,
                    endDate: values.endDate
                        ? yyyymmdd(values.endDate)
                        : undefined,
                },
                { timeout: 120_000 },
            );

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
            className="flex-1 bg-white"
            edges={isIOS ? ["left", "right"] : ["top", "left", "right"]}
        >
            {/* Header */}
            <PlatformAdaptiveHeader title="Create Report" />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
            >
                <ScrollView
                    className="flex-1"
                    contentContainerClassName="px-5 pb-32"
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Title + blurb */}
                    <Text className="mt-4 text-2xl font-kumbhBold text-black">
                        Report
                    </Text>
                    <Text className="mt-3 text-base font-kumbh leading-6 text-gray-500">
                        Generate and export an AI summary PDF for a project
                        channel.
                    </Text>

                    {/* Project Name */}
                    {/* <Text className="mt-6 text-lg font-kumbh text-black">
                        Project Name
                    </Text>
                    <Controller
                        control={control}
                        name="projectName"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput
                                className="mt-2 h-14 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 font-kumbh text-[16px] text-black"
                                placeholder="Enter Project Name"
                                placeholderTextColor="#9CA3AF"
                                onBlur={onBlur}
                                onChangeText={onChange}
                                value={value}
                            />
                        )}
                    />
                    {errors.projectName && (
                        <Text className="mt-1 font-kumbh text-sm text-red-500">
                            {errors.projectName.message}
                        </Text>
                    )} */}

                    {/* Channel (single) */}
                    <Text className="mt-5 text-lg font-kumbh text-black">
                        Project
                    </Text>
                    <Controller
                        control={control}
                        name="channelIds"
                        render={({ field: { value } }) => (
                            <Pressable
                                onPress={() => setChannelOpen(true)}
                                className="mt-2 min-h-14 w-full flex-row items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3"
                            >
                                <View className="flex-1">
                                    {value.length === 0 ? (
                                        <Text className="font-kumbh text-[16px] text-gray-400">
                                            Select Project
                                        </Text>
                                    ) : (
                                        <View>
                                            <View className="flex-row flex-wrap gap-2">
                                                {selectedNames.map((n) => (
                                                    <View
                                                        key={n}
                                                        className="px-3 py-1 rounded-full bg-white border border-gray-200"
                                                    >
                                                        <Text className="font-kumbh text-sm text-gray-700">
                                                            {n}
                                                        </Text>
                                                    </View>
                                                ))}
                                            </View>
                                        </View>
                                    )}
                                </View>
                                <ChevronDown size={20} color="#6B7280" />
                            </Pressable>
                        )}
                    />
                    {errors.channelIds && (
                        <Text className="mt-1 font-kumbh text-sm text-red-500">
                            {String(errors.channelIds.message)}
                        </Text>
                    )}

                    {/* Date Range */}
                    <View className="mt-5">
                        <Text className="text-lg font-kumbh text-black">
                            Report Period
                        </Text>
                        <View className="mt-2 flex-row gap-4">
                            {/* Start Date */}
                            <View className="flex-1">
                                <Text className="font-kumbh text-[12px] text-gray-500 mb-1">
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
                                            className="h-14 w-full flex-row items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4"
                                        >
                                            <Text
                                                className={`font-kumbh text-[16px] ${
                                                    startDateValue
                                                        ? "text-black"
                                                        : "text-gray-400"
                                                }`}
                                            >
                                                {formatDate(startDateValue)}
                                            </Text>
                                            <ChevronDown
                                                size={18}
                                                color="#6B7280"
                                            />
                                        </Pressable>
                                    )}
                                />
                                {errors.startDate && (
                                    <Text className="mt-1 font-kumbh text-sm text-red-500">
                                        {errors.startDate.message as string}
                                    </Text>
                                )}
                            </View>

                            {/* End Date */}
                            <View className="flex-1">
                                <Text className="font-kumbh text-[12px] text-gray-500 mb-1">
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
                                            className="h-14 w-full flex-row items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4"
                                        >
                                            <Text
                                                className={`font-kumbh text-[16px] ${
                                                    endDateValue
                                                        ? "text-black"
                                                        : "text-gray-400"
                                                }`}
                                            >
                                                {formatDate(endDateValue)}
                                            </Text>
                                            <ChevronDown
                                                size={18}
                                                color="#6B7280"
                                            />
                                        </Pressable>
                                    )}
                                />
                                {errors.endDate && (
                                    <Text className="mt-1 font-kumbh text-sm text-red-500">
                                        {errors.endDate.message as string}
                                    </Text>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* Footer buttons */}
                    <View className="mt-10 flex-row items-center justify-between">
                        <Pressable
                            disabled={isSubmitting || isGenerating}
                            onPress={onGenerate}
                            className="flex-1 rounded-2xl bg-primary py-4 disabled:opacity-60"
                        >
                            <Text className="text-center font-kumbh text-[16px] font-semibold text-white">
                                {isGenerating ? "Generating..." : "AI Generate"}
                            </Text>
                        </Pressable>
                    </View>

                    <Pressable
                        onPress={() =>
                            router.push("/(admin)/report/saved-reports")
                        }
                        className="mt-4 rounded-2xl border border-gray-200 bg-white py-3"
                    >
                        <Text className="text-center font-kumbhBold text-gray-800">
                            View Saved Reports
                        </Text>
                    </Pressable>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Channel Picker Modal */}
            <Modal visible={channelOpen} transparent animationType="fade">
                <Pressable
                    onPress={() => setChannelOpen(false)}
                    className="flex-1 bg-black/30"
                />
                <View className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-white p-5">
                    <View className="mb-3 flex-row items-center justify-between">
                        <Text className="text-lg font-kumbh font-semibold text-black">
                            Select Project
                        </Text>
                        <Pressable onPress={clearAll} className="px-2 py-1">
                            <Text className="font-kumbh text-primary">
                                Clear
                            </Text>
                        </Pressable>
                    </View>

                    <FlatList
                        data={channels}
                        keyExtractor={(i) => i._id}
                        ItemSeparatorComponent={() => (
                            <View className="h-[1px] bg-gray-100" />
                        )}
                        renderItem={({ item }) => {
                            const checked = selectedIds.includes(item._id);
                            return (
                                <Pressable
                                    onPress={() => toggleId(item._id)}
                                    className="py-3 flex-row items-center justify-between"
                                >
                                    <Text className="font-kumbh text-[16px] text-black">
                                        {item.name}
                                    </Text>
                                    <View
                                        className={`w-6 h-6 rounded-md border items-center justify-center ${
                                            checked
                                                ? "bg-primary border-primary"
                                                : "border-gray-300 bg-white"
                                        }`}
                                    >
                                        {checked ? (
                                            <Check size={16} color="#fff" />
                                        ) : null}
                                    </View>
                                </Pressable>
                            );
                        }}
                        style={{ maxHeight: 380 }}
                    />

                    <View className="mt-4 flex-row gap-3">
                        <Pressable
                            onPress={() => setChannelOpen(false)}
                            className="flex-1 items-center justify-center rounded-2xl border border-gray-200 py-3"
                        >
                            <Text className="font-kumbh">Done</Text>
                        </Pressable>
                    </View>

                    <View className="h-3" />
                </View>
            </Modal>

            <DatePickerModal
                visible={showDate}
                value={tempDate ?? new Date()}
                onCancel={closeDatePicker}
                onDone={handleDateDone}
                onDateChange={handleDateChange}
            />

            {/* Generating overlay */}
            <Modal visible={isGenerating} transparent animationType="fade">
                <View className="flex-1 items-center justify-center bg-black/40">
                    <View className="rounded-2xl bg-white px-5 py-6 items-center">
                        <ActivityIndicator size="large" />
                        <Text className="mt-3 font-kumbh">
                            Generating summary...
                        </Text>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
