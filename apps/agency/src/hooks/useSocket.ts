"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { API_URL } from "@/lib/env";

type ConnectionStatus = "connecting" | "connected" | "disconnected";

/**
 * Connects to the Socket.io server and joins a project room.
 * Returns the socket instance, connection status, and a typed event subscriber.
 */
export function useProjectSocket(projectId: string) {
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");

  useEffect(() => {
    const socket = io(API_URL, {
      withCredentials: true,
      path: "/socket.io",
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setStatus("connected");
      socket.emit("join:project", { projectId });
    });

    socket.on("disconnect", () => {
      setStatus("disconnected");
    });

    socket.on("connect_error", () => {
      setStatus("disconnected");
    });

    return () => {
      socket.emit("leave:project", { projectId });
      socket.disconnect();
    };
  }, [projectId]);

  /**
   * Subscribe to a socket event. Returns an unsubscribe function.
   * Stable across re-renders — caller manages cleanup with useEffect.
   */
  function on<T>(event: string, handler: (data: T) => void): () => void {
    socketRef.current?.on(event, handler);
    return () => { socketRef.current?.off(event, handler); };
  }

  return { status, on };
}
