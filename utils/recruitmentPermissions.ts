import { normalizeRole } from "@/utils/roles";

const isRecruiter = (role?: string | null) => {
    const normalized = normalizeRole(role);
    return normalized === "staff";
};

const isSupervisor = (role?: string | null) => {
    const normalized = normalizeRole(role);
    return normalized === "clientservice";
};

const isAdmin = (role?: string | null) => {
    const normalized = normalizeRole(role);
    return normalized === "admin" || normalized === "super-admin";
};

export const canCreateRecruitment = (role?: string | null) => {
    return isAdmin(role) || isSupervisor(role);
};

export const canEditRecruitment = (role?: string | null) => {
    return isAdmin(role) || isSupervisor(role);
};

export const canAddCandidate = (role?: string | null) => {
    return isAdmin(role) || isSupervisor(role) || isRecruiter(role);
};

export const canUpdateCandidateProgress = (role?: string | null) => {
    return isAdmin(role) || isSupervisor(role) || isRecruiter(role);
};

export const canUploadCandidateDocuments = (role?: string | null) => {
    return isAdmin(role) || isSupervisor(role) || isRecruiter(role);
};

export const canAddCandidateNotes = (role?: string | null) => {
    return isAdmin(role) || isSupervisor(role) || isRecruiter(role);
};
