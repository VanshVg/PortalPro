/**
 * Vercel serverless entry point for the PortalPro API.
 *
 * Vercel auto-detects files under apps/api/api/ as serverless functions.
 * The vercel.json rewrites all paths to /api/index so the Express app
 * receives the original request URL and handles routing itself.
 *
 * The src/index.ts module's `if (!process.env.VERCEL)` guard prevents
 * httpServer.listen() and Socket.io initialization in the serverless
 * environment (Socket.io requires a persistent connection Vercel can't provide).
 */
import app from "../src/index";

export default app;
