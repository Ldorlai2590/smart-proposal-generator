"""
Unit tests for the exports module.

Coverage
--------
- POST /api/v1/exports/                      wizard export (no DB, no tenant required)
- POST /api/v1/exports/proposals/{id}/pdf    PDF via DocuForge (tenant required)
- POST /api/v1/exports/proposals/{id}/docx   DOCX via python-docx (tenant required)
- POST /api/v1/exports/proposals/{id}/email  Email via Resend (tenant required)

External services (DocuForge, Resend) are always mocked with AsyncMock.
DB is mocked via the client_no_db fixture from conftest.
"""
from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from tests.conftest import (
    TENANT_A,
    USER_ID,
    tenant_headers,
    make_fake_proposal,
)


# ---------------------------------------------------------------------------
# Helpers shared across this module
# ---------------------------------------------------------------------------

SAMPLE_SECTIONS = {
    "resumenEjecutivo": "Executive summary of the proposal.",
    "problema": "The client needs better automation.",
    "serviciosPropuestos": "We propose a custom SaaS solution.",
    "alcancePorServicio": "Includes: design, development, QA.",
    "timeline": "Q2 2026 — 3 months.",
    "inversion": "USD 15,000 one-time + USD 500/mo support.",
    "casoDeExito": "Client X reduced costs by 40%.",
    "proximosPasos": "Sign NDA, kickoff call on May 15.",
}

SAMPLE_CLIENT = {
    "id": str(uuid4()),
    "name": "María García",
    "company": "TechStartup SAS",
    "email": "maria@techstartup.co",
    "industry": "SaaS",
}


def _scalar_result(value):
    result = MagicMock()
    result.scalar_one_or_none.return_value = value
    return result


# ---------------------------------------------------------------------------
# 1. Wizard export — POST /api/v1/exports/ (no tenant, no DB)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_wizard_export_pdf_without_docuforge_returns_text(raw_client):
    """
    POST /api/v1/exports/ with format=pdf and no DOCUFORGE_API_KEY set
    should return a plain-text fallback (200, text/plain).
    """
    payload = {
        "sections": SAMPLE_SECTIONS,
        "client": SAMPLE_CLIENT,
        "format": "pdf",
    }

    # Ensure docuforge_api_key is empty (fallback path)
    with patch("app.modules.exports.pdf.settings") as mock_settings:
        mock_settings.docuforge_api_key = ""

        resp = await raw_client.post("/api/v1/exports/", json=payload)

    assert resp.status_code == 200, resp.text
    assert "text/plain" in resp.headers["content-type"]
    content = resp.content.decode("utf-8")
    assert "PROPUESTA COMERCIAL" in content
    assert "TechStartup SAS" in content


@pytest.mark.asyncio
async def test_wizard_export_pdf_calls_docuforge_when_key_configured(raw_client):
    """
    POST /api/v1/exports/ with format=pdf and DOCUFORGE_API_KEY set
    should call DocuForge and return application/pdf.
    """
    fake_pdf_bytes = b"%PDF-1.4 fake pdf content"

    payload = {
        "sections": SAMPLE_SECTIONS,
        "client": SAMPLE_CLIENT,
        "format": "pdf",
    }

    with patch("app.modules.exports.pdf.settings") as mock_settings, \
         patch("app.modules.exports.pdf.httpx.AsyncClient") as mock_httpx:

        mock_settings.docuforge_api_key = "df_test_key_12345"

        # Mock the httpx async context manager
        mock_response = MagicMock()
        mock_response.content = fake_pdf_bytes
        mock_response.raise_for_status = MagicMock()

        mock_http_instance = AsyncMock()
        mock_http_instance.post = AsyncMock(return_value=mock_response)
        mock_http_instance.__aenter__ = AsyncMock(return_value=mock_http_instance)
        mock_http_instance.__aexit__ = AsyncMock(return_value=False)
        mock_httpx.return_value = mock_http_instance

        resp = await raw_client.post("/api/v1/exports/", json=payload)

    assert resp.status_code == 200, resp.text
    assert "application/pdf" in resp.headers["content-type"]
    assert resp.content == fake_pdf_bytes

    # Verify DocuForge was called with proper headers
    mock_http_instance.post.assert_awaited_once()
    call_kwargs = mock_http_instance.post.call_args
    assert "api.getdocuforge.dev" in call_kwargs.args[0]
    assert call_kwargs.kwargs["headers"]["Authorization"] == "Bearer df_test_key_12345"


