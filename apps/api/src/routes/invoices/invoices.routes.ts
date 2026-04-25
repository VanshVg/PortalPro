import { Router } from "express";
import { requireRole } from "../../middleware/auth.middleware";
import {
  getInvoices,
  postInvoice,
  getInvoiceById,
  patchInvoice,
  deleteInvoiceHandler,
  postSendInvoice,
  postPaymentLink,
  postMarkPaid,
  postCancelInvoice,
} from "./invoices.controller";

const router = Router();

router.get("/", getInvoices);
router.post("/", requireRole("EDITOR"), postInvoice);
router.get("/:id", getInvoiceById);
router.patch("/:id", requireRole("EDITOR"), patchInvoice);
router.delete("/:id", requireRole("ADMIN"), deleteInvoiceHandler);
router.post("/:id/send", requireRole("EDITOR"), postSendInvoice);
router.post("/:id/payment-link", requireRole("EDITOR"), postPaymentLink);
router.post("/:id/mark-paid", requireRole("ADMIN"), postMarkPaid);
router.post("/:id/cancel", requireRole("EDITOR"), postCancelInvoice);

export default router;
