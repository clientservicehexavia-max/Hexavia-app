import { api } from "@/api/axios";
import OptionSheet from "@/components/common/OptionSheet";
import { showError } from "@/components/ui/toast";
import { toApiStatus } from "@/features/client/statusMap";
import { StatusKey, TAB_ORDER, Task } from "@/features/staff/types";
import {
    normalizeCode,
    selectCodeIndex,
} from "@/redux/channels/channels.selectors";
import {
    assignChannelTaskMembers,
    deleteChannelTask,
    fetchChannelById,
    fetchChannelTasks,
    unassignChannelTaskMember,
} from "@/redux/channels/channels.thunks";
import { fetchPersonalTasks } from "@/redux/personalTasks/personalTasks.thunks";
import { getToken } from "@/storage/auth";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    Text,
    TextInput,
    View,
} from "react-native";

export default function TaskDetailModal({
    visible,
    onClose,
    task,
    onTaskDeleted,
}: {
    visible: boolean;
    onClose: () => void;
    task: Task;
    onTaskDeleted?: (taskId: string) => void;
}) {
    const dispatch = useAppDispatch();

    const isPersonal = task.channelCode === "personal";
    const role = useAppSelector(
        (s) => s.auth.user?.role ?? s.user.user?.role ?? null,
    );
    const canManageAssignments = !isPersonal && role !== "staff";

    const codeIndex = useAppSelector(selectCodeIndex);

    const brr = getToken();

    const resolvedChannelId = useMemo(() => {
        if (isPersonal) return undefined;
        if ((task as any).channelId) return String((task as any).channelId);
        const norm = normalizeCode(task.channelCode);
        if (!norm) return undefined;
        const viaIndex = codeIndex.get(norm);
        return viaIndex ? String(viaIndex) : undefined;
    }, [isPersonal, task, codeIndex]);

    const [name, setName] = useState<string>(task.title);
    const [desc, setDesc] = useState<string>(task.description ?? "");
    const [pending, setPending] = useState<StatusKey>(task.status);
    const [saving, setSaving] = useState(false);
    const [assignedMembers, setAssignedMembers] = useState<
        Array<{ id: string; name?: string | null; email?: string | null }>
    >([]);
    const [channelMembers, setChannelMembers] = useState<
        Array<{
            id: string;
            name?: string | null;
            email?: string | null;
            type?: string | null;
        }>
    >([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [showMemberPicker, setShowMemberPicker] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [unassigningId, setUnassigningId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [noMembers, setNoMembers] = useState(false);

    useEffect(() => {
        if (visible) {
            setName(task.title);
            setDesc(task.description ?? "");
            setPending(task.status);
        }
    }, [visible, task]);

    const deriveAssigned = useMemo(() => {
        const raw =
            (task as any)?.assignees ??
            (task as any)?.assignedTo ??
            (task as any)?.assignee ??
            (task as any)?.members ??
            [];
        const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
        return arr
            .map((a: any, idx: number) => {
                const base = typeof a === "string" ? { _id: a } : (a ?? {});
                const entry =
                    base?.user ?? base?.member ?? base?.assignee ?? base ?? {};
                const id =
                    entry?._id ??
                    entry?.id ??
                    base?._id ??
                    base?.id ??
                    base?.userId ??
                    base?.memberId ??
                    (typeof a === "string" ? a : null) ??
                    `assignee-${idx}`;
                const name =
                    entry?.name ??
                    entry?.fullname ??
                    entry?.username ??
                    entry?.email ??
                    base?.name ??
                    base?.email ??
                    null;
                const email = entry?.email ?? base?.email ?? null;
                return {
                    id: id ? String(id) : "",
                    name: name ? String(name) : null,
                    email: email ? String(email) : null,
                };
            })
            .filter((a: any) => a.id);
    }, [task]);

    const resolvedAssigned = useMemo(() => {
        if (!channelMembers.length) return deriveAssigned;
        const byId = new Map(channelMembers.map((m) => [m.id, m]));
        return deriveAssigned.map((a) => {
            if (a.name || a.email) return a;
            const member = byId.get(a.id);
            if (!member) return a;
            return {
                ...a,
                name: member.name ?? a.name ?? null,
                email: member.email ?? a.email ?? null,
            };
        });
    }, [deriveAssigned, channelMembers]);

    useEffect(() => {
        setAssignedMembers(resolvedAssigned);
    }, [resolvedAssigned, visible]);

    const loadMembers = React.useCallback(async () => {
        if (isPersonal || !resolvedChannelId) return [];
        setMembersLoading(true);
        setNoMembers(false);
        try {
            const res = await api.get(`/channel/${resolvedChannelId}/members`);
            const members = Array.isArray(res.data?.members)
                ? res.data.members
                : [];
            const mapped = members
                .map((m: any) => ({
                    id: String(
                        m?.id ??
                            m?._id ??
                            m?.userId ??
                            m?.user?._id ??
                            m?.user?.id ??
                            "",
                    ),
                    name:
                        m?.name ??
                        m?.fullname ??
                        m?.username ??
                        m?.user?.name ??
                        null,
                    email: m?.email ?? m?.user?.email ?? null,
                    type: m?.type ?? m?.role ?? null,
                }))
                .filter((m: any) => m.id);
            setChannelMembers(mapped);
            setNoMembers(mapped.length === 0);
            return mapped;
        } catch (err: any) {
            setNoMembers(true);
            return [];
        } finally {
            setMembersLoading(false);
        }
    }, [isPersonal, resolvedChannelId]);

    useEffect(() => {
        if (!visible || !canManageAssignments || !resolvedChannelId) return;
        loadMembers();
    }, [visible, canManageAssignments, resolvedChannelId, loadMembers]);

    const memberOptions = useMemo(
        () =>
            channelMembers.map((m) => ({
                label: `${m.name || m.email || "Member"}${m.type ? ` · ${m.type}` : ""}`,
                value: m.id,
            })),
        [channelMembers],
    );

    const handleAssignMember = async (memberId: string) => {
        if (!resolvedChannelId) {
            showError("Could not resolve channel id for this task.");
            return;
        }
        if (assigning) return;
        setAssigning(true);
        try {
            await dispatch(
                assignChannelTaskMembers({
                    channelId: resolvedChannelId,
                    taskId: task.id,
                    members: [memberId],
                }),
            ).unwrap();
            const member = channelMembers.find((m) => m.id === memberId);
            setAssignedMembers((prev) => {
                if (prev.some((p) => p.id === memberId)) return prev;
                return [
                    ...prev,
                    {
                        id: memberId,
                        name: member?.name ?? null,
                        email: member?.email ?? null,
                    },
                ];
            });
            await dispatch(fetchChannelTasks(resolvedChannelId));
        } catch {
            // error already surfaced
        } finally {
            setAssigning(false);
        }
    };

    const handleUnassignMember = async (memberId: string) => {
        if (!resolvedChannelId) {
            showError("Could not resolve channel id for this task.");
            return;
        }
        if (unassigningId) return;
        setUnassigningId(memberId);
        try {
            await dispatch(
                unassignChannelTaskMember({
                    channelId: resolvedChannelId,
                    taskId: task.id,
                    userId: memberId,
                }),
            ).unwrap();
            setAssignedMembers((prev) => prev.filter((m) => m.id !== memberId));
            await dispatch(fetchChannelTasks(resolvedChannelId));
        } catch {
            // error already surfaced
        } finally {
            setUnassigningId(null);
        }
    };

    const canSave = useMemo(() => {
        const changedText =
            name.trim() !== task.title ||
            (desc.trim() || "") !== (task.description?.trim() || "");
        const changedStatus = pending !== task.status;
        return changedText || changedStatus;
    }, [name, desc, pending, task]);

    const save = async () => {
        if (!canSave || saving || deleting) return;

        try {
            setSaving(true);

            const payload = {
                channelId: !isPersonal ? resolvedChannelId : undefined,
                taskId: task.id,
                name: name.trim(),
                description: desc.trim() === "" ? null : desc.trim(),
                status: toApiStatus(pending),
            };

            if (isPersonal) {
                // PERSONAL: direct API call (adjust the path if your final route differs)
                await api.put(
                    "/personal-task",
                    {
                        taskId: payload.taskId,
                        name: payload.name,
                        description: payload.description,
                        status: payload.status,
                    },
                    brr
                        ? { headers: { Authorization: `BRR ${brr}` } }
                        : undefined,
                );

                // Refresh personal list so UI updates
                await dispatch(fetchPersonalTasks());
            } else {
                if (!resolvedChannelId) {
                    showError("Could not resolve channel id for this task.");
                    setSaving(false);
                    return;
                }

                const res = await api.put("/channel/update-task", {
                    channelId: resolvedChannelId,
                    taskId: payload.taskId,
                    name: payload.name,
                    description: payload.description,
                    status: payload.status,
                });

                // console.log(res.data);

                await dispatch(fetchChannelById(resolvedChannelId));
            }

            onClose();
        } catch (err: any) {
            console.log("TaskDetailModal direct API save error:", err);
            showError(
                err?.message ? String(err.message) : "Failed to save task.",
            );
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteTask = () => {
        if (isPersonal) {
            showError(
                "Delete from this view is only available for channel tasks.",
            );
            return;
        }
        if (!resolvedChannelId) {
            showError("Could not resolve channel id for this task.");
            return;
        }
        if (deleting || saving) return;

        Alert.alert("Delete task?", "This action cannot be undone.", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    try {
                        setDeleting(true);
                        await dispatch(
                            deleteChannelTask({
                                channelId: resolvedChannelId,
                                taskId: task.id,
                            }),
                        ).unwrap();
                        await dispatch(fetchChannelTasks(resolvedChannelId));
                        onTaskDeleted?.(task.id);
                        onClose();
                    } catch {
                        // error already surfaced by thunk
                    } finally {
                        setDeleting(false);
                    }
                },
            },
        ]);
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={
                    Platform.select({ ios: 70, android: 0 }) as number
                }
            >
                <Pressable
                    className="flex-1 bg-black/40 justify-end"
                    onPress={() => {
                        Keyboard.dismiss();
                        onClose();
                    }}
                >
                    <Pressable
                        onPress={(e) => e.stopPropagation()}
                        className="bg-white rounded-t-3xl px-4 py-8"
                    >
                        <Text className="font-kumbhBold text-[20px] text-[#111827]">
                            Task Details
                        </Text>

                        <Text className="font-kumbh text-[#6B7280] mt-2">
                            {isPersonal
                                ? "Type: Personal"
                                : `Channel: ${task.channelCode}`}
                        </Text>

                        <Text className="font-kumbh text-[#6B7280] mt-4 mb-2">
                            Name
                        </Text>
                        <TextInput
                            value={name}
                            onChangeText={setName}
                            placeholder="Enter task name"
                            className="font-kumbh text-[#111827] border border-[#E5E7EB] rounded-xl px-4 py-3"
                        />

                        <Text className="font-kumbh text-[#6B7280] mt-4 mb-2">
                            Description
                        </Text>
                        <TextInput
                            value={desc}
                            onChangeText={setDesc}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                            placeholder="Add a short description"
                            className="font-kumbh text-[#111827] border border-[#E5E7EB] rounded-xl px-4 py-3"
                            style={{ minHeight: 120 }}
                        />

                        <Text className="font-kumbh text-[#6B7280] mt-4 mb-2">
                            Change Status
                        </Text>
                        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                            {TAB_ORDER.map((s) => {
                                const selected = pending === s;
                                return (
                                    <Pressable
                                        key={s}
                                        onPress={() => setPending(s)}
                                        className="rounded-full py-[6px]"
                                        style={{
                                            backgroundColor: selected
                                                ? "#111827"
                                                : "#E5E7EB",
                                        }}
                                    >
                                        <Text
                                            className="font-kumbh text-[12px] capitalize px-3"
                                            style={{
                                                color: selected
                                                    ? "#fff"
                                                    : "#111827",
                                            }}
                                        >
                                            {s.replace("-", " ")}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>

                        {canManageAssignments ? (
                            <View className="mt-4">
                                <Text className="font-kumbh text-[#6B7280] mb-2">
                                    Assigned members
                                </Text>
                                {assignedMembers.length ? (
                                    <View style={{ gap: 8 }}>
                                        {assignedMembers.map((m) => (
                                            <View
                                                key={m.id}
                                                className="flex-row items-center justify-between rounded-xl border border-[#E5E7EB] px-3 py-2"
                                            >
                                                <View className="flex-1 mr-2">
                                                    <Text className="font-kumbh text-[#111827]">
                                                        {m.name ||
                                                            m.email ||
                                                            m.id}
                                                    </Text>
                                                    {!!m.email && (
                                                        <Text className="font-kumbh text-[12px] text-[#6B7280]">
                                                            {m.email}
                                                        </Text>
                                                    )}
                                                </View>
                                                <Pressable
                                                    onPress={() =>
                                                        handleUnassignMember(
                                                            m.id,
                                                        )
                                                    }
                                                    disabled={!!unassigningId}
                                                    className="rounded-lg px-3 py-1"
                                                    style={{
                                                        backgroundColor:
                                                            "#FEE2E2",
                                                        opacity:
                                                            unassigningId ===
                                                            m.id
                                                                ? 0.6
                                                                : 1,
                                                    }}
                                                >
                                                    <Text className="font-kumbh text-[12px] text-[#B91C1C]">
                                                        {unassigningId === m.id
                                                            ? "Removing…"
                                                            : "Remove"}
                                                    </Text>
                                                </Pressable>
                                            </View>
                                        ))}
                                    </View>
                                ) : (
                                    <Text className="font-kumbh text-[12px] text-[#9CA3AF]">
                                        No members assigned yet.
                                    </Text>
                                )}

                                <Pressable
                                    onPress={async () => {
                                        if (membersLoading) return;
                                        if (!memberOptions.length) {
                                            const fetched = await loadMembers();
                                            if (!fetched.length) return;
                                        }
                                        setShowMemberPicker(true);
                                    }}
                                    className="mt-3 rounded-xl border border-[#E5E7EB] px-4 py-3"
                                >
                                    <View className="flex-row items-center justify-between">
                                        <Text className="font-kumbh text-[#111827]">
                                            Assign member
                                        </Text>
                                        {membersLoading ? (
                                            <ActivityIndicator
                                                size="small"
                                                color="#4C5FAB"
                                            />
                                        ) : null}
                                    </View>
                                </Pressable>
                                {noMembers && !membersLoading ? (
                                    <Text className="mt-2 font-kumbh text-[12px] text-[#9CA3AF]">
                                        No members found for this channel.
                                    </Text>
                                ) : null}
                            </View>
                        ) : null}

                        <View
                            className="flex-row justify-end items-center mt-6"
                            style={{ gap: 12 }}
                        >
                            {!isPersonal ? (
                                <Pressable
                                    disabled={saving || deleting}
                                    onPress={handleDeleteTask}
                                >
                                    <Text className="font-kumbh text-[#B91C1C]">
                                        {deleting ? "Deleting..." : "Delete"}
                                    </Text>
                                </Pressable>
                            ) : null}
                            <Pressable
                                disabled={saving || deleting}
                                onPress={onClose}
                            >
                                <Text className="font-kumbh text-[#6B7280]">
                                    Close
                                </Text>
                            </Pressable>
                            <Pressable
                                onPress={save}
                                disabled={!canSave || saving || deleting}
                                className="rounded-xl px-5 py-3"
                                style={{
                                    backgroundColor:
                                        !canSave || saving || deleting
                                            ? "#9CA3AF"
                                            : "#4C5FAB",
                                    opacity: saving ? 0.8 : 1,
                                }}
                            >
                                <Text className="font-kumbh text-white">
                                    {saving ? "Saving…" : "Save"}
                                </Text>
                            </Pressable>
                        </View>
                    </Pressable>
                </Pressable>
            </KeyboardAvoidingView>
            <OptionSheet
                visible={showMemberPicker}
                onClose={() => setShowMemberPicker(false)}
                onSelect={(value) => {
                    setShowMemberPicker(false);
                    handleAssignMember(String(value));
                }}
                title="Assign member"
                options={memberOptions}
            />
        </Modal>
    );
}
