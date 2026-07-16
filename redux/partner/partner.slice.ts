import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
    createPartner,
    deletePartner,
    fetchPartnerById,
    fetchPartners,
    updatePartner,
} from "./partner.thunks";
import type { Partner, PartnerState } from "./partner.types";

const initialState: PartnerState = {
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
        status: undefined,
        search: "",
    },
    currentPartner: null,
};

export const partnerSlice = createSlice({
    name: "partner",
    initialState,
    reducers: {
        setPartnerFilters: (
            state,
            action: PayloadAction<{
                status?: string;
                search?: string;
            }>,
        ) => {
            state.filters = { ...state.filters, ...action.payload };
            state.pagination.currentPage = 1;
        },
        clearPartnerFilters: (state) => {
            state.filters = { status: undefined, search: "" };
            state.pagination.currentPage = 1;
        },
        setCurrentPartner: (state, action: PayloadAction<Partner | null>) => {
            state.currentPartner = action.payload;
        },
    },
    extraReducers: (builder) => {
        // Fetch Partners
        builder
            .addCase(fetchPartners.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchPartners.fulfilled, (state, action) => {
                state.loading = false;
                const page = action.meta.arg?.page ?? 1;
                const partners = action.payload?.partners ?? [];
                const pagination = action.payload?.pagination;

                if (Array.isArray(partners)) {
                    if (page <= 1) {
                        state.byId = {};
                        state.allIds = [];
                    }

                    partners.forEach((partner) => {
                        state.byId[partner._id] = partner;
                        if (!state.allIds.includes(partner._id)) {
                            state.allIds.push(partner._id);
                        }
                    });
                }

                if (pagination) {
                    state.pagination = {
                        currentPage: pagination.page,
                        totalPages: pagination.pages,
                        totalCount: pagination.total,
                        limit: pagination.limit,
                    };
                }
            })
            .addCase(fetchPartners.rejected, (state, action) => {
                state.loading = false;
                state.error =
                    action.payload?.message || "Failed to fetch partners";
            });

        // Fetch Partner by ID
        builder
            .addCase(fetchPartnerById.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchPartnerById.fulfilled, (state, action) => {
                state.loading = false;
                state.byId[action.payload._id] = action.payload;
                if (!state.allIds.includes(action.payload._id)) {
                    state.allIds.push(action.payload._id);
                }
                state.currentPartner = action.payload;
            })
            .addCase(fetchPartnerById.rejected, (state, action) => {
                state.loading = false;
                state.error =
                    action.payload?.message || "Failed to fetch partner";
            });

        // Create Partner
        builder
            .addCase(createPartner.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createPartner.fulfilled, (state, action) => {
                state.loading = false;
                state.byId[action.payload._id] = action.payload;
                if (!state.allIds.includes(action.payload._id)) {
                    state.allIds.push(action.payload._id);
                }
                state.currentPartner = action.payload;
            })
            .addCase(createPartner.rejected, (state, action) => {
                state.loading = false;
                state.error =
                    action.payload?.message || "Failed to create partner";
            });

        // Update Partner
        builder
            .addCase(updatePartner.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updatePartner.fulfilled, (state, action) => {
                state.loading = false;
                state.byId[action.payload._id] = action.payload;
                state.currentPartner = action.payload;
            })
            .addCase(updatePartner.rejected, (state, action) => {
                state.loading = false;
                state.error =
                    action.payload?.message || "Failed to update partner";
            });

        // Delete Partner
        builder
            .addCase(deletePartner.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(deletePartner.fulfilled, (state, action) => {
                state.loading = false;
                const { id } = action.payload;
                delete state.byId[id];
                state.allIds = state.allIds.filter(
                    (partnerId) => partnerId !== id,
                );
                if (state.currentPartner?._id === id) {
                    state.currentPartner = null;
                }
            })
            .addCase(deletePartner.rejected, (state, action) => {
                state.loading = false;
                state.error =
                    action.payload?.message || "Failed to delete partner";
            });
    },
});

export const { setPartnerFilters, clearPartnerFilters, setCurrentPartner } =
    partnerSlice.actions;

export default partnerSlice.reducer;
