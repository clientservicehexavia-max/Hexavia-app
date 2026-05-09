// redux/sanctions/sanctions.slice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ApiSanction, SanctionsState } from "./sanctions.type";
import {
  fetchSanctions,
  createSanction,
  deleteSanction,
  updateSanction,
} from "./sanctions.thunks";

const initialState: SanctionsState = {
  items: [],
  loading: false,
  error: null,
  creating: false,
  updating: false,
  fetchedFor: {},
};

const getSanctionUserId = (sanction: ApiSanction) =>
  String(
    (sanction as any)?.sanctionUser?._id ??
      sanction.user?._id ??
      sanction.userId ??
      ""
  );

const getSanctionTime = (sanction: ApiSanction) => {
  const raw =
    sanction.createdAt ??
    (sanction as any)?.date ??
    (sanction as any)?.created_at ??
    (sanction as any)?.sanctionedAt ??
    (sanction as any)?.timestamp;
  const time = raw ? new Date(raw).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
};

const sortSanctionsNewestFirst = (rows: ApiSanction[]) =>
  rows.sort((a, b) => getSanctionTime(b) - getSanctionTime(a));

const sanctionsSlice = createSlice({
  name: "sanctions",
  initialState,
  reducers: {
    resetSanctions(state) {
      state.items = [];
      state.error = null;
      state.loading = false;
      state.creating = false;
      state.updating = false;
      state.fetchedFor = {};
    },
  },
  extraReducers: (builder) => {
    // fetch
    builder.addCase(fetchSanctions.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(
      fetchSanctions.fulfilled,
      (
        state,
        action: PayloadAction<{
          rows: ApiSanction[];
          userIdKey: string | "_all";
        }>
      ) => {
        state.loading = false;
        if (action.payload.userIdKey === "_all") {
          state.items = sortSanctionsNewestFirst(action.payload.rows);
        } else {
          const fetchedUserId = String(action.payload.userIdKey);
          const otherRows = state.items.filter(
            (row) => getSanctionUserId(row) !== fetchedUserId
          );
          state.items = sortSanctionsNewestFirst([
            ...otherRows,
            ...action.payload.rows,
          ]);
        }
        state.fetchedFor[action.payload.userIdKey] = true;
      }
    );
    builder.addCase(fetchSanctions.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload || "Failed to fetch sanctions";
    });

    // create
    builder.addCase(createSanction.pending, (state) => {
      state.creating = true;
      state.error = null;
    });
    builder.addCase(createSanction.fulfilled, (state, action) => {
      state.creating = false;
      if (!Array.isArray(state.items)) state.items = [];
      state.items.unshift(action.payload);
      sortSanctionsNewestFirst(state.items);
    });
    builder.addCase(createSanction.rejected, (state, action) => {
      state.creating = false;
      state.error = action.payload || "Failed to create sanction";
    });

    // delete
    builder.addCase(deleteSanction.pending, (state) => {
      state.error = null;
    });
    builder.addCase(deleteSanction.fulfilled, (state, action) => {
      state.items = state.items.filter((s) => s._id !== action.payload);
    });
    builder.addCase(deleteSanction.rejected, (state, action) => {
      state.error = action.payload || "Failed to delete sanction";
    });

    // update
    builder.addCase(updateSanction.pending, (state) => {
      state.updating = true;
      state.error = null;
    });
    builder.addCase(updateSanction.fulfilled, (state, action) => {
      state.updating = false;
      const idx = state.items.findIndex((s) => s._id === action.payload._id);
      if (idx !== -1) state.items[idx] = action.payload;
      sortSanctionsNewestFirst(state.items);
    });
    builder.addCase(updateSanction.rejected, (state, action) => {
      state.updating = false;
      state.error = action.payload || "Failed to update sanction";
    });
  },
});

export const { resetSanctions } = sanctionsSlice.actions;
export default sanctionsSlice.reducer;

// Selectors
export const selectSanctionsState = (s: any): SanctionsState =>
  (s?.sanctions as SanctionsState) ??
  ({
    items: [],
    loading: false,
    error: null,
    creating: false,
    updating: false,
    fetchedFor: {},
  } as SanctionsState);
export const selectSanctions = (s: any) => s?.sanctions?.items ?? [];
export const selectSanctionsLoading = (s: any) =>
  Boolean(s?.sanctions?.loading);

export const selectSanctionById =
  (id?: string) =>
  (s: any) =>
    Array.isArray(s?.sanctions?.items)
      ? s.sanctions.items.find((x: any) => x._id === id) ?? null
      : null;

export const selectSanctionsError = (s: any) => s?.sanctions?.error ?? null;
export const selectSanctionsUpdating = (s: any) => s?.sanctions?.updating;
