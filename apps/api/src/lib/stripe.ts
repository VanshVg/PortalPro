import Stripe from "stripe";
import { STRIPE_SECRET_KEY } from "./env";

type StripeClient = InstanceType<typeof Stripe>;

/**
 * Lazily-initialised Stripe client.
 * Returns null when STRIPE_SECRET_KEY is not configured (dev/test without payments).
 */
let _stripe: StripeClient | null = null;

export function getStripe(): StripeClient | null {
  if (!STRIPE_SECRET_KEY) return null;
  if (!_stripe) {
    _stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2026-03-25.dahlia" });
  }
  return _stripe;
}

/**
 * Creates a Stripe Payment Link for an invoice.
 * Returns the hosted payment URL, or null if Stripe is not configured.
 */
export async function createPaymentLink(opts: {
  invoiceNumber: string;
  amountCents: number;
  currency: string;
  description: string;
}): Promise<string | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const price = await stripe.prices.create({
    currency: opts.currency.toLowerCase(),
    unit_amount: opts.amountCents,
    product_data: {
      name: `Invoice ${opts.invoiceNumber} — ${opts.description}`,
    },
  });

  const link = await stripe.paymentLinks.create({
    line_items: [{ price: price.id, quantity: 1 }],
    metadata: { invoiceNumber: opts.invoiceNumber },
  });

  return link.url;
}
