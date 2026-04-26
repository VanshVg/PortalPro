import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { InvoiceResponse } from "@portalpro/types";

// Register Helvetica built-in variants for bold support
Font.registerHyphenationCallback((word) => [word]);

const PRIMARY = "#1B4D6E";
const NEUTRAL_800 = "#1f2937";
const NEUTRAL_500 = "#6b7280";
const NEUTRAL_200 = "#e5e7eb";
const GREEN = "#16a34a";
const RED = "#dc2626";

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
    fontSize: 10,
    color: NEUTRAL_800,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 36,
  },
  brandName: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: PRIMARY,
  },
  brandSub: {
    fontSize: 9,
    color: NEUTRAL_500,
    marginTop: 2,
  },
  invoiceTitle: {
    fontSize: 26,
    fontFamily: "Helvetica-Bold",
    color: PRIMARY,
    textAlign: "right",
  },
  invoiceNumber: {
    fontSize: 10,
    color: NEUTRAL_500,
    textAlign: "right",
    marginTop: 4,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: NEUTRAL_200,
    marginBottom: 24,
  },

  // Meta section
  metaSection: {
    marginBottom: 32,
  },
  metaBillTo: {
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaBlock: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 8,
    color: NEUTRAL_500,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 10,
    color: NEUTRAL_800,
  },

  // Status badge
  statusBadge: {
    alignSelf: "flex-start",
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },

  // Table
  table: { marginBottom: 24 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: PRIMARY,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 4,
    marginBottom: 2,
  },
  tableHeaderCell: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: "#ffffff",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: NEUTRAL_200,
  },
  tableRowAlt: {
    backgroundColor: "#f9fafb",
  },
  tableCell: { fontSize: 10, color: NEUTRAL_800 },
  tableCellMuted: { fontSize: 9, color: NEUTRAL_500, marginTop: 2 },

  // Column widths
  colDesc: { flex: 3 },
  colQty: { flex: 1, textAlign: "right" },
  colUnit: { flex: 1.5, textAlign: "right" },
  colTotal: { flex: 1.5, textAlign: "right" },

  // Totals
  totalsSection: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 32,
  },
  totalsBox: {
    width: 220,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  totalLabel: { fontSize: 10, color: NEUTRAL_500 },
  totalValue: { fontSize: 10, color: NEUTRAL_800 },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderTopWidth: 2,
    borderTopColor: PRIMARY,
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: PRIMARY,
  },
  grandTotalValue: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: PRIMARY,
  },

  // Notes
  notesSection: {
    marginBottom: 24,
    padding: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 4,
  },
  notesLabel: {
    fontSize: 8,
    color: NEUTRAL_500,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  notesText: { fontSize: 9, color: NEUTRAL_500, lineHeight: 1.5 },

  // Footer
  footer: {
    position: "absolute",
    bottom: 36,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: NEUTRAL_200,
    paddingTop: 10,
  },
  footerText: { fontSize: 8, color: NEUTRAL_500 },
});

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getStatusStyle(status: string): { backgroundColor: string; color: string } {
  switch (status) {
    case "PAID":
      return { backgroundColor: "#dcfce7", color: GREEN };
    case "OVERDUE":
      return { backgroundColor: "#fee2e2", color: RED };
    case "SENT":
      return { backgroundColor: "#dbeafe", color: "#1d4ed8" };
    case "CANCELLED":
      return { backgroundColor: "#f3f4f6", color: NEUTRAL_500 };
    default:
      return { backgroundColor: "#f3f4f6", color: NEUTRAL_500 };
  }
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: "Draft",
    SENT: "Payment Due",
    PAID: "Paid",
    OVERDUE: "Overdue",
    CANCELLED: "Cancelled",
  };
  return labels[status] ?? status;
}

interface InvoicePDFProps {
  invoice: InvoiceResponse;
  tenantName?: string;
}

