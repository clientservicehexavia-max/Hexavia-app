import { api } from "@/api/axios";
import { createAsyncThunk } from "@reduxjs/toolkit";

export const fetchPartnerships = createAsyncThunk(
    "partnership/fetchPartnerships",
    async (
        params: {
            status?: string;
            isFinance?: boolean;
            search?: string;
            sortBy?: string;
            sortOrder?: "asc" | "desc";
            limit?: number;
            page?: number;
        },
        { rejectWithValue },
    ) => {
        try {
            const queryParams = new URLSearchParams();
            if (params.status) queryParams.append("status", params.status);
            if (params.isFinance !== undefined)
                queryParams.append("isFinance", String(params.isFinance));
            if (params.search) queryParams.append("search", params.search);
            if (params.sortBy) queryParams.append("sortBy", params.sortBy);
            if (params.sortOrder)
                queryParams.append("sortOrder", params.sortOrder);
            if (params.limit) queryParams.append("limit", String(params.limit));
            if (params.page) queryParams.append("page", String(params.page));

            const { data } = await api.get(
                `/partnerships?${queryParams.toString()}`,
            );
            return data.data;
        } catch (err: any) {
            return rejectWithValue(
                err.message || "Failed to fetch partnerships",
            );
        }
    },
);

export const getPartnership = createAsyncThunk(
    "partnership/getPartnership",
    async (id: string, { rejectWithValue }) => {
        try {
            const { data } = await api.get(`/partnerships/${id}`);
            return data.data;
        } catch (err: any) {
            return rejectWithValue(
                err.message || "Failed to fetch partnership",
            );
        }
    },
);

export const createPartnership = createAsyncThunk(
    "partnership/createPartnership",
    async (
        payload: {
            name: string;
            clientName?: string;
            email?: string;
            phoneNumber?: string;
            description?: string;
            partnershipAgreement?: string;
            deliverables?: string;
            documentsLink?: string;
            isFinance?: boolean;
            terms?: string;
            notes?: string;
        },
        { rejectWithValue },
    ) => {
        try {
            const { data } = await api.post("/partnerships", payload);
            return data.data;
        } catch (err: any) {
            return rejectWithValue(
                err.message || "Failed to create partnership",
            );
        }
    },
);

export const updatePartnership = createAsyncThunk(
    "partnership/updatePartnership",
    async (payload: { id: string; updates: any }, { rejectWithValue }) => {
        try {
            const { data } = await api.put(
                `/partnerships/${payload.id}`,
                payload.updates,
            );
            return data.data;
        } catch (err: any) {
            return rejectWithValue(
                err.message || "Failed to update partnership",
            );
        }
    },
);

export const deletePartnership = createAsyncThunk(
    "partnership/deletePartnership",
    async (id: string, { rejectWithValue }) => {
        try {
            await api.delete(`/partnerships/${id}`);
            return id;
        } catch (err: any) {
            return rejectWithValue(
                err.message || "Failed to delete partnership",
            );
        }
    },
);
