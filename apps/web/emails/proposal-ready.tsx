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

export interface ProposalReadyEmailProps {
  proposalTitle: string
  clientName: string
  proposalUrl: string
  senderName?: string
}

const BRAND_COLOR = '#1D9E75'
const BRAND_DARK = '#158a63'

export default function ProposalReadyEmail({
  proposalTitle = 'Propuesta Comercial',
  clientName = 'Cliente',
  proposalUrl = 'https://app.smartproposal.com',
  senderName = 'Smart Proposal Generator',
}: ProposalReadyEmailProps) {
  return (
    <Html lang="es" dir="ltr">
      <Head />
      <Preview>Tu propuesta "{proposalTitle}" para {clientName} está lista para revisar</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          {/* Header */}
          <Section style={{ ...headerStyle, backgroundColor: BRAND_COLOR }}>
            <Text style={logoStyle}>{senderName}</Text>
          </Section>

          {/* Body */}
          <Section style={contentStyle}>
            <Text style={headingStyle}>Tu propuesta está lista</Text>
            <Text style={paragraphStyle}>
              Hemos generado exitosamente tu propuesta comercial para{' '}
              <strong>{clientName}</strong>. Ya puedes revisarla, editarla y
              enviarla cuando estés listo.
            </Text>

            {/* Proposal card */}
            <Section style={cardStyle}>
              <Text style={cardLabelStyle}>PROPUESTA</Text>
              <Text style={cardTitleStyle}>{proposalTitle}</Text>
              <Text style={cardMetaStyle}>Para: {clientName}</Text>
            </Section>

            <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
              <Button
                href={proposalUrl}
                style={{
                  backgroundColor: BRAND_COLOR,
                  color: '#ffffff',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '600',
                  padding: '14px 32px',
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                Ver propuesta
              </Button>
            </Section>

            <Text style={paragraphStyle}>
              O copia y pega este enlace en tu navegador:
            </Text>
            <Link href={proposalUrl} style={linkStyle}>
              {proposalUrl}
            </Link>

            <Hr style={hrStyle} />

            <Text style={footerTextStyle}>
              Este correo fue enviado desde{' '}
              <strong style={{ color: BRAND_DARK }}>Smart Proposal Generator</strong>.
              Si no esperabas este mensaje, puedes ignorarlo.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footerStyle}>
            <Text style={footerMutedStyle}>
              © {new Date().getFullYear()} Smart Proposal Generator · Todos los derechos reservados
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
  padding: '28px 40px',
}

const logoStyle = {
  margin: '0',
  fontSize: '18px',
  fontWeight: '700' as const,
  color: '#ffffff',
  letterSpacing: '-0.3px',
}

const contentStyle = {
  padding: '36px 40px',
}

const headingStyle = {
  fontSize: '24px',
  fontWeight: '700' as const,
  color: '#111827',
  margin: '0 0 16px 0',
  letterSpacing: '-0.5px',
}

const paragraphStyle = {
  fontSize: '15px',
  lineHeight: '1.7',
  color: '#374151',
  margin: '0 0 16px 0',
}

const cardStyle = {
  backgroundColor: '#f0fdf9',
  border: '1px solid #a7f3d0',
  borderRadius: '10px',
  padding: '20px 24px',
  margin: '24px 0',
}

const cardLabelStyle = {
  fontSize: '10px',
  fontWeight: '700' as const,
  color: '#059669',
  letterSpacing: '1px',
  textTransform: 'uppercase' as const,
  margin: '0 0 6px 0',
}

const cardTitleStyle = {
  fontSize: '17px',
  fontWeight: '700' as const,
  color: '#111827',
  margin: '0 0 4px 0',
}

const cardMetaStyle = {
  fontSize: '13px',
  color: '#6b7280',
  margin: '0',
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

const footerTextStyle = {
  fontSize: '13px',
  color: '#6b7280',
  lineHeight: '1.6',
  margin: '0',
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
}
