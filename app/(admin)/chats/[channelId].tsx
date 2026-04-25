import { api } from "@/api/axios";
import ActionSheet from "@/components/staff/chat/ActionSheet";
import AttachmentTray from "@/components/staff/chat/AttachmentTray";
import BottomStack from "@/components/staff/chat/BottomStack";
import ChatHeader from "@/components/staff/chat/ChatHeader";
import Composer from "@/components/staff/chat/Composer";
import MessageBubble from "@/components/staff/chat/MessageBubble";
import { showError } from "@/components/ui/toast";
import { useKeyboardSpacer } from "@/hooks/useKeyboardSpacer";
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
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type { AttachmentKind, Message, ReplyMeta } from "@/types/chat";
import type { ChatTaggedUser } from "@/types/chat-model";
import { formatDateLabel, getDateKey } from "@/utils/format";
import { buildMentionables, type Mentionable } from "@/utils/handles";
import {
    AudioModule,
    RecordingPresets,
    setAudioModeAsync,
    useAudioRecorder,
    useAudioRecorderState,
} from "expo-audio";
import * as Clipboard from "expo-clipboard";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    FlatList,
    InteractionManager,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Text,
    View,
} from "react-native";
import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";

const TYPE: "community" | "direct" = "community";

export default function ChatScreen() {
    const { channelId: rawId } = useLocalSearchParams<{ channelId: string }>();
    const dispatch = useAppDispatch();
    const router = useRouter();

    const user = useAppSelector(selectUser);
    const meId = user?._id;
    const channelId = typeof rawId === "string" ? rawId : rawId?.[0];

    const channelSel = useMemo(() => selectChannelById(channelId), [channelId]);
    const channel = useAppSelector(channelSel);

    const initialLoadedRef = useRef<Record<string, boolean>>({});
    const didEnterScrollRef = useRef<Record<string, boolean>>({});
    const enterChannelRef = useRef<string | null>(null);

    useEffect(() => {
        if (!channelId) return;

        enterChannelRef.current = channelId;
        // allow the enter-scroll to run again for this channel
        didEnterScrollRef.current[channelId] = false;

        // treat as bottom on entry
        atBottomRef.current = true;
        isInteractingRef.current = false;
    }, [channelId]);

    useEffect(() => {
        if (!channelId) return;

        // only once per channel entry
        if (initialLoadedRef.current[channelId]) return;
        initialLoadedRef.current[channelId] = true;

        // load first page immediately
        dispatch(
            fetchMessages({ id: channelId, type: TYPE, limit: 50, skip: 0 }),
        );
    }, [channelId, dispatch]);

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
        dispatch({ type: "chat/joinChannel", payload: { meId, channelId } });
    }, [dispatch, channelId, meId]);

    const messagesFromRedux = useAppSelector(selectMessagesForCurrent);

    const [trayOpen, setTrayOpen] = useState(false);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [selected, setSelected] = useState<Message | null>(null);
    const [replyTo, setReplyTo] = useState<ReplyMeta | null>(null);
    type ChatListItem =
        | { type: "date"; key: string; ts: number }
        | { type: "message"; key: string; message: Message };
    const listRef = useRef<FlatList<ChatListItem>>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordDurationMs, setRecordDurationMs] = useState(0);
    const [draftText, setDraftText] = useState("");
    const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
    const recorderState = useAudioRecorderState(audioRecorder, 200);
    const recordRef = useRef<typeof audioRecorder | null>(null);

    const title = channel?.name ?? "Fin Team";
    const subtitle = channel?.description ?? "Mr Chiboy and 5 Others…";

    const data = useMemo<Message[]>(() => {
        return (messagesFromRedux || []).map((m: any) => ({
            id: m.id,
            text: m.text,
            createdAt: m.createdAt,
            senderId: m.senderId,
            senderName: m.senderName ?? "",
            avatar: m.avatar ?? undefined,
            status: m.status,
            isRead: m.isRead,
            mediaUri: (m as any).mediaUri,
            mimeType: (m as any).mimeType,
            durationMs: (m as any).durationMs,
            replyTo: (m as any).replyTo,
        }));
    }, [messagesFromRedux]);

    const listData = useMemo<ChatListItem[]>(() => {
        const out: ChatListItem[] = [];
        let lastDateKey: string | null = null;
        for (const m of data) {
            if (!m) continue;
            const isTyping = m.id === "typing";
            const ts = typeof m.createdAt === "number" ? m.createdAt : NaN;
            if (!isTyping && Number.isFinite(ts)) {
                const dateKey = getDateKey(ts);
                if (dateKey !== lastDateKey) {
                    out.push({ type: "date", key: `d-${dateKey}`, ts });
                    lastDateKey = dateKey;
                }
            }
            out.push({ type: "message", key: `m-${m.id}`, message: m });
        }
        return out;
    }, [data]);

    useEffect(() => {
        if (!channelId) return;
        if (!data.length) return;

        // only do this once per entry
        if (didEnterScrollRef.current[channelId]) return;
        if (enterChannelRef.current !== channelId) return;

        didEnterScrollRef.current[channelId] = true;
        pendingInitialSnapRef.current = true;

        InteractionManager.runAfterInteractions(() => {
            requestAnimationFrame(() => {
                listRef.current?.scrollToEnd({ animated: true });
            });
        });
    }, [channelId, data.length]);

    useEffect(() => {
        setRecordDurationMs(recorderState.durationMillis ?? 0);
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
        const perm = await AudioModule.requestRecordingPermissionsAsync();
        if (!perm.granted) return;
        await setAudioModeAsync({
            allowsRecording: true,
            playsInSilentMode: true,
            shouldPlayInBackground: false,
        });
        await audioRecorder.prepareToRecordAsync();
        audioRecorder.record();
        recordRef.current = audioRecorder;
        setIsRecording(true);
        setRecordDurationMs(0);
    };

    const stopRecording = async (cancel = false) => {
        const rec = recordRef.current ?? audioRecorder;
        if (!recorderState.isRecording) return;

        await rec.stop();

        const srcUri = rec.uri ?? undefined; // e.g. file:///.../recording-xxxx.m4a
        recordRef.current = null;
        setIsRecording(false);

        if (!cancel && srcUri) {
            // 1) ensure a proper filename (with extension)
            const name = `voice_${Date.now()}.m4a`;

            // 2) copy to cache (just like your picker audio branch)
            const dest = FileSystem.cacheDirectory + name;
            try {
                await FileSystem.copyAsync({ from: srcUri, to: dest });
            } catch (e) {
                console.warn(
                    "[voice] copy failed, fallback to original uri",
                    e,
                );
            }

            // 3) use a widely-accepted MIME for m4a
            // (server-side libs often prefer audio/mp4 for .m4a)
            const type = "audio/mp4";

            await sendVoiceNote({
                uri: dest || srcUri,
                name,
                type,
                durationMs: recorderState.durationMillis ?? 0,
            });
        }

        setRecordDurationMs(0);
    };

    const handleMicPress = async () => {
        if (recorderState.isRecording) await stopRecording(false);
        else await startRecording();
    };

    const openSheetFor = (m: Message) => {
        setSelected(m);
        setSheetOpen(true);
    };

    const handleDeleteSelected = () => {
        if (!selected || !meId) return;
        if (selected.senderId !== meId) return;
        dispatch({
            type: "chat/deleteMessage",
            payload: { userId: meId, messageId: selected.id },
        });
    };

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

        if (selected?.senderId === meId) {
            base.push({
                key: "delete",
                label: "Delete",
                danger: true,
                onPress: handleDeleteSelected,
            });
        }

        return base;
    }, [handleDeleteSelected, meId, selected]);

    const ALWAYS_SNAP_TO_BOTTOM = false;
    const atBottomRef = useRef(true);
    const isInteractingRef = useRef(false);
    const lastRealMsgIdRef = useRef<string | null>(null);
    const pendingAutoScrollRef = useRef(false);
    const pendingInitialSnapRef = useRef(false);
    const contentHeightRef = useRef(0);
    const BOTTOM_THRESHOLD = 80;

    const getLastRealMsgId = (arr: Message[]) => {
        for (let i = arr.length - 1; i >= 0; i--) {
            if (arr[i]?.id !== "typing") return arr[i].id;
        }
        return null;
    };

    useEffect(() => {
        const lastRealId = getLastRealMsgId(data);
        if (!lastRealId) return;
        if (lastRealId !== lastRealMsgIdRef.current) {
            const shouldAuto =
                ALWAYS_SNAP_TO_BOTTOM ||
                (atBottomRef.current && !isInteractingRef.current);
            if (shouldAuto) pendingAutoScrollRef.current = true;
            lastRealMsgIdRef.current = lastRealId;
        }
    }, [data]);

    const scrollToEnd = () => {
        requestAnimationFrame(() =>
            listRef.current?.scrollToEnd({ animated: true }),
        );
    };

    const lastTopLoadRef = useRef(0);

    const handleScroll = ({
        nativeEvent: { contentOffset, contentSize, layoutMeasurement },
    }: any) => {
        const y = contentOffset.y;

        const distanceFromBottom =
            contentSize.height - (contentOffset.y + layoutMeasurement.height);
        atBottomRef.current = distanceFromBottom < BOTTOM_THRESHOLD;

        // auto-load older when near top
        if (y < 40) {
            const now = Date.now();
            if (now - lastTopLoadRef.current > 800) {
                lastTopLoadRef.current = now;
                loadOlder();
            }
        }
    };

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
                    const uploadAction = await dispatch(
                        uploadSingle({ uri: a.uri, name, type }),
                    );
                    if (uploadSingle.fulfilled.match(uploadAction)) {
                        const { url, publicId } = uploadAction.payload;
                        if (channelId) {
                            await dispatch(
                                uploadChannelResources({
                                    channelId,
                                    resources: [
                                        {
                                            name,
                                            description: "Image shared in chat",
                                            resourceUpload: url,
                                            publicId: publicId ?? name,
                                        },
                                    ],
                                }),
                            );
                        }
                        dispatch({
                            type: "chat/sendChannel",
                            payload: {
                                meId,
                                channelId,
                                text: "Image resource uploaded",
                                attachment: {
                                    mediaUri: url,
                                    mimeType: "image/jpeg",
                                    isImage: true,
                                } as any,
                            },
                        });
                        scrollToEnd();
                    }
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
                    const uploadAction = await dispatch(
                        uploadSingle({ uri: a.uri, name, type }),
                    );
                    if (uploadSingle.fulfilled.match(uploadAction)) {
                        const { url, publicId } = uploadAction.payload;
                        if (channelId) {
                            await dispatch(
                                uploadChannelResources({
                                    channelId,
                                    resources: [
                                        {
                                            name,
                                            description:
                                                "Photo captured in chat",
                                            resourceUpload: url,
                                            publicId: publicId ?? name,
                                        },
                                    ],
                                }),
                            );
                        }
                        dispatch({
                            type: "chat/sendChannel",
                            payload: {
                                meId,
                                channelId,
                                text: "Image resource uploaded",
                                attachment: {
                                    mediaUri: url,
                                    mimeType: "image/jpeg",
                                },
                            },
                        });
                        scrollToEnd();
                    }
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
                    const name = a.name ?? `document_${Date.now()}`;
                    const type = a.mimeType ?? "application/octet-stream";
                    const uploadAction = await dispatch(
                        uploadSingle({ uri: a.uri, name, type }),
                    );
                    if (uploadSingle.fulfilled.match(uploadAction)) {
                        const { url, publicId } = uploadAction.payload;
                        if (channelId) {
                            await dispatch(
                                uploadChannelResources({
                                    channelId,
                                    resources: [
                                        {
                                            name,
                                            description:
                                                "Document shared in chat",
                                            resourceUpload: url,
                                            publicId: publicId ?? name,
                                        },
                                    ],
                                }),
                            );
                        }
                        dispatch({
                            type: "chat/sendChannel",
                            payload: {
                                meId,
                                channelId,
                                text: "Document resource uploaded",
                                attachment: { mediaUri: url, mimeType: type },
                            },
                        });
                        scrollToEnd();
                    }
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
                    const name = a.name ?? `audio_${Date.now()}.m4a`;
                    const type = a.mimeType ?? "audio/m4a";
                    const ext = ".m4a";
                    const dest = FileSystem.cacheDirectory + name; // ensure name includes .m4a
                    await FileSystem.copyAsync({ from: a.uri, to: dest });
                    const form = new FormData();
                    form.append("channelId", channelId);
                    form.append("name", name);
                    form.append("description", "Audio file shared in chat");
                    form.append("mime", type);
                    form.append("pdfUpload", {
                        uri: dest,
                        name,
                        type,
                    } as any);

                    const resUpload = await api.post(
                        "/channel/upload-resources",
                        form,
                        {
                            headers: { Accept: "application/json" },
                            transformRequest: (v) => v,
                        },
                    );

                    const channel =
                        (resUpload.data as any)?.channel ||
                        (resUpload.data as any)?.data?.channel ||
                        (resUpload.data as any)?.data;
                    const resources = (channel?.resources as any[]) || [];
                    const latest = resources[resources.length - 1];
                    const url = latest?.resourceUpload;

                    if (url) {
                        dispatch({
                            type: "chat/sendChannel",
                            payload: {
                                meId,
                                channelId,
                                text: "Audio resource uploaded",
                                attachment: { mediaUri: url, mimeType: type },
                            },
                        });
                        scrollToEnd();
                    } else {
                        showError("Upload succeeded but no file URL returned.");
                    }
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

    const isAdmin = me?.role === "admin" || me?.role === "super-admin";

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

    useEffect(() => {
        if (!channelId) return;
    }, [channelId, dispatch]);

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

    const lastSendRef = useRef(0);
    const MIN_INTERVAL_MS = 350;

    // ...inside component:
    const members = (channel as any)?.members ?? []; // [{_id, name/displayName, avatar}, ...]
    // console.log(members, channel);

    const mentionables = useMemo<Mentionable[]>(() => {
        const enriched = (members as any[]).map((m: any, idx: number) => {
            const base = typeof m === "string" ? { _id: m } : m;
            const entry = base?.user ?? base?.member ?? base;
            const profile =
                entry?._id && typeof entry._id === "object" ? entry._id : entry;
            const rawId =
                entry?._id ??
                entry?.id ??
                profile?._id ??
                profile?.id ??
                m?.userId ??
                m?.memberId ??
                `member-${idx}`;
            const username =
                profile?.username ??
                profile?.name ??
                profile?.fullName ??
                profile?.email ??
                profile?.displayName ??
                (typeof profile === "string" ? profile : undefined) ??
                `member-${idx}`;
            const resolvedId =
                typeof rawId === "object" && rawId !== null
                    ? (rawId._id ?? rawId.id ?? JSON.stringify(rawId))
                    : rawId;
            return {
                _id: String(resolvedId),
                name: username,
                displayName: username,
                avatar:
                    profile?.profilePicture ??
                    profile?.avatar ??
                    profile?.photo ??
                    undefined,
            };
        });
        return buildMentionables(enriched, meId as any);
    }, [members, meId]);

    // Build a quick lookup map for bubble highlighting and mentions
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
    };

    const sendVoiceNote = useCallback(
        async (voice: {
            uri: string;
            name: string;
            type: string;
            durationMs: number;
        }) => {
            if (!channelId) return;
            if (!voice.uri) return;
            try {
                const secs = Math.max(1, Math.round(voice.durationMs / 1000));
                const form = new FormData();
                form.append("channelId", channelId);
                form.append("name", voice.name);
                form.append("description", `Voice note • ${secs}s`);
                form.append("mime", voice.type);
                form.append("pdfUpload", {
                    uri: voice.uri,
                    name: voice.name,
                    type: voice.type,
                } as any);

                const res = await api.post("/channel/upload-resources", form, {
                    headers: { Accept: "application/json" },
                    transformRequest: (v) => v,
                });

                const channel =
                    (res.data as any)?.channel ||
                    (res.data as any)?.data?.channel ||
                    (res.data as any)?.data;
                const resources = (channel?.resources as any[]) || [];
                const latest = resources[resources.length - 1];
                const url = latest?.resourceUpload;

                if (url) {
                    if (meId) {
                        dispatch({
                            type: "chat/sendChannel",
                            payload: {
                                meId,
                                channelId,
                                text: "Voice note",
                                attachment: {
                                    mediaUri: url,
                                    mimeType: voice.type,
                                    durationMs: voice.durationMs,
                                },
                            },
                        });
                    }
                    scrollToEnd();
                } else {
                    showError("Upload succeeded but no file URL returned.");
                }
            } catch (e) {
                console.warn(e);
                showError("Failed to send voice note.");
            }
        },
        [channelId, dispatch, meId, scrollToEnd],
    );

    return (
        <SafeAreaView className="flex-1 bg-white">
            <StatusBar style="dark" />
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={0}
                style={{ flex: 1 }}
            >
                <ChatHeader
                    title={title}
                    subtitle={subtitle}
                    onPress={handleOpenResources}
                    onTaskOpen={handleOpenTasks}
                    channelId={channelId}
                />
                <FlatList
                    ref={listRef}
                    style={{ flex: 1 }}
                    contentContainerStyle={{
                        paddingTop: 16,
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
                                mentionMap={mentionMap}
                            />
                        );
                    }}
                    showsVerticalScrollIndicator={false}
                    keyboardDismissMode={
                        Platform.OS === "ios" ? "interactive" : "on-drag"
                    }
                    keyboardShouldPersistTaps="handled"
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                    onScrollBeginDrag={() => {
                        isInteractingRef.current = true;
                    }}
                    onScrollEndDrag={() => {
                        isInteractingRef.current = false;
                        markVisibleAsRead();
                    }}
                    onMomentumScrollEnd={() => {
                        isInteractingRef.current = false;
                        markVisibleAsRead();
                    }}
                    onContentSizeChange={(w, h) => {
                        contentHeightRef.current = h;

                        if (pendingInitialSnapRef.current) {
                            pendingInitialSnapRef.current = false;
                            requestAnimationFrame(() => {
                                listRef.current?.scrollToEnd({
                                    animated: true,
                                });
                            });
                        }

                        if (pendingAutoScrollRef.current) {
                            pendingAutoScrollRef.current = false;
                            requestAnimationFrame(() => {
                                listRef.current?.scrollToEnd({
                                    animated: true,
                                });
                                if (Platform.OS === "android") {
                                    InteractionManager.runAfterInteractions(
                                        () => {
                                            listRef.current?.scrollToOffset({
                                                offset: Math.max(
                                                    0,
                                                    contentHeightRef.current,
                                                ),
                                                animated: true,
                                            });
                                        },
                                    );
                                }
                            });
                        }
                    }}
                    refreshing={!!loadingOlder}
                    onRefresh={loadOlder}
                />
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
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
