import { createSlice } from "@reduxjs/toolkit";
import {
    createPartnership,
    deletePartnership,
    fetchPartnerships,
    getPartnership,
    updatePartnership,
} from "./partnership.thunks";
import type { PartnershipState } from "./partnership.types";

const initialState: PartnershipState = {
    partnerships: [],
    selectedPartnership: null,
    loading: false,
    error: null,
    pagination: null,
};

const partnershipSlice = createSlice({
    name: "partnership",
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
        clearSelected: (state) => {
            state.selectedPartnership = null;
        },
    },
    extraReducers: (builder) => {
        // Fetch Partnerships
        builder
            .addCase(fetchPartnerships.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchPartnerships.fulfilled, (state, action: any) => {
                state.loading = false;
                state.partnerships =
                    action.payload.data || action.payload || [];
                state.pagination = action.payload.pagination;
            })
            .addCase(fetchPartnerships.rejected, (state, action: any) => {
                state.loading = false;
                state.error = action.payload || "Failed to fetch partnerships";
            });

        // Get Single Partnership
        builder
            .addCase(getPartnership.pending, (state) => {
                state.loading = true;
            })
            .addCase(getPartnership.fulfilled, (state, action: any) => {
                state.loading = false;
                state.selectedPartnership = action.payload;
            })
            .addCase(getPartnership.rejected, (state, action: any) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Create Partnership
        builder
            .addCase(createPartnership.pending, (state) => {
                state.loading = true;
            })
            .addCase(createPartnership.fulfilled, (state, action: any) => {
                state.loading = false;
                state.partnerships.unshift(action.payload);
            })
            .addCase(createPartnership.rejected, (state, action: any) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Update Partnership
        builder
            .addCase(updatePartnership.pending, (state) => {
                state.loading = true;
            })
            .addCase(updatePartnership.fulfilled, (state, action: any) => {
                state.loading = false;
                const index = state.partnerships.findIndex(
                    (p) => p._id === action.payload._id,
                );
                if (index > -1) {
                    state.partnerships[index] = action.payload;
                }
                state.selectedPartnership = action.payload;
            })
            .addCase(updatePartnership.rejected, (state, action: any) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Delete Partnership
        builder
            .addCase(deletePartnership.pending, (state) => {
                state.loading = true;
            })
            .addCase(deletePartnership.fulfilled, (state, action: any) => {
                state.loading = false;
                state.partnerships = state.partnerships.filter(
                    (p) => p._id !== action.payload,
                );
            })
            .addCase(deletePartnership.rejected, (state, action: any) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const { clearError, clearSelected } = partnershipSlice.actions;
export default partnershipSlice.reducer;
