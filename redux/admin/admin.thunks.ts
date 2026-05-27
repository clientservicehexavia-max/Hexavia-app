// redux/admin/admin.thunks.ts
import { api } from "@/api/axios";
import { showError, showPromise } from "@/components/ui/toast";
import { createAsyncThunk } from "@reduxjs/toolkit";
import type { AxiosError } from "axios";
import type {
    AddMemberBody,
    AdminRole,
    BasicMsgResponse,
    DeleteUserBody,
    DowngradeBody,
    GetUsersResponse,
    PromoteBody,
    RemoveMemberBody,
    SuspendBody,
    UpdateUserBody,
    UpdateMemberRoleBody,
} from "./admin.types";

/** Helpful extractor for API error messages */
const pickAxiosMessage = (err: unknown): string => {
    const e = err as AxiosError<any>;
    if (e?.response?.data?.message) return e.response.data.message;
    if (e?.response?.data?.error) return e.response.data.error;
    if (e?.message) return e.message;
    return "Something went wrong";
};

/** GET /admin/users?role=... */
export const fetchAdminUsers = createAsyncThunk<
    GetUsersResponse,
    { role?: AdminRole } | void
>("admin/fetchUsers", async (arg, { rejectWithValue }) => {
    try {
        const params = arg?.role ? { role: arg.role } : undefined;

        const { data } = await api.get<GetUsersResponse>("/admin/users", {
            params,
        });
        // console.log(data)

        return {
            message: data?.message,
            count: data?.count ?? data?.data?.length ?? 0,
            data: data?.data ?? [],
        };
    } catch (err) {
        const msg = pickAxiosMessage(err);
        showError(msg);
        return rejectWithValue(msg);
    }
});

/** PUT /admin/users/suspend  { userId } (toggle) */
export const toggleUserSuspension = createAsyncThunk<
    { user: any },
    SuspendBody
>("admin/toggleUserSuspension", async (body, { rejectWithValue }) => {
    try {
        const { data } = await showPromise(
            api.put<{ user: any }>("/admin/users/suspend", body),
            "Updating suspension...",
            "Suspension updated",
        );
        return data;
    } catch (err) {
        const msg = pickAxiosMessage(err);
        showError(msg);
        return rejectWithValue(msg);
    }
});

/** POST /admin/add  { userId, role } (super-admin only) */
export const promoteUser = createAsyncThunk<{ user: any }, PromoteBody>(
    "admin/promoteUser",
    async (body, { rejectWithValue }) => {
        try {
            const { data } = await showPromise(
                api.post<{ user: any }>("/admin/add", body),
                "Promoting user...",
                "User promoted",
            );
            return data;
        } catch (err) {
            const msg = pickAxiosMessage(err);
            showError(msg);
            return rejectWithValue(msg);
        }
    },
);

/** POST /admin/downgrade  { userId } (super-admin only) */
export const downgradeAdmin = createAsyncThunk<{ user: any }, DowngradeBody>(
    "admin/downgradeAdmin",
    async (body, { rejectWithValue }) => {
        try {
            const { data } = await showPromise(
                api.post<{ user: any }>("/admin/downgrade", body),
                "Demoting admin...",
                "Admin demoted",
            );
            return data;
        } catch (err) {
            const msg = pickAxiosMessage(err);
            showError(msg);
            return rejectWithValue(msg);
        }
    },
);

/** DELETE /account  { userId } */
export const deleteAdminUser = createAsyncThunk<{ success?: boolean; message?: string }, DeleteUserBody>(
    "admin/deleteUser",
    async (body, { rejectWithValue }) => {
        try {
            const { data } = await showPromise(
                api.delete<{ success?: boolean; message?: string }>("/account", {
                    data: body,
                }),
                "Deleting user...",
                "User deleted",
            );
            return data;
        } catch (err) {
            const msg = pickAxiosMessage(err);
            showError(msg);
            return rejectWithValue(msg);
        }
    },
);

/** PATCH /admin/users/:userId */
export const updateAdminUser = createAsyncThunk<
    { success?: boolean; message?: string; user: any },
    UpdateUserBody
>("admin/updateUser", async (body, { rejectWithValue }) => {
    try {
        const { userId, ...payload } = body;
        const { data } = await showPromise(
            api.patch<{ success?: boolean; message?: string; user: any }>(
                `/admin/users/${userId}`,
                payload,
            ),
            "Saving user...",
            "User updated",
        );
        return data;
    } catch (err) {
        const msg = pickAxiosMessage(err);
        showError(msg);
        return rejectWithValue(msg);
    }
});

/* ---------------- Channel Member Ops (under Admin) ---------------- */

/** POST /channel/add-member  { code, userId, type } */
export const adminAddChannelMember = createAsyncThunk<
    BasicMsgResponse,
    AddMemberBody
>("admin/addChannelMember", async (body, { rejectWithValue }) => {
    try {
        const { data } = await showPromise(
            api.post<BasicMsgResponse>("/channel/add-member", body),
            "Adding member...",
            "Member added",
        );
        return data;
    } catch (err) {
        const msg = pickAxiosMessage(err);
        showError(msg);
        return rejectWithValue(msg);
    }
});

/** POST /channel/remove-member  { channelId, userId } */
export const adminRemoveChannelMember = createAsyncThunk<
    BasicMsgResponse,
    RemoveMemberBody
>("admin/removeChannelMember", async (body, { rejectWithValue }) => {
    try {
        const { data } = await showPromise(
            api.post<BasicMsgResponse>("/channel/remove-member", body),
            "Removing member...",
            "Member removed",
        );
        return data;
    } catch (err) {
        const msg = pickAxiosMessage(err);
        showError(msg);
        return rejectWithValue(msg);
    }
});

/** POST /channel/update-member-role  { channelId, userId, type } */
export const adminUpdateChannelMemberRole = createAsyncThunk<
    BasicMsgResponse,
    UpdateMemberRoleBody
>("admin/updateChannelMemberRole", async (body, { rejectWithValue }) => {
    try {
        const { data } = await showPromise(
            api.post<BasicMsgResponse>("/channel/update-member-role", body),
            "Updating member role...",
            "Member role updated",
        );
        return data;
    } catch (err) {
        const msg = pickAxiosMessage(err);
        showError(msg);
        return rejectWithValue(msg);
    }
});
