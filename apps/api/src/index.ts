import cors from "cors";
import express from "express";
import helmet from "helmet";
import { createServer } from "http";
import Stripe from "stripe";

import { errorMiddleware } from "./middleware/error.middleware";
import { requestIdMiddleware } from "./middleware/request-id.middleware";
import { authMiddleware } from "./middleware/auth.middleware";
import { tenantMiddleware } from "./middleware/tenant.middleware";
import { logger } from "./lib/logger";
import { PORT, AGENCY_URL, PORTAL_URL, STRIPE_WEBHOOK_SECRET } from "./lib/env";
import { tenantRoutes } from "./routes/tenants/tenants.routes";
import { portalRoutes } from "./routes/portals/portals.routes";
import { projectRoutes } from "./routes/projects/projects.routes";
import { fileRoutes } from "./routes/files/files.routes";
import milestoneRoutes from "./routes/milestones/milestones.routes";
import taskRoutes, { commentRouter } from "./routes/tasks/tasks.routes";
import messageRoutes from "./routes/messages/messages.routes";
import timeEntryRoutes from "./routes/time-entries/time-entries.routes";
import deliverableRoutes from "./routes/deliverables/deliverables.routes";
import invoiceRoutes from "./routes/invoices/invoices.routes";
import { initSocketServer } from "./lib/socket";
import { getStripe } from "./lib/stripe";
import { markInvoicePaid } from "./routes/invoices/invoices.service";
import { prisma } from "@portalpro/database";

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

// Stripe webhook must use raw body — mount before express.json()
app.post(
  "/api/v1/webhooks/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const stripe = getStripe();
    if (!stripe || !STRIPE_WEBHOOK_SECRET) {
      res.status(400).json({ error: "Stripe not configured" });
      return;
    }

    const sig = req.headers["stripe-signature"] as string;
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body as Buffer, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      logger.warn({ err }, "Stripe webhook signature verification failed");
      res.status(400).json({ error: `Webhook Error: ${message}` });
      return;
    }

    if (event.type === "checkout.session.completed" || event.type === "payment_intent.succeeded") {
      const metadata = (event.data.object as { metadata?: { invoiceNumber?: string } }).metadata;
      if (metadata?.invoiceNumber) {
        const invoice = await prisma.invoice.findFirst({
          where: { number: metadata.invoiceNumber },
          select: { id: true, tenantId: true },
        });
        if (invoice) {
          await markInvoicePaid(invoice.tenantId, invoice.id).catch((err: unknown) => {
            logger.error({ err, invoiceNumber: metadata.invoiceNumber }, "Failed to mark invoice paid via webhook");
          });
        }
      }
    }

    res.json({ received: true });
  },
);

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
apiRouter.use("/projects", projectRoutes); // includes /:projectId/milestones sub-router
apiRouter.use("/files", fileRoutes);

// Phase 3: Standalone routes (operate on individual records by id)
apiRouter.use("/milestones", milestoneRoutes);
apiRouter.use("/tasks", taskRoutes);
apiRouter.use("/comments", commentRouter);
apiRouter.use("/messages", messageRoutes);
apiRouter.use("/time-entries", timeEntryRoutes);

// Phase 4: Billing & Approval
apiRouter.use("/deliverables", deliverableRoutes);
apiRouter.use("/invoices", invoiceRoutes);

app.use("/api/v1", apiRouter);

// ===== Error Handler (must be last) =====
app.use(errorMiddleware);

// ===== Start Server =====
// Vercel runs this file as a serverless function — skip listening and Socket.io.
// Socket.io requires a persistent HTTP server which serverless does not support.
if (!process.env.VERCEL) {
  const httpServer = createServer(app);
  initSocketServer(httpServer);
  httpServer.listen(PORT, () => {
    logger.info({ port: PORT }, "PortalPro API server started");
  });
}

export default app;
