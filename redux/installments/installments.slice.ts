// redux/installments/installments.slice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
    addClientInstallments,
    deleteClientInstallment,
} from "./installments.thunks";
import type { InstallmentRow, InstallmentsState } from "./installments.types";

const initialState: InstallmentsState = {
    clientId: "",
    rows: [
        { amount: "5000", due: "01/02/2025" },
        { amount: "", due: "" },
    ],
    totalAmount: "60000",
    amountPaid: "48000",

    adding: false,
    deleting: false,
    error: null,
    errorDetail: null,

    lastAdd: null,
    lastDelete: null,
};

const installmentsSlice = createSlice({
    name: "installments",
    initialState,
    reducers: {
        setClientId(state, action: PayloadAction<string>) {
            state.clientId = action.payload;
        },
        setTotalAmount(state, action: PayloadAction<string>) {
            state.totalAmount = action.payload.replace(/[^\d]/g, "");
        },
        setAmountPaid(state, action: PayloadAction<string>) {
            state.amountPaid = action.payload.replace(/[^\d]/g, "");
        },
        setRows(state, action: PayloadAction<InstallmentRow[]>) {
            state.rows = action.payload;
        },
        updateRow(
            state,
            action: PayloadAction<{
                index: number;
                patch: Partial<InstallmentRow>;
            }>,
        ) {
            const { index, patch } = action.payload;
            const next = [...state.rows];
            next[index] = { ...next[index], ...patch };
            state.rows = next;
        },
        addRow(state) {
            state.rows = [...state.rows, { amount: "", due: "" }];
        },
        removeRow(state, action: PayloadAction<number>) {
            const idx = action.payload;
            state.rows = state.rows.filter((_, i) => i !== idx);
        },
        clearError(state) {
            state.error = null;
            state.errorDetail = null;
        },
        clearLastAdd(state) {
            state.lastAdd = null;
        },
        resetForm(state) {
            state.rows = [{ amount: "", due: "" }];
            state.totalAmount = "";
            state.amountPaid = "";
        },
    },
    extraReducers: (builder) => {
        // ADD
        builder.addCase(addClientInstallments.pending, (state) => {
            state.adding = true;
            state.error = null;
            state.errorDetail = null;
            state.lastAdd = null;
        });
        builder.addCase(
            addClientInstallments.fulfilled,
            (state, { payload }) => {
                state.adding = false;
                state.lastAdd = payload.data ?? null;
            },
        );
        builder.addCase(
            addClientInstallments.rejected,
            (state, { payload }) => {
                state.adding = false;
                if (payload && typeof payload === "object") {
                    const p: any = payload;
                    state.error =
                        p.message || "Failed to add installment payments";
                    state.errorDetail = p.details ?? null;
                } else {
                    state.error = "Failed to add installment payments";
                }
            },
        );

        // DELETE
        builder.addCase(deleteClientInstallment.pending, (state) => {
            state.deleting = true;
            state.error = null;
            state.errorDetail = null;
            state.lastDelete = null;
        });
        builder.addCase(
            deleteClientInstallment.fulfilled,
            (state, { payload }) => {
                state.deleting = false;
                state.lastDelete = payload.data ?? null;
            },
        );
        builder.addCase(
            deleteClientInstallment.rejected,
            (state, { payload }) => {
                state.deleting = false;
                if (payload && typeof payload === "object") {
                    const p: any = payload;
                    state.error =
                        p.message || "Failed to delete installment payment";
                } else {
                    state.error = "Failed to delete installment payment";
                }
            },
        );
    },
});

export const {
    setClientId,
    setTotalAmount,
    setAmountPaid,
    setRows,
    updateRow,
    addRow,
    removeRow,
    clearError,
    clearLastAdd,
    resetForm,
} = installmentsSlice.actions;

export const installmentsReducer = installmentsSlice.reducer;
export default installmentsReducer;
