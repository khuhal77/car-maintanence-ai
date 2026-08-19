"""
FastAPI Routes for Car Part Diagnosis
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
import base64
import logging
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
