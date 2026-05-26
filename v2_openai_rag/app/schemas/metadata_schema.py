from pydantic import BaseModel, Field
from typing import List, Optional

class MetadataSchema(BaseModel):
    """Structured metadata schema for document validation"""
    title: str = Field(default="", description="Document title")
    domain: str = Field(default="", description="Document domain or type")
    summary: str = Field(default="", description="Brief document summary")
    keywords: List[str] = Field(default_factory=list, description="Document keywords")

    class Config:
        json_schema_extra = {
            "example": {
                "title": "Generative AI in Research",
                "domain": "Academic Research",
                "summary": "Survey on researchers' use of GenAI",
                "keywords": ["GenAI", "research", "AI"]
            }
        }
