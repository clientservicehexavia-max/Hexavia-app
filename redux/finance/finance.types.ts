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

/* ───────── Bank Statement Import Types ───────── */

export type StatementTransaction = {
    tempId: string;
    date: string;
    rawDate?: string;
    amount: number;
    rawAmount?: number;
    charge?: number;
    type: "receivable" | "expense";
    narration: string;
    reference: string;
    beneficiary?: string;
    beneficiaryInstitution?: string;
    sender?: string;
    senderInstitution?: string;
    clientName?: string;
    companyName?: string;
    source?: string;
    isDuplicate: boolean;
    duplicateReason?: string;
    excluded: boolean;
    importedRecordId?: string;
    importedModel?: string;
};

export type StatementInfo = {
    bankName: string;
    accountName: string;
    accountNumber: string;
    currency: string;
    period: string;
    openingBalance: number;
    closingBalance: number;
    totalDebits: number;
    totalCredits: number;
};

export type StatementSummary = {
    totalParsed: number;
    totalReceivables: number;
    totalExpenses: number;
    totalAmountReceivables: number;
    totalAmountExpenses: number;
    duplicatesCount: number;
    excludedCount: number;
    importedCount: number;
};

export type StatementParseResponse = {
    success: boolean;
    message: string;
    data: {
        importId: string;
        statementInfo: StatementInfo;
        summary: StatementSummary;
        transactions: StatementTransaction[];
    };
};

export type StatementConfirmResponse = {
    success: boolean;
    message: string;
    data: {
        importId: string;
        summary: {
            totalImported: number;
            expensesCount: number;
            receivablesCount: number;
            totalExpenseAmount: number;
            totalReceivableAmount: number;
            excludedCount: number;
        };
    };
};

