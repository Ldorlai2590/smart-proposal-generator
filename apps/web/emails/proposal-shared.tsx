import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

export interface ProposalSharedEmailProps {
  proposalTitle: string
  senderCompany: string
  senderName: string
  recipientName?: string
  summary?: string
  proposalUrl: string
}

const BRAND_COLOR = '#1D9E75'

export default function ProposalSharedEmail({
  proposalTitle = 'Propuesta Comercial',
  senderCompany = 'Tu empresa',
  senderName = 'El equipo',
  recipientName,
  summary,
  proposalUrl = 'https://app.smartproposal.com/p/token',
}: ProposalSharedEmailProps) {
  const greeting = recipientName ? `Hola, ${recipientName}` : 'Hola'

  return (
    <Html lang="es" dir="ltr">
      <Head />
      <Preview>
        {senderCompany} te ha enviado una propuesta: {proposalTitle}
      </Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          {/* Header */}
          <Section style={headerStyle}>
            <Text style={fromStyle}>Propuesta de {senderCompany}</Text>
          </Section>

          {/* Hero divider */}
          <Section style={heroBannerStyle} />

          {/* Body */}
          <Section style={contentStyle}>
            <Text style={greetingStyle}>{greeting}</Text>
            <Text style={paragraphStyle}>
              <strong>{senderName}</strong> de <strong>{senderCompany}</strong>{' '}
              te ha enviado una propuesta comercial para tu consideración.
            </Text>

            {/* Proposal card */}
            <Section style={cardStyle}>
              <Section style={cardAccentStyle} />
              <Section style={cardBodyStyle}>
                <Text style={cardLabelStyle}>PROPUESTA COMERCIAL</Text>
                <Text style={cardTitleStyle}>{proposalTitle}</Text>
                {summary && (
                  <Text style={cardSummaryStyle}>{summary}</Text>
                )}
              </Section>
            </Section>

            <Text style={paragraphStyle}>
              Haz clic en el botón para ver la propuesta completa, incluyendo los
              servicios, alcance, inversión y próximos pasos.
            </Text>

            <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
              <Button
                href={proposalUrl}
                style={{
                  backgroundColor: BRAND_COLOR,
                  color: '#ffffff',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '600',
                  padding: '14px 36px',
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                Ver propuesta
              </Button>
            </Section>

            <Text style={smallTextStyle}>
              O accede directamente desde este enlace:
            </Text>
            <Link href={proposalUrl} style={linkStyle}>
              {proposalUrl}
            </Link>

            <Hr style={hrStyle} />

            <Text style={paragraphStyle}>
              Si tienes alguna pregunta, responde a este correo o contacta
              directamente a <strong>{senderName}</strong> de {senderCompany}.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footerStyle}>
            <Text style={footerMutedStyle}>
              Esta propuesta fue creada con{' '}
              <Link
                href="https://smartproposal.com"
                style={{ color: BRAND_COLOR, textDecoration: 'none' }}
              >
                Smart Proposal Generator
              </Link>
              . Si no esperabas esta propuesta, puedes ignorar este correo.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const bodyStyle = {
  backgroundColor: '#f3f4f6',
  fontFamily: 'Arial, Helvetica, sans-serif',
  margin: '0',
  padding: '32px 0',
}

const containerStyle = {
  maxWidth: '600px',
  margin: '0 auto',
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  overflow: 'hidden' as const,
  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
}

const headerStyle = {
  backgroundColor: '#111827',
  padding: '24px 40px',
}

const fromStyle = {
  margin: '0',
  fontSize: '16px',
  fontWeight: '600' as const,
  color: '#ffffff',
}

const heroBannerStyle = {
  backgroundColor: BRAND_COLOR,
  height: '4px',
  lineHeight: '4px',
}

const contentStyle = {
  padding: '36px 40px',
}

const greetingStyle = {
  fontSize: '22px',
  fontWeight: '700' as const,
  color: '#111827',
  margin: '0 0 16px 0',
}

const paragraphStyle = {
  fontSize: '15px',
  lineHeight: '1.7',
  color: '#374151',
  margin: '0 0 16px 0',
}

const cardStyle = {
  border: '1px solid #e5e7eb',
  borderRadius: '10px',
  overflow: 'hidden' as const,
  margin: '24px 0',
  display: 'flex' as const,
}

const cardAccentStyle = {
  backgroundColor: BRAND_COLOR,
  width: '4px',
  minHeight: '80px',
}

const cardBodyStyle = {
  padding: '20px 24px',
  flex: '1',
}

const cardLabelStyle = {
  fontSize: '10px',
  fontWeight: '700' as const,
  color: '#9ca3af',
  letterSpacing: '1px',
  textTransform: 'uppercase' as const,
  margin: '0 0 6px 0',
}

const cardTitleStyle = {
  fontSize: '18px',
  fontWeight: '700' as const,
  color: '#111827',
  margin: '0 0 6px 0',
}

const cardSummaryStyle = {
  fontSize: '14px',
  color: '#6b7280',
  lineHeight: '1.6',
  margin: '0',
}

const smallTextStyle = {
  fontSize: '13px',
  color: '#9ca3af',
  margin: '0 0 4px 0',
}

const linkStyle = {
  fontSize: '13px',
  color: BRAND_COLOR,
  wordBreak: 'break-all' as const,
}

const hrStyle = {
  border: 'none',
  borderTop: '1px solid #e5e7eb',
  margin: '28px 0',
}

const footerStyle = {
  backgroundColor: '#f9fafb',
  padding: '20px 40px',
  borderTop: '1px solid #e5e7eb',
}

const footerMutedStyle = {
  fontSize: '12px',
  color: '#9ca3af',
  textAlign: 'center' as const,
  margin: '0',
  lineHeight: '1.6',
}
