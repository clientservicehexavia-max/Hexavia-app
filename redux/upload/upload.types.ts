export type UploadPhase = "idle" | "uploading" | "success" | "error";

export type UploadInput = {
  uri: string;
  name?: string;
  type?: string;
};

export type UploadResult = {
  url: string;
  filename?: string | null;
  message?: string | null;
  publicId?: string | null;
  resourceType?: string | null;
};

export type UploadState = {
  phase: UploadPhase;
  progress: number;
  error: string | null;
  last?: UploadResult | null;
};
