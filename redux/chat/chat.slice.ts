import type {
    ChatMessage,
    ChatState,
    Thread,
    ThreadId,
} from "@/types/chat-model";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { fetchMessages } from "./chat.thunks";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { persistReducer } from "redux-persist";

const initialState: ChatState = {
    meId: null,
    currentThreadId: null,
    threads: {},
    messages: {},
    joinedRooms: { me: false, channels: {} },
    connecting: false,
    connected: false,
    error: null,
    loadingByThread: {},
    hasMoreByThread: {},
    nextSkipByThread: {},
};

export const chatSlice = createSlice({
    name: "chat",
    initialState,
    reducers: {
        resetChat: () => initialState,
        setMe(state, action: PayloadAction<string>) {
            state.meId = action.payload;
        },
        wsConnecting(state) {
            state.connecting = true;
            state.error = null;
        },
        wsConnected(state) {
            state.connecting = false;
            state.connected = true;
        },
        wsDisconnected(state) {
            state.connected = false;
            state.joinedRooms.me = false;
            state.joinedRooms.channels = {};
        },
        joinedMeRoom(state) {
            state.joinedRooms.me = true;
        },
        joinedChannel(state, action: PayloadAction<string>) {
            state.joinedRooms.channels[action.payload] = true;
        },
        ensureThread(
            state,
            action: PayloadAction<{
                id: ThreadId;
                kind: Thread["kind"];
                title?: string;
                subtitle?: string;
            }>,
        ) {
            const { id, kind, title, subtitle } = action.payload;
            if (!state.threads[id]) {
                state.threads[id] = { id, kind, title, subtitle, messages: [] };
            }
        },
        setCurrentThread(state, action: PayloadAction<ThreadId | null>) {
            state.currentThreadId = action.payload;
        },
        upsertMessage(state, action: PayloadAction<ChatMessage>) {
            const msg = action.payload;
            state.messages[msg.id] = { ...state.messages[msg.id], ...msg };
        },
        addMessageToThread(
            state,
            action: PayloadAction<{ threadId: ThreadId; message: ChatMessage }>,
        ) {
            const { threadId, message } = action.payload;
            state.messages[message.id] = message;
            const thr = state.threads[threadId];
            if (!thr) return;
            if (!thr.messages.includes(message.id))
                thr.messages.push(message.id);
        },
        replaceTempId(
            state,
            action: PayloadAction<{
                tempId: string;
                realId: string;
                createdAt?: number;
            }>,
        ) {
            const { tempId, realId, createdAt } = action.payload;
            const existing = state.messages[tempId];
            if (!existing) return;
            state.messages[realId] = {
                ...existing,
                id: realId,
                temp: false,
                ...(createdAt !== undefined && { createdAt }),
            };
            delete state.messages[tempId];
            Object.values(state.threads).forEach((t) => {
                const idx = t.messages.indexOf(tempId);
                if (idx >= 0) t.messages[idx] = realId;
            });
        },
        setMessageStatus(
            state,
            action: PayloadAction<{
                id: string;
                status: ChatMessage["status"];
                isRead?: boolean;
            }>,
        ) {
            const m = state.messages[action.payload.id];
            if (m) {
                m.status = action.payload.status;
                if (action.payload.isRead !== undefined)
                    m.isRead = action.payload.isRead;
            }
        },
        markReadBulk(state, action: PayloadAction<string[]>) {
            action.payload.forEach((id) => {
                const m = state.messages[id];
                if (m) m.isRead = true;
            });
        },
        removeMessage(state, action: PayloadAction<{ id: string }>) {
            const { id } = action.payload;
            delete state.messages[id];
            Object.values(state.threads).forEach((t) => {
                const idx = t.messages.indexOf(id);
                if (idx >= 0) t.messages.splice(idx, 1);
            });
        },
        setError(state, action: PayloadAction<string | null>) {
            state.error = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchMessages.pending, (state, { meta }) => {
                const { id } = meta.arg as { id: string };
                state.loadingByThread![id] = true;
                if (state.nextSkipByThread![id] == null)
                    state.nextSkipByThread![id] = 0;
            })
            .addCase(fetchMessages.fulfilled, (state, { payload }) => {
                const {
                    threadId,
                    kind,
                    items,
                    page,
                    orphanedIds = [],
                    reconcile,
                } = payload;
                const { limit = 50, skip = 0 } = page || {};
                state.loadingByThread![threadId] = false;

                if (!state.threads[threadId]) {
                    state.threads[threadId] = {
                        id: threadId,
                        kind,
                        messages: [],
                    };
                }
                const thr = state.threads[threadId];

                if (skip === 0 && reconcile) {
                    const localIds: string[] = reconcile.localNonTempIds ?? [];
                    const serverIds: string[] = reconcile.serverIds ?? [];
                    const serverSet = new Set(serverIds);

                    // Remove local messages that no longer exist on the server.
                    for (const localId of localIds) {
                        if (!serverSet.has(localId)) {
                            delete state.messages[localId];
                            const idx = thr.messages.indexOf(localId);
                            if (idx >= 0) thr.messages.splice(idx, 1);
                        }
                    }
                }

                // Remove orphaned messages (deleted while offline)
                if (orphanedIds.length > 0) {
                    console.log(
                        "[reducer] removing",
                        orphanedIds.length,
                        "orphaned messages",
                    );
                    for (const orphanId of orphanedIds) {
                        console.log("[reducer] deleting orphan:", orphanId);
                        delete state.messages[orphanId];
                        const idx = thr.messages.indexOf(orphanId);
                        if (idx >= 0) {
                            thr.messages.splice(idx, 1);
                            console.log(
                                "[reducer] removed from thread at index:",
                                idx,
                            );
                        }
                    }
                }

                for (const d of items) {
                    const id = String(d._id ?? `${d.sender}-${d.createdAt}`);
                    if (!state.messages[id]) {
                        const text = d.message ?? "";
                        const isImg =
                            typeof text === "string" &&
                            /^https?:\/\//i.test(text) &&
                            /\.(png|jpe?g|gif|webp)(\?|$)/i.test(text);
                        state.messages[id] = {
                            id,
                            text,
                            createdAt: new Date(d.createdAt).valueOf(),
                            senderId: String(d.sender),
                            senderName: d.username ?? "",
                            avatar: d.profilePicture ?? undefined,
                            isRead: !!d.read,
                            status: d.read ? "seen" : "delivered",
                            mediaUri:
                                d.attachment?.mediaUri ??
                                (isImg ? text : undefined),
                            mimeType:
                                d.attachment?.mimeType ??
                                (isImg ? "image/jpeg" : undefined),
                        };
                    }
                    if (!thr.messages.includes(id)) {
                        thr.messages.push(id);
                        console.log("[reducer] added message to thread:", id);
                    }
                }

                thr.messages.sort(
                    (a, b) =>
                        state.messages[a].createdAt -
                        state.messages[b].createdAt,
                );

                // Fresh fetch: reconcile local and DB by replacing non-temp IDs
                // with the server snapshot while preserving pending temp messages.
                if (skip === 0) {
                    const pendingTempIds = thr.messages.filter(
                        (id) => state.messages[id]?.temp,
                    );
                    const serverIds = items.map((d: any) =>
                        String(d._id ?? `${d.sender}-${d.createdAt}`),
                    );

                    thr.messages = [
                        ...pendingTempIds,
                        ...serverIds.filter(
                            (id) => !pendingTempIds.includes(id),
                        ),
                    ];
                }

                const got = items.length;
                state.hasMoreByThread![threadId] = got >= limit;
                state.nextSkipByThread![threadId] = skip + got;
            })
            .addCase(fetchMessages.rejected, (state, { meta }) => {
                const { id } = meta.arg as { id: string };
                state.loadingByThread![id] = false;
            });
    },
});

export const {
    resetChat,
    setMe,
    wsConnecting,
    wsConnected,
    wsDisconnected,
    joinedMeRoom,
    joinedChannel,
    ensureThread,
    setCurrentThread,
    addMessageToThread,
    replaceTempId,
    setMessageStatus,
    markReadBulk,
    removeMessage,
    setError,
} = chatSlice.actions;

const chatPersistConfig = {
    key: "chat",
    storage: AsyncStorage,
    version: 1,
    whitelist: [
        "messages", // flat map id -> message (used by replaceTempId)
        "threads", // if you store thread meta
        "messagesByThread", // your list by thread
        "hasMoreByThread",
        "nextSkipByThread",
        "joinedRooms", // optional: so we auto re-join after reload
        "currentThreadId", // optional: restore last open thread
    ],
};

export default persistReducer(chatPersistConfig, chatSlice.reducer);
