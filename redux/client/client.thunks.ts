import { api } from "@/api/axios";
import { showPromise } from "@/components/ui/toast";
import { uploadSingle } from "@/redux/upload/upload.thunks";
import { createAsyncThunk } from "@reduxjs/toolkit";
import type {
    Client,
    ClientCreateInput,
    ClientFilters,
    ClientListResponse,
    ClientStats,
    ClientUpdateInput,
} from "./client.types";

export const fetchClients = createAsyncThunk<
    ClientListResponse,
    ClientFilters | undefined
>("client/fetchClients", async (filters, { rejectWithValue, signal }) => {
    try {
        const { data } = await api.get<ClientListResponse>("/admin/clients", {
            params: {
                status: filters?.status,
                industry: filters?.industry,
                engagement: filters?.engagement,
                page: filters?.page ?? 1,
                limit: filters?.limit ?? 10,
                sortBy: filters?.sortBy,
                sortOrder: filters?.sortOrder ?? "desc",
                from: filters?.from,
            },
            signal,
        });
        return data;
    } catch (err: any) {
        const status = err?.response?.status;
        const retryAfter = err?.response?.headers?.["retry-after"] ?? null;

        // return structured payload; DO NOT toast here
        return rejectWithValue({
            code: status ?? 0,
            message:
                err?.response?.data?.message ||
                err?.message ||
                "Failed to fetch clients",
            retryAfter,
            // custom marker set by interceptor when it gave up retrying
            gaveUpAfterRetries: err?.__gaveUp429 === true,
        });
    }
});

export const fetchAllClients = createAsyncThunk<
    ClientListResponse,
    Omit<ClientFilters, "page" | "limit"> | undefined
>("client/fetchAllClients", async (filters, { rejectWithValue, signal }) => {
    try {
        const limit = 100;
        const baseParams = {
            status: filters?.status,
            industry: filters?.industry,
            engagement: filters?.engagement,
            sortBy: filters?.sortBy,
            sortOrder: filters?.sortOrder ?? "desc",
            from: filters?.from,
            limit,
        };

        const first = await api.get<ClientListResponse>("/admin/clients", {
            params: { ...baseParams, page: 1 },
            signal,
        });

        let all = [...(first.data.clients ?? [])];
        const totalPages = first.data.pagination?.totalPages ?? 1;

        for (let page = 2; page <= totalPages; page += 1) {
            if (signal.aborted) break;
            const res = await api.get<ClientListResponse>("/admin/clients", {
                params: { ...baseParams, page },
                signal,
            });
            all = all.concat(res.data.clients ?? []);
        }

        return {
            success: true,
            clients: all,
            pagination: {
                currentPage: 1,
                totalPages: 1,
                totalClients: all.length,
                limit: all.length || limit,
            },
        };
    } catch (err: any) {
        const status = err?.response?.status;
        const retryAfter = err?.response?.headers?.["retry-after"] ?? null;

        return rejectWithValue({
            code: status ?? 0,
            message:
                err?.response?.data?.message ||
                err?.message ||
                "Failed to fetch all clients",
            retryAfter,
            gaveUpAfterRetries: err?.__gaveUp429 === true,
        });
    }
});

export const fetchDeletedClients = createAsyncThunk<ClientListResponse, void>(
    "client/fetchDeletedClients",
    async (_, { rejectWithValue, signal }) => {
        try {
            const { data } = await api.get<ClientListResponse>(
                "/admin/clients/deleted",
                { signal },
            );
            return data;
        } catch (err: any) {
            const status = err?.response?.status;
            const retryAfter = err?.response?.headers?.["retry-after"] ?? null;

            return rejectWithValue({
                code: status ?? 0,
                message:
                    err?.response?.data?.message ||
                    err?.message ||
                    "Failed to fetch deleted clients",
                retryAfter,
                gaveUpAfterRetries: err?.__gaveUp429 === true,
            });
        }
    },
);

export const fetchClientById = createAsyncThunk<Client, string>(
    "client/fetchClientById",
    async (id, { rejectWithValue }) => {
        try {
            const { data } = await api.get<{
                success: boolean;
                client: Client;
            }>(`/admin/clients/${id}`);
            return data.client;
        } catch (err: any) {
            const status = err?.response?.status;
            const retryAfter = err?.response?.headers?.["retry-after"] ?? null;

            // return structured payload; DO NOT toast here
            return rejectWithValue({
                code: status ?? 0,
                message:
                    err?.response?.data?.message ||
                    err?.message ||
                    "Failed to fetch client",
                retryAfter,
                // custom marker set by interceptor when it gave up retrying
                gaveUpAfterRetries: err?.__gaveUp429 === true,
            });
        }
    },
);

export const createClient = createAsyncThunk<Client, ClientCreateInput>(
    "client/createClient",
    async (payload, { rejectWithValue, dispatch }) => {
        try {
            const documentFile = (payload as any)?.documentFile as
                | { uri: string; name: string; type?: string }
                | undefined;

            const requestBody: Record<string, unknown> = {
                ...(payload as any),
            };
            delete requestBody.documentFile;

            if (documentFile?.uri) {
                const uploaded = await dispatch(
                    uploadSingle(documentFile),
                ).unwrap();
                if (uploaded?.url) {
                    requestBody.document = uploaded.url;
                    requestBody.documentUrl = uploaded.url;
                }
            }

            const res = await api.post<{
                success: boolean;
                message: string;
                client: Client;
            }>("/admin/clients", requestBody);
            const data = res.data;
            return data.client;
        } catch (err: any) {
            const status = err?.response?.status;
            const retryAfter = err?.response?.headers?.["retry-after"] ?? null;

            // return structured payload; DO NOT toast here
            return rejectWithValue({
                code: status ?? 0,
                message:
                    err?.response?.data?.message ||
                    err?.message ||
                    "Failed to create client",
                retryAfter,
                // custom marker set by interceptor when it gave up retrying
                gaveUpAfterRetries: err?.__gaveUp429 === true,
            });
        }
    },
);

