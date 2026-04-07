from io import BytesIO
from docx import Document

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


def generate_docx(sections: dict[str, str], client_name: str, company: str) -> bytes:
    """Genera DOCX usando python-docx."""
    doc = Document()

    doc.add_heading(f"Propuesta Comercial — {company}", 0)
    subtitle = doc.add_paragraph(f"Preparada para: {client_name}")
    subtitle.runs[0].italic = True

    for key in SECTION_ORDER:
        content = sections.get(key, "")
        if content:
            heading = SECTION_LABELS[key]
            doc.add_heading(heading, level=1)
            doc.add_paragraph(content)

    buffer = BytesIO()
    doc.save(buffer)
    return buffer.getvalue()
