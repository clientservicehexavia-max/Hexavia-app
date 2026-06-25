export type Partner = {
    _id: string;
    name: string;
    company?: string;
    description?: string;
    contactEmail?: string;
    contactPhone?: string;
    alternateContactEmail?: string;
    alternateContactPhone?: string;
    address?: string;
    partnerType?: "individual" | "company" | "investor" | "vendor" | "other";
    industry?: string;
    engagementTags?: string[];
    notes?: string;
    profileImage?: string;
    status: "active" | "inactive";
    dealCount?: number;
    documents?: string[];
    createdBy?: string;
    updatedBy?: string;
    createdAt: string;
    updatedAt: string;
    deleted: boolean;
};

export type PartnerListResponse = {
    success: boolean;
    data: {
        partners: Partner[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    };
};

export type PartnerState = {
    byId: Record<string, Partner>;
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
        status?: string;
        search?: string;
    };
    currentPartner: Partner | null;
};
