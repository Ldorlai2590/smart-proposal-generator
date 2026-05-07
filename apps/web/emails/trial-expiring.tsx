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

export interface TrialExpiringEmailProps {
  userName?: string
  daysRemaining: number
  upgradeUrl: string
  proposalsUsed?: number
  proposalsQuota?: number
}

const BRAND_COLOR = '#1D9E75'
const WARNING_COLOR = '#f59e0b'
const WARNING_BG = '#fffbeb'
const WARNING_BORDER = '#fde68a'

export default function TrialExpiringEmail({
  userName,
  daysRemaining = 3,
  upgradeUrl = 'https://app.smartproposal.com/billing',
  proposalsUsed = 0,
  proposalsQuota = 5,
}: TrialExpiringEmailProps) {
  const greeting = userName ? `Hola, ${userName}` : 'Hola'
  const dayWord = daysRemaining === 1 ? 'día' : 'días'
  const urgencyText =
    daysRemaining <= 1
      ? 'Mañana expira tu período de prueba'
      : `Tu período de prueba expira en ${daysRemaining} ${dayWord}`

  return (
    <Html lang="es" dir="ltr">
      <Head />
      <Preview>
        Tu trial expira en {daysRemaining} {dayWord} — actualiza tu plan para seguir generando propuestas
      </Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          {/* Warning header */}
          <Section style={headerStyle}>
            <Text style={headerIconStyle}>⏰</Text>
            <Text style={headerTitleStyle}>{urgencyText}</Text>
          </Section>

          {/* Body */}
          <Section style={contentStyle}>
            <Text style={greetingStyle}>{greeting}</Text>
            <Text style={paragraphStyle}>
              Tu período de prueba gratuito de{' '}
              <strong>Smart Proposal Generator</strong> termina en{' '}
              <strong style={{ color: WARNING_COLOR }}>
                {daysRemaining} {dayWord}
              </strong>
              . Después de esa fecha, no podrás generar nuevas propuestas
              comerciales hasta que actualices tu plan.
            </Text>

            {/* Usage stats */}
            <Section style={statsCardStyle}>
              <Text style={statsLabelStyle}>Tu uso durante el trial</Text>
              <Text style={statsValueStyle}>
                {proposalsUsed} de {proposalsQuota} propuestas generadas
              </Text>
              {/* Progress bar */}
              <Section style={progressTrackStyle}>
                <Section
                  style={{
                    ...progressFillStyle,
                    width: `${Math.min(100, Math.round((proposalsUsed / proposalsQuota) * 100))}%`,
                  }}
                />
              </Section>
            </Section>

            {/* What you'll lose */}
            <Section style={warningBoxStyle}>
              <Text style={warningTitleStyle}>
                Sin un plan activo, perderás acceso a:
              </Text>
              <Text style={warningItemStyle}>✗ Generación de propuestas con IA</Text>
              <Text style={warningItemStyle}>✗ Exportación a PDF y DOCX</Text>
              <Text style={warningItemStyle}>✗ Seguimiento de apertura de propuestas</Text>
              <Text style={warningItemStyle}>✗ Plantillas por industria</Text>
            </Section>

            {/* What you keep */}
            <Section style={successBoxStyle}>
              <Text style={successTitleStyle}>Con el plan Pro mantienes:</Text>
              <Text style={successItemStyle}>✓ 200 propuestas por mes</Text>
              <Text style={successItemStyle}>✓ Exportación PDF, DOCX y email</Text>
              <Text style={successItemStyle}>✓ Seguimiento e inteligencia comercial</Text>
              <Text style={successItemStyle}>✓ Soporte prioritario</Text>
            </Section>

            <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
              <Button
                href={upgradeUrl}
                style={{
                  backgroundColor: BRAND_COLOR,
                  color: '#ffffff',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '700',
                  padding: '16px 40px',
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                Actualizar mi plan ahora
              </Button>
            </Section>

            <Text style={smallTextStyle}>
              O accede desde:{' '}
              <Link href={upgradeUrl} style={linkStyle}>
                {upgradeUrl}
              </Link>
            </Text>

            <Hr style={hrStyle} />

            <Text style={footerTextStyle}>
              Si tienes preguntas sobre los planes o necesitas ayuda, responde a
              este correo y nos pondremos en contacto contigo.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footerStyle}>
            <Text style={footerMutedStyle}>
              © {new Date().getFullYear()} Smart Proposal Generator · Enviado porque tienes una cuenta activa.{' '}
              <Link href="#" style={{ color: '#9ca3af' }}>
                Cancelar suscripción a emails
              </Link>
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
  backgroundColor: WARNING_COLOR,
  padding: '28px 40px',
  textAlign: 'center' as const,
}

const headerIconStyle = {
  fontSize: '32px',
  margin: '0 0 8px 0',
}

const headerTitleStyle = {
  fontSize: '20px',
  fontWeight: '700' as const,
  color: '#ffffff',
  margin: '0',
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
  margin: '0 0 20px 0',
}

const statsCardStyle = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '10px',
  padding: '20px 24px',
  margin: '0 0 20px 0',
}

const statsLabelStyle = {
  fontSize: '12px',
  fontWeight: '600' as const,
  color: '#6b7280',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 4px 0',
}

const statsValueStyle = {
  fontSize: '18px',
  fontWeight: '700' as const,
  color: '#111827',
  margin: '0 0 12px 0',
}

const progressTrackStyle = {
  backgroundColor: '#e5e7eb',
  borderRadius: '999px',
  height: '8px',
  overflow: 'hidden' as const,
}

const progressFillStyle = {
  backgroundColor: BRAND_COLOR,
  height: '8px',
  borderRadius: '999px',
}

const warningBoxStyle = {
  backgroundColor: WARNING_BG,
  border: `1px solid ${WARNING_BORDER}`,
  borderRadius: '10px',
  padding: '20px 24px',
  margin: '0 0 16px 0',
}

const warningTitleStyle = {
  fontSize: '14px',
  fontWeight: '700' as const,
  color: '#92400e',
  margin: '0 0 10px 0',
}

const warningItemStyle = {
  fontSize: '14px',
  color: '#b45309',
  margin: '0 0 4px 0',
}

const successBoxStyle = {
  backgroundColor: '#f0fdf9',
  border: '1px solid #a7f3d0',
  borderRadius: '10px',
  padding: '20px 24px',
  margin: '0 0 20px 0',
}

const successTitleStyle = {
  fontSize: '14px',
  fontWeight: '700' as const,
  color: '#064e3b',
  margin: '0 0 10px 0',
}

const successItemStyle = {
  fontSize: '14px',
  color: '#065f46',
  margin: '0 0 4px 0',
}

const smallTextStyle = {
  fontSize: '13px',
  color: '#9ca3af',
  margin: '0 0 4px 0',
  textAlign: 'center' as const,
}

const linkStyle = {
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
  lineHeight: '1.6',
}
