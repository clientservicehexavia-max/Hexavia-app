export type ChatTaggedUser = {
    id: string;
    handle?: string;
    name?: string;
    avatar?: string;
};

export type ChatMessage = {
    id: string;
    temp?: boolean;
    text: string;
    createdAt: number;
    senderId: string;
    senderName?: string;
    avatar?: string | null;
    isRead?: boolean;
    status?: "sending" | "sent" | "delivered" | "seen" | "failed";
    mediaUri?: string;
    mimeType?: string;
    durationMs?: number;
    replyTo?: { id: string; preview: string; senderName?: string };
    taggedUsers?: ChatTaggedUser[];
};

export type ThreadId = string;

export type Thread = {
    id: ThreadId;
    kind: "direct" | "community";
    title?: string;
    subtitle?: string;
    members?: string[];
    messages: string[];
};

export type ChatState = {
    meId: string | null;
    currentThreadId: string | null;
    threads: Record<ThreadId, Thread>;
    messages: Record<string, ChatMessage>;
    joinedRooms: {
        me: boolean;
        channels: Record<string, boolean>;
    };
    connecting: boolean;
    connected: boolean;
    error?: string | null;

    loadingByThread?: Record<string, boolean>;
    hasMoreByThread?: Record<string, boolean>;
    nextSkipByThread?: Record<string, number>;
};
