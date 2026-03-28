import httpx
from app.core.config import settings


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
