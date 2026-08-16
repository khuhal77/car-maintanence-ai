"""
FastAPI Routes for Car Part Diagnosis
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
import base64
import json
import logging
import os
from typing import Any, Dict, Optional

import requests

from models.car_parts import detect_car_part, get_part_price_range

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/diagnose", tags=["diagnosis"])


class DiagnoseRequest(BaseModel):
    image_base64: str


class DiagnoseResponse(BaseModel):
    diagnosis: dict
    parts: list
    avg_price: int
    part_type: str


class ChatRequest(BaseModel):
    message: str
    diagnosis: Optional[Dict[str, Any]] = None


class ChatResponse(BaseModel):
    reply: str
    provider: str


def _fallback_vehicle_reply(message: str, diagnosis: Optional[Dict[str, Any]] = None) -> str:
    """Generate a useful diagnostic response when no external LLM is configured."""
    diagnosis = diagnosis or {}
    issue = diagnosis.get('issue') or 'a vehicle issue'
    recommendation = diagnosis.get('recommendation') or 'Please consult a certified mechanic for confirmation.'
    severity = diagnosis.get('severity') or 'low'
    parts = diagnosis.get('parts') or []
    avg_price = diagnosis.get('avg_price') or 0
    normalized = (message or '').lower()

    if any(word in normalized for word in ['issue', 'problem', 'fault', 'wrong', 'what']):
        return (
            f"The detected issue is: {issue}. "
            f"Severity is {severity}. The recommended action is: {recommendation}"
        )

    if any(word in normalized for word in ['fix', 'repair', 'solution', 'solve', 'recommend', 'next step', 'how']):
        part_text = f" Recommended replacement parts: {', '.join(parts)}." if parts else ''
        return f"{recommendation}{part_text}"

    if any(word in normalized for word in ['cost', 'price', 'budget', 'estimate', 'money']):
        if avg_price > 0:
            return f"The estimated cost for this repair is around ₹{avg_price:,}. Always confirm with a mechanic before purchase."
        return "The exact cost estimate is not available from this scan alone. A workshop inspection will give a more accurate quote."

    if any(word in normalized for word in ['urgent', 'risk', 'danger', 'severity']):
        if severity == 'high':
            return "This is a high-risk issue and should be addressed promptly to avoid safety problems or further damage."
        if severity == 'medium':
            return "This is a medium-priority issue. It should be repaired soon before it worsens."
        return "This is a low-priority issue, but it is still best to fix it before it turns into a larger problem."

    return (
        f"I reviewed the vehicle condition. The main issue is: {issue}. "
        f"Suggested solution: {recommendation}"
    )


def _call_llm_service(message: str, diagnosis: Optional[Dict[str, Any]]) -> Optional[str]:
    """Use OpenAI or Gemini-compatible APIs when keys are configured; otherwise return None."""
    diagnosis = diagnosis or {}
    issue = diagnosis.get('issue') or 'vehicle issue'
    recommendation = diagnosis.get('recommendation') or 'check with a mechanic'
    severity = diagnosis.get('severity') or 'medium'
    parts = diagnosis.get('parts') or []
    avg_price = diagnosis.get('avg_price') or 0

    llm_api_key = os.getenv("OPENAI_API_KEY") or os.getenv("GEMINI_API_KEY")
    if not llm_api_key:
        return None

    if os.getenv("OPENAI_API_KEY"):
        url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1") + "/chat/completions"
        payload = {
            "model": os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a professional car repair assistant. Answer in plain, helpful language. "
                        "Use the issue, recommendation, severity, parts, and price context provided by the user. "
                        "Do not claim certainty beyond the diagnosis."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Vehicle issue summary: {issue}. Severity: {severity}. "
                        f"Recommended fix: {recommendation}. Replacement parts: {', '.join(parts) if parts else 'not provided'}. "
                        f"Estimated price: ₹{avg_price if avg_price else 'not available'}. "
                        f"User asks: {message}"
                    ),
                },
            ],
            "temperature": 0.4,
        }
        headers = {
            "Authorization": f"Bearer {llm_api_key}",
            "Content-Type": "application/json",
        }
        try:
            response = requests.post(url, headers=headers, data=json.dumps(payload), timeout=30)
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"].strip()
        except Exception as exc:
            logger.warning(f"OpenAI chat fallback failed: {exc}")
            return None

    if os.getenv("GEMINI_API_KEY"):
        model_name = os.getenv("GEMINI_MODEL") or "gemini-3.5-flash"
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model_name}:generateContent?key={llm_api_key}"
        )
        payload = {
            "contents": [{
                "parts": [{
                    "text": (
                        f"Vehicle issue summary: {issue}. Severity: {severity}. "
                        f"Recommended fix: {recommendation}. Replacement parts: {', '.join(parts) if parts else 'not provided'}. "
                        f"Estimated price: ₹{avg_price if avg_price else 'not available'}. "
                        f"User asks: {message}"
                    )
                }]
            }]
        }
        try:
            response = requests.post(url, json=payload, timeout=30)
            response.raise_for_status()
            data = response.json()
            return data["candidates"][0]["content"]["parts"][0]["text"].strip()
        except Exception as exc:
            logger.warning(f"Gemini chat fallback failed: {exc}")
            return None

    return None


@router.post("", response_model=DiagnoseResponse)
async def diagnose(request: DiagnoseRequest):
    """
    Diagnose car part from base64 encoded image.

    Request:
        { "image_base64": "..." }

    Response:
        {
          "diagnosis": {...},
          "parts": [...],
          "avg_price": 3500,
          "part_type": "battery"
        }
    """
    try:
        if not request.image_base64:
            raise HTTPException(status_code=400, detail="No image provided")

        image_base64 = request.image_base64
        if ',' in image_base64:
            image_base64 = image_base64.split(',')[1]

        diagnosis = detect_car_part(image_base64)
        part_type = diagnosis.get('type', 'unknown')
        avg_price = get_part_price_range(part_type)
        parts = diagnosis.get('parts', [])

        logger.info(f"Diagnosis result: {part_type}, price: ₹{avg_price}")

        return DiagnoseResponse(
            diagnosis=diagnosis,
            parts=parts,
            avg_price=avg_price,
            part_type=part_type
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Diagnosis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload")
async def diagnose_upload(file: UploadFile = File(...)):
    """
    Diagnose car part from an uploaded image file.
    """
    try:
        contents = await file.read()

        valid_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if file.content_type not in valid_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Accepted: {valid_types}"
            )

        image_base64 = base64.b64encode(contents).decode()
        diagnosis = detect_car_part(image_base64)

        part_type = diagnosis.get('type', 'unknown')
        avg_price = get_part_price_range(part_type)
        parts = diagnosis.get('parts', [])

        logger.info(f"File diagnosis: {file.filename} -> {part_type}")

        return {
            "filename": file.filename,
            "diagnosis": diagnosis,
            "parts": parts,
            "avg_price": avg_price,
            "part_type": part_type
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat", response_model=ChatResponse)
async def diagnose_chat(request: ChatRequest):
    """Use a real LLM if configured or fall back to a local diagnostic response."""
    try:
        if not request.message or not request.message.strip():
            raise HTTPException(status_code=400, detail="No message provided")

        llm_reply = _call_llm_service(request.message, request.diagnosis)
        if llm_reply:
            return ChatResponse(reply=llm_reply, provider="llm")

        return ChatResponse(
            reply=_fallback_vehicle_reply(request.message, request.diagnosis),
            provider="local-fallback",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
