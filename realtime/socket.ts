import { WS_URL } from "@/config/chat";
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket() {
    return socket;
}

export function connectSocket(token?: string | null) {
    if (socket) {
        if (token) {
            (socket.auth as any) = { token };
        }
        if (!socket.connected) {
            socket.connect();
        }
        return socket;
    }

    if (!WS_URL) {
        console.warn("[chat] WS_URL is missing!");
    }

    socket = io(WS_URL, {
        auth: { token: token || undefined },
        transports: ["websocket"],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 500,
    });

    return socket;
}

export function closeSocket() {
    try {
        socket?.close();
    } catch {}
    socket = null;
}
