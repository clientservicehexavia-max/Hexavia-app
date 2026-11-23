import { showError } from "@/components/ui/toast";
import { ENV } from "@/config/env";
import { extractErrorMessage } from "@/redux/api/extractErrorMessage";
import { logout } from "@/redux/auth/auth.slice";
import { clearToken, clearUser, getToken } from "@/storage/auth";
import type { RootState } from "@/store";
import type { Store } from "@reduxjs/toolkit";
import axios, { AxiosError } from "axios";

declare module "axios" {
    interface AxiosRequestConfig {
        __retryCount?: number;
    }
}

export const api = axios.create({
    baseURL: ENV.API_BASE_URL,
    timeout: ENV.REQUEST_TIMEOUT_MS,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
});

let _store: Store<RootState> | null = null;
export const attachStore = (store: Store<RootState>) => {
    _store = store;
};

api.interceptors.request.use(async (config) => {
    const token = await getToken();
    if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

// api/axios.ts
function parseRetryAfter(header?: string | null): number | null {
    if (!header) return null;
    const n = Number(header);
    if (!Number.isNaN(n)) return n * 1000; // seconds
    const ms = Date.parse(header);
    return Number.isNaN(ms) ? null : Math.max(0, ms - Date.now());
}

api.interceptors.response.use(
    (res) => res,
    async (err: AxiosError<any>) => {
        const { response, config } = err || {};
        const status = response?.status;

        if (status === 407) {
            await clearToken();
            await clearUser();
            _store?.dispatch(logout() as any);
            showError("Session expired. Please log in again.");
            return Promise.reject(err);
        }

        // only toast here for non-rate-limit errors
        const serverMessage = extractErrorMessage(err);
        if (serverMessage && err?.message) {
            const isGeneric = err.message
                .toLowerCase()
                .startsWith("request failed with status code");
            if (isGeneric) err.message = serverMessage;
        }

        if (serverMessage && status !== 429 && status !== 503) {
            showError(serverMessage);
        }

        if (!config) return Promise.reject(err);

        const method = (config.method || "get").toLowerCase();
        const isIdempotent = ["get", "head", "options"].includes(method);
        const retriable =
            isIdempotent && response && [429, 503].includes(status!);

        if (retriable) {
            config.__retryCount = (config.__retryCount || 0) + 1;
            const maxRetries = 3;

            if (config.__retryCount <= maxRetries) {
                const retryAfterHdr =
                    response?.headers?.["retry-after"] ??
                    response?.headers?.["Retry-After"];
                const retryAfterMs = parseRetryAfter(retryAfterHdr) ?? 0;

                const base = 500 * Math.pow(2, config.__retryCount - 1); // 500, 1000, 2000
                const jitter = Math.floor(Math.random() * 250);
                const delay = Math.max(retryAfterMs, base + jitter);

                await sleep(delay);
                return api(config);
            }

            // mark the error so thunks/UI can switch to banner, not toast
            (err as any).__gaveUp429 = true;
        }

        return Promise.reject(err);
    },
);
