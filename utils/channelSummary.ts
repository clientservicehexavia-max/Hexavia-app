import { api } from "@/api/axios";
import { getSocket } from "@/realtime/socket";

export type SummaryPdfResponse = {
    success?: boolean;
    status?: "idle" | "processing" | "completed" | "failed";
    jobId?: string | null;
    error?: string | null;
    pdfUrl?: string;
    summaryText?: string | null;
    message?: string;
    filename?: string;
};

type GenerateSummaryOptions = {
    channelId: string;
    startDate?: string;
    endDate?: string;
    pollIntervalMs?: number;
    maxWaitMs?: number;
};

type SummarySocketPayload = {
    channelId?: string;
    jobId?: string;
    status?: string;
    summaryText?: string;
    pdfUrl?: string;
    filename?: string;
    message?: string;
};

const DEFAULT_POLL_INTERVAL_MS = 2_500;
const DEFAULT_MAX_WAIT_MS = 120_000;

/**
 * Trigger channel summary generation (202 async flow) and wait via Socket.IO + polling.
 */
export async function generateChannelSummaryReport({
    channelId,
    startDate,
    endDate,
    pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
    maxWaitMs = DEFAULT_MAX_WAIT_MS,
}: GenerateSummaryOptions): Promise<SummaryPdfResponse> {
    const startResponse = await api.post<SummaryPdfResponse>(
        `/channel/${channelId}/summary-pdf`,
        {
            startDate: startDate || undefined,
            endDate: endDate || undefined,
        },
        { timeout: 30_000 },
    );

    const initial = startResponse.data;
    if (
        startResponse.status !== 202 &&
        initial?.status !== "processing"
    ) {
        if (!initial?.success) {
            throw new Error(
                initial?.message || "Summary generation failed.",
            );
        }
        return initial;
    }

    const jobId = initial?.jobId ?? undefined;

    return new Promise<SummaryPdfResponse>((resolve, reject) => {
        let settled = false;
        let pollTimer: ReturnType<typeof setTimeout> | null = null;
        let deadlineTimer: ReturnType<typeof setTimeout> | null = null;
        const socket = getSocket();

        const matchesJob = (payload?: SummarySocketPayload) => {
            if (!payload || payload.channelId !== channelId) return false;
            if (jobId && payload.jobId && payload.jobId !== jobId) return false;
            return true;
        };

        const cleanup = () => {
            if (pollTimer) {
                clearTimeout(pollTimer);
                pollTimer = null;
            }
            if (deadlineTimer) {
                clearTimeout(deadlineTimer);
                deadlineTimer = null;
            }
            if (socket) {
                socket.off("channelSummaryReady", onSocketReady);
                socket.off("channelSummaryFailed", onSocketFailed);
            }
        };

        const finishResolve = (value: SummaryPdfResponse) => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve(value);
        };

        const finishReject = (err: Error) => {
            if (settled) return;
            settled = true;
            cleanup();
            reject(err);
        };

        const onSocketReady = (payload: SummarySocketPayload) => {
            if (!matchesJob(payload)) return;
            finishResolve({
                success: true,
                status: "completed",
                jobId: payload.jobId ?? jobId ?? null,
                summaryText: payload.summaryText ?? null,
                pdfUrl: payload.pdfUrl ?? initial?.pdfUrl,
                filename: payload.filename ?? initial?.filename,
            });
        };

        const onSocketFailed = (payload: SummarySocketPayload) => {
            if (!matchesJob(payload)) return;
            finishReject(
                new Error(
                    payload?.message || "Failed to generate channel summary.",
                ),
            );
        };

        if (socket) {
            socket.on("channelSummaryReady", onSocketReady);
            socket.on("channelSummaryFailed", onSocketFailed);
        }

        deadlineTimer = setTimeout(() => {
            finishReject(
                new Error("Report generation timed out. Please try again."),
            );
        }, maxWaitMs);

        const pollStatus = async () => {
            if (settled) return;
            try {
                const statusRes = await api.get<SummaryPdfResponse>(
                    `/channel/${channelId}/summary-pdf/status`,
                    {
                        params: jobId ? { jobId } : undefined,
                        timeout: 15_000,
                    },
                );
                if (settled) return;

                const data = statusRes.data;
                if (data?.status === "completed") {
                    finishResolve(data);
                    return;
                }
                if (data?.status === "failed") {
                    finishReject(
                        new Error(
                            data?.error ||
                                data?.message ||
                                "Failed to generate channel summary.",
                        ),
                    );
                    return;
                }
            } catch {
                // Transient network/server errors during polling are retried until maxWaitMs.
            }

            if (!settled) {
                pollTimer = setTimeout(pollStatus, pollIntervalMs);
            }
        };

        pollTimer = setTimeout(pollStatus, pollIntervalMs);
    });
}

