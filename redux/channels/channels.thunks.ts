import { api } from "@/api/axios";
import { showError, showPromise, showSuccess } from "@/components/ui/toast";
import { extractErrorMessage } from "@/redux/api/extractErrorMessage";
import { createAsyncThunk } from "@reduxjs/toolkit";
import type {
  AddMemberBody,
  AddMemberResponse,
  AssignMemberTaskBody,
  AssignMemberTaskResponse,
  Channel,
  CreateChannelBody,
  CreateChannelResponse,
  CreateTaskBody,
  CreateTaskResponse,
  DeleteChannelBody,
  DeleteChannelResponse,
  DeleteTaskBody,
  DeleteTaskResponse,
  GenerateCodeResponse,
  GetDeletedChannelsResponse,
  GetChannelByCodeResponse,
  GetChannelByIdResponse,
  GetChannelsResponse,
  GetChannelTasksResponse,
  ImportTasksBody,
  JoinChannelResponse,
  RemoveMemberBody,
  RemoveMemberResponse,
  UnassignMemberTaskBody,
  UnassignMemberTaskResponse,
  UpdateMemberRoleBody,
  UpdateMemberRoleResponse,
  UpdateChannelBody,
  UpdateChannelResponse,
  UpdateTaskBody,
  UpdateTaskResponse,
  UploadResourcesBody,
  RestoreChannelBody,
  RestoreChannelResponse,
} from "./channels.types";

export const fetchChannels = createAsyncThunk<
  Channel[],
  void,
  { rejectValue: string }
>("channels/fetchAll", async (_: void, { rejectWithValue }) => {
  try {
    const res = await api.get<GetChannelsResponse>("/channel");
    // console.log(res.data);
    return res.data.channels;
  } catch (err) {
    const msg = extractErrorMessage(err);
    showError(msg);
    return rejectWithValue(msg);
  }
});

export const fetchDeletedChannels = createAsyncThunk<
  Channel[],
  void,
  { rejectValue: string }
>("channels/fetchDeleted", async (_: void, { rejectWithValue }) => {
  try {
    const res = await api.get<GetDeletedChannelsResponse>("/channel/deleted");
    const channels =
      res.data?.channels ??
      (res.data as any)?.deletedChannels ??
      res.data?.data?.channels ??
      ((res.data as any)?.data as Channel[]) ??
      [];
    return Array.isArray(channels) ? channels : [];
  } catch (err) {
    const msg = extractErrorMessage(err);
    showError(msg);
    return rejectWithValue(msg);
  }
});

export const fetchChannelById = createAsyncThunk<
  Channel,
  string,
  { rejectValue: string }
>("channels/fetchById", async (id, { rejectWithValue }) => {
  try {
    const res = await api.get<GetChannelByIdResponse>(`/channel/${id}`);
    // console.log(res.data)
    return res.data.channel as Channel;
  } catch (err) {
    const msg = extractErrorMessage(err);
    showError(msg);
    return rejectWithValue(msg);
  }
});

export const fetchChannelTasks = createAsyncThunk<
  { channelId: string; tasks: Channel["tasks"] },
  string,
  { rejectValue: string }
>("channels/fetchTasks", async (channelId, { rejectWithValue }) => {
  try {
    const res = await api.get<GetChannelTasksResponse>(
      `/channel/${channelId}/tasks`,
    );
    const tasks = Array.isArray(res.data?.tasks) ? res.data.tasks : [];
    return { channelId, tasks };
  } catch (err) {
    const msg = extractErrorMessage(err);
    showError(msg);
    return rejectWithValue(msg);
  }
});

export const generateChannelCode = createAsyncThunk<
  string,
  void,
  { rejectValue: string }
>("channels/generateCode", async (_: void, { rejectWithValue }) => {
  try {
    const res = await api.get<GenerateCodeResponse>("/channel/generate-code");
    return res.data.code as string;
  } catch (err) {
    const msg = extractErrorMessage(err);
    showError(msg);
    return rejectWithValue(msg);
  }
});

export const createChannel = createAsyncThunk<
  Channel,
  CreateChannelBody,
  { rejectValue: string }
>("channels/create", async (body, { rejectWithValue }) => {
  try {
    const res = await showPromise(
      api.post<CreateChannelResponse>("/channel", body),
      "Creating project...",
      "Project created",
    );
    return res.data.channel as Channel;
  } catch (err) {
    const msg = extractErrorMessage(err);
    showError(msg);
    return rejectWithValue(msg);
  }
});

// ADMIN ACTIONS
export const updateChannel = createAsyncThunk<
  Channel,
  UpdateChannelBody,
  { rejectValue: string }
