export type ChannelResourceCategory =
  | "image"
  | "document"
  | "audio"
  | "video"
  | "folder"
  | "other";

export type ChannelResource = {
  _id?: string;
  name: string;
  description?: string | null;
  resourceUpload: string;
  mime?: string | null;
  mimetype?: string | null;
  rawFile?: string | null;
  category?: ChannelResourceCategory;
  publicId?: string | null;
};
export type ApiResource = {
  name: string;
  description: string;
  category: ChannelResourceCategory;
  resourceUpload: string;
  publicId: string;
  resourceType?: string | null;
};

export type UploadResourcesBody = {
  channelId: string;
  resources: ApiResource[];
};
