// redux/admin/admin.types.ts

export type AdminRole = "client" | "staff" | "admin" | "super-admin";
export type PromoteRole = Extract<AdminRole, "admin" | "super-admin">;

export interface AdminUser {
    _id: string;
    email: string;
    fullname?: string;
    username?: string;
    role: AdminRole;
    suspended?: boolean;
    createdAt?: string;
    updatedAt?: string;
    [key: string]: any;
}

/** GET /admin/users response */
export interface GetUsersResponse {
    message?: string;
    count?: number;
    data: AdminUser[];
}

export interface PromoteBody {
    userId: string;
    role: PromoteRole;
}

export interface SuspendBody {
    userId: string;
}

export interface DowngradeBody {
    userId: string;
}

export interface DeleteUserBody {
    userId: string;
}

export interface UpdateUserBody {
    userId: string;
    fullname?: string;
    username?: string;
    email?: string;
}

/** Channel member ops */
export type ChannelMemberType = "pm" | "member" | "admin";

export interface AddMemberBody {
    code: string; // Project Code
    userId: string;
    type: ChannelMemberType; // e.g. "pm"
    channelId?: string;
}

export interface RemoveMemberBody {
    channelId: string;
    userId: string;
    type?: ChannelMemberType | "normal";
}

export interface UpdateMemberRoleBody {
    channelId: string;
    userId: string;
    type: ChannelMemberType; // new role in channel
}

export interface BasicMsgResponse {
    message?: string;
    channel?: string | any;
}

export interface AdminState {
    users: AdminUser[];
    count: number | null;

    fetchingUsers: boolean;
    suspending: boolean;
    promoting: boolean;
    downgrading: boolean;

    // channel-member flags
    addingMember: boolean;
    removingMember: boolean;
    updatingMemberRole: boolean;

    roleFilter?: AdminRole;
    lastError?: string | null;
    lastActionMessage?: string | null;
}
