import httpx
from app.core.config import settings

SECTION_LABELS: dict[str, str] = {
    "resumenEjecutivo": "Resumen Ejecutivo",
    "problema": "El Problema",
    "solucion": "Nuestra Solución",
    "alcance": "Alcance del Proyecto",
    "timeline": "Cronograma",
    "inversion": "Inversión",
    "proximosPasos": "Próximos Pasos",
}
SECTION_ORDER = ["resumenEjecutivo", "problema", "solucion", "alcance", "timeline", "inversion", "proximosPasos"]


def _sections_to_html(sections: dict[str, str], client_name: str, company: str) -> str:
    """Render sections dict into a minimal HTML string for DocuForge."""
    lines = [
        "<!DOCTYPE html><html><head>",
        "<meta charset='utf-8'>",
        "<style>",
        "body{font-family:Arial,sans-serif;font-size:12pt;line-height:1.6;color:#1a1a1a;padding:0 20px}",
        "h1{font-size:22pt;color:#1D9E75;margin-bottom:4px}",
        ".subtitle{color:#555;margin-bottom:30px}",
        "h2{font-size:14pt;color:#1D9E75;border-bottom:1px solid #e0e0e0;padding-bottom:4px;margin-top:28px}",
        "p{margin-top:6px;white-space:pre-wrap}",
        "</style></head><body>",
        f"<h1>Propuesta Comercial</h1>",
        f"<p class='subtitle'>Preparada para <strong>{client_name}</strong> — {company}</p>",
    ]
    for key in SECTION_ORDER:
        content = sections.get(key, "")
        if content:
            label = SECTION_LABELS.get(key, key)
            lines.append(f"<h2>{label}</h2><p>{content}</p>")
    lines.append("</body></html>")
    return "\n".join(lines)


def _sections_to_text(sections: dict[str, str], client_name: str, company: str) -> bytes:
    """Plain-text fallback when DocuForge is not configured."""
    lines = [
        "PROPUESTA COMERCIAL",
        f"Preparada para: {client_name} — {company}",
        "=" * 60,
        "",
    ]
    for key in SECTION_ORDER:
        content = sections.get(key, "")
        if content:
            label = SECTION_LABELS.get(key, key)
            lines.append(label.upper())
            lines.append("-" * len(label))
            lines.append(content)
            lines.append("")
    return "\n".join(lines).encode("utf-8")


async def generate_pdf(html_content: str, filename: str = "proposal.pdf") -> bytes:
    """Genera PDF usando DocuForge SDK (NO WeasyPrint)."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.getdocuforge.dev/v1/pdf",
            headers={
                "Authorization": f"Bearer {settings.docuforge_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "html": html_content,
                "options": {
                    "format": "A4",
                    "margin": {"top": "20mm", "bottom": "20mm", "left": "15mm", "right": "15mm"},
                },
            },
            timeout=30.0,
        )
        response.raise_for_status()
        return response.content


async def generate_pdf_from_sections(
    sections: dict[str, str],
    client_name: str,
    company: str,
) -> tuple[bytes, str]:
    """
    Build a PDF from sections dict.

    Returns (file_bytes, media_type).
    - If DOCUFORGE_API_KEY is set → calls DocuForge, returns application/pdf.
    - Otherwise → returns plain-text fallback with media_type text/plain.
    """
    if settings.docuforge_api_key:
        html = _sections_to_html(sections, client_name, company)
        pdf_bytes = await generate_pdf(html)
        return pdf_bytes, "application/pdf"
    else:
        text_bytes = _sections_to_text(sections, client_name, company)
        return text_bytes, "text/plain; charset=utf-8"
