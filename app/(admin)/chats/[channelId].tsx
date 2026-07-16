import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import ActionSheet from "@/components/staff/chat/ActionSheet";
import AttachmentTray from "@/components/staff/chat/AttachmentTray";
import BottomStack from "@/components/staff/chat/BottomStack";
import Composer from "@/components/staff/chat/Composer";
import MessageBubble from "@/components/staff/chat/MessageBubble";
import { showError } from "@/components/ui/toast";
import { PRIMARY } from "@/constants/Colors";
import { useKeyboardSpacer } from "@/hooks/useKeyboardSpacer";
import { getSocket } from "@/realtime/socket";
import { selectChannelById } from "@/redux/channels/channels.slice";
import {
    fetchChannelById,
    uploadChannelResources,
} from "@/redux/channels/channels.thunks";
import { selectMessagesForCurrent } from "@/redux/chat/chat.selectors";
import { ensureThread, setCurrentThread } from "@/redux/chat/chat.slice";
import { fetchMessages } from "@/redux/chat/chat.thunks";
import { uploadSingle } from "@/redux/upload/upload.thunks";
import { selectUser } from "@/redux/user/user.slice";
import { clearActiveChannelId, saveActiveChannelId } from "@/storage/auth";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type { AttachmentKind, Message, ReplyMeta } from "@/types/chat";
import type { ChatTaggedUser } from "@/types/chat-model";
import { formatDateLabel, getDateKey } from "@/utils/format";
import { buildMentionables, type Mentionable } from "@/utils/handles";
import { isAdminLikeRole } from "@/utils/roles";
import {
    AudioModule,
    RecordingPresets,
    setAudioModeAsync,
    useAudioPlayer,
    useAudioPlayerStatus,
    useAudioRecorder,
    useAudioRecorderState,
    type RecordingOptions,
} from "expo-audio";
import * as Clipboard from "expo-clipboard";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ChevronDown, ClipboardIcon, Cloud } from "lucide-react-native";
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
    AppState,
    FlatList,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    Text,
    View,
} from "react-native";
import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";

const TYPE: "community" | "direct" = "community";
const MAX_PICKED_UPLOAD_MB = 25;
const MAX_PICKED_UPLOAD_BYTES = MAX_PICKED_UPLOAD_MB * 1024 * 1024;
const VOICE_RECORDING_OPTIONS: RecordingOptions = {
    ...RecordingPresets.HIGH_QUALITY,
    numberOfChannels: 1,
    bitRate: 64000,
};

type PendingUploadPreview = {
    uri: string;
    name: string;
    mimeType: string;
    kind: "image" | "document" | "audio";
    resourceDescription: string;
    messageText: string;
};

const extractCloudinaryPublicId = (url?: string, stripExtension = false) => {
    if (!url || typeof url !== "string") return null;
    try {
        const parsed = new URL(url);
        const uploadToken = "/upload/";
        const uploadIndex = parsed.pathname.indexOf(uploadToken);
        if (uploadIndex === -1) return null;

        const afterUpload = parsed.pathname.slice(
            uploadIndex + uploadToken.length,
        );
        const segments = afterUpload.split("/").filter(Boolean);
        if (!segments.length) return null;

        const versionIndex = segments.findIndex((segment) =>
            /^v\d+$/.test(segment),
        );
        const publicIdSegments =
            versionIndex >= 0 ? segments.slice(versionIndex + 1) : segments;
        if (!publicIdSegments.length) return null;

        let publicId = decodeURIComponent(publicIdSegments.join("/"));
        if (stripExtension) {
            publicId = publicId.replace(/\.[^/.]+$/, "");
        }
        return publicId || null;
    } catch {
        return null;
    }
};

const isPickerAssetTooLarge = (asset?: { size?: number | null }) =>
    typeof asset?.size === "number" && asset.size > MAX_PICKED_UPLOAD_BYTES;

