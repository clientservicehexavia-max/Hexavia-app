import { createAsyncThunk } from "@reduxjs/toolkit";
import { AxiosError } from "axios";
import { api } from "@/api/axios";
import {
  ApiSanction,
  CreateSanctionBody,
  DeleteSanctionBody,
  UpdateSanctionBody,
  SanctionsQuery,
} from "./sanctions.type";
import { showPromise } from "@/components/ui/toast";

const normalizeSanction = (raw: any): ApiSanction => ({
  ...raw,
  createdAt: raw?.createdAt ?? raw?.date ?? undefined,
  user: raw?.user ?? raw?.sanctionUser ?? undefined,
});

export const fetchSanctions = createAsyncThunk<
  { rows: ApiSanction[]; userIdKey: string | "_all" },
  SanctionsQuery | void,
  { rejectValue: string }
>("sanctions/fetch", async (query, thunkAPI) => {
  try {
    const params: Record<string, string> = {};
    if (query?.userId) params.userId = query.userId;

    const { data } = await api.get("/sanction", { params });

    const rowsRaw = Array.isArray(data)
      ? data
      : Array.isArray(data?.sanctions)
        ? data.sanctions
        : Array.isArray(data?.data)
          ? data.data
          : [];

    const rows: ApiSanction[] = rowsRaw.map(normalizeSanction);

    return { rows, userIdKey: query?.userId ?? "_all" };
  } catch (err) {
    const e = err as AxiosError<any>;
    if (e.response?.status === 404) {
      return thunkAPI.fulfillWithValue({
        rows: [],
        userIdKey: query?.userId ?? "_all",
      });
    }
    return thunkAPI.rejectWithValue(e.response?.data?.message || e.message);
  }
});

export const createSanction = createAsyncThunk<
  ApiSanction,
  CreateSanctionBody & { silent?: boolean },
  { rejectValue: string }
>("sanctions/create", async (body, { rejectWithValue }) => {
  try {
    const { silent = false, ...payload } = body;

    const request = api.post("/sanction/create", payload);
    const { data } = silent
      ? await request
      : await showPromise(request, "Creating Sanction...", "Sanction given");

    const created = (data as any)?.sanction ?? data;
    return normalizeSanction(created);
  } catch (err) {
    const e = err as AxiosError<any>;
    return rejectWithValue(e.response?.data?.message || e.message);
  }
});

export const deleteSanction = createAsyncThunk<
  string,
  DeleteSanctionBody,
  { rejectValue: string }
>("sanctions/delete", async (body, { rejectWithValue }) => {
  try {
    const request = (async () => {
      try {
        return await api.delete("/sanction/delete", { data: body });
      } catch (firstErr) {
        const e = firstErr as AxiosError<any>;
        const status = e.response?.status;
        if (status === 404 || status === 405) {
          return await api.delete("/sanction", { data: body });
        }
        throw firstErr;
      }
    })();

    await showPromise(
      request,
      "Deleting Sanction...",
      "Sanction deleted"
    );
    return body.sanctionId;
  } catch (err) {
    const e = err as AxiosError<any>;
    return rejectWithValue(e.response?.data?.message || e.message);
  }
});

export const updateSanction = createAsyncThunk<
  ApiSanction,
  UpdateSanctionBody,
  { rejectValue: string }
>("sanctions/update", async (body, { rejectWithValue }) => {
  try {
    const { data } = await showPromise(
      api.put<ApiSanction>("/sanction/update", body),
      "Updating Sanction",
      "Sanction Updated"
    );

    return normalizeSanction((data as any)?.sanction ?? data);
  } catch (err) {
    const e = err as AxiosError<any>;
    return rejectWithValue(e.response?.data?.message || e.message);
  }
});
