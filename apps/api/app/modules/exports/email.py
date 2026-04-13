"""
Email export — sends a proposal via Resend using httpx.

Uses httpx directly (per project rules) instead of the resend SDK,
even though resend>=2.0.0 is installed, because the SDK is sync-only
and the project is fully async.
"""

import httpx
from app.core.config import settings
from app.modules.proposals.models import Proposal

SECTION_LABELS: dict[str, str] = {
    "resumenEjecutivo": "Resumen Ejecutivo",
    "problema": "El Problema",
    "serviciosPropuestos": "Servicios Propuestos",
    "alcancePorServicio": "Alcance por Servicio",
    "timeline": "Cronograma",
    "inversion": "Inversión",
    "casoDeExito": "Caso de Éxito",
    "proximosPasos": "Próximos Pasos",
}
SECTION_ORDER = [
    "resumenEjecutivo",
    "problema",
    "serviciosPropuestos",
    "alcancePorServicio",
    "timeline",
    "inversion",
    "casoDeExito",
    "proximosPasos",
]

# Brand colour
BRAND_HEX = "#1D9E75"


def build_proposal_html(proposal: Proposal) -> str:
    """
    Render the proposal sections into a self-contained HTML email.
    Inline styles are intentional — email clients strip <style> blocks.
    """
    sections: dict[str, str] = (
        proposal.sections if isinstance(proposal.sections, dict) else {}
    )
    title = proposal.title or "Propuesta Comercial"

    rows: list[str] = []
    for key in SECTION_ORDER:
        content = sections.get(key, "")
        if not content:
            continue
        label = SECTION_LABELS.get(key, key)
        rows.append(
            f"""
            <tr>
              <td style="padding: 0 0 24px 0;">
                <h2 style="
                  margin: 0 0 8px 0;
                  font-size: 16px;
                  font-weight: 700;
                  color: {BRAND_HEX};
                  border-bottom: 1px solid #e5e7eb;
                  padding-bottom: 6px;
                ">{label}</h2>
                <p style="
                  margin: 0;
                  font-size: 14px;
                  line-height: 1.7;
                  color: #374151;
                  white-space: pre-wrap;
                ">{content}</p>
              </td>
            </tr>
            """
        )

    sections_html = "".join(rows)

    return f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,Helvetica,sans-serif;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 0;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:8px;overflow:hidden;
                      box-shadow:0 1px 3px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:{BRAND_HEX};padding:32px 40px;">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">
                {title}
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                {sections_html}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f3f4f6;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#6b7280;">
                Generado por <strong>Smart Proposal Generator</strong> &mdash;
                Este correo fue enviado automáticamente. Por favor no responda directamente.
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>

</body>
</html>"""


async def send_proposal_email(
    proposal: Proposal,
    recipient_email: str,
) -> None:
    """
    Sends the proposal as an HTML email via Resend.

    Raises httpx.HTTPStatusError on a non-2xx response from Resend.
    Raises RuntimeError when RESEND_API_KEY is not configured.
    """
    if not settings.resend_api_key:
        raise RuntimeError(
            "RESEND_API_KEY is not configured. "
            "Set it in apps/api/.env to enable email export."
        )

    subject = f"Propuesta: {proposal.title or 'Propuesta Comercial'}"
    html_body = build_proposal_html(proposal)

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {settings.resend_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "from": settings.email_from,
                "to": [recipient_email],
                "subject": subject,
                "html": html_body,
            },
        )
        response.raise_for_status()
