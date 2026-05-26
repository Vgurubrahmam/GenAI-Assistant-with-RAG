"""
Metadata extraction service using Groq LLM.
Extracts title, summary, keywords from document text.
"""
from app.openai_client import get_groq_client
from app.schemas.metadata_schema import MetadataSchema
from app.prompts.loader import load_prompt
from app.utils.logger import get_logger
from app.config import settings
import json

groq_client = get_groq_client()
logger = get_logger(__name__)

async def extract_metadata(text: str) -> dict:
    """Extract metadata from document text and validate using Pydantic schema. Uses Groq for generation."""
    prompt = load_prompt("metadata_prompt.json")
    
    # Truncate text to first 2000 characters to avoid context window limits
    truncated_text = text[:2000]

    response = groq_client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=[
            {"role": "system", "content": prompt["system"]},
            {"role": "user", "content": prompt["user"] + f"\n\nDocument excerpt:\n{truncated_text}"}
        ],
        temperature=prompt.get("temperature", 0.2),
        max_tokens=prompt.get("max_tokens", 300)
    )
    
    # Extract text from response
    metadata_text = response.choices[0].message.content if response.choices else ""
    
    if not metadata_text:
        logger.warning("[METADATA] No metadata extracted from response")
        # Return default valid metadata
        return MetadataSchema().model_dump()
    
    try:
        # Parse JSON from response
        metadata_dict = json.loads(metadata_text)
        logger.info(f"[METADATA] Raw parsed dict: {metadata_dict}")
        
        # Validate using Pydantic schema
        validated_metadata = MetadataSchema(**metadata_dict)
        result = validated_metadata.model_dump()
        
        logger.info(f"[METADATA] Validated metadata: {result}")
        return result
        
    except json.JSONDecodeError as e:
        logger.error(f"[METADATA] Failed to parse JSON: {str(e)}")
        return MetadataSchema().model_dump()
    except Exception as e:
        logger.error(f"[METADATA] Validation error: {str(e)}")
        # Return default if validation fails
        return MetadataSchema().model_dump()