// Change ONLY this one value whenever you want to switch backend:
// - Local example:  http://192.168.1.20:6000
// - Deployed example: https://hexavia.cloud
const BACKEND_ORIGIN = "https://deep-lynx-free.ngrok-free.app";
// const BACKEND_ORIGIN = "https://hexavia.cloud";

export const ENV = {
    API_BASE_URL: `${BACKEND_ORIGIN}/api`,
    WS_URL: BACKEND_ORIGIN,
    REQUEST_TIMEOUT_MS: 60_000, // 60 seconds for most requests
    EXPO_PUBLIC_OPENAI_API_KEY: "",
};
