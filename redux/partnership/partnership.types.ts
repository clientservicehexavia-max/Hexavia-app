export type Partnership = {
    _id: string;
    name: string;
    clientName?: string;
    email?: string;
    phoneNumber?: string;
    companyName?: string;
    industry?: string;
    description?: string;
    partnershipType?: string;
    isFinance: boolean;
    status: "active" | "inactive" | "pending" | "closed";
    engagement?: string;
    contractValue: number;
    partnershipAgreement?: string;
    deliverables?: string;
    document?: string;
    documentUrl?: string;
    documentsLink?: string;
    contact?: {
        firstName?: string;
        lastName?: string;
        title?: string;
    };
    terms?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
    deleted: boolean;
};

export type PartnershipPagination = {
    total: number;
    page: number;
    limit: number;
    pages: number;
};

export type PartnershipState = {
    partnerships: Partnership[];
    selectedPartnership: Partnership | null;
    loading: boolean;
    error: string | null;
    pagination: PartnershipPagination | null;
};
