import type { RootState } from "@/store";

export const selectRecruitments = (state: RootState) => state.recruitment.items;
export const selectRecruitmentLoading = (state: RootState) => state.recruitment.loading;
export const selectRecruitmentError = (state: RootState) => state.recruitment.error;
export const selectRecruitmentPagination = (state: RootState) => state.recruitment.pagination;
export const selectSelectedRecruitment = (state: RootState) => state.recruitment.selectedRecruitment;
