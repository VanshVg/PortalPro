import { Server as SocketIOServer, type Socket } from "socket.io";
import { type Server as HttpServer } from "http";
import { logger } from "./logger";
import { AGENCY_URL, PORTAL_URL } from "./env";

/** Singleton Socket.io server instance — set once in index.ts. */
let io: SocketIOServer | null = null;

/**
 * Initializes the Socket.io server attached to the Node.js http.Server.
 * Call this once in index.ts after creating the HTTP server.
 */
export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: [AGENCY_URL, PORTAL_URL],
      credentials: true,
    },
    path: "/socket.io",
  });

  io.on("connection", (socket: Socket) => {
    logger.info({ socketId: socket.id }, "Socket connected");

    /**
     * Clients join a project room to receive real-time updates for that project.
     * Payload: { projectId: string }
     */
    socket.on("join:project", ({ projectId }: { projectId: string }) => {
      socket.join(`project:${projectId}`);
      logger.debug({ socketId: socket.id, projectId }, "Socket joined project room");
    });

    socket.on("leave:project", ({ projectId }: { projectId: string }) => {
      socket.leave(`project:${projectId}`);
      logger.debug({ socketId: socket.id, projectId }, "Socket left project room");
    });

    socket.on("disconnect", () => {
      logger.info({ socketId: socket.id }, "Socket disconnected");
    });
  });

  logger.info("Socket.io server initialized");
  return io;
}

/**
 * Returns the Socket.io server. Throws if not initialized.
 */
export function getIO(): SocketIOServer {
  if (!io) throw new Error("Socket.io not initialized — call initSocketServer first");
  return io;
}

// ===== Broadcast helpers =====

/** Broadcast a task status/update change to everyone in the project room. */
export function broadcastTaskUpdate(projectId: string, task: unknown): void {
  if (!io) return; // no-op if socket not yet initialized (e.g. during tests)
  io.to(`project:${projectId}`).emit("task:updated", task);
}

/** Broadcast a new message to everyone in the project room. */
export function broadcastNewMessage(projectId: string, message: unknown): void {
  if (!io) return;
  io.to(`project:${projectId}`).emit("message:new", message);
}