@pytest.mark.asyncio
async def test_docuforge_payload_contains_html_and_options(raw_client):
    """Verify the DocuForge request body includes 'html' key and A4 format options."""
    payload = {
        "sections": {"resumenEjecutivo": "Summary text"},
        "client": SAMPLE_CLIENT,
        "format": "pdf",
    }

    with patch("app.modules.exports.pdf.settings") as mock_settings, \
         patch("app.modules.exports.pdf.httpx.AsyncClient") as mock_httpx:

        mock_settings.docuforge_api_key = "df_test_key_12345"

        mock_response = MagicMock()
        mock_response.content = b"%PDF fake"
        mock_response.raise_for_status = MagicMock()

        mock_http_instance = AsyncMock()
        mock_http_instance.post = AsyncMock(return_value=mock_response)
        mock_http_instance.__aenter__ = AsyncMock(return_value=mock_http_instance)
        mock_http_instance.__aexit__ = AsyncMock(return_value=False)
        mock_httpx.return_value = mock_http_instance

        await raw_client.post("/api/v1/exports/", json=payload)

    posted_json = mock_http_instance.post.call_args.kwargs["json"]
    assert "html" in posted_json
    assert "options" in posted_json
    assert posted_json["options"]["format"] == "A4"


@pytest.mark.asyncio
async def test_wizard_export_docx_returns_correct_content_type(raw_client):
    """
    POST /api/v1/exports/ with format=docx should return
    application/vnd.openxmlformats-officedocument.wordprocessingml.document.
    """
    payload = {
        "sections": SAMPLE_SECTIONS,
        "client": SAMPLE_CLIENT,
        "format": "docx",
    }

    resp = await raw_client.post("/api/v1/exports/", json=payload)

    assert resp.status_code == 200, resp.text
    assert (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        in resp.headers["content-type"]
    )
    # DOCX files start with the PK zip header
    assert resp.content[:2] == b"PK"


@pytest.mark.asyncio
async def test_wizard_export_docx_filename_uses_company_name(raw_client):
    """Content-Disposition filename should incorporate the company name."""
    payload = {
        "sections": SAMPLE_SECTIONS,
        "client": {**SAMPLE_CLIENT, "company": "My Special Company"},
        "format": "docx",
    }

    resp = await raw_client.post("/api/v1/exports/", json=payload)

    assert resp.status_code == 200, resp.text
    disposition = resp.headers.get("content-disposition", "")
    assert "my-special-company" in disposition


@pytest.mark.asyncio
async def test_wizard_export_skips_empty_sections(raw_client):
    """Sections with empty strings should not appear in the generated output."""
    payload = {
        "sections": {
            "resumenEjecutivo": "Only this section has content",
            "problema": "",
            "serviciosPropuestos": "",
            "alcancePorServicio": "",
            "timeline": "",
            "inversion": "",
            "casoDeExito": "",
            "proximosPasos": "",
        },
        "client": SAMPLE_CLIENT,
        "format": "docx",
    }

    resp = await raw_client.post("/api/v1/exports/", json=payload)
    assert resp.status_code == 200, resp.text
    # We just verify it doesn't crash and returns valid DOCX
    assert resp.content[:2] == b"PK"


@pytest.mark.asyncio
async def test_wizard_export_invalid_format_returns_422(raw_client):
    """POST /api/v1/exports/ with an unknown format value returns 422."""
    payload = {
        "sections": SAMPLE_SECTIONS,
        "client": SAMPLE_CLIENT,
        "format": "xlsx",  # not a valid Literal["pdf", "docx"]
    }

    resp = await raw_client.post("/api/v1/exports/", json=payload)
    assert resp.status_code == 422, resp.text


# ---------------------------------------------------------------------------
# 2. DB-backed PDF export — tenant required
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_pdf_export_requires_tenant_header(raw_client):
    """POST /api/v1/exports/proposals/{id}/pdf without X-Tenant-ID → 401/422."""
    resp = await raw_client.post(f"/api/v1/exports/proposals/{uuid4()}/pdf")
    assert resp.status_code in (401, 422), (
        f"Expected 401/422 for missing tenant, got {resp.status_code}"
    )


@pytest.mark.asyncio
async def test_pdf_export_proposal_not_found_returns_404(client_no_db):
    """POST /api/v1/exports/proposals/{id}/pdf for unknown proposal → 404."""
    http_client, mock_db = client_no_db

    mock_db.execute.return_value = _scalar_result(None)

    resp = await http_client.post(
        f"/api/v1/exports/proposals/{uuid4()}/pdf",
        headers=tenant_headers(TENANT_A),
    )
    assert resp.status_code == 404, resp.text


