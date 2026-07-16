import { closeSocket, connectSocket, getSocket } from "@/realtime/socket";
import type { RootState } from "@/store";
import type { ChatMessage, ChatTaggedUser } from "@/types/chat-model";
import type { AnyAction, Middleware } from "@reduxjs/toolkit";
import * as Notifications from "expo-notifications";
import {
    addMessageToThread,
    ensureThread,
    joinedChannel,
    markReadBulk,
    removeMessage,
    replaceTempId,
    setCurrentThread,
    setError,
    setMe,
    setMessageStatus,
    wsConnected,
    wsConnecting,
    wsDisconnected,
} from "./chat.slice";

let lastEmitAt = 0;
const EMIT_GAP = 250;
const normalizeTaggedUsers = (list?: any[]): ChatTaggedUser[] => {
    if (!Array.isArray(list)) return [];
    const seen = new Set<string>();
    return list
        .map((item) => {
            if (!item) return null;
            const rawId =
                item._id ??
                item.id ??
                item.userId ??
                item.memberId ??
                (typeof item === "string" ? item : null);
            if (!rawId) return null;
            const id = String(rawId);
            if (seen.has(id)) return null;
            seen.add(id);
            return {
                id,
                handle:
                    typeof item.handle === "string" ? item.handle : undefined,
                name: item.name ?? item.displayName ?? item.username,
                avatar: item.avatar ?? item.profilePicture,
            } as const;
        })
        .filter((u) => u !== null) as ChatTaggedUser[];
};

