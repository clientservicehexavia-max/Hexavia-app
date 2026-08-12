import type { RootState } from "@/store";
import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
    addMemberToChannel,
    createChannel,
    createChannelTask,
    deleteChannelById,
    deleteChannelTask,
    fetchChannelByCode,
    fetchChannelById,
    fetchChannels,
    fetchChannelTasks,
    generateChannelCode,
    importChannelTasks,
    joinChannel,
    removeMemberFromChannel,
    restoreChannelById,
    updateChannel,
    updateChannelMemberRole,
    updateChannelTask,
    uploadChannelResources,
} from "./channels.thunks";
import type { Channel, ChannelId } from "./channels.types";

const normalizeCode = (c: string) => c.trim().toUpperCase().replace(/\s+/g, "");

type Status = "idle" | "loading" | "succeeded" | "failed";

export interface ChannelsState {
    byId: Record<ChannelId, Channel>;
    allIds: ChannelId[];
    status: Status;
    error: string | null;
    currentChannelId: ChannelId | null;
    lastGeneratedCode: string | null;
    codeIndex: Record<string, ChannelId>;
}

const initialState: ChannelsState = {
    byId: {},
    allIds: [],
    status: "idle",
    error: null,
    currentChannelId: null,
    lastGeneratedCode: null,
    codeIndex: {},
};

function indexChannel(state: ChannelsState, ch: Channel) {
    const rawCode = (ch as any).code ?? (ch as any).channelCode;
    if (rawCode) state.codeIndex[normalizeCode(String(rawCode))] = ch._id;
}

function upsertMany(state: ChannelsState, channels: Channel[]) {
    if (!Array.isArray(channels)) return;
    for (const ch of channels) {
        state.byId[ch._id] = { ...state.byId[ch._id], ...ch };
        if (!state.allIds.includes(ch._id)) state.allIds.push(ch._id);
        indexChannel(state, ch);
    }
}

function upsertOne(state: ChannelsState, channel: Channel) {
    state.byId[channel._id] = { ...state.byId[channel._id], ...channel };
    if (!state.allIds.includes(channel._id)) state.allIds.push(channel._id);
    indexChannel(state, channel);
}

function removeOne(state: ChannelsState, channelId: ChannelId) {
    delete state.byId[channelId];
    state.allIds = state.allIds.filter((id) => id !== channelId);
    // also remove from code index
    for (const [code, id] of Object.entries(state.codeIndex)) {
        if (id === channelId) delete state.codeIndex[code];
    }
    if (state.currentChannelId === channelId) state.currentChannelId = null;
}

