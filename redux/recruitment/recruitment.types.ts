export type RecruitmentCandidate = {
    _id?: string;
    fullName: string;
    email?: string;
    phone?: string;
    location?: string;
    age?: number;
    yearsExperience?: number;
    overallStatus?: string;
    cvUrl?: string;
    recruiter?: string;
    currentStage?: string;
    progress?: Record<string, any>;
    notes?: Array<{ _id?: string; createdBy?: string; note?: string; createdAt?: string }>;
    documents?: Array<{
        _id?: string;
        type?: string;
        fileUrl?: string;
        uploadedBy?: string;
        uploadedAt?: string;
        publicId?: string;
        assetId?: string;
        resourceType?: string;
    }>;
    activityLog?: string[];
    createdAt?: string;
    updatedAt?: string;
};

export type Recruitment = {
    _id?: string;
    clientId?: string;
    clientName?: string;
    position: string;
    employmentType?: string;
    numberOfOpenings?: number;
    recruiterId?: string;
    recruiterName?: string;
    status?: string;
    description?: string;
    closingDate?: string;
    candidates?: RecruitmentCandidate[];
    createdAt?: string;
    updatedAt?: string;
    deleted?: boolean;
};

export type RecruitmentState = {
    items: Recruitment[];
    selectedRecruitment: Recruitment | null;
    loading: boolean;
    error: string | null;
    pagination: { total: number; page: number; limit: number; pages: number } | null;
};
