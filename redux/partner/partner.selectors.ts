import type { RootState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import type { Partner } from "./partner.types";

const selectPartnerState = (s: RootState) => s.partner;
const selectById = (s: RootState) => s.partner.byId;
const selectAllIds = (s: RootState) => s.partner.allIds;

export const selectAllPartners = createSelector(
    [selectById, selectAllIds],
    (byId, allIds) => allIds.map((id) => byId[id]).filter(Boolean),
);

export const selectPartnerById = (id: string) =>
    createSelector([selectById], (byId) => byId[id]);

export const selectCurrentPartner = (state: RootState): Partner | null => {
    return selectPartnerState(state).currentPartner;
};

export const selectPartnerLoading = (state: RootState): boolean => {
    return selectPartnerState(state).loading;
};

export const selectPartnerError = (state: RootState): string | null => {
    return selectPartnerState(state).error;
};

export const selectPartnerFilters = (state: RootState) => {
    return selectPartnerState(state).filters;
};

export const selectPartnerPagination = (state: RootState) => {
    return selectPartnerState(state).pagination;
};

export const selectPartnerCount = createSelector(
    [selectPartnerPagination],
    (pagination) => pagination.totalCount,
);

export const selectActivePartners = createSelector(
    [selectAllPartners],
    (partners) => partners.filter((p) => p.status === "active"),
);

export const selectInactivePartners = createSelector(
    [selectAllPartners],
    (partners) => partners.filter((p) => p.status === "inactive"),
);
