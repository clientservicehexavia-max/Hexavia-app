import { api } from "@/api/axios";
import { createAsyncThunk } from "@reduxjs/toolkit";
import type { Recruitment } from "./recruitment.types";

export const fetchRecruitments = createAsyncThunk<
    { data: Recruitment[]; pagination: any },
    { status?: string; clientId?: string; recruiterId?: string; search?: string; page?: number; limit?: number },
    { rejectValue: { message: string } }
>("recruitment/fetchRecruitments", async (filters, { rejectWithValue }) => {
    try {
        const params = new URLSearchParams();
        if (filters.status) params.append("status", filters.status);
        if (filters.clientId) params.append("clientId", filters.clientId);
        if (filters.recruiterId) params.append("recruiterId", filters.recruiterId);
        if (filters.search) params.append("search", filters.search);
        if (filters.page) params.append("page", String(filters.page));
        if (filters.limit) params.append("limit", String(filters.limit));
        const query = params.toString();
        const { data } = await api.get(query ? `/recruitments?${query}` : "/recruitments");
        return { data: data.data || [], pagination: data.pagination || null };
    } catch (err: any) {
        return rejectWithValue({ message: err?.response?.data?.message || err.message || "Failed to fetch recruitments" });
    }
});

export const fetchRecruitmentById = createAsyncThunk<
    Recruitment,
    string,
    { rejectValue: { message: string } }
>("recruitment/fetchRecruitmentById", async (id, { rejectWithValue }) => {
    try {
        const { data } = await api.get(`/recruitments/${id}`);
        return data.data;
    } catch (err: any) {
        return rejectWithValue({ message: err?.response?.data?.message || err.message || "Failed to fetch recruitment" });
    }
});

export const createRecruitment = createAsyncThunk<
    Recruitment,
    Partial<Recruitment>,
    { rejectValue: { message: string } }
>("recruitment/createRecruitment", async (payload, { rejectWithValue }) => {
    try {
        const { data } = await api.post("/recruitments", payload);
        return data.data;
    } catch (err: any) {
        return rejectWithValue({ message: err?.response?.data?.message || err.message || "Failed to create recruitment" });
    }
});

export const updateRecruitment = createAsyncThunk<
    Recruitment,
    { id: string; updates: Partial<Recruitment> },
    { rejectValue: { message: string } }
>("recruitment/updateRecruitment", async ({ id, updates }, { rejectWithValue }) => {
    try {
        const { data } = await api.put(`/recruitments/${id}`, updates);
        return data.data;
    } catch (err: any) {
        return rejectWithValue({ message: err?.response?.data?.message || err.message || "Failed to update recruitment" });
    }
});
import type { Recruitment, RecruitmentCandidate } from "./recruitment.types";

export const deleteRecruitment = createAsyncThunk<
    { id: string },
    string,
    { rejectValue: { message: string } }
>("recruitment/deleteRecruitment", async (id, { rejectWithValue }) => {
    try {
        await api.delete(`/recruitments/${id}`);
        return { id };
    } catch (err: any) {
        return rejectWithValue({ message: err?.response?.data?.message || err.message || "Failed to delete recruitment" });
    }
});

export const addRecruitmentCandidate = createAsyncThunk<
    RecruitmentCandidate,
    { recruitmentId: string; payload: Partial<RecruitmentCandidate> },
    { rejectValue: { message: string } }
>(
    "recruitment/addRecruitmentCandidate",
    async ({ recruitmentId, payload }, { rejectWithValue }) => {
        try {
            const { data } = await api.post(
                `/recruitments/${recruitmentId}/candidates`,
                payload,
            );
            return data.data;
        } catch (err: any) {
            return rejectWithValue({
                message:
                    err?.response?.data?.message ||
                    err.message ||
                    "Failed to add candidate",
            });
        }
    },
);

export const updateRecruitmentCandidate = createAsyncThunk<
    { candidateId: string; candidate: RecruitmentCandidate },
    {
        recruitmentId: string;
        candidateId: string;
        payload: Partial<RecruitmentCandidate>;
    },
    { rejectValue: { message: string } }
>(
    "recruitment/updateRecruitmentCandidate",
    async (
        { recruitmentId, candidateId, payload },
        { rejectWithValue },
    ) => {
        try {
            const { data } = await api.put(
                `/recruitments/${recruitmentId}/candidates/${candidateId}`,
                payload,
            );
            return { candidateId, candidate: data.data };
        } catch (err: any) {
            return rejectWithValue({
                message:
                    err?.response?.data?.message ||
                    err.message ||
                    "Failed to update candidate",
            });
        }
    },
);

export const addRecruitmentCandidateNote = createAsyncThunk<
    {
        candidateId: string;
        note: { _id?: string; createdBy?: string; note?: string; createdAt?: string };
    },
    {
        recruitmentId: string;
        candidateId: string;
        payload: { note: string; createdBy?: string };
    },
    { rejectValue: { message: string } }
>(
    "recruitment/addRecruitmentCandidateNote",
    async ({ recruitmentId, candidateId, payload }, { rejectWithValue }) => {
        try {
            const { data } = await api.post(
                `/recruitments/${recruitmentId}/candidates/${candidateId}/notes`,
                payload,
            );
            return { candidateId, note: data.data };
        } catch (err: any) {
            return rejectWithValue({
                message:
                    err?.response?.data?.message ||
                    err.message ||
                    "Failed to add note",
            });
        }
    },
);

export const addRecruitmentCandidateDocument = createAsyncThunk<
    {
        candidateId: string;
        document: {
            _id?: string;
            type?: string;
            fileUrl?: string;
            uploadedBy?: string;
            uploadedAt?: string;
        };
    },
    {
        recruitmentId: string;
        candidateId: string;
        payload: {
            type: string;
            fileUrl: string;
            uploadedBy?: string;
            publicId?: string | null;
            assetId?: string | null;
            resourceType?: string | null;
        };
    },
    { rejectValue: { message: string } }
>(
    "recruitment/addRecruitmentCandidateDocument",
    async ({ recruitmentId, candidateId, payload }, { rejectWithValue }) => {
        try {
            const { data } = await api.post(
                `/recruitments/${recruitmentId}/candidates/${candidateId}/documents`,
                payload,
            );
            return { candidateId, document: data.data };
        } catch (err: any) {
            return rejectWithValue({
                message:
                    err?.response?.data?.message ||
                    err.message ||
                    "Failed to add document",
            });
        }
    },
);

export const deleteRecruitmentCandidateDocument = createAsyncThunk<
    { candidateId: string; documentId: string },
    { recruitmentId: string; candidateId: string; documentId: string },
    { rejectValue: { message: string } }
>(
    "recruitment/deleteRecruitmentCandidateDocument",
    async ({ recruitmentId, candidateId, documentId }, { rejectWithValue }) => {
        try {
            await api.delete(
                `/recruitments/${recruitmentId}/candidates/${candidateId}/documents/${documentId}`,
            );
            return { candidateId, documentId };
        } catch (err: any) {
            return rejectWithValue({
                message:
                    err?.response?.data?.message ||
                    err.message ||
                    "Failed to delete document",
            });
        }
    },
);
