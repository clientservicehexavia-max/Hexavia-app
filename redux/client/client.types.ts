export type ClientStatus =
    | "pending"
    | "active"
    | "closed"
    | "current"
    | "completed"
    | "past"
    | "archived"
    | string;

export interface Client {
    phoneNumber?: string;
    _id: string;
    name: string;
    projectName?: string;
    email?: string;
    engagement?: string;
    industry?: string;
    staffSize?: number;
    description?: string;
    problems?: string;
    strength?: string;
    opportunities?: string;
    weakness?: string;
    threats?: string;
    deliverables?: string;
    payableAmount?: number;
    isExternal?: boolean;
    document?: string | null;
    documentUrl?: string | null;
    status?: ClientStatus;
    createdAt?: string;
    updatedAt?: string;
}

export interface RateLimited {
    retryAfter: string;
    at: string;
}

export interface ClientFilters {
    status?: string;
    industry?: string;
    engagement?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    from?: string;
    createdAtFrom?: string;
    createdAtTo?: string;
    updatedAtFrom?: string;
    updatedAtTo?: string;
}

export interface Pagination {
    currentPage: number;
    totalPages: number;
    totalClients: number;
    limit: number;
}

export interface ClientListResponse {
    success: boolean;
    clients: Client[];
    pagination: Pagination;
}

export interface ClientCreateInput {
    name: string;
    projectName?: string;
    phoneNumber?: string;
    email?: string;
    engagement?: string;
    industry?: string;
    staffSize?: number;
    description?: string;
    problems?: string;
    strength?: string;
    opportunities?: string;
    weakness?: string;
    threats?: string;
    deliverables?: string;
    payableAmount?: number;
    isExternal?: boolean;
    document?: string | null;
    documentUrl?: string;
    documentFile?: { uri: string; name: string; type?: string };
    status?: ClientStatus;
}

export type ClientUpdateInput = Partial<ClientCreateInput>;

export interface ClientStats {
    total: number;
    totalPayable: number;
    averagePayable: number;
    byStatus: Array<{ _id: string; count: number }>;
    byIndustry: Array<{ _id: string; count: number }>;
}

export interface ClientState {
    byId: Record<string, Client>;
    rateLimited: {
        retryAfter: string | null;
        at: string | null;
    };
    allIds: string[];
    listLoading: boolean;
    detailLoading: boolean;
    mutationLoading: boolean;
    pagination: Pagination | null;
    filters: ClientFilters;
    current?: Client | null;
    stats?: ClientStats | null;
    statsLoading: boolean;
    error?: string | null;
}
