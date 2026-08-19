"""
FastAPI route for the vehicle maintenance chatbot.
Uses the Anthropic Messages API to answer user questions about vehicle
issues, grounded with a system prompt that keeps advice general/safe and
steers hands-on/safety-critical work to a certified mechanic.
"""

import os
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import httpx

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])

ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
MODEL = "claude-sonnet-4-5"

SYSTEM_PROMPT = """You are the VEHIQ Vehicle Assistant, a chat helper embedded in a car/bike \
maintenance diagnostics app.

Scope:
- Help users understand symptoms, likely causes, and general maintenance guidance for cars and motorcycles.
- You may reference a diagnosis result the app already produced (part, issue, severity) if it's given to you as context.
- Explain part function, typical wear patterns, rough replacement intervals, and what a symptom usually indicates.

Safety boundaries:
- Never give step-by-step instructions for repairs involving brakes, airbags, fuel systems, electrical/high-voltage \
(including EV battery packs), or suspension load-bearing components — these are safety-critical and require a \
certified mechanic. Explain what's likely wrong and why it matters, but stop short of a DIY repair walkthrough for these.
- For everything else (e.g. wiper blades, air filters, checking fluid levels), general guidance is fine.
- If a symptom could indicate a safety-critical failure (brake failure, fuel leak, smoke, loss of steering), \
clearly recommend stopping use of the vehicle and seeking professional help immediately — don't downplay urgency.
- You are not a certified mechanic and cannot see or physically inspect the vehicle. Say so naturally when it's relevant, \
without repeating it every message.

Style:
- Be direct, concise, and practical. Use plain language, not marketing tone.
- Prefer short paragraphs or a few bullet points over long essays.
- If the question is ambiguous (e.g. "my car is making a noise"), ask ONE clarifying question rather than guessing.
"""


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    diagnosis_context: Optional[dict] = None


class ChatResponse(BaseModel):
    reply: str


@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Send the conversation to Claude and return the assistant's reply.

    Request:
        {
          "messages": [{"role": "user", "content": "..."}],
          "diagnosis_context": { "part_type": "brake_pad", "issue": "...", "severity": "high" }  // optional
        }
    """
    if not ANTHROPIC_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="ANTHROPIC_API_KEY is not configured on the server."
        )

    if not request.messages:
        raise HTTPException(status_code=400, detail="messages cannot be empty")

    try:
        system_prompt = SYSTEM_PROMPT
        if request.diagnosis_context:
            system_prompt += (
                f"\n\nCurrent diagnosis context from the app (use only if relevant to the question): "
                f"{request.diagnosis_context}"
            )

        payload = {
            "model": MODEL,
            "max_tokens": 600,
            "system": system_prompt,
            "messages": [
                {"role": m.role, "content": m.content} for m in request.messages
            ],
        }

        headers = {
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(ANTHROPIC_API_URL, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()

        reply_text = "".join(
            block.get("text", "") for block in data.get("content", []) if block.get("type") == "text"
        )

        if not reply_text:
            reply_text = "I couldn't generate a response. Please try rephrasing your question."

        return ChatResponse(reply=reply_text)

    except httpx.HTTPStatusError as e:
        logger.error(f"Anthropic API error: {e.response.status_code} - {e.response.text}")
        raise HTTPException(status_code=502, detail="Chat service returned an error.")
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