@pytest.mark.asyncio
async def test_pdf_export_calls_docuforge_with_proposal_sections(client_no_db):
    """
    POST /api/v1/exports/proposals/{id}/pdf should call DocuForge
    with the proposal's sections converted to HTML.
    """
    http_client, mock_db = client_no_db

    fake_proposal = make_fake_proposal(
        tenant_id=TENANT_A,
        sections={
            "resumenEjecutivo": "Executive summary from DB",
            "problema": "Problem from DB",
        },
    )
    mock_db.execute.return_value = _scalar_result(fake_proposal)

    fake_pdf_bytes = b"%PDF-1.4 real pdf"

    with patch("app.modules.exports.pdf.settings") as mock_settings, \
         patch("app.modules.exports.pdf.httpx.AsyncClient") as mock_httpx:

        mock_settings.docuforge_api_key = "df_real_key_abcde"

        mock_response = MagicMock()
        mock_response.content = fake_pdf_bytes
        mock_response.raise_for_status = MagicMock()

        mock_http_instance = AsyncMock()
        mock_http_instance.post = AsyncMock(return_value=mock_response)
        mock_http_instance.__aenter__ = AsyncMock(return_value=mock_http_instance)
        mock_http_instance.__aexit__ = AsyncMock(return_value=False)
        mock_httpx.return_value = mock_http_instance

        resp = await http_client.post(
            f"/api/v1/exports/proposals/{fake_proposal.id}/pdf",
            headers=tenant_headers(TENANT_A),
        )

    assert resp.status_code == 200, resp.text
    assert "application/pdf" in resp.headers["content-type"]
    assert resp.content == fake_pdf_bytes

    # DocuForge must have been called
    mock_http_instance.post.assert_awaited_once()
    json_payload = mock_http_instance.post.call_args.kwargs["json"]
    assert "html" in json_payload
    # The HTML should contain some section content
    assert "Executive summary from DB" in json_payload["html"]


@pytest.mark.asyncio
async def test_pdf_export_fallback_text_when_no_docuforge_key(client_no_db):
    """
    POST /api/v1/exports/proposals/{id}/pdf without DOCUFORGE_API_KEY
    returns text/plain fallback.
    """
    http_client, mock_db = client_no_db

    fake_proposal = make_fake_proposal(tenant_id=TENANT_A)
    mock_db.execute.return_value = _scalar_result(fake_proposal)

    with patch("app.modules.exports.pdf.settings") as mock_settings:
        mock_settings.docuforge_api_key = ""

        resp = await http_client.post(
            f"/api/v1/exports/proposals/{fake_proposal.id}/pdf",
            headers=tenant_headers(TENANT_A),
        )

    assert resp.status_code == 200, resp.text
    assert "text/plain" in resp.headers["content-type"]


# ---------------------------------------------------------------------------
# 3. DB-backed DOCX export — tenant required
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_docx_export_requires_tenant_header(raw_client):
    """POST /api/v1/exports/proposals/{id}/docx without X-Tenant-ID → 401/422."""
    resp = await raw_client.post(f"/api/v1/exports/proposals/{uuid4()}/docx")
    assert resp.status_code in (401, 422), (
        f"Expected 401/422 for missing tenant, got {resp.status_code}"
    )


@pytest.mark.asyncio
async def test_docx_export_generates_valid_docx(client_no_db):
    """
    POST /api/v1/exports/proposals/{id}/docx should return a valid DOCX binary.
    DOCX is a ZIP file — its magic bytes are PK (0x50 0x4B).
    """
    http_client, mock_db = client_no_db

    fake_proposal = make_fake_proposal(
        tenant_id=TENANT_A,
        title="DOCX Test Proposal",
        context={"client_name": "Juan López", "company": "Startup SAS"},
        sections={
            "resumenEjecutivo": "Summary content",
            "problema": "Problem content",
            "inversion": "USD 5,000",
        },
    )
    mock_db.execute.return_value = _scalar_result(fake_proposal)

    resp = await http_client.post(
        f"/api/v1/exports/proposals/{fake_proposal.id}/docx",
        headers=tenant_headers(TENANT_A),
    )

    assert resp.status_code == 200, resp.text
    assert (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        in resp.headers["content-type"]
    )
    # Verify DOCX binary signature (ZIP/PK header)
    assert resp.content[:2] == b"PK", "DOCX should start with PK (ZIP) magic bytes"