export default function ChatScreen() {
    const { channelId: rawId } = useLocalSearchParams<{ channelId: string }>();
    const dispatch = useAppDispatch();
    const router = useRouter();
    const isIOS = Platform.OS === "ios";

    // ...existing code...

    const user = useAppSelector(selectUser);
    const meId = user?._id;
    const channelId = typeof rawId === "string" ? rawId : rawId?.[0];

    const channelSel = useMemo(() => selectChannelById(channelId), [channelId]);
    const channel = useAppSelector(channelSel);

    const mentionables = useMemo<Mentionable[]>(() => {
        const rawMembers = ((channel as any)?.members ?? []) as any[];
        const normalizedMembers = rawMembers
            .map((member: any) => {
                const candidate = member?.user ?? member?.member ?? member;
                const profile =
                    candidate?._id && typeof candidate._id === "object"
                        ? candidate._id
                        : candidate;

                const id =
                    profile?._id ??
                    candidate?._id ??
                    candidate?.id ??
                    member?._id ??
                    member?.id;
                if (!id) return null;

                return {
                    _id: String(id),
                    name:
                        profile?.name ??
                        profile?.fullName ??
                        profile?.fullname ??
                        profile?.username ??
                        candidate?.name ??
                        candidate?.fullName ??
                        candidate?.fullname ??
                        candidate?.username ??
                        "User",
                    fullName: profile?.fullName ?? profile?.fullname,
                    displayName: profile?.displayName,
                    avatar: profile?.avatar,
                };
            })
            .filter(Boolean) as Array<{
            _id: string;
            name?: string;
            fullName?: string;
            displayName?: string;
            avatar?: string;
        }>;

        return buildMentionables(
            normalizedMembers,
            meId !== undefined && meId !== null ? String(meId) : undefined,
        );
    }, [channel, meId]);

    useEffect(() => {
        if (!meId) return;
        dispatch({ type: "chat/connect", payload: { meId } });
        return () => {
            dispatch({ type: "chat/disconnect" });
        };
    }, [dispatch, meId]);

    useEffect(() => {
        if (!channelId) return;
        if (channel) return;
        dispatch(fetchChannelById(channelId));
    }, [dispatch, channelId, channel]);

    // console.log(channel.members.map(m => m._id), meId)

    // if (channel && !channel.members?.includes("68ceca05823d6f4b18f00f7f" as any)) {
    //   console.warn("[chat] Not a member of channel", { channelId, meId });
    // }
    // useEffect(() => {
    //   if (!channelId) return;
    //   dispatch(
    //     fetchMessages({ id: channelId, type: "community", limit: 50, skip: 0 })
    //   );
    // }, [channelId, dispatch]);

    useEffect(() => {
        if (!channelId || !meId) return;
        dispatch(ensureThread({ id: channelId, kind: "community" }));
        dispatch(setCurrentThread(channelId));
        saveActiveChannelId(channelId);
        dispatch({ type: "chat/joinChannel", payload: { meId, channelId } });
    }, [dispatch, channelId, meId]);

    const messagesFromRedux = useAppSelector(selectMessagesForCurrent);

    const refreshMissedMessages = useCallback(() => {
        if (!channelId) return;
        dispatch(
            fetchMessages({ id: channelId, type: TYPE, limit: 50, skip: 0 }),
        );
    }, [channelId, dispatch]);

    useFocusEffect(
        useCallback(() => {
            // User is now viewing this channel screen
            if (channelId && meId) {
                const socket = getSocket();
                socket?.emit("viewingChannel", { userId: meId, channelId });
                console.log(`📱 User ${meId} viewing channel ${channelId}`);
            }

            refreshMissedMessages();

            // Cleanup: user left the chat screen
            return () => {
                if (channelId && meId) {
                    const socket = getSocket();
                    socket?.emit("leftChatScreen", { userId: meId, channelId });
                    console.log(
                        `📱 User ${meId} left chat screen for channel ${channelId}`,
                    );
                }
            };
        }, [refreshMissedMessages, channelId, meId]),
    );

    useEffect(() => {
        const sub = AppState.addEventListener("change", (next) => {
            if (next === "active") {
                refreshMissedMessages();
            }
        });

        return () => sub.remove();
    }, [refreshMissedMessages]);

    const [trayOpen, setTrayOpen] = useState(false);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [selected, setSelected] = useState<Message | null>(null);
    const [replyTo, setReplyTo] = useState<ReplyMeta | null>(null);
    const [pendingVoiceNotes, setPendingVoiceNotes] = useState<Message[]>([]);
    const [pendingUploadPreview, setPendingUploadPreview] =
        useState<PendingUploadPreview | null>(null);
    const [sendingPreviewUpload, setSendingPreviewUpload] = useState(false);

    const previewAudioSource =
        pendingUploadPreview?.kind === "audio"
            ? pendingUploadPreview.uri
            : null;
    const previewAudioPlayer = useAudioPlayer(previewAudioSource, {
        updateInterval: 200,
    });
    const previewAudioStatus = useAudioPlayerStatus(previewAudioPlayer);
    const showScrollToBottomRef = useRef(false);
    const scrollButtonRef = useRef<View>(null);
    type ChatListItem =
        | { type: "date"; key: string; ts: number }
        | { type: "message"; key: string; message: Message };
    const listRef = useRef<FlatList<ChatListItem>>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordDurationMs, setRecordDurationMs] = useState(0);
    const [draftText, setDraftText] = useState("");
    const audioRecorder = useAudioRecorder(VOICE_RECORDING_OPTIONS);
    const recorderState = useAudioRecorderState(audioRecorder, 1000);
    const recordRef = useRef<typeof audioRecorder | null>(null);
    const recordingBusyRef = useRef(false);
    const recordingPermissionGrantedRef = useRef(false);

    const title = channel?.name ?? "";
    const subtitle = channel?.description ?? "";

    const data = useMemo<Message[]>(() => {
        const messages = (messagesFromRedux || []).map((m: any) => {
            const rawTs = m.createdAt;
            let createdAtNum: number = NaN;
            if (typeof rawTs === "number") createdAtNum = rawTs;
            else if (typeof rawTs === "string") {
                const p = Date.parse(rawTs);
                if (!Number.isNaN(p)) createdAtNum = p;
            } else if (rawTs instanceof Date) createdAtNum = rawTs.getTime();

            return {
                id: m.id,
                text: m.text,
                createdAt: createdAtNum,
                senderId: m.senderId,
                senderName: m.senderName ?? "",
                avatar: m.avatar ?? undefined,
                status: m.status,
                isRead: m.isRead,
                mediaUri: (m as any).mediaUri,
                mimeType: (m as any).mimeType,
                durationMs: (m as any).durationMs,
                publicId: (m as any).publicId,
                assetId: (m as any).assetId,
                resourceType: (m as any).resourceType,
                replyTo: (m as any).replyTo,
            };
        });

        return [...messages, ...pendingVoiceNotes];
    }, [messagesFromRedux, pendingVoiceNotes]);

    const listData = useMemo<ChatListItem[]>(() => {
        const out: ChatListItem[] = [];
        const sortedData = [...data].reverse();

        // Iterate by index so we can look ahead and place the date separator
        // AFTER the message. This matches the visual grouping when using an
        // inverted FlatList (newest messages at the bottom).
        for (let i = 0; i < sortedData.length; i++) {
            const m = sortedData[i];
            if (!m) continue;
            const isTyping = m.id === "typing";
            const ts = typeof m.createdAt === "number" ? m.createdAt : NaN;

            // 1) Push the message first
            out.push({ type: "message", key: `m-${m.id}`, message: m });

            // 2) If this message marks the end of a day (i.e. the next
            // message is a different day or there is no next message), push
            // a date separator AFTER the message so the separator visually
            // attaches to the group that just finished.
            if (!isTyping && Number.isFinite(ts)) {
                // Find the next non-typing message to compare dates against.
                let j = i + 1;
                let next: typeof m | undefined = undefined;
                for (; j < sortedData.length; j++) {
                    const candidate = sortedData[j];
                    if (!candidate) continue;
                    if (candidate.id === "typing") continue;
                    next = candidate;
                    break;
                }

                const nextTs = next
                    ? typeof next.createdAt === "number"
                        ? next.createdAt
                        : NaN
                    : NaN;
                if (!next || getDateKey(nextTs) !== getDateKey(ts)) {
                    out.push({
                        type: "date",
                        key: `d-${getDateKey(ts)}-${i}`,
                        ts,
                    });
                }
            }
        }

        return out;
    }, [data]);

    useEffect(() => {
        const next = recorderState.durationMillis ?? 0;
        setRecordDurationMs((prev) =>
            Math.floor(prev / 1000) === Math.floor(next / 1000) ? prev : next,
        );
    }, [recorderState.durationMillis]);

    useEffect(() => {
        if (Platform.OS === "ios") {
            const sub = Keyboard.addListener("keyboardWillChangeFrame", (e) => {
                Keyboard.scheduleLayoutAnimation(e);
            });
            return () => sub.remove();
        }

        const show = Keyboard.addListener("keyboardDidShow", (e) => {
            Keyboard.scheduleLayoutAnimation(e);
        });
        const hide = Keyboard.addListener("keyboardDidHide", (e) => {
            Keyboard.scheduleLayoutAnimation(e);
        });
        return () => {
            show.remove();
            hide.remove();
        };
    }, []);

    const startRecording = async () => {
        if (recordingBusyRef.current) return;
        recordingBusyRef.current = true;
        setTrayOpen(false);
        setIsRecording(true);
        setRecordDurationMs(0);

        try {
            if (!recordingPermissionGrantedRef.current) {
                const perm =
                    await AudioModule.requestRecordingPermissionsAsync();
                if (!perm.granted) {
                    setIsRecording(false);
                    showError("Microphone permission is required.");
                    return;
                }
                recordingPermissionGrantedRef.current = true;
            }

            await setAudioModeAsync({
                allowsRecording: true,
                playsInSilentMode: true,
                shouldPlayInBackground: false,
                shouldRouteThroughEarpiece: false,
            });
            await audioRecorder.prepareToRecordAsync();
            audioRecorder.record();
            recordRef.current = audioRecorder;
        } catch (e: any) {
            console.warn("[voice] start recording failed", {
                message: e?.message,
                data: e?.response?.data,
            });
            recordRef.current = null;
            setIsRecording(false);
            setRecordDurationMs(0);
            showError(e?.message || "Failed to start recording.");
            await setAudioModeAsync({
                allowsRecording: false,
                playsInSilentMode: true,
                shouldPlayInBackground: false,
                shouldRouteThroughEarpiece: false,
            }).catch(() => {});
        } finally {
            recordingBusyRef.current = false;
        }
    };

    const stopRecording = async (cancel = false) => {
        if (recordingBusyRef.current) return;
        const rec = recordRef.current ?? audioRecorder;
        if (!isRecording && !recorderState.isRecording) return;
        recordingBusyRef.current = true;
        const durationMs =
            recorderState.durationMillis || recordDurationMs || 0;
        setIsRecording(false);
        setRecordDurationMs(0);

        try {
            await rec.stop();

            const srcUri = rec.uri ?? undefined; // e.g. file:///.../recording-xxxx.m4a
            recordRef.current = null;
            await setAudioModeAsync({
                allowsRecording: false,
                playsInSilentMode: true,
                shouldPlayInBackground: false,
                shouldRouteThroughEarpiece: false,
            });

            if (!cancel && srcUri && durationMs >= 700) {
                const name = `voice_${Date.now()}.m4a`;
                const dest = FileSystem.cacheDirectory + name;
                let uploadUri = srcUri;
                try {
                    await FileSystem.copyAsync({ from: srcUri, to: dest });
                    uploadUri = dest;
                } catch (e) {
                    console.warn(
                        "[voice] copy failed, fallback to original uri",
                        e,
                    );
                }

                const type = "audio/mp4";

                await sendVoiceNote({
                    uri: uploadUri,
                    name,
                    type,
                    durationMs,
                });
            } else if (!cancel && durationMs < 700) {
                showError("Voice note is too short.");
            }
        } catch (e: any) {
            console.warn("[voice] stop recording failed", {
                message: e?.message,
                data: e?.response?.data,
            });
            showError(e?.message || "Failed to stop recording.");
        } finally {
            await setAudioModeAsync({
                allowsRecording: false,
                playsInSilentMode: true,
                shouldPlayInBackground: false,
                shouldRouteThroughEarpiece: false,
            }).catch(() => {});
            recordRef.current = null;
            setRecordDurationMs(0);
            recordingBusyRef.current = false;
        }
    };

    const handleMicPress = async () => {
        if (isRecording || recorderState.isRecording)
            await stopRecording(false);
        else await startRecording();
    };

    const openSheetFor = (m: Message) => {
        setSelected(m);
        setSheetOpen(true);
    };

    const handleDeleteSelected = () => {
        if (!selected || !meId) return;
        if (selected.senderId !== meId) return;

        Alert.alert(
            "Delete Message",
            "Are you sure you want to delete this message? This action cannot be undone.",
            [
                {
                    text: "Cancel",
                    onPress: () => setSheetOpen(false),
                    style: "cancel",
                },
                {
                    text: "Delete",
                    onPress: () => {
                        dispatch({
                            type: "chat/deleteMessage",
                            payload: { userId: meId, messageId: selected.id },
                        });
                        setSheetOpen(false);
                    },
                    style: "destructive",
                },
            ],
        );
    };

    const handleRetryMessage = useCallback(
        (message: Message) => {
            if (!channelId || !meId) return;
            dispatch({
                type: "chat/retrySendChannel",
                payload: { messageId: message.id },
            });
            setSheetOpen(false);
        },
        [channelId, dispatch, meId],
    );

    const handleDeleteMessage = useCallback(
        (message: Message) => {
            if (!meId || message.senderId !== meId) return;

            dispatch({
                type: "chat/deleteMessage",
                payload: { userId: meId, messageId: message.id },
            });
            setSheetOpen(false);
        },
        [dispatch, meId],
    );

    const items = useMemo(() => {
        const base = [
            {
                key: "reply",
                label: "Reply",
                onPress: () => {
                    if (!selected) return;
                    setReplyTo({
                        id: selected.id,
                        preview: selected.text,
                        senderName: selected.senderName,
                    });
                },
            },
            {
                key: "copy",
                label: "Copy",
                onPress: () =>
                    selected && Clipboard.setStringAsync(selected.text),
            },
        ];

        if (selected && selected.senderId === meId) {
            if (selected.status === "failed") {
                base.push({
                    key: "retry",
                    label: "Retry Send",
                    onPress: () => handleRetryMessage(selected),
                });
            }
            base.push({
                key: "delete",
                label: "Delete",
                onPress: handleDeleteSelected,
            });
        }

        return base;
    }, [handleDeleteSelected, handleRetryMessage, meId, selected]);

    const handlePick = async (kind: AttachmentKind) => {
        try {
            if (kind === "gallery") {
                const res = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    quality: 0.7,
                    allowsEditing: false,
                });
                if (!res.canceled && res.assets?.[0]) {
                    const a = res.assets[0];
                    const name =
                        (a as any).fileName ??
                        `image_${Date.now()}.${a.mimeType?.split("/")?.[1] ?? "jpg"}`;
                    const type = a.mimeType ?? "image/jpeg";
                    setPendingUploadPreview({
                        uri: a.uri,
                        name,
                        mimeType: type,
                        kind: "image",
                        resourceDescription: "Image shared in chat",
                        messageText: "Image resource uploaded",
                    });
                }
            }

            if (kind === "camera") {
                const perm = await ImagePicker.requestCameraPermissionsAsync();
                if (!perm.granted) return;
                const res = await ImagePicker.launchCameraAsync({
                    quality: 0.7,
                    allowsEditing: false,
                });
                if (!res.canceled && res.assets?.[0]) {
                    const a = res.assets[0];
                    const name = `photo_${Date.now()}.jpg`;
                    const type = a.mimeType ?? "image/jpeg";
                    setPendingUploadPreview({
                        uri: a.uri,
                        name,
                        mimeType: type,
                        kind: "image",
                        resourceDescription: "Photo captured in chat",
                        messageText: "Image resource uploaded",
                    });
                }
            }

            if (kind === "document") {
                const res = await DocumentPicker.getDocumentAsync({
                    copyToCacheDirectory: true,
                    multiple: false,
                    type: "*/*",
                });
                if (!res.canceled && res.assets?.[0]) {
                    const a = res.assets[0];
                    if (isPickerAssetTooLarge(a as any)) {
                        showError(
                            `File is too large. Please upload files under ${MAX_PICKED_UPLOAD_MB}MB.`,
                        );
                        return;
                    }
                    const name = a.name ?? `document_${Date.now()}`;
                    const type = a.mimeType ?? "application/octet-stream";
                    setPendingUploadPreview({
                        uri: a.uri,
                        name,
                        mimeType: type,
                        kind: "document",
                        resourceDescription: "Document shared in chat",
                        messageText: "Document resource uploaded",
                    });
                }
            }

            if (kind === "audio") {
                const res = await DocumentPicker.getDocumentAsync({
                    type: "audio/*",
                    copyToCacheDirectory: true,
                    multiple: false,
                });
                if (!res.canceled && res.assets?.[0]) {
                    const a = res.assets[0];
                    if (isPickerAssetTooLarge(a as any)) {
                        showError(
                            `Audio is too large. Please upload files under ${MAX_PICKED_UPLOAD_MB}MB.`,
                        );
                        return;
                    }
                    const name = a.name ?? `audio_${Date.now()}.m4a`;
                    const type = a.mimeType ?? "audio/m4a";
                    setPendingUploadPreview({
                        uri: a.uri,
                        name,
                        mimeType: type,
                        kind: "audio",
                        resourceDescription: "Audio file shared in chat",
                        messageText: "Audio resource uploaded",
                    });
                }
            }
        } catch (e) {
            console.warn(e);
        } finally {
            setTrayOpen(false);
        }
    };

    const markVisibleAsRead = () => {
        if (!meId || !channelId || !messagesFromRedux?.length) return;
        const unreadFromOthers = messagesFromRedux
            .filter((m: any) => !m.isRead && m.senderId !== meId)
            .map((m: any) => m.id);
        if (unreadFromOthers.length) {
            dispatch({
                type: "chat/markAsRead",
                payload: {
                    meId,
                    messageIds: unreadFromOthers,
                    kind: "community",
                    channelId,
                },
            });
        }
    };

    const me = useAppSelector(selectUser);
    //   console.log(me?.role);
    const resourcesPath =
        me?.role === "client"
            ? "/(client)/channels/[channelId]/resources"
            : me?.role === "staff"
              ? "/(staff)/channels/[channelId]/resources"
              : "/(admin)/channels/[channelId]/resources";
    const tasksPath =
        me?.role === "client"
            ? "/(client)/channels/[channelId]/tasks"
            : me?.role === "staff"
              ? "/(staff)/channels/[channelId]/tasks"
              : "/(admin)/channels/[channelId]/tasks";

    const isAdmin = isAdminLikeRole(me?.role);

    // Ensure we have user details for mentions
    const handleOpenResources = () => {
        router.push({
            pathname: resourcesPath as any,
            params: { channelId },
        });
    };
    const handleOpenTasks = () => {
        router.push({
            pathname: tasksPath as any,
            params: { channelId },
        });
    };

    const insets = useSafeAreaInsets();
    const HEADER_HEIGHT = 44;
    const kb = useKeyboardSpacer();
    const baseBottom = trayOpen ? 220 : 100;
    const paddingBottom = baseBottom + kb;
    const scrollToBottomButtonBottom = baseBottom + kb + 12;
    const SHOW_SCROLL_TO_BOTTOM_OFFSET = 120;
    const HIDE_SCROLL_TO_BOTTOM_OFFSET = 40;

    const loadingOlder = useAppSelector(
        (s) => s.chat.loadingByThread?.[channelId!],
    );
    const hasMore = useAppSelector((s) => s.chat.hasMoreByThread?.[channelId!]);
    const nextSkip = useAppSelector(
        (s) => s.chat.nextSkipByThread?.[channelId!],
    );

    const loadOlder = useCallback(() => {
        if (!channelId || loadingOlder || hasMore === false) return;
        const limit = 50;
        const skip = nextSkip ?? messagesFromRedux?.length ?? 0;
        dispatch(fetchMessages({ id: channelId, type: TYPE, limit, skip }));
    }, [
        channelId,
        loadingOlder,
        hasMore,
        nextSkip,
        messagesFromRedux?.length,
        dispatch,
    ]);

    const lastTopLoadRef = useRef(0);
    const handleEndReached = useCallback(() => {
        const now = Date.now();
        if (now - lastTopLoadRef.current < 800) return;
        lastTopLoadRef.current = now;
        loadOlder();
    }, [loadOlder]);

    const scrollToBottom = useCallback(() => {
        // Keep this path minimal so touch feedback is immediate.
        showScrollToBottomRef.current = false;
        scrollButtonRef.current?.setNativeProps({
            style: {
                width: 0,
                height: 0,
                opacity: 0,
            },
        });
        const nativeScrollView = listRef.current?.getNativeScrollRef?.() as
            | { scrollTo?: (opts: { y: number; animated: boolean }) => void }
            | undefined;

        nativeScrollView?.scrollTo?.({ y: 0, animated: true });
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, []);

    const handleConfirmPreviewUpload = useCallback(async () => {
        if (!pendingUploadPreview || !channelId || !meId) return;
        setSendingPreviewUpload(true);
        try {
            const uploadAction = await dispatch(
                uploadSingle({
                    uri: pendingUploadPreview.uri,
                    name: pendingUploadPreview.name,
                    type: pendingUploadPreview.mimeType,
                }),
            );
            if (!uploadSingle.fulfilled.match(uploadAction)) {
                showError("Failed to upload attachment.");
                return;
            }

            const { url, publicId, assetId } = uploadAction.payload;
            await dispatch(
                uploadChannelResources({
                    channelId,
                    resources: [
                        {
                            name: pendingUploadPreview.name,
                            description:
                                pendingUploadPreview.resourceDescription,
                            resourceUpload: url,
                            publicId:
                                publicId ??
                                extractCloudinaryPublicId(url) ??
                                pendingUploadPreview.name,
                            resourceType:
                                uploadAction.payload.resourceType ?? undefined,
                        },
                    ],
                }),
            );

            dispatch({
                type: "chat/sendChannel",
                payload: {
                    meId,
                    channelId,
                    text: pendingUploadPreview.messageText,
                    attachment: {
                        mediaUri: url,
                        publicId: publicId || undefined,
                        assetId: assetId || undefined,
                        mimeType: pendingUploadPreview.mimeType,
                        resourceType:
                            uploadAction.payload.resourceType || undefined,
                        ...(pendingUploadPreview.kind === "image"
                            ? { isImage: true }
                            : {}),
                    },
                },
            });
            scrollToBottom();
            setPendingUploadPreview(null);
        } catch (e: any) {
            showError(e?.message || "Failed to upload attachment.");
        } finally {
            setSendingPreviewUpload(false);
        }
    }, [pendingUploadPreview, channelId, meId, dispatch, scrollToBottom]);

    const handleTogglePreviewAudio = useCallback(async () => {
        if (!previewAudioStatus.isLoaded) return;
        try {
            if (previewAudioStatus.playing) {
                previewAudioPlayer.pause();
                return;
            }

            await setAudioModeAsync({
                allowsRecording: false,
                playsInSilentMode: true,
                shouldPlayInBackground: false,
                shouldRouteThroughEarpiece: false,
            });

            const done =
                typeof previewAudioStatus.duration === "number" &&
                typeof previewAudioStatus.currentTime === "number" &&
                previewAudioStatus.duration > 0 &&
                previewAudioStatus.currentTime >=
                    previewAudioStatus.duration - 0.25;
            if (done) {
                await previewAudioPlayer.seekTo(0);
            }

            previewAudioPlayer.play();
        } catch {
            showError("Unable to play audio preview.");
        }
    }, [previewAudioPlayer, previewAudioStatus]);

    useEffect(() => {
        if (pendingUploadPreview?.kind === "audio") return;
        if (!previewAudioStatus.isLoaded || !previewAudioStatus.playing) return;
        previewAudioPlayer.pause();
        void previewAudioPlayer.seekTo(0);
    }, [pendingUploadPreview?.kind, previewAudioPlayer, previewAudioStatus]);

    const setScrollButtonVisible = useCallback((visible: boolean) => {
        if (showScrollToBottomRef.current === visible) return;
        showScrollToBottomRef.current = visible;
        scrollButtonRef.current?.setNativeProps({
            style: {
                width: visible ? 40 : 0,
                height: visible ? 40 : 0,
                opacity: visible ? 1 : 0,
            },
        });
    }, []);

    const handleListScroll = useCallback(
        (e: any) => {
            const y = e?.nativeEvent?.contentOffset?.y ?? 0;
            const shouldShow = showScrollToBottomRef.current
                ? y > HIDE_SCROLL_TO_BOTTOM_OFFSET
                : y > SHOW_SCROLL_TO_BOTTOM_OFFSET;
            setScrollButtonVisible(shouldShow);
        },
        [setScrollButtonVisible],
    );

    const lastSendRef = useRef(0);
    const MIN_INTERVAL_MS = 350;

    const mentionMap = useMemo(
        () =>
            Object.fromEntries(
                mentionables
                    .map((m) => [m.handle?.toLowerCase() ?? "", m])
                    .filter(([key]) => Boolean(key)),
            ),
        [mentionables],
    );

    const buildTaggedUsers = useCallback(
        (content: string) => {
            if (!content) return [];
            const seen = new Set<string>();
            const matches = content.matchAll(/@([a-z0-9._-]+)/gi);
            const tagged: ChatTaggedUser[] = [];
            for (const match of matches) {
                const handle = match[1];
                if (!handle) continue;
                const normalized = handle.toLowerCase();
                if (seen.has(normalized)) continue;
                const mention = mentionMap[normalized];
                if (!mention) continue;
                seen.add(normalized);
                tagged.push({
                    id: mention.id,
                    name: mention.name,
                    handle: mention.handle,
                    avatar: mention.avatar,
                });
            }
            return tagged;
        },
        [mentionMap],
    );

    const sendChannel = useCallback(
        (text: string, taggedUsers: ChatTaggedUser[] = []) => {
            if (!text.trim() || !channelId || !meId) return;
            dispatch({
                type: "chat/sendChannel",
                payload: { meId, channelId, text, taggedUsers },
            });
        },
        [channelId, dispatch, meId],
    );

    const sendWithReply = useCallback(
        (text: string, meta: ReplyMeta | null) => {
            const textToSend = meta
                ? `${meta.senderName}: ${meta.preview}\n${text}`
                : text;
            const taggedUsers = buildTaggedUsers(textToSend);
            sendChannel(textToSend, taggedUsers);
        },
        [buildTaggedUsers, sendChannel],
    );

    const handleSend = (text: string) => {
        const now = Date.now();
        if (now - lastSendRef.current < MIN_INTERVAL_MS) return;
        lastSendRef.current = now;
        const meta = replyTo;
        sendWithReply(text, meta);
        setDraftText("");
        setReplyTo(null);
        setTrayOpen(false);
        // Ensure the view scrolls to show the newly-sent message immediately.
        // Use a short timeout to allow the FlatList to update its content/layout.
        setTimeout(() => {
            try {
                scrollToBottom();
            } catch (e) {
                // noop
            }
        }, 50);
    };

    // Auto-scroll when new messages arrive. If the user is already at the
    // bottom (showScrollToBottomRef is false) we should keep them pinned to
    // the latest message. Also always scroll if the incoming message is from
    // the current user so they can see their sent message.
    const lastMessageIdRef = useRef<string | null>(null);
    useEffect(() => {
        const lastMsg =
            messagesFromRedux && messagesFromRedux.length
                ? messagesFromRedux[messagesFromRedux.length - 1]
                : undefined;
        if (!lastMsg) return;
        if (lastMsg.id === lastMessageIdRef.current) return;
        lastMessageIdRef.current = lastMsg.id;

        const shouldForceScroll =
            !showScrollToBottomRef.current || lastMsg.senderId === meId;
        if (shouldForceScroll) {
            // Delay slightly to wait for layout/keyboard adjustments.
            setTimeout(() => {
                try {
                    scrollToBottom();
                } catch (e) {
                    // ignore
                }
            }, 60);
        }
    }, [messagesFromRedux?.length]);

    const sendVoiceNote = useCallback(
        async (voice: {
            uri: string;
            name: string;
            type: string;
            durationMs: number;
        }) => {
            if (!channelId) return;
            if (!voice.uri) return;
            if (!meId) return;
            const pendingId = `voice_upload_${Date.now().toString(36)}_${Math.random()
                .toString(36)
                .slice(2, 8)}`;
            setPendingVoiceNotes((items) => [
                ...items,
                {
                    id: pendingId,
                    text: "Voice note",
                    createdAt: Date.now(),
                    senderId: String(meId),
                    senderName: "You",
                    status: "sending",
                    mimeType: voice.type,
                    durationMs: voice.durationMs,
                },
            ]);
            scrollToBottom();
            try {
                const secs = Math.max(1, Math.round(voice.durationMs / 1000));
                const uploaded = await dispatch(
                    uploadSingle({
                        uri: voice.uri,
                        name: voice.name,
                        type: voice.type,
                    }),
                ).unwrap();

                await dispatch(
                    uploadChannelResources({
                        channelId,
                        resources: [
                            {
                                name: voice.name,
                                description: `Voice note - ${secs}s`,
                                resourceUpload: uploaded.url,
                                publicId:
                                    uploaded.publicId ??
                                    extractCloudinaryPublicId(uploaded.url) ??
                                    voice.name,
                                resourceType: uploaded.resourceType,
                            },
                        ],
                    }),
                ).unwrap();

                if (uploaded.url) {
                    dispatch({
                        type: "chat/sendChannel",
                        payload: {
                            meId,
                            channelId,
                            text: "Voice note",
                            attachment: {
                                mediaUri: uploaded.url,
                                publicId: uploaded.publicId || undefined,
                                assetId: uploaded.assetId || undefined,
                                mimeType: voice.type,
                                durationMs: voice.durationMs,
                                resourceType:
                                    uploaded.resourceType || undefined,
                            },
                        },
                    });
                    scrollToBottom();
                } else {
                    showError("Upload succeeded but no file URL returned.");
                }
            } catch (e: any) {
                const message =
                    typeof e === "string"
                        ? e
                        : e?.response?.data?.message ||
                          e?.message ||
                          "Failed to send voice note.";
                console.warn("[voice] send failed", {
                    message,
                    status: e?.response?.status,
                    data: e?.response?.data,
                });
                showError(message);
            } finally {
                setPendingVoiceNotes((items) =>
                    items.filter((item) => item.id !== pendingId),
                );
            }
        },
        [channelId, dispatch, meId, scrollToBottom],
    );

    // Helper to emit leaveChannel
    const emitLeaveChannel = React.useCallback(() => {
        if (meId && channelId) {
            dispatch({
                type: "chat/leaveChannel",
                payload: { meId, channelId },
            });
        }
    }, [dispatch, meId, channelId]);

    // Leave channel when navigating away (unmount)
    // useEffect(() => {
    //     return () => {
    //         emitLeaveChannel();
    //     };
    // }, [emitLeaveChannel]);

    useFocusEffect(
        useCallback(() => {
            return () => {
                clearActiveChannelId();
            };
        }, [clearActiveChannelId]),
    );

    // Leave channel when app is backgrounded (minimized)
    // useEffect(() => {
    //     const sub = AppState.addEventListener("change", (next) => {
    //         if (next === "background" || next === "inactive") {
    //             emitLeaveChannel();
    //         }
    //     });
    //     return () => sub.remove();
    // }, [emitLeaveChannel]);

    return (
        <SafeAreaView
            className="flex-1 bg-white"
            edges={
                user?.role === "staff"
                    ? isIOS
                        ? ["left", "right"]
                        : ["top", "left", "right"]
                    : isIOS
                      ? ["left", "right", "bottom"]
                      : ["top", "left", "right"]
            }
        >
            <StatusBar style="dark" />
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={isIOS ? 100 : 72}
                style={{ flex: 1 }}
            >
                {/* <ChatHeader
                    title={title}
                    subtitle={subtitle}
                    onPress={handleOpenResources}
                    onTaskOpen={handleOpenTasks}
                    channelId={channelId}
                /> */}

                <PlatformAdaptiveHeader
                    title={title}
                    description={subtitle}
                    multilineTitle
                    backgroundColor="#F3F4F6"
                    onTitlePress={() =>
                        router.push({
                            pathname: "/(staff)/channels/[channelId]/members",
                            params: { channelId: channelId as any },
                        })
                    }
                    headerRight={({ tintColor }) => (
                        <View className="flex-row items-center gap-2">
                            <Pressable
                                onPress={handleOpenTasks}
                                className="w-10 h-10 rounded-full items-center justify-center"
                                hitSlop={8}
                                style={{
                                    backgroundColor: PRIMARY,
                                }}
                            >
                                <ClipboardIcon size={22} color="white" />
                                {/* <Text className="text-sm font-kumbh">
                                    Tasks
                                </Text> */}
                            </Pressable>
                            <Pressable
                                onPress={handleOpenResources}
                                className="w-10 h-10 items-center justify-center"
                                hitSlop={8}
                            >
                                <Cloud size={25} color={tintColor} />
                                {/* <Text className="text-sm font-kumbh">
                                    Resources
                                </Text> */}
                            </Pressable>
                        </View>
                    )}
                />
                <FlatList
                    ref={listRef}
                    style={{ flex: 1 }}
                    inverted
                    maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
                    contentContainerStyle={{
                        paddingTop: 5,
                        paddingBottom: paddingBottom,
                    }}
                    data={listData}
                    keyExtractor={(item) => item.key}
                    renderItem={({ item }) => {
                        if (item.type === "date") {
                            return (
                                <View className="px-5 mb-3 items-center">
                                    <View className="px-3 py-1 rounded-full bg-gray-100">
                                        <Text className="text-[11px] text-gray-500 font-kumbh">
                                            {formatDateLabel(item.ts)}
                                        </Text>
                                    </View>
                                </View>
                            );
                        }

                        if (item.message.id === "typing") {
                            return (
                                <View className="px-5 mb-3">
                                    <View className="h-4 w-12 rounded-full bg-gray-2 00" />
                                </View>
                            );
                        }
                        return (
                            <MessageBubble
                                msg={item.message}
                                isMe={item.message.senderId === meId}
                                onLongPress={openSheetFor}
                                onRetry={handleRetryMessage}
                                onDeleteMessage={handleDeleteMessage}
                                mentionMap={mentionMap}
                            />
                        );
                    }}
                    showsVerticalScrollIndicator={false}
                    keyboardDismissMode={
                        Platform.OS === "ios" ? "interactive" : "on-drag"
                    }
                    keyboardShouldPersistTaps="handled"
                    onScroll={handleListScroll}
                    scrollEventThrottle={16}
                    onScrollEndDrag={() => {
                        markVisibleAsRead();
                    }}
                    onMomentumScrollEnd={() => {
                        markVisibleAsRead();
                    }}
                    onEndReached={handleEndReached}
                    onEndReachedThreshold={0.2}
                />
                <View
                    ref={scrollButtonRef}
                    collapsable={false}
                    style={{
                        position: "absolute",
                        right: 10,
                        bottom: scrollToBottomButtonBottom,
                        zIndex: 10,
                        width: 0,
                        height: 0,
                        opacity: 0,
                        overflow: "hidden",
                    }}
                >
                    <Pressable
                        onPressIn={scrollToBottom}
                        className="rounded-full bg-gray-200 w-11 h-11 items-center justify-center"
                    >
                        <ChevronDown color="black" size={30} />
                    </Pressable>
                </View>
                <BottomStack
                    tray={
                        trayOpen ? (
                            <AttachmentTray
                                onPick={(kind) => handlePick(kind)}
                            />
                        ) : null
                    }
                    composer={
                        <Composer
                            onSend={handleSend}
                            value={draftText}
                            onChangeText={setDraftText}
                            trayOpen={trayOpen}
                            onToggleTray={() => setTrayOpen((v) => !v)}
                            replyTo={replyTo}
                            onCancelReply={() => setReplyTo(null)}
                            isRecording={isRecording}
                            recordDurationMs={recordDurationMs}
                            onMicPress={handleMicPress}
                            onCancelRecording={() => stopRecording(true)}
                            mentionables={mentionables}
                        />
                    }
                    isAdmin={isAdmin}
                />
                <ActionSheet
                    visible={sheetOpen}
                    onClose={() => setSheetOpen(false)}
                    items={items}
                />

                <Modal
                    visible={!!pendingUploadPreview}
                    animationType="slide"
                    transparent
                    onRequestClose={() =>
                        !sendingPreviewUpload && setPendingUploadPreview(null)
                    }
                >
                    {pendingUploadPreview?.kind === "image" ? (
                        <View className="flex-1 bg-black">
                            <View className="absolute top-14 left-0 right-0 z-10 px-4 flex-row items-center justify-between">
                                <Pressable
                                    onPress={() =>
                                        setPendingUploadPreview(null)
                                    }
                                    disabled={sendingPreviewUpload}
                                    className="px-4 h-10 rounded-full bg-black/45 items-center justify-center"
                                >
                                    <Text className="text-white font-semibold">
                                        Cancel
                                    </Text>
                                </Pressable>
                                <Pressable
                                    onPress={handleConfirmPreviewUpload}
                                    disabled={sendingPreviewUpload}
                                    className={`px-5 h-10 rounded-full items-center justify-center ${
                                        sendingPreviewUpload
                                            ? "bg-blue-300"
                                            : "bg-blue-600"
                                    }`}
                                >
                                    {sendingPreviewUpload ? (
                                        <ActivityIndicator
                                            size="small"
                                            color="white"
                                        />
                                    ) : (
                                        <Text className="text-white font-semibold">
                                            Send
                                        </Text>
                                    )}
                                </Pressable>
                            </View>

                            <Image
                                source={{ uri: pendingUploadPreview.uri }}
                                resizeMode="contain"
                                style={{ width: "100%", height: "100%" }}
                            />

                            <View className="absolute bottom-10 left-4 right-4 rounded-xl bg-black/45 px-4 py-3">
                                <Text
                                    className="text-white font-semibold"
                                    numberOfLines={1}
                                >
                                    {pendingUploadPreview.name}
                                </Text>
                            </View>
                        </View>
                    ) : (
                        <View className="flex-1 bg-black/40 justify-end">
                            <View className="bg-white rounded-t-3xl px-5 pt-5 pb-8">
                                <Text className="text-lg font-bold text-gray-900 mb-3">
                                    Preview Upload
                                </Text>

                                <View className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
                                    <Text
                                        className="text-base font-semibold text-gray-900"
                                        numberOfLines={2}
                                    >
                                        {pendingUploadPreview?.name}
                                    </Text>
                                    <Text className="text-sm text-gray-500 mt-1">
                                        {pendingUploadPreview?.mimeType || "Document"}
                                    </Text>

                                    {pendingUploadPreview?.kind === "audio" ? (
                                        <View className="mt-4">
                                            <Pressable
                                                onPress={handleTogglePreviewAudio}
                                                disabled={
                                                    !previewAudioStatus.isLoaded
                                                }
                                                className={`h-10 rounded-lg items-center justify-center ${
                                                    !previewAudioStatus.isLoaded
                                                        ? "bg-gray-300"
                                                        : "bg-blue-600"
                                                }`}
                                            >
                                                {!previewAudioStatus.isLoaded ? (
                                                    <ActivityIndicator
                                                        size="small"
                                                        color="white"
                                                    />
                                                ) : (
                                                    <Text className="text-white font-semibold">
                                                        {previewAudioStatus.playing
                                                            ? "Pause Preview"
                                                            : "Play Preview"}
                                                    </Text>
                                                )}
                                            </Pressable>
                                        </View>
                                    ) : null}
                                </View>

                                <View className="flex-row gap-3 mt-5">
                                    <Pressable
                                        onPress={() =>
                                            setPendingUploadPreview(null)
                                        }
                                        disabled={sendingPreviewUpload}
                                        className="flex-1 h-11 rounded-lg border border-gray-300 items-center justify-center"
                                    >
                                        <Text className="text-gray-800 font-semibold">
                                            Cancel
                                        </Text>
                                    </Pressable>
                                    <Pressable
                                        onPress={handleConfirmPreviewUpload}
                                        disabled={sendingPreviewUpload}
                                        className={`flex-1 h-11 rounded-lg items-center justify-center ${
                                            sendingPreviewUpload
                                                ? "bg-blue-300"
                                                : "bg-blue-600"
                                        }`}
                                    >
                                        {sendingPreviewUpload ? (
                                            <ActivityIndicator
                                                size="small"
                                                color="white"
                                            />
                                        ) : (
                                            <Text className="text-white font-semibold">
                                                Send
                                            </Text>
                                        )}
                                    </Pressable>
                                </View>
                            </View>
                        </View>
                    )}
                </Modal>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
