import type { RootState } from "@/store";
import type { Deal } from "./deal.types";

export const selectAllDeals = (state: RootState): Deal[] => {
    return state.deal.allIds.map((id) => state.deal.byId[id]);
};

export const selectDealById = (id: string) => (state: RootState): Deal | undefined => {
    return state.deal.byId[id];
};

export const selectCurrentDeal = (state: RootState): Deal | null => {
    return state.deal.currentDeal;
};

export const selectDealLoading = (state: RootState): boolean => {
    return state.deal.loading;
};

export const selectDealError = (state: RootState): string | null => {
    return state.deal.error;
};

export const selectDealFilters = (state: RootState) => {
    return state.deal.filters;
};

export const selectDealPagination = (state: RootState) => {
    return state.deal.pagination;
};

export const selectDealCount = (state: RootState): number => {
    return state.deal.allIds.length;
};

export const selectDealsByStage = (stage: string) => (state: RootState): Deal[] => {
    return state.deal.allIds
        .map((id) => state.deal.byId[id])
        .filter((deal) => deal.stage === stage);
};

export const selectDealsByPartner = (partnerId: string) => (state: RootState): Deal[] => {
    return state.deal.allIds
        .map((id) => state.deal.byId[id])
        .filter((deal) => deal.partnerId === partnerId);
};

export const selectClosedDeals = (state: RootState): Deal[] => {
    return state.deal.allIds
        .map((id) => state.deal.byId[id])
        .filter((deal) => deal.stage === "Closed Won" || deal.stage === "Closed Lost");
};

export const selectActiveDeals = (state: RootState): Deal[] => {
    return state.deal.allIds
        .map((id) => state.deal.byId[id])
        .filter((deal) => deal.stage !== "Closed Won" && deal.stage !== "Closed Lost");
};
