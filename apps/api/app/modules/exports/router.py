from uuid import UUID
from typing import Literal
from fastapi import APIRouter, Depends
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.shared.tenant import require_tenant
from app.modules.proposals.handlers import handle_get_proposal
from app.modules.proposals.queries import GetProposalQuery
from app.modules.exports.pdf import generate_pdf, generate_pdf_from_sections
from app.modules.exports.docx import generate_docx

router = APIRouter(prefix="/exports", tags=["exports"])


# ---------------------------------------------------------------------------
# Schema for the wizard-driven export (no proposal_id required)
# ---------------------------------------------------------------------------

class SectionsPayload(BaseModel):
    resumenEjecutivo: str = ""
    problema: str = ""
    solucion: str = ""
    alcance: str = ""
    timeline: str = ""
    inversion: str = ""
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
# Legacy endpoints that look up a saved proposal from the DB
# ---------------------------------------------------------------------------

@router.post("/proposals/{proposal_id}/pdf")
async def export_pdf(
    proposal_id: UUID,
    tenant_id: str = Depends(require_tenant),
    db: AsyncSession = Depends(get_db),
):
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


@router.post("/proposals/{proposal_id}/docx")
async def export_docx(
    proposal_id: UUID,
    tenant_id: str = Depends(require_tenant),
    db: AsyncSession = Depends(get_db),
):
    proposal = await handle_get_proposal(
        GetProposalQuery(tenant_id=tenant_id, proposal_id=proposal_id), db
    )
    sections = proposal.sections if isinstance(proposal.sections, dict) else {}
    docx_bytes = generate_docx(sections, "", proposal.title or "")
    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename=propuesta-{proposal_id}.docx"},
    )
