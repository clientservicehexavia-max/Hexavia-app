import { io, Socket } from "socket.io-client";
import { WS_URL } from "@/config/chat";

let socket: Socket | null = null;

export function getSocket() {
  return socket;
}

export function connectSocket(token?: string | null) {
  if (socket?.connected) return socket;

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
