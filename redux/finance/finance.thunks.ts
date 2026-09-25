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

/** POST /admin/finance/statement/parse */
export const parseBankStatement = createAsyncThunk<
    StatementParseResponse,
    { uri: string; name: string; type?: string },
    { rejectValue: { message: string } }
>("finance/parseBankStatement", async (file, { rejectWithValue }) => {
    try {
        const formData = new FormData();
        formData.append("statementFile", {
            uri: file.uri,
            name: file.name || "statement.pdf",
            type: file.type || "application/pdf",
        } as any);

        const { data } = await api.post<StatementParseResponse>(
            `${BASE}/statement/parse`,
            formData,
            {
                headers: {
                    Accept: "application/json",
                    "Content-Type": "multipart/form-data",
                },
                transformRequest: (v) => v,
                timeout: 180_000,
            },
        );
        return data;
    } catch (err: any) {
        return rejectWithValue({
            message:
                err?.response?.data?.message ||
                err.message ||
                "Failed to parse bank statement",
        });
    }
});

/** POST /admin/finance/statement/confirm */
export const confirmBankStatementImport = createAsyncThunk<
    StatementConfirmResponse,
    {
        importId: string;
        transactions: StatementTransaction[];
    },
    { rejectValue: { message: string } }
>("finance/confirmBankStatementImport", async (payload, { rejectWithValue }) => {
    try {
        const { data } = await api.post<StatementConfirmResponse>(
            `${BASE}/statement/confirm`,
            payload,
        );
        return data;
    } catch (err: any) {
        return rejectWithValue({
            message:
                err?.response?.data?.message ||
                err.message ||
                "Failed to confirm bank statement import",
        });
    }
});

