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

interface ResetPasswordProps {
  userName: string;
  resetUrl: string;
  agencyUrl: string;
}

/**
 * Email sent when a user requests a password reset.
 */
export function ResetPassword({ userName, resetUrl, agencyUrl }: ResetPasswordProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset your PortalPro password</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Text style={logoText}>PortalPro</Text>
          </Section>

          <Heading style={heading}>Reset your password</Heading>

          <Text style={paragraph}>Hi {userName},</Text>
          <Text style={paragraph}>
            We received a request to reset the password for your PortalPro account. Click the
            button below to choose a new password.
          </Text>

          <Section style={buttonSection}>
            <Button href={resetUrl} style={button}>
              Reset Password
            </Button>
          </Section>

          <Text style={hint}>
            This link expires in <strong>1 hour</strong>. If you didn&apos;t request a password
            reset, you can safely ignore this email — your password won&apos;t change.
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            If the button doesn&apos;t work, copy and paste this URL into your browser:
            <br />
            <a href={resetUrl} style={footerLink}>
              {resetUrl}
            </a>
          </Text>

          <Text style={footer}>
            &copy; {new Date().getFullYear()} PortalPro &middot;{" "}
            <a href={agencyUrl} style={footerLink}>
              Open dashboard
            </a>
          </Text>
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

const hint: React.CSSProperties = {
  fontSize: "13px",
  color: "#6b7280",
  margin: "0 0 24px",
};

const hr: React.CSSProperties = { borderColor: "#e5e7eb", margin: "24px 0" };

const footer: React.CSSProperties = {
  fontSize: "12px",
  color: "#9ca3af",
  lineHeight: "1.6",
  margin: "0 0 8px",
};

const footerLink: React.CSSProperties = {
  color: "#1B4D6E",
  textDecoration: "underline",
  wordBreak: "break-all",
};
