"""
Car Part Diagnosis Routes
Endpoints for diagnosing car parts from images using YOLOv8 or CNN classification.
"""

from fastapi import APIRouter, File, UploadFile, HTTPException, Query
from fastapi.responses import JSONResponse
import base64
import logging
from typing import Optional

from models.car_parts import detect_car_part
from models.diagnosis import classify_car_part_cnn

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/diagnose", tags=["diagnosis"])


@router.post("/image")
async def diagnose_from_image(file: UploadFile = File(...)):
    """
    Diagnose car part from uploaded image file.
    
    Args:
        file: Image file (JPG, PNG, etc.)
    
    Returns:
        dict: Diagnosis information including:
            - type: Part type identified
            - issue: Description of the issue
            - severity: 'low', 'medium', or 'high'
            - recommendation: Recommended action
            - parts: List of related parts to purchase
            - avg_price: Average price in INR
            - emoji: Visual indicator
            - confidence: Detection confidence (0-1)
    
    Example:
        curl -X POST "http://localhost:8000/api/diagnose/image" \\
             -F "file=@car_part.jpg"
    """
    try:
        # Validate file type
        if file.content_type not in ["image/jpeg", "image/png", "image/jpg"]:
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Please upload JPG or PNG image."
            )
        
        # Read file and encode to base64
        contents = await file.read()
        if not contents:
            raise HTTPException(
                status_code=400,
                detail="Uploaded file is empty."
            )
        
        image_base64 = base64.b64encode(contents).decode()
        
        logger.info(f"Diagnosing image: {file.filename} ({len(contents)} bytes)")
        
        # Detect using YOLOv8
        diagnosis = detect_car_part(image_base64)
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": diagnosis,
                "method": "yolov8"
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error diagnosing image: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "Failed to process image",
                "details": str(e)
            }
        )


@router.post("/base64")
async def diagnose_from_base64(
    image: str = Query(..., description="Base64 encoded image string"),
    method: Optional[str] = Query("yolov8", description="Detection method: 'yolov8' or 'cnn'")
):
    """
    Diagnose car part from base64 encoded image string.
    
    Args:
        image: Base64 encoded image string (without data URL prefix)
        method: Detection method - 'yolov8' (default) or 'cnn'
    
    Returns:
        dict: Diagnosis information
    
    Example:
        curl -X POST "http://localhost:8000/api/diagnose/base64" \\
             -H "Content-Type: application/json" \\
             -d '{"image": "iVBORw0KGgoAAAANS..."}'
    """
    try:
        if not image:
            raise HTTPException(
                status_code=400,
                detail="Image data is required."
            )
        
        # Validate base64
        try:
            base64.b64decode(image)
        except Exception:
            raise HTTPException(
                status_code=400,
                detail="Invalid base64 encoded image."
            )
        
        logger.info(f"Diagnosing base64 image using {method} method")
        
        # Select detection method
        if method.lower() == "cnn":
            diagnosis = classify_car_part_cnn(image)
        else:  # Default to yolov8
            diagnosis = detect_car_part(image)
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": diagnosis,
                "method": method.lower()
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error diagnosing base64 image: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "Failed to process image",
                "details": str(e)
            }
        )


@router.get("/health")
async def diagnose_health():
    """
    Health check endpoint for diagnosis service.
    
    Returns:
        dict: Service status
    """
    return JSONResponse(
        status_code=200,
        content={
            "success": True,
            "service": "diagnosis",
            "status": "healthy"
        }
    )


@router.get("/info")
async def diagnosis_info():
    """
    Get information about available car part types and severity levels.
    
    Returns:
        dict: Information about diagnosis system
    """
    car_parts = [
        'battery',
        'brake_pad',
        'spark_plug',
        'air_filter',
        'oil_filter',
        'tire',
        'wiper_blade',
        'unknown'
    ]
    
    severity_levels = ['low', 'medium', 'high']
    
    return JSONResponse(
        status_code=200,
        content={
            "success": True,
            "car_parts": car_parts,
            "severity_levels": severity_levels,
            "endpoints": {
                "upload_image": "/api/diagnose/image",
                "diagnose_base64": "/api/diagnose/base64",
                "health_check": "/api/diagnose/health",
                "info": "/api/diagnose/info"
            }
        }
    )
