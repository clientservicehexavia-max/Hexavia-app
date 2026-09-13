export type ApiEnvelope<T = unknown> = {
    success?: boolean;
    message?: string;
    data?: T;
    user?: T;
    token?: string | null;
    status?: boolean;
    otp?: string;
};

export type User = {
    _id: number | string | undefined;
    fullname: string;
    email: string;
    role?: string | null;
    username?: string | null;
    phoneNumber?: string | null;
    profilePicture?: string | null;
    channelCode?: string | null;
    linkedChannelId?: string | null;
    linkedProjectCode?: string | null;
    linkedAt?: string | null;
    clientProjects?: Array<{
        _id: string;
        name: string;
        code: string;
        description?: string | null;
        clientRole: "project_owner" | "project_member";
    }>;
    expoPushToken?: string | null;
};
