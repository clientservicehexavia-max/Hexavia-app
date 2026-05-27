import type { RootState } from "@/store";
import type { Partner } from "./partner.types";

export const selectAllPartners = (state: RootState): Partner[] => {
    return state.partner.allIds.map((id) => state.partner.byId[id]);
};

export const selectPartnerById = (id: string) => (state: RootState): Partner | undefined => {
    return state.partner.byId[id];
};

export const selectCurrentPartner = (state: RootState): Partner | null => {
    return state.partner.currentPartner;
};

export const selectPartnerLoading = (state: RootState): boolean => {
    return state.partner.loading;
};

export const selectPartnerError = (state: RootState): string | null => {
    return state.partner.error;
};

export const selectPartnerFilters = (state: RootState) => {
    return state.partner.filters;
};

export const selectPartnerPagination = (state: RootState) => {
    return state.partner.pagination;
};

export const selectPartnerCount = (state: RootState): number => {
    return state.partner.allIds.length;
};

export const selectActivePartners = (state: RootState): Partner[] => {
    return state.partner.allIds
        .map((id) => state.partner.byId[id])
        .filter((partner) => partner.status === "active");
};

export const selectInactivePartners = (state: RootState): Partner[] => {
    return state.partner.allIds
        .map((id) => state.partner.byId[id])
        .filter((partner) => partner.status === "inactive");
};
