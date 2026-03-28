from io import BytesIO
from docx import Document
from docx.shared import Pt, RGBColor


def generate_docx(sections: dict, client_name: str, company: str) -> bytes:
    """Genera DOCX usando python-docx."""
    doc = Document()

    # Titulo
    title = doc.add_heading(f"Propuesta Comercial — {company}", 0)

    section_titles = {
        "resumenEjecutivo": "Resumen Ejecutivo",
        "problema": "El Problema",
        "solucion": "Nuestra Solucion",
        "alcance": "Alcance del Proyecto",
        "timeline": "Cronograma",
        "inversion": "Inversion",
        "proximosPasos": "Proximos Pasos",
    }

    for key, heading in section_titles.items():
        if content := sections.get(key):
            doc.add_heading(heading, level=1)
            doc.add_paragraph(content)

    buffer = BytesIO()
    doc.save(buffer)
    return buffer.getvalue()
