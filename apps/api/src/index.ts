import cors from "cors";
import express from "express";
import helmet from "helmet";

import { errorMiddleware } from "./middleware/error.middleware";
import { requestIdMiddleware } from "./middleware/request-id.middleware";
import { logger } from "./lib/logger";

const app = express();
const PORT = process.env.PORT ?? 4000;

// ===== Global Middleware (order matters) =====
app.use(cors({
  origin: [
    process.env.AGENCY_URL ?? "http://localhost:3000",
    process.env.PORTAL_URL ?? "http://localhost:3001",
  ],
  credentials: true,
}));
app.use(helmet());
app.use(express.json({ limit: "10mb" }));
app.use(requestIdMiddleware);

// ===== Health Check =====
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ===== API Routes =====
app.get("/api/v1", (_req, res) => {
  res.json({
    name: "PortalPro API",
    version: "0.1.0",
    docs: "/api/docs",
  });
});

// Route registration will be added here as modules are implemented:
// app.use("/api/v1/auth", authRoutes);
// app.use("/api/v1/tenants", tenantRoutes);
// app.use("/api/v1/portals", portalRoutes);
// app.use("/api/v1/projects", projectRoutes);

// ===== Error Handler (must be last) =====
app.use(errorMiddleware);

// ===== Start Server =====
app.listen(PORT, () => {
  logger.info({ port: PORT }, "PortalPro API server started");
});

export default app;
