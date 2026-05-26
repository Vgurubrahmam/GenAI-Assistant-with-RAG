"""
File utilities for saving uploads and reading text from files.
Supports PDF and plain text files.
"""
import os

UPLOAD_DIR = "data/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


async def save_file(file):
    """Save an uploaded file to disk and return the path."""
    path = os.path.join(UPLOAD_DIR, file.filename)
    with open(path, "wb") as f:
        f.write(await file.read())
    return path


def read_file(path: str) -> str:
    """
    Read text content from a file.
    Supports PDF (.pdf) and plain text files.
    """
    ext = os.path.splitext(path)[1].lower()

    if ext == ".pdf":
        return _read_pdf(path)
    else:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()


def _read_pdf(path: str) -> str:
    """Extract text from a PDF file using PyPDF2."""
    try:
        from PyPDF2 import PdfReader
        reader = PdfReader(path)
        text_parts = []
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
        return "\n\n".join(text_parts)
    except Exception as e:
        raise Exception(f"Failed to read PDF file: {str(e)}")