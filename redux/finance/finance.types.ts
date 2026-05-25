// redux/finance/finance.types.ts

export type FinanceType = "expense";

export type FinanceRecord = {
    _id: string;
    type: FinanceType;
    amount: number;
    description?: string;
    notes?: string;
    date: string; // ISO (YYYY-MM-DD or ISO datetime from server)
    createdAt?: string;
    updatedAt?: string;
};

export type FinanceMutateInput = {
    type?: FinanceType;
    amount: number;
    description?: string;
    notes?: string;
    date: string;
};

export type FinanceMutateUpdateInput = Partial<FinanceMutateInput>;

export type FinanceFilters = {
    type?: FinanceType;
    startDate?: string; // ISO YYYY-MM-DD
    endDate?: string; // ISO YYYY-MM-DD
    page?: number;
    limit?: number;
};

export type FinanceListResponse = {
    message?: string;
    data?: {
        records: FinanceRecord[];
        pagination: {
            currentPage: number;
            totalPages: number;
            totalRecords: number;
            limit: number;
        };
        summary?: {
            totalReceivables: number;
            totalExpenses: number;
            netBalance: number;
        };
    };
};

export type FinanceMutateResponse = {
    message?: string;
    data?: Record<string, any>;
};

export type FinanceDeleteResponse = {
    message?: string;
    data?: {
        deletedRecord: FinanceRecord;
    };
};

export type FinanceState = {
    // collection
    records: FinanceRecord[];
    pagination: NonNullable<FinanceListResponse["data"]>["pagination"] | null;
    summary: NonNullable<FinanceListResponse["data"]>["summary"] | null;

    // filters
    filters: FinanceFilters;

    // network flags
    listLoading: boolean;
    creating: boolean;
    updating: boolean;
    deletingId: string | null;

    error: string | null;
};
