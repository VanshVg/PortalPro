import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface InvoiceSentProps {
  invoiceNumber: string;
  amount: number;
  currency: string;
  dueDate: string | null;
  paymentUrl?: string;
}

/** Sent to the client when an invoice is issued. */
export function InvoiceSent({
  invoiceNumber,
  amount,
  currency,
  dueDate,
  paymentUrl,
}: InvoiceSentProps) {
  const formattedAmount = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amount);

  return (
    <Html>
      <Head />
      <Preview>Invoice {invoiceNumber} — {formattedAmount} due</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Text style={logoText}>PortalPro</Text>
          </Section>

          <Heading style={heading}>Invoice {invoiceNumber}</Heading>

          <Text style={paragraph}>
            Please find your invoice details below. You can pay securely online using the button
            below.
          </Text>

          <Section style={summaryBox}>
            <Row>
              <Column>
                <Text style={summaryLabel}>Invoice</Text>
                <Text style={summaryValue}>{invoiceNumber}</Text>
              </Column>
              <Column>
                <Text style={summaryLabel}>Amount Due</Text>
                <Text style={{ ...summaryValue, ...amountStyle }}>{formattedAmount}</Text>
              </Column>
              <Column>
                <Text style={summaryLabel}>Due Date</Text>
                <Text style={summaryValue}>
                  {dueDate
                    ? new Date(dueDate).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "Upon receipt"}
                </Text>
              </Column>
            </Row>
          </Section>

          {paymentUrl && (
            <Section style={buttonSection}>
              <Button href={paymentUrl} style={button}>
                Pay Now — {formattedAmount}
              </Button>
            </Section>
          )}

          <Hr style={hr} />
          <Text style={footer}>&copy; {new Date().getFullYear()} PortalPro</Text>
        </Container>
      </Body>
    </Html>
  );
}

interface PaymentReceivedProps {
  invoiceNumber: string;
  amount: number;
  currency: string;
}

/** Sent to the client confirming payment was received. */
export function PaymentReceived({ invoiceNumber, amount, currency }: PaymentReceivedProps) {
  const formattedAmount = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amount);

  return (
    <Html>
      <Head />
      <Preview>Payment received for invoice {invoiceNumber}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Text style={logoText}>PortalPro</Text>
          </Section>

          <Section style={successBadge}>
            <Text style={successText}>✓ Payment Confirmed</Text>
          </Section>

          <Heading style={heading}>Thank you for your payment</Heading>

          <Text style={paragraph}>
            We have received your payment of <strong>{formattedAmount}</strong> for invoice{" "}
            <strong>{invoiceNumber}</strong>. Your account is now up to date.
          </Text>

          <Hr style={hr} />
          <Text style={footer}>&copy; {new Date().getFullYear()} PortalPro</Text>
        </Container>
      </Body>
    </Html>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const main: React.CSSProperties = {
  backgroundColor: "#f5f5f5",
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const container: React.CSSProperties = {
  margin: "40px auto",
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  padding: "40px",
  maxWidth: "560px",
  border: "1px solid #e5e7eb",
};

const logoSection: React.CSSProperties = { marginBottom: "32px" };

const logoText: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: "700",
  color: "#1B4D6E",
  margin: "0",
};

const heading: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: "700",
  color: "#111827",
  margin: "0 0 16px",
};

const paragraph: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: "1.6",
  color: "#374151",
  margin: "0 0 16px",
};

const summaryBox: React.CSSProperties = {
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
  padding: "20px",
  margin: "0 0 24px",
  border: "1px solid #e5e7eb",
};

const summaryLabel: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: "600",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "#6b7280",
  margin: "0 0 4px",
};

const summaryValue: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#111827",
  margin: "0",
};

const amountStyle: React.CSSProperties = {
  color: "#1B4D6E",
  fontSize: "20px",
};

const buttonSection: React.CSSProperties = { margin: "32px 0", textAlign: "center" };

const button: React.CSSProperties = {
  backgroundColor: "#1B4D6E",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: "600",
  textDecoration: "none",
  padding: "14px 32px",
  display: "inline-block",
};

const successBadge: React.CSSProperties = {
  backgroundColor: "#dcfce7",
  borderRadius: "8px",
  padding: "12px 16px",
  margin: "0 0 24px",
};

const successText: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#15803d",
  margin: "0",
};

const hr: React.CSSProperties = {
  borderColor: "#e5e7eb",
  margin: "24px 0",
};

const footer: React.CSSProperties = {
  fontSize: "12px",
  color: "#9ca3af",
  lineHeight: "1.6",
  margin: "0",
};