export const chatMiddleware: Middleware<{}, RootState> =
    (store) => (next) => (action) => {
        const result = next(action);
        const a = action as AnyAction;

        switch (a.type) {
            case "chat/connect": {
                const { meId } = a.payload as { meId: string };
                store.dispatch(setMe(meId));
                store.dispatch(wsConnecting());

                const socket = connectSocket();

                if (!(socket as any).__handlersBound) {
                    (socket as any).__handlersBound = true;

                    socket.onAny((event, ...args) => {});

                    socket.on("connect", () => {
                        console.log("[chat] wsConnected", { sid: socket.id });
                        store.dispatch(wsConnected());
                        socket.emit("joinChat", store.getState().chat.meId);
                        const rooms = Object.keys(
                            store.getState().chat.joinedRooms.channels,
                        );
                        rooms.forEach((chId) => {
                            socket.emit("joinChannel", {
                                userId: store.getState().chat.meId,
                                channelId: chId,
                            });
                        });
                    });

                    socket.on("disconnect", (reason) => {
                        console.log("[chat] wsDisconnected", { reason });
                        store.dispatch(wsDisconnected());
                    });

                    socket.on("connect_error", (err) => {
                        console.log("[chat] wsError", err?.message ?? err);
                        store.dispatch(
                            setError((err as any)?.message ?? "WS error"),
                        );
                    });

                    socket.on("receiveDirectMessage", (data: any) => {
                        const msg: ChatMessage = {
                            id: data._id,
                            text: data.message,
                            createdAt: new Date(data.createdAt).valueOf(),
                            senderId: data.sender,
                            senderName: data.username,
                            avatar: data.profilePicture,
                            isRead: !!data.read,
                            status: data.read ? "seen" : "delivered",
                        };
                        const meIdNow = store.getState().chat.meId;
                        const threadId =
                            data.sender === meIdNow
                                ? data.receiverId
                                : data.sender;
                        store.dispatch(
                            ensureThread({ id: threadId, kind: "direct" }),
                        );
                        store.dispatch(
                            addMessageToThread({ threadId, message: msg }),
                        );
                    });

                    // ✅ replace with this
                    socket.on("receiveChannelMessage", async (data: any) => {
                        const stateBefore = store.getState();
                        const meId = String(stateBefore.chat.meId ?? "");
                        const senderId = String(
                            data.senderId ?? data.sender ?? "",
                        );
                        const threadId = String(data.channelId);
                        const isFromMe = Boolean(
                            meId && senderId && senderId === meId,
                        );

                        // If it's my own message, we ALREADY handled it with ack (replaceTempId).
                        // Do NOT add again.
                        if (isFromMe) {
                            const has =
                                stateBefore.chat.messages[data._id] ??
                                undefined;

                            if (!has) {
                                const isUrl =
                                    typeof data.message === "string" &&
                                    /^https?:\/\//i.test(data.message);
                                const looksImage =
                                    isUrl &&
                                    /\.(png|jpe?g|gif|webp)(\?|$)/i.test(
                                        data.message,
                                    );

                                const msg: ChatMessage = {
                                    id: data._id,
                                    text: data.message,
                                    createdAt: new Date(
                                        data.createdAt,
                                    ).valueOf(),
                                    senderId: data.sender,
                                    senderName: data.username,
                                    avatar: data.profilePicture,
                                    isRead: !!data.read,
                                    status: data.read ? "seen" : "delivered",
                                    mediaUri:
                                        data.attachment?.mediaUri ??
                                        (looksImage ? data.message : undefined),
                                    mimeType:
                                        data.attachment?.mimeType ??
                                        (looksImage ? "image/jpeg" : undefined),
                                    durationMs: data.attachment?.durationMs,
                                    taggedUsers: normalizeTaggedUsers(
                                        data.taggedUsers ?? data.tag,
                                    ),
                                };

                                store.dispatch(
                                    addMessageToThread({
                                        threadId,
                                        message: msg,
                                    }),
                                );
                            }
                            return;
                        }

                        const isUrl =
                            typeof data.message === "string" &&
                            /^https?:\/\//i.test(data.message);
                        const looksImage =
                            isUrl &&
                            /\.(png|jpe?g|gif|webp)(\?|$)/i.test(data.message);

                        const msg: ChatMessage = {
                            id: data._id,
                            text: data.message,
                            createdAt: new Date(data.createdAt).valueOf(),
                            senderId: data.sender,
                            senderName: data.username,
                            avatar: data.profilePicture,
                            isRead: !!data.read,
                            status: data.read ? "seen" : "delivered",
                            mediaUri:
                                data.attachment?.mediaUri ??
                                (looksImage ? data.message : undefined),
                            mimeType:
                                data.attachment?.mimeType ??
                                (looksImage ? "image/jpeg" : undefined),
                            durationMs: data.attachment?.durationMs,
                            taggedUsers: normalizeTaggedUsers(
                                data.taggedUsers ?? data.tag,
                            ),
                        };

                        store.dispatch(
                            ensureThread({ id: threadId, kind: "community" }),
                        );
                        store.dispatch(
                            addMessageToThread({ threadId, message: msg }),
                        );

                        const state = store.getState();
                        const isOnThread =
                            String(state.chat.currentThreadId ?? "") ===
                            threadId;

                        if (!isOnThread) {
                            await Notifications.scheduleNotificationAsync({
                                content: {
                                    title: data.username ?? "New message",
                                    body: msg.mediaUri
                                        ? "📷 Image"
                                        : data.message || "New message",
                                    data: { channelId: threadId },
                                },
                                trigger: null,
                            });
                        }
                    });
                    socket.on("messagesRead", (data: any) => {
                        const ids: string[] = data.messageIds || [];
                        store.dispatch(markReadBulk(ids));
                        ids.forEach((id) =>
                            store.dispatch(
                                setMessageStatus({
                                    id,
                                    status: "seen",
                                    isRead: true,
                                }),
                            ),
                        );
                    });
                    const handleDelete = (data: any) => {
                        const rawId = data?.messageId ?? data?._id ?? data?.id;
                        if (!rawId) return;
                        store.dispatch(removeMessage({ id: String(rawId) }));
                    };
                    socket.on("messageDeleted", handleDelete);
                    socket.on("deleteMessage", handleDelete);
                }

                return result;
            }

            case "chat/disconnect": {
                const socket = getSocket();
                if (socket) {
                    socket.removeAllListeners();
                    (socket as any).__handlersBound = false;
                }
                closeSocket();
                return result;
            }

            case "chat/joinChannel": {
                const { meId, channelId } = a.payload as {
                    meId: string;
                    channelId: string;
                };
                const socket = getSocket();

                const wasJoined =
                    !!store.getState().chat.joinedRooms.channels[channelId];
                if (wasJoined) return result;

                store.dispatch(
                    ensureThread({ id: channelId, kind: "community" }),
                );
                store.dispatch(setCurrentThread(channelId));
                const emitJoin = () =>
                    socket?.emit("joinChannel", { userId: meId, channelId });

                if (socket?.connected) emitJoin();
                else socket?.once("connect", emitJoin);

                store.dispatch(joinedChannel(channelId));
                return result;
            }

            case "chat/leaveChannel": {
                const { meId, channelId } = a.payload as {
                    meId: string;
                    channelId: string;
                };
                const socket = getSocket();
                if (socket?.connected) {
                    socket.emit("leaveChannel", { userId: meId, channelId });
                }
                return result;
            }

            case "chat/sendDirect": {
                const { meId, otherUserId, text, attachment } = a.payload as {
                    meId: string;
                    otherUserId: string;
                    text: string;
                    attachment?: {
                        mediaUri: string;
                        mimeType: string;
                        durationMs?: number;
                    };
                };
                const socket = getSocket();
                const tempId = `temp_${Date.now().toString(36)}_${Math.random()
                    .toString(36)
                    .slice(2, 8)}`;

                store.dispatch(
                    ensureThread({ id: otherUserId, kind: "direct" }),
                );
                const createdAt = Date.now();
                store.dispatch(
                    addMessageToThread({
                        threadId: otherUserId,
                        message: {
                            id: tempId,
                            temp: true,
                            text,
                            createdAt,
                            senderId: meId,
                            senderName: "You",
                            status: "sending",
                            mediaUri: attachment?.mediaUri,
                            mimeType: attachment?.mimeType,
                            durationMs: attachment?.durationMs,
                        },
                    }),
                );

                if (socket?.connected) {
                    const once = (data: any) => {
                        if (
                            data.sender === meId &&
                            data.receiverId === otherUserId
                        ) {
                            store.dispatch(
                                replaceTempId({ tempId, realId: data._id }),
                            );
                            store.dispatch(
                                setMessageStatus({
                                    id: data._id,
                                    status: data.read ? "seen" : "delivered",
                                    isRead: !!data.read,
                                }),
                            );
                            socket.off("receiveDirectMessage", once);
                        }
                    };
                    socket.emit("sendDirectMessage", {
                        senderId: meId,
                        receiverId: otherUserId,
                        message: text,
                        createdAt,
                    });
                    socket.on("receiveDirectMessage", once);

                    setTimeout(() => {
                        const state = store.getState();
                        if (state.chat.messages[tempId]?.status === "sending") {
                            store.dispatch(
                                setMessageStatus({
                                    id: tempId,
                                    status: "failed",
                                }),
                            );
                            socket.off("receiveDirectMessage", once);
                        }
                    }, 10000);
                } else {
                    store.dispatch(
                        setMessageStatus({ id: tempId, status: "failed" }),
                    );
                }
                return result;
            }

            case "chat/sendChannel": {
                const { meId, channelId, text, attachment, taggedUsers } =
                    a.payload as {
                        meId: string;
                        channelId: string;
                        text: string;
                        attachment?: {
                            mediaUri: string;
                            publicId?: string;
                            assetId?: string;
                            mimeType: string;
                            durationMs?: number;
                        };
                        taggedUsers?: ChatTaggedUser[];
                    };
                const socket = getSocket();
                const tempId = `temp_${Date.now().toString(36)}_${Math.random()
                    .toString(36)
                    .slice(2, 8)}`;

                store.dispatch(
                    ensureThread({ id: channelId, kind: "community" }),
                );
                store.dispatch(setCurrentThread(channelId));
                const normalizedTaggedUsers = normalizeTaggedUsers(taggedUsers);
                const tag = normalizedTaggedUsers.map((u) => u.id);
                const createdAt = Date.now();
                store.dispatch(
                    addMessageToThread({
                        threadId: channelId,
                        message: {
                            id: tempId,
                            temp: true,
                            text,
                            createdAt,
                            senderId: meId,
                            senderName: "You",
                            status: "sending",
                            mediaUri: attachment?.mediaUri,
                            mimeType: attachment?.mimeType,
                            durationMs: attachment?.durationMs,
                            taggedUsers: normalizedTaggedUsers,
                        },
                    }),
                );

                const now = Date.now();
                if (now - lastEmitAt < EMIT_GAP) {
                    setTimeout(
                        () => store.dispatch(a),
                        EMIT_GAP - (now - lastEmitAt),
                    );
                    return result;
                }
                lastEmitAt = now;

                if (socket?.connected) {
                    socket.emit(
                        "sendChannelMessage",
                        {
                            senderId: meId,
                            channelId,
                            message: text,
                            attachment,
                            tag,
                            createdAt,
                        },
                        (ack?: {
                            _id?: string;
                            read?: boolean;
                            createdAt?: number;
                        }) => {
                            if (ack?._id) {
                                store.dispatch(
                                    replaceTempId({
                                        tempId,
                                        realId: ack._id,
                                        createdAt: ack.createdAt,
                                    }),
                                );
                                store.dispatch(
                                    setMessageStatus({
                                        id: ack._id,
                                        status: ack.read ? "seen" : "delivered",
                                        isRead: !!ack.read,
                                    }),
                                );
                            } else {
                                store.dispatch(
                                    setMessageStatus({
                                        id: tempId,
                                        status: "failed",
                                    }),
                                );
                            }
                        },
                    );

                    setTimeout(() => {
                        const state = store.getState();
                        if (state.chat.messages[tempId]?.status === "sending") {
                            store.dispatch(
                                setMessageStatus({
                                    id: tempId,
                                    status: "failed",
                                }),
                            );
                        }
                    }, 10000);
                } else {
                    store.dispatch(
                        setMessageStatus({ id: tempId, status: "failed" }),
                    );
                }
                return result;
            }

            case "chat/retrySendChannel": {
                const { messageId } = a.payload as { messageId: string };
                const socket = getSocket();
                const state = store.getState();
                const threadId = state.chat.currentThreadId;
                const meId = state.chat.meId;

                if (!threadId || !meId) {
                    store.dispatch(
                        setError("Cannot retry without an active channel"),
                    );
                    return result;
                }

                const msg = state.chat.messages[messageId];
                if (!msg) {
                    store.dispatch(
                        setError("Message no longer exists locally"),
                    );
                    return result;
                }

                const normalizedTaggedUsers = normalizeTaggedUsers(
                    msg.taggedUsers ?? [],
                );
                const tag = normalizedTaggedUsers.map((u) => u.id);
                const attachment = msg.mediaUri
                    ? {
                          mediaUri: msg.mediaUri,
                          publicId: (msg as any).publicId,
                          assetId: (msg as any).assetId,
                          mimeType: msg.mimeType,
                          durationMs: msg.durationMs,
                      }
                    : undefined;

                store.dispatch(
                    setMessageStatus({ id: messageId, status: "sending" }),
                );

                if (socket?.connected) {
                    socket.emit(
                        "sendChannelMessage",
                        {
                            senderId: meId,
                            channelId: threadId,
                            message: msg.text,
                            attachment,
                            tag,
                            createdAt: msg.createdAt,
                        },
                        (ack?: {
                            _id?: string;
                            read?: boolean;
                            createdAt?: number;
                        }) => {
                            if (ack?._id) {
                                store.dispatch(
                                    replaceTempId({
                                        tempId: messageId,
                                        realId: ack._id,
                                        createdAt: ack.createdAt,
                                    }),
                                );
                                store.dispatch(
                                    setMessageStatus({
                                        id: ack._id,
                                        status: ack.read ? "seen" : "delivered",
                                        isRead: !!ack.read,
                                    }),
                                );
                            } else {
                                store.dispatch(
                                    setMessageStatus({
                                        id: messageId,
                                        status: "failed",
                                    }),
                                );
                            }
                        },
                    );

                    setTimeout(() => {
                        const latest = store.getState();
                        if (
                            latest.chat.messages[messageId]?.status ===
                            "sending"
                        ) {
                            store.dispatch(
                                setMessageStatus({
                                    id: messageId,
                                    status: "failed",
                                }),
                            );
                        }
                    }, 10000);
                } else {
                    store.dispatch(
                        setMessageStatus({ id: messageId, status: "failed" }),
                    );
                    store.dispatch(setError("Cannot retry while offline"));
                }
                return result;
            }

            case "chat/markAsRead": {
                const { meId, messageIds, kind, otherUserId, channelId } =
                    a.payload as {
                        meId: string;
                        messageIds: string[];
                        kind: "direct" | "community";
                        otherUserId?: string;
                        channelId?: string;
                    };
                const socket = getSocket();
                if (socket?.connected) {
                    socket.emit("markAsRead", {
                        userId: meId,
                        messageIds,
                        type: kind,
                        ...(kind === "direct"
                            ? { otherUserId }
                            : { channelId }),
                    });
                }
                store.dispatch(markReadBulk(messageIds));
                return result;
            }

            case "chat/deleteMessage": {
                const { userId, messageId } = a.payload as {
                    userId: string;
                    messageId: string;
                };
                const socket = getSocket();
                store.dispatch(removeMessage({ id: messageId }));
                if (socket?.connected) {
                    socket.emit("deleteMessage", { userId, messageId });
                }
                return result;
            }

            case "chat/fetchMessages/fulfilled": {
                // Fallback: if fetching messages succeeded, auto-join the channel's socket room
                // in case client isn't already there (prevents missing real-time messages)
                const payload = a.payload as {
                    threadId: string;
                    kind: "community" | "direct";
                    items: any[];
                };

                if (payload.kind === "community") {
                    const channelId = payload.threadId;
                    const state = store.getState();
                    const isAlreadyJoined =
                        !!state.chat.joinedRooms.channels[channelId];

                    if (!isAlreadyJoined) {
                        console.log(
                            `[chat] Auto-joining channel ${channelId} after fetchMessages (wasn't in socket room)`,
                        );
                        store.dispatch({
                            type: "chat/joinChannel",
                            payload: {
                                meId: state.chat.meId,
                                channelId,
                            },
                        });
                    }
                }

                return result;
            }
        }

        return result;
    };