@pytest.mark.asyncio
async def test_docx_export_proposal_not_found_returns_404(client_no_db):
    """POST /api/v1/exports/proposals/{id}/docx for unknown proposal → 404."""
    http_client, mock_db = client_no_db

    mock_db.execute.return_value = _scalar_result(None)

    resp = await http_client.post(
        f"/api/v1/exports/proposals/{uuid4()}/docx",
        headers=tenant_headers(TENANT_A),
    )
    assert resp.status_code == 404, resp.text


@pytest.mark.asyncio
async def test_docx_export_content_disposition_includes_proposal_id(client_no_db):
    """DOCX response Content-Disposition must include the proposal ID."""
    http_client, mock_db = client_no_db

    proposal_id = uuid4()
    fake_proposal = make_fake_proposal(tenant_id=TENANT_A, proposal_id=proposal_id)
    mock_db.execute.return_value = _scalar_result(fake_proposal)

    resp = await http_client.post(
        f"/api/v1/exports/proposals/{proposal_id}/docx",
        headers=tenant_headers(TENANT_A),
    )

    assert resp.status_code == 200, resp.text
    disposition = resp.headers.get("content-disposition", "")
    assert str(proposal_id) in disposition


# ---------------------------------------------------------------------------
# 4. Email export — tenant required
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_email_export_requires_tenant_header(raw_client):
    """POST /api/v1/exports/proposals/{id}/email without X-Tenant-ID → 401/422."""
    resp = await raw_client.post(
        f"/api/v1/exports/proposals/{uuid4()}/email",
        json={"recipient_email": "recipient@example.com"},
    )
    assert resp.status_code in (401, 422), (
        f"Expected 401/422 for missing tenant, got {resp.status_code}"
    )


@pytest.mark.asyncio
async def test_email_export_proposal_not_found_returns_404(client_no_db):
    """POST /api/v1/exports/proposals/{id}/email for unknown proposal → 404."""
    http_client, mock_db = client_no_db

    mock_db.execute.return_value = _scalar_result(None)

    resp = await http_client.post(
        f"/api/v1/exports/proposals/{uuid4()}/email",
        headers=tenant_headers(TENANT_A),
        json={"recipient_email": "test@example.com"},
    )
    assert resp.status_code == 404, resp.text


@pytest.mark.asyncio
async def test_email_export_without_resend_key_returns_503(client_no_db):
    """
    POST /api/v1/exports/proposals/{id}/email without RESEND_API_KEY
    should return 503.
    """
    http_client, mock_db = client_no_db

    fake_proposal = make_fake_proposal(tenant_id=TENANT_A)
    mock_db.execute.return_value = _scalar_result(fake_proposal)

    with patch("app.modules.exports.email.settings") as mock_settings:
        mock_settings.resend_api_key = ""

        resp = await http_client.post(
            f"/api/v1/exports/proposals/{fake_proposal.id}/email",
            headers=tenant_headers(TENANT_A),
            json={"recipient_email": "test@example.com"},
        )

    assert resp.status_code == 503, (
        f"Expected 503 when RESEND_API_KEY is not set, got {resp.status_code}"
    )


@pytest.mark.asyncio
async def test_email_export_calls_resend_api(client_no_db):
    """
    POST /api/v1/exports/proposals/{id}/email with RESEND_API_KEY configured
    should call the Resend API and return success.
    """
    http_client, mock_db = client_no_db

    fake_proposal = make_fake_proposal(
        tenant_id=TENANT_A,
        title="Email Test Proposal",
        sections={"resumenEjecutivo": "Proposal summary for email"},
    )
    mock_db.execute.return_value = _scalar_result(fake_proposal)

    resend_response = MagicMock()
    resend_response.raise_for_status = MagicMock()

    with patch("app.modules.exports.email.settings") as mock_settings, \
         patch("app.modules.exports.email.httpx.AsyncClient") as mock_httpx:

        mock_settings.resend_api_key = "re_test_key_xyz"
        mock_settings.email_from = "propuestas@smartproposal.ai"

        mock_http_instance = AsyncMock()
        mock_http_instance.post = AsyncMock(return_value=resend_response)
        mock_http_instance.__aenter__ = AsyncMock(return_value=mock_http_instance)
        mock_http_instance.__aexit__ = AsyncMock(return_value=False)
        mock_httpx.return_value = mock_http_instance

        resp = await http_client.post(
            f"/api/v1/exports/proposals/{fake_proposal.id}/email",
            headers=tenant_headers(TENANT_A),
            json={"recipient_email": "client@example.com"},
        )

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["success"] is True
    assert "client@example.com" in body["message"]

    # Verify Resend was called
    mock_http_instance.post.assert_awaited_once()
    call_args = mock_http_instance.post.call_args
    assert "api.resend.com" in call_args.args[0]
    json_body = call_args.kwargs["json"]
    assert json_body["to"] == ["client@example.com"]
    assert json_body["from"] == "propuestas@smartproposal.ai"
    assert "Email Test Proposal" in json_body["subject"]


