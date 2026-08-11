import { createSlice } from "@reduxjs/toolkit";
import {
    addRecruitmentCandidate,
    addRecruitmentCandidateDocument,
    addRecruitmentCandidateNote,
    createRecruitment,
    deleteRecruitment,
    deleteRecruitmentCandidateDocument,
    fetchRecruitmentById,
    fetchRecruitments,
    updateRecruitmentCandidate,
    updateRecruitment,
} from "./recruitment.thunks";
import type { RecruitmentState } from "./recruitment.types";

const initialState: RecruitmentState = {
    items: [],
    selectedRecruitment: null,
    loading: false,
    error: null,
    pagination: null,
};

const recruitmentSlice = createSlice({
    name: "recruitment",
    initialState,
    reducers: {
        clearRecruitmentError: (state) => {
            state.error = null;
        },
        clearSelectedRecruitment: (state) => {
            state.selectedRecruitment = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchRecruitments.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchRecruitments.fulfilled, (state, action) => {
                state.loading = false;
                state.items = action.payload.data || [];
                state.pagination = action.payload.pagination;
            })
            .addCase(fetchRecruitments.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload?.message || "Failed to fetch recruitments";
            })
            .addCase(fetchRecruitmentById.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchRecruitmentById.fulfilled, (state, action) => {
                state.loading = false;
                state.selectedRecruitment = action.payload;
            })
            .addCase(fetchRecruitmentById.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload?.message || "Failed to fetch recruitment";
            })
            .addCase(createRecruitment.pending, (state) => {
                state.loading = true;
            })
            .addCase(createRecruitment.fulfilled, (state, action) => {
                state.loading = false;
                state.items.unshift(action.payload);
            })
            .addCase(createRecruitment.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload?.message || "Failed to create recruitment";
            })
            .addCase(updateRecruitment.pending, (state) => {
                state.loading = true;
            })
            .addCase(updateRecruitment.fulfilled, (state, action) => {
                state.loading = false;
                state.items = state.items.map((item) => (item._id === action.payload._id ? action.payload : item));
                state.selectedRecruitment = action.payload;
            })
            .addCase(updateRecruitment.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload?.message || "Failed to update recruitment";
            })
            .addCase(deleteRecruitment.pending, (state) => {
                state.loading = true;
            })
            .addCase(deleteRecruitment.fulfilled, (state, action) => {
                state.loading = false;
                state.items = state.items.filter((item) => item._id !== action.payload.id);
            })
            .addCase(deleteRecruitment.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload?.message || "Failed to delete recruitment";
            })
            .addCase(addRecruitmentCandidate.fulfilled, (state, action) => {
                if (!state.selectedRecruitment) return;
                state.selectedRecruitment.candidates = state.selectedRecruitment.candidates || [];
                state.selectedRecruitment.candidates.unshift(action.payload);
            })
            .addCase(updateRecruitmentCandidate.fulfilled, (state, action) => {
                if (!state.selectedRecruitment || !action.payload?.candidateId) return;
                const candidates = state.selectedRecruitment.candidates || [];
                state.selectedRecruitment.candidates = candidates.map((candidate) =>
                    candidate._id === action.payload.candidateId ? action.payload.candidate : candidate,
                );
            })
            .addCase(addRecruitmentCandidateNote.fulfilled, (state, action) => {
                if (!state.selectedRecruitment) return;
                const candidates = state.selectedRecruitment.candidates || [];
                state.selectedRecruitment.candidates = candidates.map((candidate) => {
                    if (!candidate._id || candidate._id !== action.payload.candidateId) return candidate;
                    const next = { ...candidate };
                    next.notes = next.notes || [];
                    next.notes.unshift(action.payload.note);
                    return next;
                });
            })
            .addCase(addRecruitmentCandidateDocument.fulfilled, (state, action) => {
                if (!state.selectedRecruitment) return;
                const candidates = state.selectedRecruitment.candidates || [];
                state.selectedRecruitment.candidates = candidates.map((candidate) => {
                    if (!candidate._id || candidate._id !== action.payload.candidateId) return candidate;
                    const next = { ...candidate };
                    next.documents = next.documents || [];
                    next.documents.unshift(action.payload.document);
                    return next;
                });
            })
            .addCase(deleteRecruitmentCandidateDocument.fulfilled, (state, action) => {
                if (!state.selectedRecruitment) return;
                const candidates = state.selectedRecruitment.candidates || [];
                state.selectedRecruitment.candidates = candidates.map((candidate) => {
                    if (!candidate._id || candidate._id !== action.payload.candidateId) return candidate;
                    const next = { ...candidate };
                    next.documents = (next.documents || []).filter(
                        (document) => String(document._id) !== String(action.payload.documentId),
                    );
                    return next;
                });
            });
    },
});

export const { clearRecruitmentError, clearSelectedRecruitment } = recruitmentSlice.actions;
export default recruitmentSlice.reducer;
