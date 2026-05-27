import { api } from "@/api/axios";
import { createAsyncThunk } from "@reduxjs/toolkit";
import type { Partner, PartnerListResponse } from "./partner.types";

export const fetchPartners = createAsyncThunk<
    PartnerListResponse["data"]["partners"],
    {
        status?: string;
        search?: string;
        page?: number;
        limit?: number;
    },
    { rejectValue: { message: string } }
>("partner/fetchPartners", async (filters, { rejectWithValue }) => {
    try {
        const params = new URLSearchParams();
        if (filters.status) params.append("status", filters.status);
        if (filters.search) params.append("search", filters.search);
        if (filters.page) params.append("page", String(filters.page));
        if (filters.limit) params.append("limit", String(filters.limit));

        const query = params.toString();
        const { data } = await api.get<PartnerListResponse>(
            query ? `/admin/partners?${query}` : "/admin/partners",
            {
                headers: {
                    "Cache-Control": "no-cache, no-store, max-age=0",
                    Pragma: "no-cache",
                },
            },
        );
        return data.data.partners;
    } catch (err: any) {
        return rejectWithValue({
            message: err?.response?.data?.message || err.message || "Failed to fetch partners",
        });
    }
});

export const fetchPartnerById = createAsyncThunk<
    Partner,
    string,
    { rejectValue: { message: string } }
>("partner/fetchPartnerById", async (id, { rejectWithValue }) => {
    try {
        const { data } = await api.get(`/admin/partners/${id}`);
        return data.data;
    } catch (err: any) {
        return rejectWithValue({
            message: err?.response?.data?.message || err.message || "Failed to fetch partner",
        });
    }
});

export const createPartner = createAsyncThunk<
    Partner,
    {
        name: string;
        company?: string;
        contactEmail?: string;
        contactPhone?: string;
        address?: string;
        partnerType?: "individual" | "company" | "investor" | "vendor" | "other";
        industry?: string;
        engagementTags?: string[];
        notes?: string;
        profileImage?: string;
        status?: "active" | "inactive";
    },
    { rejectValue: { message: string } }
>("partner/createPartner", async (payload, { rejectWithValue }) => {
    try {
        const { data } = await api.post("/admin/partners", payload);
        return data.data;
    } catch (err: any) {
        return rejectWithValue({
            message: err?.response?.data?.message || err.message || "Failed to create partner",
        });
    }
});

export const updatePartner = createAsyncThunk<
    Partner,
    {
        id: string;
        updates: Partial<Omit<Partner, "_id" | "createdAt" | "updatedAt" | "deleted" | "createdBy" | "updatedBy">>;
    },
    { rejectValue: { message: string } }
>("partner/updatePartner", async ({ id, updates }, { rejectWithValue }) => {
    try {
        const { data } = await api.put(`/admin/partners/${id}`, updates);
        return data.data;
    } catch (err: any) {
        return rejectWithValue({
            message: err?.response?.data?.message || err.message || "Failed to update partner",
        });
    }
});

export const deletePartner = createAsyncThunk<
    { id: string },
    string,
    { rejectValue: { message: string } }
>("partner/deletePartner", async (id, { rejectWithValue }) => {
    try {
        await api.delete(`/admin/partners/${id}`);
        return { id };
    } catch (err: any) {
        return rejectWithValue({
            message: err?.response?.data?.message || err.message || "Failed to delete partner",
        });
    }
});