@pytest.mark.asyncio
async def test_email_export_invalid_email_format_returns_422(client_no_db):
    """POST /api/v1/exports/proposals/{id}/email with invalid email → 422."""
    http_client, mock_db = client_no_db

    # The Pydantic EmailStr validation should reject this
    resp = await http_client.post(
        f"/api/v1/exports/proposals/{uuid4()}/email",
        headers=tenant_headers(TENANT_A),
        json={"recipient_email": "not-a-valid-email"},
    )
    assert resp.status_code == 422, resp.text


# ---------------------------------------------------------------------------
# 5. Unit tests for export helper functions (no HTTP layer)
# ---------------------------------------------------------------------------

def test_sections_to_html_includes_all_sections():
    """_sections_to_html should render each section as an h2 + p block."""
    from app.modules.exports.pdf import _sections_to_html

    sections = {
        "resumenEjecutivo": "Executive summary",
        "inversion": "USD 10,000",
    }
    html = _sections_to_html(sections, "María", "TechCo")

    assert "Resumen Ejecutivo" in html
    assert "Executive summary" in html
    assert "Inversión" in html
    assert "USD 10,000" in html
    assert "María" in html
    assert "TechCo" in html


def test_sections_to_html_skips_empty_sections():
    """_sections_to_html should not render h2 tags for empty section values."""
    from app.modules.exports.pdf import _sections_to_html

    sections = {
        "resumenEjecutivo": "Only section with content",
        "problema": "",  # empty — must be skipped
    }
    html = _sections_to_html(sections, "Client", "Company")

    assert "Only section with content" in html
    assert "El Problema" not in html


def test_sections_to_text_fallback_produces_plain_text():
    """_sections_to_text should produce UTF-8 encoded plain text."""
    from app.modules.exports.pdf import _sections_to_text

    sections = {"resumenEjecutivo": "Summary", "problema": "Problem"}
    result = _sections_to_text(sections, "Client", "Company")

    assert isinstance(result, bytes)
    text = result.decode("utf-8")
    assert "PROPUESTA COMERCIAL" in text
    assert "Summary" in text
    assert "Problem" in text


def test_generate_docx_returns_valid_zip():
    """generate_docx should return bytes starting with PK (ZIP header)."""
    from app.modules.exports.docx import generate_docx

    sections = {
        "resumenEjecutivo": "Executive summary",
        "problema": "Problem",
        "inversion": "USD 5,000",
    }
    result = generate_docx(sections, "Juan", "MiEmpresa", "Test Proposal")

    assert isinstance(result, bytes)
    assert result[:2] == b"PK", "DOCX must be a ZIP file"


def test_generate_docx_with_empty_sections_still_returns_bytes():
    """generate_docx with no sections should still return a valid DOCX."""
    from app.modules.exports.docx import generate_docx

    result = generate_docx({}, "Client", "Company", "Empty Proposal")

    assert isinstance(result, bytes)
    assert result[:2] == b"PK"


def test_build_proposal_html_includes_all_non_empty_sections():
    """build_proposal_html renders each non-empty section into the email HTML."""
    from app.modules.exports.email import build_proposal_html
    from tests.conftest import make_fake_proposal

    proposal = make_fake_proposal(
        sections={
            "resumenEjecutivo": "Summary for email",
            "problema": "Problem for email",
            "inversion": "",  # should be skipped
        }
    )
    html = build_proposal_html(proposal)

    assert "Summary for email" in html
    assert "Problem for email" in html
    assert "Inversión" not in html  # empty section must be omitted


def test_build_proposal_html_uses_brand_color():
    """The email HTML must include the brand colour #1D9E75."""
    from app.modules.exports.email import build_proposal_html
    from tests.conftest import make_fake_proposal

    proposal = make_fake_proposal()
    html = build_proposal_html(proposal)

    assert "#1D9E75" in html