export function InvoicePDF({ invoice, tenantName = "PortalPro Agency" }: InvoicePDFProps) {
  const statusStyle = getStatusStyle(invoice.status);
  const amountDue =
    invoice.status === "PAID" || invoice.status === "CANCELLED" ? 0 : invoice.amount;

  return (
    <Document
      title={`Invoice ${invoice.number}`}
      author={tenantName}
      creator="PortalPro"
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brandName}>{tenantName}</Text>
            <Text style={styles.brandSub}>Powered by PortalPro</Text>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>#{invoice.number}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Meta section — Bill To on its own row to avoid overflow on long emails */}
        <View style={styles.metaSection}>
          <View style={styles.metaBillTo}>
            <Text style={styles.metaLabel}>Bill To</Text>
            <Text style={styles.metaValue}>{invoice.clientEmail ?? "—"}</Text>
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaBlock}>
              <Text style={styles.metaLabel}>Issue Date</Text>
              <Text style={styles.metaValue}>{formatDate(invoice.createdAt)}</Text>
            </View>
            <View style={styles.metaBlock}>
              <Text style={styles.metaLabel}>Due Date</Text>
              <Text
                style={[
                  styles.metaValue,
                  invoice.status === "OVERDUE" ? { color: RED, fontFamily: "Helvetica-Bold" } : {},
                ]}
              >
                {formatDate(invoice.dueDate)}
              </Text>
            </View>
            <View style={[styles.metaBlock, { alignItems: "flex-end" }]}>
              <Text style={styles.metaLabel}>Status</Text>
              <View style={[styles.statusBadge, statusStyle]}>
                <Text style={{ color: statusStyle.color, fontFamily: "Helvetica-Bold", fontSize: 9 }}>
                  {getStatusLabel(invoice.status)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Line items table */}
        <View style={styles.table}>
          {/* Table header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colDesc]}>Description</Text>
            <Text style={[styles.tableHeaderCell, styles.colQty]}>Qty</Text>
            <Text style={[styles.tableHeaderCell, styles.colUnit]}>Unit Price</Text>
            <Text style={[styles.tableHeaderCell, styles.colTotal]}>Total</Text>
          </View>

          {/* Rows */}
          {invoice.lineItems.map((item, i) => (
            <View
              key={i}
              style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}
              wrap={false}
            >
              <View style={styles.colDesc}>
                <Text style={styles.tableCell}>{item.title}</Text>
                {item.description && (
                  <Text style={styles.tableCellMuted}>{item.description}</Text>
                )}
              </View>
              <Text style={[styles.tableCell, styles.colQty]}>{item.quantity}</Text>
              <Text style={[styles.tableCell, styles.colUnit]}>
                {formatCurrency(item.unitPrice, invoice.currency)}
              </Text>
              <Text style={[styles.tableCell, styles.colTotal]}>
                {formatCurrency(item.quantity * item.unitPrice, invoice.currency)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(invoice.amount, invoice.currency)}
              </Text>
            </View>
            {invoice.status === "PAID" && invoice.paidAt && (
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, { color: GREEN }]}>
                  Paid on {formatDate(invoice.paidAt)}
                </Text>
                <Text style={[styles.totalValue, { color: GREEN }]}>
                  -{formatCurrency(invoice.amount, invoice.currency)}
                </Text>
              </View>
            )}
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>
                {invoice.status === "PAID" ? "Amount Paid" : "Amount Due"}
              </Text>
              <Text
                style={[
                  styles.grandTotalValue,
                  invoice.status === "PAID" ? { color: GREEN } : {},
                  invoice.status === "OVERDUE" ? { color: RED } : {},
                ]}
              >
                {invoice.status === "PAID"
                  ? formatCurrency(invoice.amount, invoice.currency)
                  : formatCurrency(amountDue, invoice.currency)}
              </Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Invoice #{invoice.number} · {tenantName}
          </Text>
          <Text style={styles.footerText}>
            Generated by PortalPro · {new Date().toLocaleDateString("en-GB")}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
