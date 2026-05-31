import { api } from "@/api/axios";
import { showError, showSuccess } from "@/components/ui/toast";
import { createAsyncThunk } from "@reduxjs/toolkit";
import type { AxiosError } from "axios";
import type { AppNotification } from "./notification.types";

function extractErrorMessage(err: unknown): string {
    const ax = err as AxiosError<any>;
    const data = ax?.response?.data as any;
    const retryAfter = data?.retryAfter;
    const firstArrayError =
        Array.isArray(data?.errors) && data.errors.length
            ? data.errors[0]?.msg || data.errors[0] // support express-validator or arrays
            : null;

    const base =
        data?.message ||
        data?.error ||
        firstArrayError ||
        ax?.message ||
        "Something went wrong. Please try again.";

    if (ax?.response?.status === 429 && retryAfter) {
        return `${base} (Retry after: ${retryAfter})`;
    }

    return base;
}

export const fetchNotifications = createAsyncThunk<
    AppNotification[],
    void,
    { rejectValue: string }
>("notifications/fetch", async (_, { rejectWithValue }) => {
    try {
        const res = await api.get<{ notifications: AppNotification[] }>(
            "/notifications",
        );
        return (res.data.notifications ?? []).map((notification: any) => ({
            id: String(
                notification.id ?? notification._id ?? notification.uuid,
            ),
            kind: notification.kind ?? notification.type ?? "channel",
            title: notification.title ?? "New Update",
            message: notification.message ?? "",
            createdAt: new Date(
                notification.createdAt ?? Date.now(),
            ).toISOString(),
        }));
    } catch (err) {
        const msg = extractErrorMessage(err);
        return rejectWithValue(msg);
    }
});

export const sendMassNotification = createAsyncThunk<
    void,
    { title: string; message: string },
    { rejectValue: string }
>("notifications/sendMass", async (payload, { rejectWithValue }) => {
    try {
        await api.post("/admin/notification/mass", payload);
        showSuccess("Mass notification sent successfully");
    } catch (err) {
        const msg = extractErrorMessage(err);
        showError(msg);
        return rejectWithValue(msg);
    }
});
