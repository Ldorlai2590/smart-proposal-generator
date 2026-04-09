from pydantic import BaseModel, EmailStr


class DocxExportResponse(BaseModel):
    file_url: str
    proposal_id: str


class EmailExportRequest(BaseModel):
    recipient_email: EmailStr


class EmailExportResponse(BaseModel):
    success: bool
    message: str