>("channels/updateChannel", async (body, { rejectWithValue }) => {
  try {
    const res = await showPromise(
      api.patch<UpdateChannelResponse>("/admin/channels", body),
      "Updating project...",
      "Project updated",
    );
    const channel =
      (res.data as any)?.channel ||
      (res.data as any)?.data?.channel ||
      (res.data as any)?.data;
    if (!channel) {
      throw new Error("Missing channel in response");
    }
    return channel as Channel;
  } catch (err) {
    const msg = extractErrorMessage(err);
    showError(msg);
    return rejectWithValue(msg);
  }
});

export const addMemberToChannel = createAsyncThunk<
  Channel,
  AddMemberBody,
  { rejectValue: string }
>("channels/addMember", async (body, { rejectWithValue }) => {
  try {
    const res = await showPromise(
      api.post<AddMemberResponse>("/channel/add-member", body),
      "Adding member…",
      "Member added",
    );
    return res.data.channel as Channel;
  } catch (err) {
    const msg = extractErrorMessage(err);
    showError(msg);
    return rejectWithValue(msg);
  }
});

export const removeMemberFromChannel = createAsyncThunk<
  Channel,
  RemoveMemberBody,
  { rejectValue: string }
>("channels/removeMember", async (body, { rejectWithValue }) => {
  try {
    const res = await showPromise(
      api.post<RemoveMemberResponse>("/channel/remove-member", body),
      "Removing member…",
      "Member removed",
    );
    return res.data.channel as Channel;
  } catch (err) {
    const msg = extractErrorMessage(err);
    showError(msg);
    return rejectWithValue(msg);
  }
});

export const updateChannelMemberRole = createAsyncThunk<
  Channel,
  UpdateMemberRoleBody,
  { rejectValue: string }
>("channels/updateMemberRole", async (body, { rejectWithValue }) => {
  try {
    const res = await showPromise(
      api.post<UpdateMemberRoleResponse>("/channel/update-member-role", body),
      "Updating role…",
      "Member role updated",
    );
    return res.data.channel as Channel;
  } catch (err) {
    const msg = extractErrorMessage(err);
    showError(msg);
    return rejectWithValue(msg);
  }
});

// DELETE CHANNEL (assumed endpoint)
export const deleteChannelById = createAsyncThunk<
  string,
  DeleteChannelBody,
  { rejectValue: string }
>("channels/deleteChannel", async (body, { rejectWithValue }) => {
  try {
    const res = await showPromise(
      api.delete<DeleteChannelResponse>("/admin/channels", { data: body }),
      "Deleting project...",
      "Project deleted",
    );

    return res.data?.channelId ?? body.channelId;
  } catch (err) {
    const msg = extractErrorMessage(err);
    showError(msg);
    return rejectWithValue(msg);
  }
});

export const restoreChannelById = createAsyncThunk<
  { channelId: string; channel?: Channel; message?: string },
  RestoreChannelBody,
  { rejectValue: string }
>("channels/restoreChannel", async (body, { rejectWithValue }) => {
  try {
    const res = await api.post<RestoreChannelResponse>("/channel/restore", body);
    return {
      channelId:
        res.data?.channelId ??
        res.data?.channel?._id ??
        body.channelId,
      channel: res.data?.channel,
      message: res.data?.message,
    };
  } catch (err) {
    const msg = extractErrorMessage(err);
    showError(msg);
    return rejectWithValue(msg);
  }
});

// CHANNEL TASKS & RESOURCES
export const createChannelTask = createAsyncThunk<
  Channel,
  CreateTaskBody,
  { rejectValue: string }
>("channels/createTask", async (body, { rejectWithValue }) => {
  try {
    const res = await showPromise(
      api.post<CreateTaskResponse>(`/channel/create-task`, body),
      "Creating task…",
      "Task created",
    );
    // console.log(res.data)
    return res.data.channel as Channel;
  } catch (err) {
    const msg = extractErrorMessage(err);
    showError(msg);
    return rejectWithValue(msg);
  }
});

export const importChannelTasks = createAsyncThunk<
  Channel,
  ImportTasksBody,
  { rejectValue: string }
>("channels/importTasks", async (body, { rejectWithValue }) => {
  try {
    const res = await showPromise(
      (async () => {
        let latestChannel: Channel | null = null;

        for (const task of body.tasks) {
          const taskRes = await api.post<CreateTaskResponse>(
            "/channel/create-task",
            {
              channelId: body.channelId,
              name: task.name,
              description: task.description || "Imported from spreadsheet",
              status: task.status ?? "not-started",
            },
          );
          latestChannel = taskRes.data.channel as Channel;
        }

        if (!latestChannel) {
          throw new Error("No tasks to import.");
        }

        return latestChannel;
      })(),
      `Importing ${body.tasks.length} task${body.tasks.length === 1 ? "" : "s"}...`,
      `Imported ${body.tasks.length} task${body.tasks.length === 1 ? "" : "s"}`,
    );

    return res;
  } catch (err) {
    const msg = extractErrorMessage(err);
    showError(msg);
    return rejectWithValue(msg);
  }
});

