import DatePickerModal from "@/components/admin/DatePickerModal";
import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import { CustomTextInput } from "@/components/ui/CustomInput";
import { showError, showSuccess } from "@/components/ui/toast";
import clsx from "clsx";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Calendar } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { selectCurrentClient } from "@/redux/client/client.selectors";
import {
    createClient,
    fetchClientById,
    updateClient,
} from "@/redux/client/client.thunks";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

type ManualReceivableSource =
    | "BWE"
    | "Inner Circle"
    | "Consulting"
    | "Partnerships"
    | "Retreat"
    | "Books"
    | "Internal Transfer"
    | "Others";
type AttendanceType = "physical" | "virtual";
type TableType = "individual" | "corporate";

const RECEIVABLE_SOURCE_OPTIONS: ManualReceivableSource[] = [
    "BWE",
    "Inner Circle",
    "Consulting",
    "Partnerships",
    "Retreat",
    "Books",
    "Internal Transfer",
    "Others",
];

function fmtDMY(d: Date) {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

function toISODate(dmy: string) {
    const m = dmy.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return dmy;
    const dd = m[1];
    const mm = m[2];
    const yyyy = m[3];
    return `${yyyy}-${mm}-${dd}`;
}

function toCreatedAt(dmy: string) {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    return `${toISODate(dmy)}T${hh}:${mm}:${ss}`;
}

export default function ReceivableForm() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const params = useLocalSearchParams<{ clientId?: string }>();
    const currentClient = useAppSelector(selectCurrentClient);
    const isIOS = Platform.OS === "ios";

    // Determine if we're editing
    const clientId = params?.clientId;
    const isEditing = !!clientId;

    const [amount, setAmount] = useState("");
    const [date, setDate] = useState("");
    const [desc, setDesc] = useState("");
    const [clientName, setClientName] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [source, setSource] = useState<ManualReceivableSource | "">("");
    const [tableType, setTableType] = useState<TableType | "">("");
    const [attendance, setAttendance] = useState<AttendanceType | "">("");

    const [showPicker, setShowPicker] = useState(false);
    const [pickerDate, setPickerDate] = useState<Date>(new Date());

    useEffect(() => {
        if (!isEditing || !clientId || !currentClient) return;

        const currentClientId = String(currentClient._id || "");
        if (currentClientId !== String(clientId)) return;

        setAmount(String(currentClient.payableAmount ?? 0));
        setDesc(currentClient.description || "");
        setClientName(String(currentClient.name || ""));
        setCompanyName(String(currentClient.projectName || ""));
        setSource((currentClient.engagement as ManualReceivableSource) || "");
        setTableType("");
        setAttendance("");

        const recordDate = new Date(currentClient.createdAt || Date.now());
        setDate(fmtDMY(recordDate));
    }, [isEditing, clientId, currentClient]);

    useEffect(() => {
        if (!clientId) return;
        dispatch(fetchClientById(clientId));
    }, [clientId, dispatch]);

    const openPicker = () => {
        const m = date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (m) setPickerDate(new Date(+m[3], +m[2] - 1, +m[1]));
        else setPickerDate(new Date());
        setShowPicker(true);
    };

    const onSave = async () => {
        const amt = Number(String(amount).replace(/[^\d.]/g, ""));
        if (!Number.isFinite(amt) || amt <= 0) {
            return showError("Enter a valid amount.");
        }
        if (!date) return showError("Pick a date.");
        if (!clientName.trim()) return showError("Enter the client name.");
        if (!companyName.trim()) return showError("Enter the company name.");
        if (!source) return showError("Select a receivable source.");
        if (source === "BWE" && !tableType)
            return showError("Select a BWE table type.");
        if (source === "BWE" && !attendance)
            return showError("Select a BWE attendance type.");

        try {
            const createdAt = toCreatedAt(date);

            if (isEditing && clientId) {
                await dispatch(
                    updateClient({
                        id: clientId!,
                        body: {
                            name: clientName.trim(),
                            projectName: companyName.trim(),
                            engagement: source || undefined,
                            payableAmount: amt,
                            isExternal: true,
                            description: desc.trim() || undefined,
                            status: "current",
                            createdAt,
                        },
                    }),
                ).unwrap();

                showSuccess("External client updated.");
                // router.replace({
                //     pathname: "/(admin)/clients/installments",
                //     params: { clientId: clientId! },
                // });
                router.back();
                return;
            }

            const createdRecord = await dispatch(
                createClient({
                    name: clientName.trim(),
                    projectName: companyName.trim(),
                    engagement: source || undefined,
                    payableAmount: amt,
                    isExternal: true,
                    description: desc.trim() || undefined,
                    status: "current",
                    createdAt,
                }),
            ).unwrap();

            showSuccess("External client added.");

            const createdId = (createdRecord as any)?._id;
            if (createdId) {
                router.replace({
                    pathname: "/(admin)/clients/installments",
                    params: { clientId: createdId },
                });
                return;
            }

            router.back();
        } catch (e: any) {
            showError(e?.message || "Failed to save record");
        }
    };

    return (
        <SafeAreaView
            className="flex-1 bg-[#F5F7FB]"
            edges={
                isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]
            }
        >
            <PlatformAdaptiveHeader
                title={isEditing ? "Edit Receivable" : "Record Receivable"}
                backgroundColor="#F5F7FB"
            />

            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.select({
                    ios: "padding",
                    android: "height",
                })}
                keyboardVerticalOffset={
                    Platform.select({ ios: 70, android: 0 }) as number
                }
            >
                <ScrollView
                    className="flex-1"
                    contentContainerClassName="px-4 pb-12 pt-3"
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Amount + Date */}
                    <View className="flex-row gap-3 mb-4">
                        <View className="flex-1">
                            <Text className="mb-2 text-sm text-[#374151] font-kumbhBold">
                                Amount
                            </Text>
                            <View className="h-14 flex-row items-center rounded-2xl border border-gray-200 bg-white px-4">
                                <Text className="font-kumbhBold text-[15px] text-[#6B7280] mr-1.5">
                                    ₦
                                </Text>
                                <CustomTextInput
                                    value={amount}
                                    onChangeText={setAmount}
                                    placeholder="0.00"
                                    keyboardType="numeric"
                                    className="flex-1 h-full"
                                />
                            </View>
                        </View>

                        <View className="flex-1">
                            <Text className="mb-2 text-sm text-[#374151] font-kumbhBold">
                                Date
                            </Text>
                            <Pressable
                                onPress={openPicker}
                                className="h-14 rounded-2xl border border-gray-200 bg-white px-4 flex-row items-center justify-between"
                            >
                                <Text
                                    className={clsx(
                                        "font-kumbh text-[15px]",
                                        date
                                            ? "text-[#111827]"
                                            : "text-[#9CA3AF]",
                                    )}
                                >
                                    {date || "DD/MM/YYYY"}
                                </Text>
                                <Calendar size={18} color="#4C5FAB" />
                            </Pressable>
                        </View>
                    </View>

                    <View className="mb-4">
                        <Text className="mb-2 text-sm text-[#374151] font-kumbhBold">
                            Client Name
                        </Text>
                        <View className="h-14 justify-center rounded-2xl border border-gray-200 bg-white px-4">
                            <CustomTextInput
                                value={clientName}
                                onChangeText={setClientName}
                                placeholder="Enter Client Name"
                            />
                        </View>
                    </View>

                    <View className="mb-4">
                        <Text className="mb-2 text-sm text-[#374151] font-kumbhBold">
                            Company Name
                        </Text>
                        <View className="h-14 justify-center rounded-2xl border border-gray-200 bg-white px-4">
                            <CustomTextInput
                                value={companyName}
                                onChangeText={setCompanyName}
                                placeholder="Enter Company Name"
                            />
                        </View>
                    </View>

                    <View className="mb-4">
                        <Text className="mb-2 text-sm text-[#374151] font-kumbhBold">
                            Source
                        </Text>
                        <View className="flex-row flex-wrap gap-2">
                            {RECEIVABLE_SOURCE_OPTIONS.map((item) => {
                                const active = source === item;
                                return (
                                    <Pressable
                                        key={item}
                                        onPress={() => {
                                            setSource(item);
                                            if (item === "Inner Circle")
                                                setAttendance("virtual");
                                        }}
                                        className={clsx(
                                            "px-4 py-2 rounded-full border",
                                            active
                                                ? "bg-[#4C5FAB] border-[#4C5FAB]"
                                                : "bg-white border-gray-200",
                                        )}
                                    >
                                        <Text
                                            className={clsx(
                                                "font-kumbhBold text-[13px]",
                                                active
                                                    ? "text-white"
                                                    : "text-[#374151]",
                                            )}
                                        >
                                            {item}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>

                    {source === "BWE" ? (
                        <View className="flex-row gap-3 mb-4">
                            <View className="flex-1">
                                <Text className="mb-2 text-sm text-[#374151] font-kumbhBold">
                                    Table Type
                                </Text>
                                <View className="flex-row gap-2">
                                    {(
                                        [
                                            "individual",
                                            "corporate",
                                        ] as TableType[]
                                    ).map((item) => {
                                        const active = tableType === item;
                                        return (
                                            <Pressable
                                                key={item}
                                                onPress={() =>
                                                    setTableType(item)
                                                }
                                                className={clsx(
                                                    "flex-1 h-12 rounded-2xl border items-center justify-center",
                                                    active
                                                        ? "bg-[#4C5FAB] border-[#4C5FAB]"
                                                        : "bg-white border-gray-200",
                                                )}
                                            >
                                                <Text
                                                    className={clsx(
                                                        "font-kumbhBold text-[13px] capitalize",
                                                        active
                                                            ? "text-white"
                                                            : "text-[#374151]",
                                                    )}
                                                >
                                                    {item}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </View>

                            <View className="flex-1">
                                <Text className="mb-2 text-sm text-[#374151] font-kumbhBold">
                                    Attendance
                                </Text>
                                <View className="flex-row gap-2">
                                    {(
                                        [
                                            "physical",
                                            "virtual",
                                        ] as AttendanceType[]
                                    ).map((item) => {
                                        const active = attendance === item;
                                        return (
                                            <Pressable
                                                key={item}
                                                onPress={() =>
                                                    setAttendance(item)
                                                }
                                                className={clsx(
                                                    "flex-1 h-12 rounded-2xl border items-center justify-center",
                                                    active
                                                        ? "bg-[#4C5FAB] border-[#4C5FAB]"
                                                        : "bg-white border-gray-200",
                                                )}
                                            >
                                                <Text
                                                    className={clsx(
                                                        "font-kumbhBold text-[13px] capitalize",
                                                        active
                                                            ? "text-white"
                                                            : "text-[#374151]",
                                                    )}
                                                >
                                                    {item}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </View>
                        </View>
                    ) : null}

                    {source === "Inner Circle" ? (
                        <View className="mb-4">
                            <Text className="mb-2 text-sm text-[#374151] font-kumbhBold">
                                Attendance
                            </Text>
                            <View className="h-14 justify-center rounded-2xl border border-gray-200 bg-white px-4">
                                <Text className="font-kumbh text-[15px] text-[#111827] capitalize">
                                    virtual
                                </Text>
                            </View>
                        </View>
                    ) : null}

                    <View className="mb-6">
                        <Text className="mb-2 text-sm text-[#374151] font-kumbhBold">
                            Notes
                        </Text>
                        <View className="rounded-2xl border border-gray-200 bg-white px-4 py-3.5">
                            <CustomTextInput
                                value={desc}
                                onChangeText={setDesc}
                                placeholder="Enter Notes"
                                multiline
                                textAlignVertical="top"
                                style={{ minHeight: 100 }}
                            />
                        </View>
                    </View>

                    <Pressable
                        onPress={onSave}
                        className="h-14 rounded-2xl bg-[#4C5FAB] items-center justify-center active:opacity-90"
                    >
                        <Text className="text-white text-[15px] font-kumbhBold">
                            {isEditing
                                ? "Update Receivable"
                                : "Save Receivable"}
                        </Text>
                    </Pressable>
                </ScrollView>
            </KeyboardAvoidingView>

            <DatePickerModal
                visible={showPicker}
                value={pickerDate}
                onCancel={() => setShowPicker(false)}
                onDone={(selectedDate) => {
                    const finalDate =
                        selectedDate instanceof Date ? selectedDate : pickerDate;
                    setShowPicker(false);
                    setDate(fmtDMY(finalDate));
                }}
                onDateChange={(d: Date) => setPickerDate(d)}
            />
        </SafeAreaView>
    );
}
