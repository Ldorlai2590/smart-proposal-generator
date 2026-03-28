from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.shared.tenant import require_tenant
from app.modules.proposals.handlers import handle_get_proposal
from app.modules.proposals.queries import GetProposalQuery
from app.modules.exports.pdf import generate_pdf
from app.modules.exports.docx import generate_docx

router = APIRouter(prefix="/exports", tags=["exports"])


@router.post("/proposals/{proposal_id}/pdf")
async def export_pdf(
    proposal_id: UUID,
    tenant_id: str = Depends(require_tenant),
    db: AsyncSession = Depends(get_db),
):
    proposal = await handle_get_proposal(
        GetProposalQuery(tenant_id=tenant_id, proposal_id=proposal_id), db
    )
    # TODO: renderizar HTML desde secciones antes de pasar a DocuForge
    html = f"<h1>{proposal.title or 'Propuesta'}</h1>"
    for key, content in proposal.sections.items():
        html += f"<h2>{key}</h2><p>{content}</p>"

    pdf_bytes = await generate_pdf(html)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=propuesta-{proposal_id}.pdf"},
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
    docx_bytes = generate_docx(proposal.sections, "", "")
    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename=propuesta-{proposal_id}.docx"},
    )
