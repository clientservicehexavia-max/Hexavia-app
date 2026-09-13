import axios from "axios";

const HBC_API_BASE_URL = "https://hbc.hexavia.africa/wp-json/hbc/v1";
const DEFAULT_PER_PAGE = 20;

const hbcApi = axios.create({
    baseURL: HBC_API_BASE_URL,
    timeout: 60_000,
    headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
    },
});

export type HbcMember = {
    id: string;
    displayName: string;
    avatarUrl?: string;
    email?: string;
    phone?: string;
    location?: string;
    company?: string;
    role?: string;
    website?: string;
    bio?: string;
    raw: Record<string, unknown>;
};

export type FetchHbcMembersParams = {
    search?: string;
    page?: number;
    perPage?: number;
};

export type FetchHbcMembersResult = {
    members: HbcMember[];
    page: number;
    perPage: number;
    total?: number;
    hasMore: boolean;
};

const CANDIDATE_ID_KEYS = ["id", "ID", "memberId", "member_id", "user_id"];
const CANDIDATE_NAME_KEYS = [
    "name",
    "full_name",
    "fullname",
    "display_name",
    "title",
    "username",
];
const CANDIDATE_EMAIL_KEYS = ["email", "email_address", "mail"];
const CANDIDATE_PHONE_KEYS = [
    "phone",
    "phone_number",
    "phoneNumber",
    "mobile",
    "telephone",
];
const CANDIDATE_LOCATION_KEYS = ["location", "city", "state", "address"];
const CANDIDATE_COMPANY_KEYS = [
    "company",
    "organization",
    "organisation",
    "business_name",
    "businessName",
];
const CANDIDATE_ROLE_KEYS = ["role", "position", "designation", "title_role"];
const CANDIDATE_WEBSITE_KEYS = ["website", "site", "url", "profile_url"];
const CANDIDATE_BIO_KEYS = ["bio", "about", "description", "excerpt"];
const CANDIDATE_AVATAR_KEYS = [
    "avatar",
    "avatar_url",
    "avatarUrl",
    "photo_url",
    "image",
    "profile_image",
    "featured_image",
    "photo",
];

function readFirstString(source: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
        const value = source[key];
        if (typeof value === "string" && value.trim()) {
            return value.trim();
        }
        if (typeof value === "number") {
            return String(value);
        }
    }
    return undefined;
}

function readAvatar(source: Record<string, unknown>) {
    for (const key of CANDIDATE_AVATAR_KEYS) {
        const value = source[key];
        if (typeof value === "string" && value.trim()) {
            return value.trim();
        }

        if (value && typeof value === "object") {
            const nested = value as Record<string, unknown>;
            const directUrl = readFirstString(nested, [
                "url",
                "src",
                "source_url",
                "href",
            ]);
            if (directUrl) return directUrl;

            const avatarUrls = nested.avatar_urls;
            if (avatarUrls && typeof avatarUrls === "object") {
                const avatarRecord = avatarUrls as Record<string, unknown>;
                const preferred =
                    readFirstString(avatarRecord, ["96", "64", "48", "24"]) ||
                    readFirstString(avatarRecord, Object.keys(avatarRecord));
                if (preferred) return preferred;
            }
        }
    }

    return undefined;
}

function normalizeMember(raw: unknown): HbcMember | null {
    if (!raw || typeof raw !== "object") return null;
    const source = raw as Record<string, unknown>;

    const id =
        readFirstString(source, CANDIDATE_ID_KEYS) ||
        readFirstString(source, ["slug"]);
    if (!id) return null;

    const displayName =
        readFirstString(source, CANDIDATE_NAME_KEYS) || `Member ${id}`;

    return {
        id,
        displayName,
        avatarUrl: readAvatar(source),
        email: readFirstString(source, CANDIDATE_EMAIL_KEYS),
        phone: readFirstString(source, CANDIDATE_PHONE_KEYS),
        location: readFirstString(source, CANDIDATE_LOCATION_KEYS),
        company: readFirstString(source, CANDIDATE_COMPANY_KEYS),
        role: readFirstString(source, CANDIDATE_ROLE_KEYS),
        website: readFirstString(source, CANDIDATE_WEBSITE_KEYS),
        bio: readFirstString(source, CANDIDATE_BIO_KEYS),
        raw: source,
    };
}

function pickMembersArray(payload: unknown): unknown[] {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== "object") return [];

    const source = payload as Record<string, unknown>;
    const candidates = ["members", "data", "items", "results", "rows"];

    for (const key of candidates) {
        const value = source[key];
        if (Array.isArray(value)) return value;
    }

    return [];
}

function pickSingleMember(payload: unknown): unknown {
    if (!payload || typeof payload !== "object") return payload;

    const source = payload as Record<string, unknown>;
    const candidates = ["member", "data", "item", "result"];

    for (const key of candidates) {
        if (source[key] && typeof source[key] === "object") {
            return source[key];
        }
    }

    return payload;
}

function pickNumeric(value: unknown): number | undefined {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
        const n = Number(value);
        if (Number.isFinite(n)) return n;
    }
    return undefined;
}

export async function fetchHbcMembers(
    params: FetchHbcMembersParams = {},
): Promise<FetchHbcMembersResult> {
    const page = Math.max(1, Number(params.page ?? 1));
    const perPage = Math.max(1, Number(params.perPage ?? DEFAULT_PER_PAGE));
    const search = params.search?.trim();

    const response = await hbcApi.get("/members", {
        params: {
            page,
            per_page: perPage,
            ...(search ? { search } : {}),
        },
    });

    const list = pickMembersArray(response.data)
        .map((row) => normalizeMember(row))
        .filter(Boolean) as HbcMember[];

    const body =
        response.data && typeof response.data === "object"
            ? (response.data as Record<string, unknown>)
            : null;

    const total =
        pickNumeric(response.headers?.["x-wp-total"]) ??
        pickNumeric(body?.total) ??
        pickNumeric(body?.count) ??
        pickNumeric(
            body?.pagination &&
                (body.pagination as Record<string, unknown>).total,
        );

    const hasMore =
        typeof total === "number"
            ? page * perPage < total
            : list.length >= perPage;

    return {
        members: list,
        page,
        perPage,
        total,
        hasMore,
    };
}

export async function fetchHbcMemberById(memberId: string): Promise<HbcMember> {
    const response = await hbcApi.get(
        `/members/${encodeURIComponent(memberId)}`,
    );
    const member = normalizeMember(pickSingleMember(response.data));

    if (!member) {
        throw new Error("Failed to parse member profile.");
    }

    return member;
}
