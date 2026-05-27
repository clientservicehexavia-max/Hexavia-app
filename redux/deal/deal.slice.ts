import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { Deal, DealState } from "./deal.types";
import {
    fetchDeals,
    fetchDealById,
    createDeal,
    updateDeal,
    deleteDeal,
} from "./deal.thunks";

const initialState: DealState = {
    byId: {},
    allIds: [],
    loading: false,
    error: null,
    pagination: {
        currentPage: 1,
        totalPages: 0,
        totalCount: 0,
        limit: 20,
    },
    filters: {
        stage: undefined,
        search: "",
        partnerId: undefined,
    },
    currentDeal: null,
};

export const dealSlice = createSlice({
    name: "deal",
    initialState,
    reducers: {
        setDealFilters: (
            state,
            action: PayloadAction<{
                stage?: string;
                search?: string;
                partnerId?: string;
            }>
        ) => {
            state.filters = { ...state.filters, ...action.payload };
            state.pagination.currentPage = 1;
        },
        clearDealFilters: (state) => {
            state.filters = { stage: undefined, search: "", partnerId: undefined };
            state.pagination.currentPage = 1;
        },
        setCurrentDeal: (state, action: PayloadAction<Deal | null>) => {
            state.currentDeal = action.payload;
        },
    },
    extraReducers: (builder) => {
        // Fetch Deals
        builder
            .addCase(fetchDeals.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchDeals.fulfilled, (state, action) => {
                state.loading = false;
                if (Array.isArray(action.payload)) {
                    state.byId = {};
                    state.allIds = [];
                    action.payload.forEach((deal) => {
                        state.byId[deal._id] = deal;
                        state.allIds.push(deal._id);
                    });
                }
            })
            .addCase(fetchDeals.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload?.message || "Failed to fetch deals";
            });

        // Fetch Deal by ID
        builder
            .addCase(fetchDealById.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchDealById.fulfilled, (state, action) => {
                state.loading = false;
                state.byId[action.payload._id] = action.payload;
                if (!state.allIds.includes(action.payload._id)) {
                    state.allIds.push(action.payload._id);
                }
                state.currentDeal = action.payload;
            })
            .addCase(fetchDealById.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload?.message || "Failed to fetch deal";
            });

        // Create Deal
        builder
            .addCase(createDeal.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createDeal.fulfilled, (state, action) => {
                state.loading = false;
                state.byId[action.payload._id] = action.payload;
                if (!state.allIds.includes(action.payload._id)) {
                    state.allIds.push(action.payload._id);
                }
                state.currentDeal = action.payload;
            })
            .addCase(createDeal.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload?.message || "Failed to create deal";
            });

        // Update Deal
        builder
            .addCase(updateDeal.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateDeal.fulfilled, (state, action) => {
                state.loading = false;
                state.byId[action.payload._id] = action.payload;
                state.currentDeal = action.payload;
            })
            .addCase(updateDeal.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload?.message || "Failed to update deal";
            });

        // Delete Deal
        builder
            .addCase(deleteDeal.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(deleteDeal.fulfilled, (state, action) => {
                state.loading = false;
                const { id } = action.payload;
                delete state.byId[id];
                state.allIds = state.allIds.filter((dealId) => dealId !== id);
                if (state.currentDeal?._id === id) {
                    state.currentDeal = null;
                }
            })
            .addCase(deleteDeal.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload?.message || "Failed to delete deal";
            });
    },
});

export const { setDealFilters, clearDealFilters, setCurrentDeal } =
    dealSlice.actions;

export default dealSlice.reducer;
