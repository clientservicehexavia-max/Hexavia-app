import { api } from "@/api/axios";
import { createAsyncThunk } from "@reduxjs/toolkit";

type FetchArgs = {
    id: string;
    type: "community" | "direct";
    limit?: number;
    skip?: number;
};

export const fetchMessages = createAsyncThunk(
    "chat/fetchMessages",
    async ({ id, type, limit = 50, skip = 0 }: FetchArgs, { getState }) => {
        const state = getState() as any;
        const localMessages = state.chat.messages;
        const threadMsgs = state.chat.threads?.[id]?.messages ?? [];
        const localNonTempIds = threadMsgs.filter((mid: string) => {
            const msg = localMessages[mid];
            return msg && !msg.temp;
        });

        const effectiveLimit =
            skip === 0 ? Math.max(limit, localNonTempIds.length + 50) : limit;

        const { data } = await api.get(`/messages/${id}/${type}`, {
            params: { limit: effectiveLimit, skip },
        });

        const items = data?.messages ?? [];
        const totalCount = data?.totalCount ?? 0;

        // If this is a fresh fetch (skip=0) and local count > server count, clear all old messages
        // because deletions occurred while we were offline
        const orphanedIds: string[] = [];
        if (skip === 0) {
            const localCount = localNonTempIds.length;

            // If server has fewer messages than we have locally, messages were deleted
            if (totalCount < localCount) {
                // Mark all current local messages as orphaned; fresh fetch will repopulate them
                for (const localId of localNonTempIds) {
                    const msg = localMessages[localId];
                    if (msg && !msg.temp) {
                        orphanedIds.push(localId);
                    }
                }
            }
        }

        const serverIds = items.map((d: any) =>
            String(d._id ?? `${d.sender}-${d.createdAt}`),
        );

        return {
            threadId: id,
            kind: type,
            items,
            page: { limit: effectiveLimit, skip },
            orphanedIds,
            reconcile:
                skip === 0
                    ? {
                          localNonTempIds,
                          serverIds,
                      }
                    : undefined,
        };
    },
);
