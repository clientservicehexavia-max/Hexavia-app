import type { RootState } from "@/store";

export const selectAllPartnerships = (state: RootState) =>
    state.partnership.partnerships;
export const selectSelectedPartnership = (state: RootState) =>
    state.partnership.selectedPartnership;
export const selectPartnershipLoading = (state: RootState) =>
    state.partnership.loading;
export const selectPartnershipError = (state: RootState) =>
    state.partnership.error;
export const selectPartnershipPagination = (state: RootState) =>
    state.partnership.pagination;
