import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "@/store";
import type { Deal } from "./deal.types";

const selectDealState = (s: RootState) => s.deal;
const selectById = (s: RootState) => s.deal.byId;
const selectAllIds = (s: RootState) => s.deal.allIds;

export const selectAllDeals = createSelector(
    [selectById, selectAllIds],
    (byId, allIds) => allIds.map((id) => byId[id]).filter(Boolean)
);

export const selectDealById = (id: string) => createSelector([selectById], (byId) => byId[id]);

export const selectCurrentDeal = (state: RootState): Deal | null => {
    return selectDealState(state).currentDeal;
};

export const selectDealLoading = (state: RootState): boolean => {
    return selectDealState(state).loading;
};

export const selectDealError = (state: RootState): string | null => {
    return selectDealState(state).error;
};

export const selectDealFilters = (state: RootState) => {
    return selectDealState(state).filters;
};

export const selectDealPagination = (state: RootState) => {
    return selectDealState(state).pagination;
};

export const selectDealCount = createSelector([selectAllIds], (allIds) => allIds.length);

export const selectDealsByStage = (stage: string) =>
    createSelector([selectAllDeals], (deals) => deals.filter((deal) => deal.stage === stage));

export const selectDealsByPartner = (partnerId: string) =>
    createSelector([selectAllDeals], (deals) => deals.filter((deal) => deal.partnerId === partnerId));

export const selectClosedDeals = createSelector([selectAllDeals], (deals) =>
    deals.filter((deal) => deal.stage === "Closed Won" || deal.stage === "Closed Lost")
);

export const selectActiveDeals = createSelector([selectAllDeals], (deals) =>
    deals.filter((deal) => deal.stage !== "Closed Won" && deal.stage !== "Closed Lost")
);
