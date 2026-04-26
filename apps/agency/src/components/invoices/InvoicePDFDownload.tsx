"use client";

import { PDFDownloadLink } from "@react-pdf/renderer";
import { Download } from "lucide-react";
import { InvoicePDF } from "./InvoicePDF";
import type { InvoiceResponse } from "@portalpro/types";

interface InvoicePDFDownloadProps {
  invoice: InvoiceResponse;
  tenantName?: string;
}

export default function InvoicePDFDownload({ invoice, tenantName }: InvoicePDFDownloadProps) {
  return (
    <PDFDownloadLink
      document={<InvoicePDF invoice={invoice} tenantName={tenantName} />}
      fileName={`invoice-${invoice.number}.pdf`}
    >
      {({ loading }) => (
        <span
          className={[
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            loading
              ? "text-neutral-400 cursor-wait"
              : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800 cursor-pointer",
          ].join(" ")}
          title="Download PDF"
        >
          <Download className="h-3.5 w-3.5" />
          {loading ? "Generating…" : "PDF"}
        </span>
      )}
    </PDFDownloadLink>
  );
}
