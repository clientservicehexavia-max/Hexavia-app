// redux/client/client.slice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
    createClient,
    deleteClient,
    fetchAllClients,
    fetchClientById,
    fetchClients,
    fetchClientStats,
    patchClient,
    updateClient,
} from "./client.thunks";
import type { Client, ClientFilters, ClientState } from "./client.types";

const initialState: ClientState = {
    byId: {},
    allIds: [],
    listLoading: false,
    detailLoading: false,
    mutationLoading: false,
    pagination: null,
    filters: {
        page: 1,
        limit: 10,
        sortOrder: "desc",
    },
    current: null,
    stats: null,
    statsLoading: false,
    error: null,
    rateLimited: {
        retryAfter: null,
        at: null,
    },
};

const upsertOne = (state: ClientState, c?: Client | null) => {
    if (!c || !c._id) return; // guard
    state.byId[c._id] = { ...state.byId[c._id], ...c };
    if (!state.allIds.includes(c._id)) state.allIds.push(c._id);
};

const upsertMany = (state: ClientState, items: Client[]) => {
    items.forEach((c) => upsertOne(state, c));
};

const clientSlice = createSlice({
    name: "client",
    initialState,
    reducers: {
        setClientFilters(state, action: PayloadAction<Partial<ClientFilters>>) {
            state.filters = { ...state.filters, ...action.payload };
        },
        clearClientFilters(state) {
            state.filters = { page: 1, limit: 10, sortOrder: "desc" };
        },
        setCurrentClient(state, action: PayloadAction<Client | null>) {
            state.current = action.payload;
        },
        resetClientState() {
            return initialState;
        },
    },
    extraReducers: (builder) => {
        // List
        builder
            .addCase(fetchClients.pending, (state) => {
                state.listLoading = true;
                state.error = null;
            })
            .addCase(fetchClients.fulfilled, (state, { payload }) => {
                state.listLoading = false;
                state.byId = {};
                state.allIds = [];
                upsertMany(state, payload?.clients || []);
                state.pagination = payload?.pagination ?? null;
            })
            .addCase(fetchClients.rejected, (state, action) => {
                state.listLoading = false;

                // action.payload is from rejectWithValue
                const p = action.payload as any;

                if (
                    p?.code === 429 ||
                    p?.code === 503 ||
                    p?.gaveUpAfterRetries
                ) {
                    // Keep existing list intact; set a friendly, structured error
                    state.error = "rate_limited";
                    // store Retry-After (seconds or HTTP-date) if provided
                    state.rateLimited = {
                        retryAfter: p?.retryAfter ?? null,
                        at: String(Date.now()),
                    };
                    return;
                }

                // non-rate-limit errors
                state.error = String(p || action.error.message);
            });

        builder
            .addCase(fetchAllClients.pending, (state) => {
                state.listLoading = true;
                state.error = null;
            })
            .addCase(fetchAllClients.fulfilled, (state, { payload }) => {
                state.listLoading = false;
                state.byId = {};
                state.allIds = [];
                upsertMany(state, payload?.clients || []);
                state.pagination = payload?.pagination ?? null;
            })
            .addCase(fetchAllClients.rejected, (state, action) => {
                state.listLoading = false;

                const p = action.payload as any;

                if (
                    p?.code === 429 ||
                    p?.code === 503 ||
                    p?.gaveUpAfterRetries
                ) {
                    state.error = "rate_limited";
                    state.rateLimited = {
                        retryAfter: p?.retryAfter ?? null,
                        at: String(Date.now()),
                    };
                    return;
                }

                state.error = String(p || action.error.message);
            });

        // Detail
        builder
            .addCase(fetchClientById.pending, (state) => {
                state.detailLoading = true;
                state.error = null;
            })
            .addCase(fetchClientById.fulfilled, (state, { payload }) => {
                state.detailLoading = false;
                if (!payload || !payload._id) return; // guard
                upsertOne(state, payload);
                state.current = payload;
            })
            .addCase(fetchClientById.rejected, (state, action) => {
                state.detailLoading = false;
                state.error = String(action.payload || action.error.message);
            });

        // Create
        builder
            .addCase(createClient.pending, (state) => {
                state.mutationLoading = true;
            })
            .addCase(createClient.fulfilled, (state, { payload }) => {
                state.mutationLoading = false;
                if (!payload || !payload._id) return; // guard
                state.byId[payload._id] = payload;
                if (!state.allIds.includes(payload._id))
                    state.allIds.unshift(payload._id);
                state.current = payload;
                if (state.pagination) state.pagination.totalClients += 1;
            })
            .addCase(createClient.rejected, (state, action) => {
                state.mutationLoading = false;
                state.error = String(action.payload || action.error.message);
            });

        // Update (PUT)
        builder
            .addCase(updateClient.pending, (state) => {
                state.mutationLoading = true;
            })
            .addCase(updateClient.fulfilled, (state, { payload }) => {
                state.mutationLoading = false;
                if (!payload || !payload._id) return; // guard
                upsertOne(state, payload);
                state.current = state.byId[payload._id];
            })
            .addCase(updateClient.rejected, (state, action) => {
                state.mutationLoading = false;
                state.error = String(action.payload || action.error.message);
            });

        // Patch
        builder
            .addCase(patchClient.pending, (state) => {
                state.mutationLoading = true;
            })
            .addCase(patchClient.fulfilled, (state, { payload }) => {
                state.mutationLoading = false;
                if (!payload || !payload._id) return; // guard
                upsertOne(state, payload);
                state.current = state.byId[payload._id];
            })
            .addCase(patchClient.rejected, (state, action) => {
                state.mutationLoading = false;
                state.error = String(action.payload || action.error.message);
            });

        // Delete
        builder
            .addCase(deleteClient.pending, (state) => {
                state.mutationLoading = true;
            })
            .addCase(deleteClient.fulfilled, (state, { payload: id }) => {
                state.mutationLoading = false;
                if (id && state.byId[id]) delete state.byId[id];
                state.allIds = state.allIds.filter((x) => x !== id);
                if (state.current?._id === id) state.current = null;
                if (state.pagination && state.pagination.totalClients > 0) {
                    state.pagination.totalClients -= 1;
                }
            })
            .addCase(deleteClient.rejected, (state, action) => {
                state.mutationLoading = false;
                state.error = String(action.payload || action.error.message);
            });

        // Stats
        builder
            .addCase(fetchClientStats.pending, (state) => {
                state.statsLoading = true;
            })
            .addCase(fetchClientStats.fulfilled, (state, { payload }) => {
                state.statsLoading = false;
                state.stats = payload ?? null;
            })
            .addCase(fetchClientStats.rejected, (state, action) => {
                state.statsLoading = false;
                state.error = String(action.payload || action.error.message);
            });
    },
});

export const {
    setClientFilters,
    clearClientFilters,
    setCurrentClient,
    resetClientState,
} = clientSlice.actions;

export default clientSlice.reducer;
