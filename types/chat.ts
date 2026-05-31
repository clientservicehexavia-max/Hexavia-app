export type MessageStatus =
    | "sending"
    | "sent"
    | "delivered"
    | "seen"
    | "failed";

export type ReplyMeta = {
    id: string;
    preview: string; // short preview of the parent message
    senderName: string;
};

export type Mention = { id: string; name: string; handle: string };

export type Message = {
    id: string;
    text: string;
    createdAt: number;
    senderId: string;
    senderName: string;
    avatar?: string;
    status?: string;
    seenBy?: string[];
    replyTo?: ReplyMeta;
    mediaUri?: string;
    mimeType?: string;
    durationMs?: number;
    mentions?: Mention[];
};

export type AttachmentKind = "gallery" | "audio" | "camera" | "document";
