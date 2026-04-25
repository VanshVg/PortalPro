import type { Request, Response, NextFunction } from "express";
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  sendInvoiceSchema,
} from "@portalpro/types";
import {
  listInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  sendInvoice,
  generatePaymentLink,
  markInvoicePaid,
  cancelInvoice,
} from "./invoices.service";

/** GET /api/v1/invoices */
export async function getInvoices(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, projectId } = req.query as Record<string, string | undefined>;
    const invoices = await listInvoices(req.tenantId!, { status, projectId });
    res.json({ data: invoices });
  } catch (err) {
    next(err);
  }
}

/** POST /api/v1/invoices */
export async function postInvoice(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createInvoiceSchema.parse(req.body);
    const invoice = await createInvoice(req.tenantId!, input);
    res.status(201).json({ data: invoice });
  } catch (err) {
    next(err);
  }
}

/** GET /api/v1/invoices/:id */
export async function getInvoiceById(req: Request, res: Response, next: NextFunction) {
  try {
    const invoice = await getInvoice(req.tenantId!, req.params["id"] as string);
    res.json({ data: invoice });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/v1/invoices/:id */
export async function patchInvoice(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateInvoiceSchema.parse(req.body);
    const invoice = await updateInvoice(req.tenantId!, req.params["id"] as string, input);
    res.json({ data: invoice });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/v1/invoices/:id */
export async function deleteInvoiceHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await deleteInvoice(req.tenantId!, req.params["id"] as string);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/** POST /api/v1/invoices/:id/send */
export async function postSendInvoice(req: Request, res: Response, next: NextFunction) {
  try {
    const input = sendInvoiceSchema.parse(req.body);
    const invoice = await sendInvoice(req.tenantId!, req.params["id"] as string, input);
    res.json({ data: invoice });
  } catch (err) {
    next(err);
  }
}

/** POST /api/v1/invoices/:id/payment-link */
export async function postPaymentLink(req: Request, res: Response, next: NextFunction) {
  try {
    const invoice = await generatePaymentLink(req.tenantId!, req.params["id"] as string);
    res.json({ data: invoice });
  } catch (err) {
    next(err);
  }
}

/** POST /api/v1/invoices/:id/mark-paid */
export async function postMarkPaid(req: Request, res: Response, next: NextFunction) {
  try {
    const invoice = await markInvoicePaid(req.tenantId!, req.params["id"] as string);
    res.json({ data: invoice });
  } catch (err) {
    next(err);
  }
}

/** POST /api/v1/invoices/:id/cancel */
export async function postCancelInvoice(req: Request, res: Response, next: NextFunction) {
  try {
    const invoice = await cancelInvoice(req.tenantId!, req.params["id"] as string);
    res.json({ data: invoice });
  } catch (err) {
    next(err);
  }
}
