from uuid import UUID
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.shared.tenant import require_tenant
from app.modules.proposals.handlers import handle_get_proposal
from app.modules.proposals.queries import GetProposalQuery
from app.modules.exports.pdf import generate_pdf_from_sections
from app.modules.exports.docx import generate_docx
from app.modules.exports.email import send_proposal_email
from app.modules.exports.schemas import (
    DocxExportResponse,
    EmailExportRequest,
    EmailExportResponse,
)

router = APIRouter(prefix="/exports", tags=["exports"])


# ---------------------------------------------------------------------------
# Schema for the wizard-driven export (no proposal_id required)
# ---------------------------------------------------------------------------

class SectionsPayload(BaseModel):
    resumenEjecutivo: str = ""
    problema: str = ""
    serviciosPropuestos: str = ""
    alcancePorServicio: str = ""
    timeline: str = ""
    inversion: str = ""
    casoDeExito: str = ""
    proximosPasos: str = ""


class ClientPayload(BaseModel):
    id: str = ""
    name: str
    company: str
    email: str = ""
    industry: str = ""


class ExportRequest(BaseModel):
    sections: SectionsPayload
    client: ClientPayload
    format: Literal["pdf", "docx"]


# ---------------------------------------------------------------------------
# POST /exports/  — called by the Next.js route handler
# ---------------------------------------------------------------------------

@router.post("/")
async def export_proposal(body: ExportRequest) -> Response:
    """
    Generate a PDF or DOCX from raw wizard sections + client metadata.
    No DB lookup required — data arrives directly from the browser via Next.js.
    """
    sections_dict = body.sections.model_dump(exclude_none=True)
    # Remove empty strings so the generators skip blank sections
    sections_dict = {k: v for k, v in sections_dict.items() if v}

    client_name = body.client.name
    company = body.client.company
    safe_name = company.lower().replace(" ", "-") or "propuesta"

    if body.format == "pdf":
        file_bytes, media_type = await generate_pdf_from_sections(sections_dict, client_name, company)
        ext = "txt" if media_type.startswith("text/plain") else "pdf"
        return Response(
            content=file_bytes,
            media_type=media_type,
            headers={"Content-Disposition": f'attachment; filename="propuesta-{safe_name}.{ext}"'},
        )

    # DOCX
    docx_bytes = generate_docx(sections_dict, client_name, company)
    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="propuesta-{safe_name}.docx"'},
    )


# ---------------------------------------------------------------------------
# DB-backed endpoints — look up a saved proposal by proposal_id + tenant_id
# ---------------------------------------------------------------------------

@router.post("/proposals/{proposal_id}/pdf")
async def export_pdf(
    proposal_id: UUID,
    tenant_id: str = Depends(require_tenant),
    db: AsyncSession = Depends(get_db),
) -> Response:
    proposal = await handle_get_proposal(
        GetProposalQuery(tenant_id=tenant_id, proposal_id=proposal_id), db
    )
    sections = proposal.sections if isinstance(proposal.sections, dict) else {}
    file_bytes, media_type = await generate_pdf_from_sections(
        sections, "", proposal.title or str(proposal_id)
    )
    ext = "txt" if media_type.startswith("text/plain") else "pdf"
    return Response(
        content=file_bytes,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename=propuesta-{proposal_id}.{ext}"},
    )


@router.post("/proposals/{proposal_id}/docx", response_model=DocxExportResponse)
async def export_docx(
    proposal_id: UUID,
    tenant_id: str = Depends(require_tenant),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """
    Generate a DOCX for a saved proposal.

    - Tenant-scoped: only returns the proposal if tenant_id matches.
    - Cover page: title + client name (from context) + today's date.
    - Headings coloured with brand green #1D9E75.
    - Returns the file as a direct download (Content-Disposition: attachment).
    """
    proposal = await handle_get_proposal(
        GetProposalQuery(tenant_id=tenant_id, proposal_id=proposal_id), db
    )

    sections = proposal.sections if isinstance(proposal.sections, dict) else {}

    # Best-effort client name from the proposal context
    context: dict = proposal.context if isinstance(proposal.context, dict) else {}
    client_name: str = context.get("client_name", "") or context.get("clientName", "")
    company: str = context.get("company", "") or context.get("client_company", "")

    docx_bytes = generate_docx(
        sections=sections,
        client_name=client_name,
        company=company,
        title=proposal.title or "",
    )
    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename=propuesta-{proposal_id}.docx"},
    )


@router.post("/proposals/{proposal_id}/email", response_model=EmailExportResponse)
async def export_email(
    proposal_id: UUID,
    body: EmailExportRequest,
    tenant_id: str = Depends(require_tenant),
    db: AsyncSession = Depends(get_db),
) -> EmailExportResponse:
    """
    Send a proposal by email via Resend.

    - Tenant-scoped: only sends if tenant_id matches.
    - Builds an HTML email with all non-empty sections.
    - Uses settings.RESEND_API_KEY and settings.EMAIL_FROM from .env.
    """
    proposal = await handle_get_proposal(
        GetProposalQuery(tenant_id=tenant_id, proposal_id=proposal_id), db
    )

    try:
        await send_proposal_email(proposal, str(body.recipient_email))
    except RuntimeError as exc:
        # RESEND_API_KEY not configured
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return EmailExportResponse(
        success=True,
        message=f"Propuesta enviada correctamente a {body.recipient_email}",
    )
