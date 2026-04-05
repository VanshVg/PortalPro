import cors from "cors";
import express from "express";
import helmet from "helmet";

import { errorMiddleware } from "./middleware/error.middleware";
import { requestIdMiddleware } from "./middleware/request-id.middleware";
import { authMiddleware } from "./middleware/auth.middleware";
import { tenantMiddleware } from "./middleware/tenant.middleware";
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
    version: "0.1.0",
    docs: "/api/docs",
  });
});

// Route registration (added as modules are implemented):
// apiRouter.use("/auth", authRoutes);
// apiRouter.use("/tenants", tenantRoutes);
// apiRouter.use("/portals", portalRoutes);
// apiRouter.use("/projects", projectRoutes);
// apiRouter.use("/tasks", taskRoutes);
// apiRouter.use("/files", fileRoutes);
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
