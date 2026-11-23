import { api } from "@/api/axios";
import type { ApiEnvelope, User } from "@/api/types";
import { showError, showPromise } from "@/components/ui/toast";
import { saveUser } from "@/storage/auth";
import type { RootState } from "@/store";
import { getExpoPushToken } from "@/utils/pushToken";
import { createAsyncThunk } from "@reduxjs/toolkit";

export const fetchProfile = createAsyncThunk<
    User,
    void,
    { rejectValue: string }
>("user/fetchProfile", async (_, { rejectWithValue }) => {
    try {
        const res = await api.get<ApiEnvelope<User>>("/users/profile");

        const user = (res.data.data as User) ?? (res.data as any).user;
        if (!user) throw new Error("Profile not found");
        await saveUser(user);
        return user;
    } catch (err: any) {
        const msg =
            err?.response?.data?.message ||
            err?.message ||
            "Could not load profile";
        showError(msg);
        return rejectWithValue(msg);
    }
});

export type UpdateProfileArgs = {
    username?: string;
    fullname?: string;
    profilePicture?: string;
    expoPushToken?: string | null;
    silent?: boolean;
};

export const updateProfile = createAsyncThunk<
    User,
    UpdateProfileArgs,
    { state: RootState; rejectValue: string }
>("user/updateProfile", async (body, { rejectWithValue, getState }) => {
    try {
        const currentUser = getState().user.user;
        const hasStoredPush = Boolean(currentUser?.expoPushToken);
        let pushToken: string | null | undefined = body.expoPushToken;

        if (!pushToken && !hasStoredPush) {
            try {
                pushToken = await getExpoPushToken();
            } catch (e) {
                pushToken = null;
            }
        }

        const payload: Record<string, any> = {};
        if (body.username !== undefined) payload.username = body.username;
        if (body.fullname !== undefined) payload.fullname = body.fullname;
        if (body.profilePicture !== undefined)
            payload.profilePicture = body.profilePicture;
        if (pushToken) payload.expoPushToken = pushToken;
        else payload.expoPushToken = null; // Explicitly set to null if we don't have a token

        const res = body.silent
            ? await api.put<ApiEnvelope<User>>("/users/profile", payload)
            : await showPromise(
                  api.put<ApiEnvelope<User>>("/users/profile", payload),
                  "Updating profile…",
                  "Profile updated",
              );

        const user = (res.data.data as User) ?? (res.data as any).user;
        if (!user) throw new Error("No user returned");
        await saveUser(user);
        return user;
    } catch (err: any) {
        const msg =
            err?.response?.data?.message || err?.message || "Update failed";
        showError(msg);
        return rejectWithValue(msg);
    }
});

export const linkProjectCode = createAsyncThunk<
    User,
    { projectCode: string },
    { rejectValue: string }
>("user/linkProjectCode", async ({ projectCode }, { rejectWithValue }) => {
    try {
        const code = String(projectCode || "").trim();
        if (!code) {
            throw new Error("Project code is required");
        }

        const res = await showPromise(
            api.post<ApiEnvelope<{ user: User }>>("/users/link-project-code", {
                projectCode: code,
            }),
            "Linking project…",
            "Project linked",
        );

        const user =
            (res.data.data as any)?.user ??
            (res.data as any)?.user ??
            (res.data.data as unknown as User);

        if (!user) throw new Error("No user returned");
        await saveUser(user);
        return user;
    } catch (err: any) {
        const msg =
            err?.response?.data?.message ||
            err?.message ||
            "Could not link project code";
        showError(msg);
        return rejectWithValue(msg);
    }
});
