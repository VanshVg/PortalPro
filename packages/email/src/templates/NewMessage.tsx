import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Hr,
  Button,
} from "@react-email/components";
import * as React from "react";

interface NewMessageEmailProps {
  recipientName: string;
  senderName: string;
  projectName: string;
  messagePreview: string;
  messagesUrl: string;
  agencyUrl: string;
}

export function NewMessageEmail({
  recipientName,
  senderName,
  projectName,
  messagePreview,
  messagesUrl,
  agencyUrl,
}: NewMessageEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {senderName} sent a message in {projectName}
      </Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          {/* Header */}
          <Section style={headerStyle}>
            <Heading style={brandStyle}>PortalPro</Heading>
          </Section>

          {/* Content */}
          <Section style={contentStyle}>
            <Heading style={h1Style}>New message in {projectName}</Heading>
            <Text style={greetingStyle}>Hi {recipientName},</Text>
            <Text style={bodyTextStyle}>
              <strong>{senderName}</strong> sent a message in your project{" "}
              <strong>{projectName}</strong>:
            </Text>

            {/* Message preview */}
            <Section style={previewBoxStyle}>
              <Text style={previewTextStyle}>&ldquo;{messagePreview}&rdquo;</Text>
            </Section>

            <Button style={ctaStyle} href={messagesUrl}>
              View Messages
            </Button>

            <Hr style={hrStyle} />

            <Text style={footerTextStyle}>
              You received this notification because you have access to the {projectName} project on{" "}
              <Link href={agencyUrl} style={linkStyle}>
                PortalPro
              </Link>
              .
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const bodyStyle: React.CSSProperties = {
  backgroundColor: "#f5f5f4",
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const containerStyle: React.CSSProperties = {
  margin: "40px auto",
  maxWidth: "560px",
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  overflow: "hidden",
  border: "1px solid #e5e7eb",
};

const headerStyle: React.CSSProperties = {
  backgroundColor: "#1B4D6E",
  padding: "24px 32px",
};

const brandStyle: React.CSSProperties = {
  color: "#ffffff",
  fontSize: "20px",
  fontWeight: "700",
  margin: "0",
};

const contentStyle: React.CSSProperties = {
  padding: "32px",
};

const h1Style: React.CSSProperties = {
  color: "#1B4D6E",
  fontSize: "20px",
  fontWeight: "700",
  margin: "0 0 16px",
};

const greetingStyle: React.CSSProperties = {
  color: "#374151",
  fontSize: "15px",
  margin: "0 0 8px",
};

const bodyTextStyle: React.CSSProperties = {
  color: "#374151",
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 20px",
};

const previewBoxStyle: React.CSSProperties = {
  backgroundColor: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderLeft: "3px solid #1B4D6E",
  borderRadius: "6px",
  padding: "16px 20px",
  margin: "0 0 24px",
};

const previewTextStyle: React.CSSProperties = {
  color: "#4b5563",
  fontSize: "14px",
  fontStyle: "italic",
  lineHeight: "1.6",
  margin: "0",
};

const ctaStyle: React.CSSProperties = {
  backgroundColor: "#1B4D6E",
  borderRadius: "8px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "14px",
  fontWeight: "600",
  padding: "12px 24px",
  textDecoration: "none",
  marginBottom: "24px",
};

const hrStyle: React.CSSProperties = {
  borderColor: "#e5e7eb",
  margin: "0 0 20px",
};

const footerTextStyle: React.CSSProperties = {
  color: "#9ca3af",
  fontSize: "12px",
  lineHeight: "1.5",
};

const linkStyle: React.CSSProperties = {
  color: "#1B4D6E",
};
