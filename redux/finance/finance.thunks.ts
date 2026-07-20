// redux/finance/finance.thunks.ts
import { api } from "@/api/axios";
import { createAsyncThunk } from "@reduxjs/toolkit";
import type {
    FinanceDeleteResponse,
    FinanceFilters,
    FinanceListResponse,
    FinanceMutateInput,
    FinanceMutateResponse,
    FinanceMutateUpdateInput,
} from "./finance.types";

const BASE = "/admin/finance";

/** GET /admin/finance */
export const fetchFinance = createAsyncThunk<
    FinanceListResponse,
    FinanceFilters | void,
    { rejectValue: { message: string } }
>("finance/fetchFinance", async (filters, { rejectWithValue }) => {
    try {
        const { data } = await api.get<FinanceListResponse>(BASE, {
            params: filters,
        });
        return data;
    } catch (err: any) {
        return rejectWithValue({
            message:
                err?.response?.data?.message ||
                err.message ||
                "Failed to fetch finance",
        });
    }
});

/** POST /admin/finance  */
export const createFinanceRecord = createAsyncThunk<
    FinanceMutateResponse,
    FinanceMutateInput,
    { rejectValue: { message: string } }
>("finance/createFinanceRecord", async (body, { rejectWithValue }) => {
    try {
        const { data } = await api.post<FinanceMutateResponse>(BASE, body);
        return data;
    } catch (err: any) {
        return rejectWithValue({
            message:
                err?.response?.data?.message ||
                err.message ||
                "Failed to create finance record",
        });
    }
});

/** PUT /admin/finance/{recordId} */
export const updateFinanceRecord = createAsyncThunk<
    FinanceMutateResponse,
    {
        recordId: string;
        body: FinanceMutateUpdateInput;
    },
    { rejectValue: { message: string } }
>(
    "finance/updateFinanceRecord",
    async ({ recordId, body }, { rejectWithValue }) => {
        try {
            const { data } = await api.put<FinanceMutateResponse>(
                `${BASE}/${recordId}`,
                body,
            );
            return data;
        } catch (err: any) {
            return rejectWithValue({
                message:
                    err?.response?.data?.message ||
                    err.message ||
                    "Failed to update finance record",
            });
        }
    },
);

/** DELETE /admin/finance/{recordId} */
export const deleteFinanceRecord = createAsyncThunk<
    FinanceDeleteResponse,
    string,
    { rejectValue: { message: string } }
>("finance/deleteFinanceRecord", async (recordId, { rejectWithValue }) => {
    try {
        const { data } = await api.delete<FinanceDeleteResponse>(
            `${BASE}/${recordId}`,
        );
        return data;
    } catch (err: any) {
        return rejectWithValue({
            message:
                err?.response?.data?.message ||
                err.message ||
                "Failed to delete finance record",
        });
    }
});
