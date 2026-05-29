import { api } from "@/api/axios";
import { createAsyncThunk } from "@reduxjs/toolkit";
import type { Deal, DealListResponse } from "./deal.types";

export const fetchDeals = createAsyncThunk<
    DealListResponse["data"]["deals"],
    {
        stage?: string;
        search?: string;
        partnerId?: string;
        page?: number;
        limit?: number;
    },
    { rejectValue: { message: string } }
>("deal/fetchDeals", async (filters, { rejectWithValue }) => {
    try {
        const params = new URLSearchParams();
        if (filters.stage) params.append("stage", filters.stage);
        if (filters.search) params.append("search", filters.search);
        if (filters.partnerId) params.append("partnerId", filters.partnerId);
        if (filters.page) params.append("page", String(filters.page));
        if (filters.limit) params.append("limit", String(filters.limit));

        const query = params.toString();
        const { data } = await api.get<DealListResponse>(
            query ? `/admin/deals?${query}` : "/admin/deals",
            {
                headers: {
                    "Cache-Control": "no-cache, no-store, max-age=0",
                    Pragma: "no-cache",
                },
            }
        );
        return data.data.deals;
    } catch (err: any) {
        return rejectWithValue({
            message: err?.response?.data?.message || err.message || "Failed to fetch deals",
        });
    }
});

export const fetchDealById = createAsyncThunk<
    Deal,
    string,
    { rejectValue: { message: string } }
>("deal/fetchDealById", async (id, { rejectWithValue }) => {
    try {
        const { data } = await api.get(`/admin/deals/${id}`);
        return data.data;
    } catch (err: any) {
        return rejectWithValue({
            message: err?.response?.data?.message || err.message || "Failed to fetch deal",
        });
    }
});

export const createDeal = createAsyncThunk<
    Deal,
    {
        title: string;
        partnerId: string;
        introductionType?: string;
        dealSource?: string;
        assignedOwner?: string;
        stage?: string;
        agreementType?: string;
        expectedDealValue?: number;
        agreedPercentage?: number;
        agreedFixedAmount?: number;
        expectedPartnerReturn?: number;
        recurringRevenue?: boolean;
        recurringFrequency?: string;
        description?: string;
        nextActionDate?: string;
        closeDate?: string;
        tags?: string[];
    },
    { rejectValue: { message: string } }
>("deal/createDeal", async (payload, { rejectWithValue }) => {
    try {
        const { data } = await api.post("/admin/deals", payload);
        return data.data;
    } catch (err: any) {
        return rejectWithValue({
            message: err?.response?.data?.message || err.message || "Failed to create deal",
        });
    }
});

export const updateDeal = createAsyncThunk<
    Deal,
    {
        id: string;
        updates: Partial<Omit<Deal, "_id" | "createdAt" | "updatedAt" | "deleted" | "createdBy" | "updatedBy">>;
    },
    { rejectValue: { message: string } }
>("deal/updateDeal", async ({ id, updates }, { rejectWithValue }) => {
    try {
        const { data } = await api.put(`/admin/deals/${id}`, updates);
        return data.data;
    } catch (err: any) {
        return rejectWithValue({
            message: err?.response?.data?.message || err.message || "Failed to update deal",
        });
    }
});

export const deleteDeal = createAsyncThunk<
    { id: string },
    string,
    { rejectValue: { message: string } }
>("deal/deleteDeal", async (id, { rejectWithValue }) => {
    try {
        await api.delete(`/admin/deals/${id}`);
        return { id };
    } catch (err: any) {
        return rejectWithValue({
            message: err?.response?.data?.message || err.message || "Failed to delete deal",
        });
    }
});
