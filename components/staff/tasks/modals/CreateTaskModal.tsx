import OptionSheet from "@/components/common/OptionSheet";
import { showError, showSuccess } from "@/components/ui/toast";
import { toApiStatus } from "@/features/client/statusMap";
import { StatusKey, TAB_ORDER } from "@/features/staff/types";
import {
    normalizeCode,
    selectAllChannels,
    selectCodeIndex,
    selectMyChannelsByUserId,
} from "@/redux/channels/channels.selectors";
import {
    createChannelTask,
    fetchChannelById,
    fetchChannels,
} from "@/redux/channels/channels.thunks";
import {
    assignPersonalTask,
    createPersonalTask,
    fetchPersonalTasks,
} from "@/redux/personalTasks/personalTasks.thunks";
import { selectUser } from "@/redux/user/user.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { isAdminLikeRole } from "@/utils/roles";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    TouchableWithoutFeedback,
    View,
} from "react-native";

type Mode = "channel" | "personal";

export default function CreateTaskModal({
    visible,
    onClose,
    forcePersonalForUserId,
    hideModeToggle = false,
    defaultChannelId = null,
}: {
    visible: boolean;
    onClose: () => void;
    forcePersonalForUserId?: string | null;
    hideModeToggle?: boolean;
    defaultChannelId?: string | null;
}) {
    const dispatch = useAppDispatch();
    const user = useAppSelector(selectUser);
    const loggedInUserId = user?._id ?? null;

    const role = (user?.role || "").toLowerCase();
    const allowPersonalByRole = [
        "staff",
        "supervisor",
        "admin",
        "super-admin",
        "client",
    ].includes(role);

    const allowPersonal = forcePersonalForUserId ? true : allowPersonalByRole;

    const channels = useAppSelector((s) =>
        selectMyChannelsByUserId(s, loggedInUserId),
    );
    const codeIndex = useAppSelector(selectCodeIndex);
    const allChannels = useAppSelector(selectAllChannels);

    const [mode, setMode] = useState<Mode>("channel");
    const isAdminish = isAdminLikeRole(user?.role);

    useEffect(() => {
        if (visible) {
            dispatch(fetchChannels());
            setShowChannelPicker(false);
            setSelectedChannelId(defaultChannelId || null);
            setChannelCode("");

            // Lock to personal if forced
            if (forcePersonalForUserId) {
                setMode("personal");
            } else {
                setMode("channel");
            }
        }
    }, [visible, dispatch, forcePersonalForUserId, defaultChannelId]);

    const [title, setTitle] = useState("");
    const [desc, setDesc] = useState("");
    const [channelCode, setChannelCode] = useState("");
    const [status, setStatus] = useState<StatusKey>("in-progress");
    const [showChannelPicker, setShowChannelPicker] = useState(false);
    const [selectedChannelId, setSelectedChannelId] = useState<string | null>(
        null,
    );
    const creatingLockRef = useRef(false);
    const [creatingTask, setCreatingTask] = useState(false);

    // if user isn't allowed personal, force channel mode on open/role change
    useEffect(() => {
        if (!allowPersonal && mode === "personal") {
            setMode("channel");
        }
    }, [allowPersonal, mode, visible]);

    const reset = () => {
        setTitle("");
        setDesc("");
        setChannelCode("");
        setStatus("in-progress");
        setShowChannelPicker(false);
        setSelectedChannelId(null);
        setMode("channel");
    };

    const resolveChannelId = React.useCallback(
        (codeRaw: string): string | null => {
            const norm = normalizeCode(codeRaw);
            if (!norm) return null;
            const viaMap = codeIndex.get(norm);
            if (viaMap) return viaMap;
            const found = (channels as any[]).find(
                (c) => normalizeCode(c?.code) === norm,
            );
            return found?._id ?? found?.id ?? null;
        },
        [channels, codeIndex],
    );

    const channelOptions = useMemo(
        () =>
            allChannels
                .filter((c) => (c as any)?.code)
                .map((c) => ({
                    label: `${c.name ?? "Untitled"} · ${c.code ?? "#—"}`,
                    value: c.code ?? "",
                })),
        [allChannels],
    );

    const defaultChannel = useMemo(
        () => allChannels.find((c) => c._id === defaultChannelId),
        [allChannels, defaultChannelId],
    );

    useEffect(() => {
        if (!visible) return;
        if (!defaultChannelId) return;
        if (selectedChannelId && selectedChannelId !== defaultChannelId) return;
        if (channelCode) return;
        if (!defaultChannel?.code) return;
        setSelectedChannelId(defaultChannelId);
        setChannelCode(defaultChannel.code);
    }, [
        visible,
        defaultChannelId,
        defaultChannel?.code,
        selectedChannelId,
        channelCode,
    ]);

    const selectedChannel = useMemo(
        () => allChannels.find((c) => c._id === selectedChannelId),
        [allChannels, selectedChannelId],
    );

    const handleChannelSelect = (value: string | number) => {
        const codeValue = String(value);
        const found = allChannels.find(
            (c) => normalizeCode(c?.code) === normalizeCode(codeValue),
        );
        setChannelCode(found?.code ?? codeValue);
        setSelectedChannelId(found?._id ?? null);
        setShowChannelPicker(false);
    };

    const create = async () => {
        if (creatingLockRef.current) return;

        const name = title.trim();
        if (!name) return;

        const description = desc.trim() || null;
        try {
            creatingLockRef.current = true;
            setCreatingTask(true);

            if (forcePersonalForUserId || mode === "personal") {
                // Personal task flow
                if (isAdminish && forcePersonalForUserId) {
                    // Admin/Super-admin assigning to a staff
                    await dispatch(
                        assignPersonalTask({
                            assignedTo: forcePersonalForUserId, // ← staff user id
                            name,
                            description,
                            status: toApiStatus(status) as any,
                        }),
                    ).unwrap();

                    await dispatch(fetchPersonalTasks());
                    showSuccess("Personal task assigned to staff.");
                } else {
                    // Normal personal task for self
                    const targetUserId = loggedInUserId;
                    if (!targetUserId) {
                        showError("User not loaded yet.");
                        return;
                    }

                    await dispatch(
                        createPersonalTask({
                            name,
                            description,
                            status: toApiStatus(status) as any,
                        }),
                    ).unwrap();

                    await dispatch(fetchPersonalTasks());
                    showSuccess("Personal task created.");
                }
            } else {
                // Channel task flow
                const code = channelCode.trim();
                const channelId = selectedChannelId ?? resolveChannelId(code);
                if (!channelId) {
                    showError("Project Code not found.");
                    return;
                }

                await dispatch(
                    createChannelTask({
                        channelId,
                        name,
                        description,
                        status: toApiStatus(status),
                    }),
                ).unwrap();

                await dispatch(fetchChannelById(channelId));
                showSuccess("Channel task created.");
            }

            reset();
            onClose();
        } catch {
            // errors are already surfaced by thunks/toasts in your app
        } finally {
            creatingLockRef.current = false;
            setCreatingTask(false);
        }
    };

    useEffect(() => {
        if (!visible) {
            setShowChannelPicker(false);
        }
    }, [visible]);

    const modes: Mode[] = forcePersonalForUserId
        ? ["personal"]
        : allowPersonal
          ? ["channel", "personal"]
          : ["channel"];

    if (isAdminish && mode === "personal" && !forcePersonalForUserId) {
        showError("Pick a staff member to assign this personal task to.");
        return;
    }

    const closeAll = () => {
        setShowChannelPicker(false);
        onClose();
    };

    return (
        <>
            <Modal
                visible={visible}
                animationType="slide"
                transparent
                presentationStyle="overFullScreen"
                onRequestClose={closeAll}
            >
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                >
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View className="flex-1 bg-black/40 justify-end">
                            <View className="bg-white rounded-t-3xl py-8 px-5 max-h-[85%]">
                                <ScrollView
                                    keyboardShouldPersistTaps="handled"
                                    contentContainerStyle={{
                                        paddingBottom: 12,
                                    }}
                                    showsVerticalScrollIndicator={false}
                                >
                                    <Text className="font-kumbhBold text-[20px] text-[#111827]">
                                        Create Task
                                    </Text>

                                    {!hideModeToggle && (
                                        <View
                                            className="mt-4 flex-row"
                                            style={{ gap: 8 }}
                                        >
                                            {modes.map((m) => {
                                                const selected = m === mode;
                                                return (
                                                    <Pressable
                                                        key={m}
                                                        onPress={() =>
                                                            setMode(m)
                                                        }
                                                        className="rounded-full px-4 py-2"
                                                        style={{
                                                            backgroundColor:
                                                                selected
                                                                    ? "#111827"
                                                                    : "#E5E7EB",
                                                        }}
                                                    >
                                                        <Text
                                                            className="font-kumbh text-[12px]"
                                                            style={{
                                                                color: selected
                                                                    ? "#FFFFFF"
                                                                    : "#111827",
                                                            }}
                                                        >
                                                            {m === "channel"
                                                                ? "Assign to Channel"
                                                                : "My Personal Task"}
                                                        </Text>
                                                    </Pressable>
                                                );
                                            })}
                                        </View>
                                    )}

                                    {!allowPersonal && (
                                        <Text className="font-kumbh text-[12px] text-[#9CA3AF] mt-2">
                                            Personal tasks are reserved for
                                            staff and client roles.
                                        </Text>
                                    )}

                                    <TextInput
                                        value={title}
                                        onChangeText={setTitle}
                                        placeholder="Task title"
                                        placeholderTextColor="#9CA3AF"
                                        className="font-kumbh mt-4 rounded-xl bg-[#F3F4F6] px-4 py-3 text-[#111827]"
                                    />

                                    <TextInput
                                        value={desc}
                                        onChangeText={setDesc}
                                        placeholder="Task Description"
                                        placeholderTextColor="#9CA3AF"
                                        className="font-kumbh mt-3 rounded-xl bg-[#F3F4F6] px-4 py-3 text-[#111827]"
                                        multiline
                                    />

                                    {mode === "channel" &&
                                        !forcePersonalForUserId && (
                                            <View className="mt-3">
                                                <Text className="font-kumbh text-[#6B7280] mb-1">
                                                    Project Code
                                                </Text>
                                                <Pressable
                                                    onPress={() =>
                                                        setShowChannelPicker(
                                                            true,
                                                        )
                                                    }
                                                    className="rounded-xl border border-gray-200 bg-[#F3F4F6] px-4 py-3"
                                                >
                                                    <Text
                                                        className="font-kumbh text-[#111827]"
                                                        numberOfLines={1}
                                                        ellipsizeMode="tail"
                                                    >
                                                        {selectedChannel?.name ??
                                                            "Select project"}
                                                    </Text>
                                                    <Text className="font-kumbh text-[12px] text-[#6B7280]">
                                                        {selectedChannel?.code ??
                                                            channelCode ??
                                                            "#—"}
                                                    </Text>
                                                </Pressable>
                                            </View>
                                        )}

                                    {/* Status */}
                                    <View className="mt-4">
                                        <Text className="font-kumbh text-[#6B7280] mb-2">
                                            Status
                                        </Text>
                                        <View
                                            className="flex-row flex-wrap"
                                            style={{ gap: 8 }}
                                        >
                                            {TAB_ORDER.map((s) => {
                                                const selected = s === status;
                                                return (
                                                    <Pressable
                                                        key={s}
                                                        onPress={() =>
                                                            setStatus(s)
                                                        }
                                                        className="rounded-full px-4 py-2"
                                                        style={{
                                                            backgroundColor:
                                                                selected
                                                                    ? "#111827"
                                                                    : "#E5E7EB",
                                                        }}
                                                    >
                                                        <Text
                                                            className="font-kumbh text-[12px]"
                                                            style={{
                                                                color: selected
                                                                    ? "#FFFFFF"
                                                                    : "#111827",
                                                            }}
                                                        >
                                                            {s.replace(
                                                                "-",
                                                                " ",
                                                            )}
                                                        </Text>
                                                    </Pressable>
                                                );
                                            })}
                                        </View>
                                    </View>

                                    <View
                                        className="flex-row justify-end items-center mt-6"
                                        style={{ gap: 12 }}
                                    >
                                        <Pressable onPress={closeAll}>
                                            <Text className="font-kumbh text-[#6B7280]">
                                                Cancel
                                            </Text>
                                        </Pressable>
                                        <Pressable
                                            disabled={creatingTask}
                                            onPress={create}
                                            className="rounded-xl px-5 py-3"
                                            style={{
                                                backgroundColor: creatingTask
                                                    ? "#4C5FAB99"
                                                    : "#4C5FAB",
                                            }}
                                        >
                                            <Text className="font-kumbh text-white">
                                                {creatingTask
                                                    ? "Creating..."
                                                    : "Create"}
                                            </Text>
                                        </Pressable>
                                    </View>
                                </ScrollView>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
                <OptionSheet
                    visible={showChannelPicker}
                    onClose={() => setShowChannelPicker(false)}
                    onSelect={handleChannelSelect}
                    title="Select project"
                    options={channelOptions}
                    selectedValue={channelCode || undefined}
                />
            </Modal>
        </>
    );
}
