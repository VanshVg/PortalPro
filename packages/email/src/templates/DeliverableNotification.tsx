import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface DeliverableSubmittedProps {
  deliverableTitle: string;
  projectName: string;
  reviewUrl: string;
}

/**
 * Sent to the client when an agency submits a deliverable for review.
 */
export function DeliverableSubmitted({
  deliverableTitle,
  projectName,
  reviewUrl,
}: DeliverableSubmittedProps) {
  return (
    <Html>
      <Head />
      <Preview>New deliverable ready for your review: {deliverableTitle}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Text style={logoText}>PortalPro</Text>
          </Section>

          <Heading style={heading}>Deliverable ready for review</Heading>

          <Text style={paragraph}>
            A new deliverable has been submitted for your review on <strong>{projectName}</strong>.
          </Text>

          <Section style={card}>
            <Text style={cardTitle}>{deliverableTitle}</Text>
            <Text style={cardSubtitle}>Awaiting your approval</Text>
          </Section>

          <Section style={buttonSection}>
            <Button href={reviewUrl} style={button}>
              Review Deliverable
            </Button>
          </Section>

          <Text style={hint}>
            You can approve the deliverable or request changes directly in your portal.
          </Text>

          <Hr style={hr} />
          <Text style={footer}>&copy; {new Date().getFullYear()} PortalPro</Text>
        </Container>
      </Body>
    </Html>
  );
}

interface DeliverableReviewedProps {
  deliverableTitle: string;
  projectName: string;
  decision: "approved" | "revision_requested";
  feedback?: string;
  deliverableUrl: string;
}

/**
 * Sent to the agency when a client approves or requests a revision.
 */
export function DeliverableReviewed({
  deliverableTitle,
  projectName,
  decision,
  feedback,
  deliverableUrl,
}: DeliverableReviewedProps) {
  const isApproved = decision === "approved";

  return (
    <Html>
      <Head />
      <Preview>
        {isApproved
          ? `${deliverableTitle} has been approved`
          : `Revision requested on ${deliverableTitle}`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Text style={logoText}>PortalPro</Text>
          </Section>

          <Heading style={heading}>
            {isApproved ? "Deliverable approved" : "Revision requested"}
          </Heading>

          <Text style={paragraph}>
            The client has reviewed <strong>{deliverableTitle}</strong> on{" "}
            <strong>{projectName}</strong>.
          </Text>

          <Section style={isApproved ? approvedBadge : revisionBadge}>
            <Text style={badgeText}>
              {isApproved ? "✓ Approved" : "↩ Revision Requested"}
            </Text>
          </Section>

          {feedback && (
            <Section style={feedbackBox}>
              <Text style={feedbackLabel}>Client feedback:</Text>
              <Text style={feedbackText}>{feedback}</Text>
            </Section>
          )}

          <Section style={buttonSection}>
            <Button href={deliverableUrl} style={button}>
              View Deliverable
            </Button>
          </Section>

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

const card: React.CSSProperties = {
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
  padding: "16px 20px",
  margin: "0 0 24px",
  border: "1px solid #e5e7eb",
};

const cardTitle: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#111827",
  margin: "0 0 4px",
};

const cardSubtitle: React.CSSProperties = {
  fontSize: "13px",
  color: "#6b7280",
  margin: "0",
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

const approvedBadge: React.CSSProperties = {
  backgroundColor: "#dcfce7",
  borderRadius: "8px",
  padding: "12px 16px",
  margin: "0 0 24px",
};

const revisionBadge: React.CSSProperties = {
  backgroundColor: "#fef9c3",
  borderRadius: "8px",
  padding: "12px 16px",
  margin: "0 0 24px",
};

const badgeText: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#374151",
  margin: "0",
};

const feedbackBox: React.CSSProperties = {
  backgroundColor: "#fff7ed",
  borderRadius: "8px",
  padding: "16px 20px",
  margin: "0 0 24px",
  borderLeft: "4px solid #f59e0b",
};

const feedbackLabel: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: "600",
  color: "#92400e",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  margin: "0 0 8px",
};

const feedbackText: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "1.6",
  color: "#374151",
  margin: "0",
};

const hint: React.CSSProperties = {
  fontSize: "13px",
  color: "#6b7280",
  margin: "0 0 24px",
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