export const updateChannelTask = createAsyncThunk<
  Channel,
  UpdateTaskBody,
  { rejectValue: string }
>("channels/updateTask", async (body, { rejectWithValue }) => {
  try {
    const res = await showPromise(
      api.put<UpdateTaskResponse>("/channel/update-task", body),
      "updating task…",
      "Task updated",
    );
    return res.data.channel as Channel;
  } catch (err) {
    const msg = extractErrorMessage(err);
    return rejectWithValue(msg ?? "Failed to update task");
  }
});

export const deleteChannelTask = createAsyncThunk<
  { channelId: string; taskId: string },
  DeleteTaskBody,
  { rejectValue: string }
>("channels/deleteTask", async (body, { rejectWithValue }) => {
  try {
    await showPromise(
      api.delete<DeleteTaskResponse>("/channel/delete-task", { data: body }),
      "Deleting task…",
      "Task deleted",
    );
    return { channelId: body.channelId, taskId: body.taskId };
  } catch (err) {
    const msg = extractErrorMessage(err);
    showError(msg);
    return rejectWithValue(msg);
  }
});

export const assignChannelTaskMembers = createAsyncThunk<
  { channelId: string; taskId: string; members: string[] },
  AssignMemberTaskBody,
  { rejectValue: string }
>("channels/assignMemberTask", async (body, { rejectWithValue }) => {
  try {
    await showPromise(
      api.post<AssignMemberTaskResponse>("/channel/assign-member-task", body),
      "Assigning member…",
      "Member assigned",
    );
    return body;
  } catch (err) {
    const msg = extractErrorMessage(err);
    showError(msg);
    return rejectWithValue(msg);
  }
});

export const unassignChannelTaskMember = createAsyncThunk<
  { channelId: string; taskId: string; userId: string },
  UnassignMemberTaskBody,
  { rejectValue: string }
>("channels/unassignMemberTask", async (body, { rejectWithValue }) => {
  try {
    await showPromise(
      api.post<UnassignMemberTaskResponse>(
        "/channel/unassign-member-task",
        body,
      ),
      "Unassigning member…",
      "Member unassigned",
    );
    return body;
  } catch (err) {
    const msg = extractErrorMessage(err);
    showError(msg);
    return rejectWithValue(msg);
  }
});

export const uploadChannelResources = createAsyncThunk<
  Channel,
  UploadResourcesBody,
  { rejectValue: string }
>("channels/uploadResources", async (body, { rejectWithValue }) => {
  try {
    const res = await api.post(`/channel/upload-resources`, body);
    const channel =
      (res.data as any)?.channel ||
      (res.data as any)?.data?.channel ||
      (res.data as any)?.data;
    if (!channel) {
      throw new Error("Missing channel in response");
    }
    return channel as Channel;
  } catch (err: any) {
    const msg = extractErrorMessage(err);
    showError(msg);
    return rejectWithValue(msg);
  }
});

export const fetchChannelByCode = createAsyncThunk<
  Channel,
  string,
  { rejectValue: string }
>("channels/fetchByCode", async (code, { rejectWithValue }) => {
  try {
    const res = await api.get<GetChannelByCodeResponse>(
      `/channel/${code}/code`,
    );
    return res.data.channel;
  } catch (err: any) {
    const status = err?.response?.status;

    if (status === 404) {
      const msg = "Channel not found";
      showError(msg);
      return rejectWithValue(msg);
    }

    const msg = extractErrorMessage(err);
    showError(msg);
    return rejectWithValue(msg);
  }
});

export const joinChannel = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>("channels/join", async (code, { rejectWithValue }) => {
  try {
    console.log("Joining channel with code:", code);
    const res = await api.put<JoinChannelResponse>("/channel/join", {
      code: `#${code}`,
    });
    console.log("Join response:", res.data);
    if (res.status === 200) {
      showSuccess("Joined channel successfully");
      return res.data.message;
    } else {
      throw new Error(res.data.message || "Failed to join channel");
    }
  } catch (err) {
    // console.error("Join channel error:", err);
    const msg = extractErrorMessage(err);
    showError(msg);
    return rejectWithValue(msg);
  }
});
