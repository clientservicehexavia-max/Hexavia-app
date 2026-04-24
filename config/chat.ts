import { ENV } from "@/config/env";

export const WS_URL = ENV.WS_URL;
export type ChatKind = "direct" | "community";
export const CHAT_SERVER_URL = WS_URL;
