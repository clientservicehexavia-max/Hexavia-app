export type ChannelId = string;

export interface Channel {
  _id: ChannelId;
  name: string;
  description?: string | null;
  code: string;
  isActive?: boolean;
  createdAt?: string;
  createdBy?: string;
  members: Array<{
    userId: string;
    type: "pm" | "staff" | "client";
  }>;
  tasks: Array<{
    _id: string;
    name: string;
    description?: string | null;
    addedBy?: string;
    createdAt: string;
    updatedAt?: string;
    status: "not-started" | "in-progress" | "completed" | "canceled";
    members?: Array<
      | string
      | {
          _id?: string;
          id?: string;
          name?: string;
          email?: string;
        }
    >;
  }>;
  resources: Array<{
    _id: string;
    name: string;
    description?: string | null;
    resourceUpload: string;
    uploadedAt: string;
  }>;
  updatedAt?: string;
}

export interface CreateChannelResponse {
  message: string;
  channel: Channel;
}

export interface CreateChannelBody {
  name: string;
  description?: string | null;
  code: string;
  isStaff?: boolean;
}

export interface UpdateChannelBody {
  channelId: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
}

export interface UpdateChannelResponse {
  message?: string;
  channel?: Channel;
  data?: { channel?: Channel };
}

export interface GetChannelsResponse {
  channels: Channel[];
}

export interface GetDeletedChannelsResponse {
  success?: boolean;
  message?: string;
  channels?: Channel[];
  data?: {
    channels?: Channel[];
  };
}

export interface GenerateCodeResponse {
  code: string;
}

export interface GetChannelByIdResponse {
  success: boolean;
  message: string;
  data: { channel: Channel };
  channel: Channel;
}

export interface AddMemberBody {
  code: string;
  userId: string;
  type: "pm" | "staff" | "client";
  channelId?: string;
}
export interface AddMemberResponse {
  message: string;
  channel: Channel;
}

export interface RemoveMemberBody {
  channelId: string;
  userId: string;
  // Some backends require the member's channel type (e.g., "pm", "normal")
  type?: string;
}

export interface DeleteChannelBody {
  channelId: string;
}

export interface DeleteChannelResponse {
  message?: string;
  success?: boolean;
  channelId?: string;
}

export interface RestoreChannelBody {
  channelId: string;
}

export interface RestoreChannelResponse {
  success?: boolean;
  message?: string;
  channel?: Channel;
  channelId?: string;
}
export interface RemoveMemberResponse {
  message: string;
  channel: Channel;
}

export interface UpdateMemberRoleBody {
  channelId: string;
  userId: string;
  type: "pm" | "staff" | "client";
}
export interface UpdateMemberRoleResponse {
  message: string;
  channel: Channel;
}

export interface CreateTaskBody {
  channelId: string;
  name: string;
  description?: string | null;
  status?: string
}
export interface CreateTaskResponse {
  message: string;
  channel: Channel;
}

export interface UpdateTaskBody {
  channelId: string | undefined;
  taskId: string;
  name?: string;
  status?: string;
  description?: string | null;
}
export interface UpdateTaskResponse {
  message: string;
  channel: Channel;
}

export interface GetChannelTasksResponse {
  message?: string;
  tasks: Channel["tasks"];
}

export interface DeleteTaskBody {
  channelId: string;
  taskId: string;
}

export interface DeleteTaskResponse {
  message?: string;
}

export interface AssignMemberTaskBody {
  channelId: string;
  taskId: string;
  members: string[];
}

export interface AssignMemberTaskResponse {
  message?: string;
}

export interface UnassignMemberTaskBody {
  channelId: string;
  taskId: string;
  userId: string;
}

export interface UnassignMemberTaskResponse {
  message?: string;
}

export interface UploadResourcesBody {
  channelId: string;
  resources: Array<{
    name: string;
    description?: string | null;
    resourceUpload: string;
    publicId: string;
    resourceType?: string | null;
  }>;
}
export interface GetChannelByCodeResponse {
  success: boolean;
  channel: Channel;
  message: string;
}

export interface JoinChannelBody {
  code: string;
}

export interface JoinChannelResponse {
  success: boolean;
  message: string;
  channel?: Channel;
}