export const updateClient = createAsyncThunk<
    Client,
    { id: string; body: ClientUpdateInput }
>(
    "client/updateClient",
    async ({ id, body }, { rejectWithValue, dispatch }) => {
        try {
            const documentFile = (body as any)?.documentFile as
                | { uri: string; name: string; type?: string }
                | undefined;

            const requestBody: Record<string, unknown> = { ...(body as any) };
            delete requestBody.documentFile;

            if (documentFile?.uri) {
                const uploaded = await dispatch(
                    uploadSingle(documentFile),
                ).unwrap();
                if (uploaded?.url) {
                    requestBody.document = uploaded.url;
                    requestBody.documentUrl = uploaded.url;
                }
            }

            if (
                requestBody.document === null &&
                requestBody.documentUrl === undefined
            ) {
                requestBody.documentUrl = null;
            }

            const req = api.put<{
                success: boolean;
                message: string;
                client: Client;
            }>(`/admin/clients/${id}`, requestBody);

            const { data } = await showPromise(
                req,
                "Updating Client Details",
                "Client details updated",
            );
            return data.client;
        } catch (err: any) {
            const status = err?.response?.status;
            const retryAfter = err?.response?.headers?.["retry-after"] ?? null;

            // return structured payload; DO NOT toast here
            return rejectWithValue({
                code: status ?? 0,
                message:
                    err?.response?.data?.message ||
                    err?.message ||
                    "Failed to update client",
                retryAfter,
                // custom marker set by interceptor when it gave up retrying
                gaveUpAfterRetries: err?.__gaveUp429 === true,
            });
        }
    },
);

export const patchClient = createAsyncThunk<
    Client,
    { id: string; body: Partial<Pick<Client, "status" | "payableAmount">> }
>("client/patchClient", async ({ id, body }, { rejectWithValue }) => {
    try {
        const { data } = await api.patch<{
            success: boolean;
            message: string;
            client: Client;
        }>(`/admin/clients/${id}`, body);
        return data.client;
    } catch (err: any) {
        const status = err?.response?.status;
        const retryAfter = err?.response?.headers?.["retry-after"] ?? null;

        // return structured payload; DO NOT toast here
        return rejectWithValue({
            code: status ?? 0,
            message:
                err?.response?.data?.message ||
                err?.message ||
                "Failed to update clients",
            retryAfter,
            // custom marker set by interceptor when it gave up retrying
            gaveUpAfterRetries: err?.__gaveUp429 === true,
        });
    }
});

export const deleteClient = createAsyncThunk<string, string>(
    "client/deleteClient",
    async (id, { rejectWithValue }) => {
        try {
            await api.delete<{ success: boolean; message: string }>(
                `/admin/clients/${id}`,
            );
            return id;
        } catch (err: any) {
            const status = err?.response?.status;
            const retryAfter = err?.response?.headers?.["retry-after"] ?? null;

            // return structured payload; DO NOT toast here
            return rejectWithValue({
                code: status ?? 0,
                message:
                    err?.response?.data?.message ||
                    err?.message ||
                    "Failed to delete client",
                retryAfter,
                // custom marker set by interceptor when it gave up retrying
                gaveUpAfterRetries: err?.__gaveUp429 === true,
            });
        }
    },
);

export const restoreClient = createAsyncThunk<
    { id: string; client?: Client; message?: string },
    string
>("client/restoreClient", async (id, { rejectWithValue }) => {
    try {
        const { data } = await api.put<{
            success: boolean;
            message?: string;
            client?: Client;
        }>("/admin/clients/restore", { id });

        return {
            id,
            client: data?.client,
            message: data?.message,
        };
    } catch (err: any) {
        const status = err?.response?.status;
        const retryAfter = err?.response?.headers?.["retry-after"] ?? null;

        return rejectWithValue({
            code: status ?? 0,
            message:
                err?.response?.data?.message ||
                err?.message ||
                "Failed to restore client",
            retryAfter,
            gaveUpAfterRetries: err?.__gaveUp429 === true,
        });
    }
});

export const fetchClientStats = createAsyncThunk<ClientStats>(
    "client/fetchClientStats",
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await api.get<{
                success: boolean;
                stats: ClientStats;
            }>("/admin/clients/stats");
            return data.stats;
        } catch (err: any) {
            const status = err?.response?.status;
            const retryAfter = err?.response?.headers?.["retry-after"] ?? null;

            // return structured payload; DO NOT toast here
            return rejectWithValue({
                code: status ?? 0,
                message:
                    err?.response?.data?.message ||
                    err?.message ||
                    "Failed to load client stats",
                retryAfter,
                // custom marker set by interceptor when it gave up retrying
                gaveUpAfterRetries: err?.__gaveUp429 === true,
            });
        }
    },
);
