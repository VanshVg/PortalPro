import cors from "cors";
import express from "express";
import helmet from "helmet";

import { errorMiddleware } from "./middleware/error.middleware";
import { requestIdMiddleware } from "./middleware/request-id.middleware";
import { authMiddleware } from "./middleware/auth.middleware";
import { tenantMiddleware } from "./middleware/tenant.middleware";
import { logger } from "./lib/logger";
import { PORT, AGENCY_URL, PORTAL_URL } from "./lib/env";
import { tenantRoutes } from "./routes/tenants/tenants.routes";
import { portalRoutes } from "./routes/portals/portals.routes";
import { projectRoutes } from "./routes/projects/projects.routes";
import { fileRoutes } from "./routes/files/files.routes";

const app = express();

// ===== Global Middleware (order matters) =====
app.use(cors({
  origin: [AGENCY_URL, PORTAL_URL],
  credentials: true,
}));
app.use(helmet());
app.use(express.json({ limit: "10mb" }));
app.use(requestIdMiddleware);

// ===== Public Routes =====
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ===== Protected API =====
// All /api/v1/* routes require authentication + tenant resolution
const apiRouter = express.Router();
apiRouter.use(authMiddleware);
apiRouter.use(tenantMiddleware);

apiRouter.get("/", (_req, res) => {
  res.json({
    name: "PortalPro API",
    version: "1.0.0",
    docs: "/api/docs",
  });
});

// Phase 2: Core routes
apiRouter.use("/tenants", tenantRoutes);
apiRouter.use("/portals", portalRoutes);
apiRouter.use("/projects", projectRoutes);
apiRouter.use("/files", fileRoutes);

// Phase 3+ (stubs — implemented in later phases):
// apiRouter.use("/tasks", taskRoutes);
// apiRouter.use("/messages", messageRoutes);
// apiRouter.use("/invoices", invoiceRoutes);

app.use("/api/v1", apiRouter);

// ===== Error Handler (must be last) =====
app.use(errorMiddleware);

// ===== Start Server =====
app.listen(PORT, () => {
  logger.info({ port: PORT }, "PortalPro API server started");
});

export default app;
