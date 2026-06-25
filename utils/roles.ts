export const ROLE_HIERARCHY = [
    "client",
    "staff",
    "supervisor",
    "admin",
] as const;

export type CoreRole = (typeof ROLE_HIERARCHY)[number];
export type AppRole = CoreRole | "super-admin";

export const normalizeRole = (role?: string | null): AppRole | null => {
    const value = String(role ?? "")
        .trim()
        .toLowerCase();
    if (!value) return null;
    if (value === "super-admin") return "super-admin";
    if ((ROLE_HIERARCHY as readonly string[]).includes(value)) {
        return value as CoreRole;
    }
    return null;
};

export const isAdminLikeRole = (role?: string | null): boolean => {
    const normalized = normalizeRole(role);
    return (
        normalized === "admin" ||
        normalized === "super-admin" ||
        normalized === "supervisor"
    );
};

export const canAccessTeamManagement = (role?: string | null): boolean => {
    const normalized = normalizeRole(role);
    return normalized === "admin" || normalized === "super-admin";
};

export const canAccessFinanceManagement = (role?: string | null): boolean => {
    const normalized = normalizeRole(role);
    return normalized === "admin" || normalized === "super-admin";
};

export const roleHomePath = (role?: string | null): string => {
    const normalized = normalizeRole(role);
    if (normalized === "client") return "/(client)/(tabs)";
    if (normalized === "staff") return "/(staff)/(tabs)";
    return "/(admin)/(tabs)";
};

export const getRoleChangeTargets = (role?: string | null): CoreRole[] => {
    const normalized = normalizeRole(role);
    if (normalized === "staff") return ["supervisor", "admin"];
    if (normalized === "supervisor") return ["staff", "admin"];
    if (normalized === "admin" || normalized === "super-admin") {
        return ["supervisor", "staff"];
    }
    return [];
};
