import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #ffffff 0%, #e6f7f2 50%, #ffffff 100%)',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
        }}
      >
        {/* Background pattern */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.04,
            backgroundImage: 'radial-gradient(#1D9E75 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* Logo + brand */}
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              background: '#1D9E75',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              color: 'white',
              fontWeight: 'bold',
            }}
          >
            ⚡
          </div>
          <span style={{ fontSize: '32px', fontWeight: '800', color: '#111827' }}>
            Smart<span style={{ color: '#1D9E75' }}>SPG</span>
          </span>
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: '56px',
            fontWeight: '800',
            color: '#111827',
            textAlign: 'center',
            lineHeight: 1.1,
            maxWidth: '900px',
            margin: '0 0 20px 0',
          }}
        >
          Propuestas comerciales con IA
          <br />
          <span style={{ color: '#1D9E75' }}>en minutos, no en días</span>
        </h1>

        {/* Subheadline */}
        <p
          style={{
            fontSize: '24px',
            color: '#6b7280',
            textAlign: 'center',
            maxWidth: '700px',
            margin: '0 0 40px 0',
            lineHeight: 1.4,
          }}
        >
          Para agencias y consultoras en Chile, México y Colombia
        </p>

        {/* Badges */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: '16px' }}>
          {['30 días gratis', 'Sin tarjeta', 'PDF + Word al instante'].map((text) => (
            <div
              key={text}
              style={{
                background: '#f0fdf8',
                border: '1.5px solid #1D9E75',
                borderRadius: '100px',
                padding: '8px 20px',
                fontSize: '18px',
                color: '#1D9E75',
                fontWeight: '600',
              }}
            >
              ✓ {text}
            </div>
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
