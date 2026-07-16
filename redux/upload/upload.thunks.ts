import { api } from "@/api/axios";
import { showError, showPromise } from "@/components/ui/toast";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { setUploadProgress } from "./upload.actions";
import type { UploadInput, UploadResult } from "./upload.types";

const inferExt = (uriOrName?: string) => {
    if (!uriOrName) return "jpg";
    const m = /\.([a-zA-Z0-9]+)(?:\?|#|$)/.exec(uriOrName);
    return (m?.[1] || "jpg").toLowerCase();
};
const mimeFromExt: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    heic: "image/heic",
    heif: "image/heif",
    pdf: "application/pdf",
    txt: "text/plain",
    csv: "text/csv",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    m4a: "audio/mp4",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    aac: "audio/aac",
};

const extractPublicId = (body: any) => {
    return (
        body?.data?.public_id ??
        body?.data?.publicId ??
        body?.public_id ??
        body?.publicId ??
        body?.result?.public_id ??
        body?.result?.publicId ??
        null
    );
};

const extractAssetId = (body: any) => {
    return (
        body?.data?.assetId ??
        body?.data?.asset_id ??
        body?.assetId ??
        body?.asset_id ??
        body?.result?.assetId ??
        body?.result?.asset_id ??
        null
    );
};

export const uploadSingle = createAsyncThunk<
    UploadResult,
    UploadInput,
    { rejectValue: string }
>("upload/uploadSingle", async (input, { dispatch, rejectWithValue }) => {
    try {
        const ext = inferExt(input.name || input.uri);
        const type =
            input.type || mimeFromExt[ext] || "application/octet-stream";
        const name = input.name || `upload_${Date.now()}.${ext}`;

        const form = new FormData();
        form.append("file", {
            uri: input.uri,
            type,
            name,
        } as any);

        const req = api.post("/upload/single", form, {
            headers: {
                Accept: "application/json",
                "Content-Type": "multipart/form-data",
            },
            timeout: 120_000,
            transformRequest: (v) => v,
            onUploadProgress: (evt) => {
                if (!evt.total) return;
                const pct = Math.round((evt.loaded / evt.total) * 100);
                dispatch(setUploadProgress(pct));
            },
        });

        const res = await showPromise(req, "Uploading…", "Upload complete");

        const body: any = res.data;
        const url =
            body?.data?.url ||
            body?.data ||
            body?.url ||
            body?.result?.url ||
            body?.secure_url;

        if (!url) throw new Error("No URL returned from upload");

        const publicId = extractPublicId(body);
        const assetId = extractAssetId(body);

        return {
            url,
            filename: body?.filename ?? name,
            message: body?.message ?? null,
            publicId,
            assetId,
            resourceType:
                body?.data?.resourceType ?? body?.data?.resource_type ?? null,
        };
    } catch (err: any) {
        const status = err?.response?.status;
        const backendMsg =
            typeof err?.response?.data?.message === "string"
                ? err.response.data.message
                : undefined;
        const rawData =
            typeof err?.response?.data === "string" ? err.response.data : "";

        const isTooLargeError =
            status === 413 ||
            /entity too large|request entity too large|file too large/i.test(
                `${backendMsg || ""} ${rawData}`,
            );

        const msg = isTooLargeError
            ? "Upload rejected by server size limit (HTTP 413). The file may be within app limits, but your proxy/server upload limit is lower."
            : backendMsg || err?.message || "Upload failed. Please try again.";
        showError(msg);
        return rejectWithValue(msg);
    }
});

// export const uploadSingle = createAsyncThunk<
//   UploadResult,
//   UploadInput,
//   { rejectValue: string }
// >("upload/uploadSingle", async (input, { dispatch, rejectWithValue }) => {
//   try {
//     const ext = inferExt(input.name || input.uri);
//     const type = input.type || mimeFromExt[ext] || "application/octet-stream";
//     const name = input.name || `upload_${Date.now()}.${ext}`;

//     const form = new FormData();
//     form.append("file", {
//       uri: input.uri,
//       type,
//       name,
//     } as any);

//     // ✅ replace with
//     const req = api.post("/upload/single", form, {
//       headers: { Accept: "application/json" }, // let Axios set multipart boundary
//       transformRequest: (v) => v, // don't serialize FormData
//       onUploadProgress: (evt) => {
//         if (!evt.total) return;
//         const pct = Math.round((evt.loaded / evt.total) * 100);
//         dispatch(setUploadProgress(pct));
//       },
//     });

//     const res = await showPromise(req, "Uploading…", "Upload complete");

//     const body: any = res.data;
//     const url =
//       body?.data?.url ||
//       body?.data ||
//       body?.url ||
//       body?.result?.url ||
//       body?.secure_url;

//     if (!url) throw new Error("No URL returned from upload");

//     return {
//       url,
//       filename: body?.filename ?? name,
//       message: body?.message ?? null,
//     };
//   } catch (err: any) {
//     const msg =
//       err?.response?.data?.message ||
//       err?.message ||
//       "Upload failed. Please try again.";
//     showError(msg);
//     return rejectWithValue(msg);
//   }
// });