const channelsSlice = createSlice({
    name: "channels",
    initialState,
    reducers: {
        setCurrentChannel(state, action: PayloadAction<ChannelId | null>) {
            state.currentChannelId = action.payload;
        },
        clearChannels(state) {
            state.byId = {};
            state.allIds = [];
            state.currentChannelId = null;
            state.lastGeneratedCode = null;
            state.status = "idle";
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchChannels.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(fetchChannels.fulfilled, (state, action) => {
                state.status = "succeeded";
                upsertMany(state, action.payload);
            })
            .addCase(fetchChannels.rejected, (state, action) => {
                state.status = "failed";
                state.error =
                    (action.payload as string) ?? action.error.message ?? null;
            });

        builder
            .addCase(fetchChannelById.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(fetchChannelById.fulfilled, (state, action) => {
                state.status = "succeeded";
                upsertOne(state, action.payload);
            });

        builder
            .addCase(fetchChannelTasks.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(fetchChannelTasks.fulfilled, (state, action) => {
                state.status = "succeeded";
                const { channelId, tasks } = action.payload;
                const existing = state.byId[channelId];
                if (existing) {
                    state.byId[channelId] = { ...existing, tasks };
                }
            })
            .addCase(fetchChannelTasks.rejected, (state, action) => {
                state.status = "failed";
                state.error =
                    (action.payload as string) ?? action.error.message ?? null;
            });

        builder
            .addCase(createChannel.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(createChannel.fulfilled, (state, action) => {
                state.status = "succeeded";
                upsertOne(state, action.payload);
                state.currentChannelId = action.payload._id;
            })
            .addCase(createChannel.rejected, (state, action) => {
                state.status = "failed";
                state.error =
                    action.error.message ?? "Failed to create channel";
            });

        builder
            .addCase(generateChannelCode.pending, (state) => {
                state.error = null;
            })
            .addCase(generateChannelCode.fulfilled, (state, action) => {
                state.lastGeneratedCode = action.payload;
            })
            .addCase(generateChannelCode.rejected, (state, action) => {
                state.error = action.error.message ?? "Failed to generate code";
            });

        //   Admin actions: add/remove/update member
        builder
            .addCase(addMemberToChannel.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(addMemberToChannel.fulfilled, (state, action) => {
                state.status = "succeeded";
                upsertOne(state, action.payload);
            })
            .addCase(addMemberToChannel.rejected, (state, action) => {
                state.status = "failed";
                state.error =
                    (action.payload as string) ?? action.error.message ?? null;
            });

        builder
            .addCase(removeMemberFromChannel.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(removeMemberFromChannel.fulfilled, (state, action) => {
                state.status = "succeeded";
                upsertOne(state, action.payload);
            })
            .addCase(removeMemberFromChannel.rejected, (state, action) => {
                state.status = "failed";
                state.error =
                    (action.payload as string) ?? action.error.message ?? null;
            });

        builder
            .addCase(updateChannelMemberRole.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(updateChannelMemberRole.fulfilled, (state, action) => {
                state.status = "succeeded";
                upsertOne(state, action.payload);
            })
            .addCase(updateChannelMemberRole.rejected, (state, action) => {
                state.status = "failed";
                state.error =
                    (action.payload as string) ?? action.error.message ?? null;
            });

        builder
            .addCase(updateChannel.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(updateChannel.fulfilled, (state, action) => {
                state.status = "succeeded";
                upsertOne(state, action.payload);
            })
            .addCase(updateChannel.rejected, (state, action) => {
                state.status = "failed";
                state.error =
                    (action.payload as string) ?? action.error.message ?? null;
            });

        //   Channel tasks & resources
        builder
            .addCase(createChannelTask.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(createChannelTask.fulfilled, (state, action) => {
                state.status = "succeeded";
                upsertOne(state, action.payload);
            })
            .addCase(createChannelTask.rejected, (state, action) => {
                state.status = "failed";
                state.error =
                    (action.payload as string) ?? action.error.message ?? null;
            });

        builder
            .addCase(importChannelTasks.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(importChannelTasks.fulfilled, (state, action) => {
                state.status = "succeeded";
                upsertOne(state, action.payload);
            })
            .addCase(importChannelTasks.rejected, (state, action) => {
                state.status = "failed";
                state.error =
                    (action.payload as string) ?? action.error.message ?? null;
            });

        builder
            .addCase(updateChannelTask.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(updateChannelTask.fulfilled, (state, action) => {
                state.status = "succeeded";
                upsertOne(state, action.payload);
            })
            .addCase(updateChannelTask.rejected, (state, action) => {
                state.status = "failed";
                state.error =
                    (action.payload as string) ?? action.error.message ?? null;
            });

        builder
            .addCase(deleteChannelTask.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(deleteChannelTask.fulfilled, (state, action) => {
                state.status = "succeeded";
                const { channelId, taskId } = action.payload;
                const existing = state.byId[channelId];
                if (existing?.tasks?.length) {
                    existing.tasks = existing.tasks.filter(
                        (t: any) => String(t?._id ?? t?.id) !== String(taskId),
                    );
                }
            })
            .addCase(deleteChannelTask.rejected, (state, action) => {
                state.status = "failed";
                state.error =
                    (action.payload as string) ?? action.error.message ?? null;
            });

        builder
            .addCase(uploadChannelResources.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(uploadChannelResources.fulfilled, (state, action) => {
                state.status = "succeeded";
                upsertOne(state, action.payload);
            })
            .addCase(uploadChannelResources.rejected, (state, action) => {
                state.status = "failed";
                state.error =
                    (action.payload as string) ?? action.error.message ?? null;
            });

        // Delete channel
        builder
            .addCase(deleteChannelById.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(deleteChannelById.fulfilled, (state, action) => {
                state.status = "succeeded";
                const id = action.payload;
                if (id) removeOne(state, id);
            })
            .addCase(deleteChannelById.rejected, (state, action) => {
                state.status = "failed";
                state.error =
                    (action.payload as string) ?? action.error.message ?? null;
            });

        builder
            .addCase(restoreChannelById.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(restoreChannelById.fulfilled, (state, action) => {
                state.status = "succeeded";
                const channel = action.payload?.channel;
                if (channel?._id) upsertOne(state, channel);
            })
            .addCase(restoreChannelById.rejected, (state, action) => {
                state.status = "failed";
                state.error =
                    (action.payload as string) ?? action.error.message ?? null;
            });

        // Fetch channel by code
        builder
            .addCase(fetchChannelByCode.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(fetchChannelByCode.fulfilled, (state, action) => {
                state.status = "succeeded";
                upsertOne(state, action.payload);
            })
            .addCase(fetchChannelByCode.rejected, (state, action) => {
                state.status = "failed";
                state.error =
                    (action.payload as string) ?? action.error.message ?? null;
            });

        // Join channel
        builder
            .addCase(joinChannel.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(joinChannel.fulfilled, (state, action) => {
                state.status = "succeeded";
                upsertOne(state, action.payload);
            })
            .addCase(joinChannel.rejected, (state, action) => {
                state.status = "failed";
                state.error =
                    (action.payload as string) ?? action.error.message ?? null;
            });
    },
});

export const { setCurrentChannel, clearChannels } = channelsSlice.actions;
export default channelsSlice.reducer;

export const selectChannelsState = (s: RootState) => s.channels;
export const selectAllChannels = createSelector(
    [(s: RootState) => s.channels.allIds, (s: RootState) => s.channels.byId],
    (allIds, byId) => allIds.map((id) => byId[id]),
);
export const selectChannelById = (id: ChannelId) => (s: RootState) =>
    s.channels.byId[id] ?? null;

export const selectCurrentChannel = (s: RootState) =>
    s.channels.currentChannelId
        ? s.channels.byId[s.channels.currentChannelId]
        : null;
export const selectLastGeneratedCode = (s: RootState) =>
    s.channels.lastGeneratedCode;

export const selectChannelIdByCode = (code: string) => (s: RootState) =>
    s.channels.codeIndex[normalizeCode(code)] ?? null;

export const selectChannelByCode = (code: string) => (s: RootState) => {
    const id = s.channels.codeIndex[normalizeCode(code)];
    return id ? s.channels.byId[id] : null;
};

type MemberLike =
    | string
    | { _id?: string; userId?: string; user?: { _id?: string } }
    | null
    | undefined;

const hasUserId = (m: MemberLike, userId: string) => {
    if (!m) return false;
    if (typeof m === "string") return m === userId;
    if (m._id === userId) return true;
    if (m.userId === userId) return true;
    if (m.user?._id === userId) return true;
    return false;
};

export const selectChannelsForUser = (userId: string) =>
    createSelector(
        [
            (s: RootState) => s.channels.allIds,
            (s: RootState) => s.channels.byId as Record<ChannelId, Channel>,
        ],
        (allIds, byId) =>
            allIds
                .map((id) => byId[id])
                .filter(
                    (ch) =>
                        Array.isArray((ch as any)?.members) &&
                        (ch as any).members.some((m: MemberLike) =>
                            hasUserId(m, userId),
                        ),
                ),
    );
