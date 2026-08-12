export type StatusKey =
    | "in-progress"
    | "not-started"
    | "completed"
    | "canceled";

export type Task = {
    id: string;
    title: string;
    description?: string;
    channelCode: string;
    channelId?: string;
    status: StatusKey;
    createdAt: number;
    assignees?: Array<{
        id?: string;
        name?: string;
        email?: string;
    }>;
};

export const TAB_ORDER: StatusKey[] = [
    "not-started",
    "in-progress",
    "completed",
    "canceled",
];

export const STATUS_META: Record<
    StatusKey,
    { title: string; bgColor: string; arrowBg: string }
> = {
    "in-progress": {
        title: "In Progress",
        bgColor: "#F59E0B", // yellow
        arrowBg: "#D97706", // darker yellow
    },
    "not-started": {
        title: "Not Started",
        bgColor: "#EF4444", // red
        arrowBg: "#DC2626", // darker red
    },
    completed: {
        title: "Completed",
        bgColor: "#10B981", // green
        arrowBg: "#059669", // darker green
    },
    canceled: {
        title: "Canceled",
        bgColor: "#9CA3AF", // grey
        arrowBg: "#6B7280", // darker grey
    },
};
