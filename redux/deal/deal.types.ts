export type Deal = {
    _id: string;
    title: string;
    partnerId: string;
    introductionType?:
        | "New Lead"
        | "Investor Introduction"
        | "Client Introduction"
        | "Vendor/Supplier Introduction"
        | "Strategic Relationship";
    dealSource?: "Brought by Us" | "Brought by Partner" | "Jointly Sourced";
    assignedOwner?: string;
    stage:
        | "Introduced"
        | "Meeting Booked"
        | "Proposal Sent"
        | "Negotiation"
        | "Closed Won"
        | "Closed Lost"
        | "On Hold";
    agreementType?:
        | "Percentage Commission"
        | "Fixed Fee"
        | "Equity/Shareholding"
        | "Revenue Share"
        | "Non-Financial Partnership";
    expectedDealValue?: number;
    agreedPercentage?: number;
    agreedFixedAmount?: number;
    expectedPartnerReturn?: number;
    recurringRevenue: boolean;
    recurringFrequency?: "monthly" | "quarterly" | "yearly" | "as needed";
    description?: string;
    nextActionDate?: string;
    closeDate?: string;
    tags?: string[];

    activities?: {
        activityType: string;
        note: string;
        date: string;
        createdBy?: string;
        createdAt?: string;
    }[];

    financialReconciliation?: {
        dealValue?: number;
        agreedAmount?: number;
        revenueSharePercentage?: number;
        totalRevenueGenerated?: number;
        totalPartnerEarnings?: number;
        amountPaid: number;
        balanceOutstanding?: number;
        paymentDate?: string;
        paymentStatus:
            | "Not Due"
            | "Not Paid"
            | "Pending"
            | "Partially Paid"
            | "Part Paid"
            | "Fully Paid"
            | "Disputed";
        approvalStatus: "Pending" | "Approved" | "Rejected";
        invoiceUrl?: string;
        receiptUrl?: string;
        revenueEntries?: {
            investorName: string;
            investmentDate: string;
            investmentAmount: number;
            commissionPercentage: number;
            calculatedCommission: number;
            notes?: string;
            createdAt?: string;
            updatedAt?: string;
        }[];
        payments?: {
            amount: number;
            paymentDate: string;
            paymentReference?: string;
            notes?: string;
            documentUrl?: string;
            createdAt?: string;
        }[];
    };

    nonFinancialContribution?: {
        numberOfIntroductions: number;
        meetingsSecured: number;
        strategicDoorsOpened: number;
        brandVisibilityCreated?: string;
        referralsConverted: number;
        followUpSupport?: string;
        relationshipStrength?: "Weak" | "Moderate" | "Strong" | "Very Strong";
        contributionNotes?: string;
        valueRating?:
            | "Low Value"
            | "Medium Value"
            | "High Value"
            | "Strategic Value";
    };

    contributionLogs?: {
        contributionType: string;
        description: string;
        valueRating?:
            | "Low Value"
            | "Medium Value"
            | "High Value"
            | "Strategic Value";
        date: string;
        notes?: string;
        createdAt?: string;
    }[];

    documents?: {
        url: string;
        publicId?: string;
        resourceType?: string;
        type?: "agreement" | "invoice" | "receipt" | "supporting";
        name?: string;
        uploadedAt: string;
    }[];

    createdBy?: string;
    updatedBy?: string;
    createdAt: string;
    updatedAt: string;
    deleted: boolean;
};

export type DealListResponse = {
    success: boolean;
    data: {
        deals: Deal[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    };
};

export type DealState = {
    byId: Record<string, Deal>;
    allIds: string[];
    loading: boolean;
    error: string | null;
    pagination: {
        currentPage: number;
        totalPages: number;
        totalCount: number;
        limit: number;
    };
    filters: {
        stage?: string;
        search?: string;
        partnerId?: string;
    };
    currentDeal: Deal | null;
};
