"""
Car Maintenance AI - Backend Server
FastAPI application entry point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

from routes.diagnose import router as diagnose_router
from routes.prices import router as prices_router
from models.diagnosis import init_model

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Car Maintenance AI API",
    description="AI-powered car maintenance diagnostics and price comparison",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(diagnose_router)
app.include_router(prices_router)


@app.get("/")
async def root():
    return {
        "message": "Car Maintenance AI Backend",
        "status": "running",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }


@app.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


@app.get("/api/info")
async def api_info():
    return {
        "name": "Car Maintenance AI",
        "version": "1.0.0",
        "endpoints": [
            {"method": "POST", "path": "/api/diagnose", "description": "Diagnose car part from base64 image"},
            {"method": "POST", "path": "/api/diagnose/upload", "description": "Diagnose car part from file upload"},
            {"method": "POST", "path": "/api/prices", "description": "Get price comparison for part"},
            {"method": "GET", "path": "/api/prices/retailers", "description": "Get list of retailers"},
        ]
    }


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc) if str(exc) else "Unknown error"}
    )


@app.on_event("startup")
async def startup_event():
    logger.info("=" * 50)
    logger.info("Car Maintenance AI Backend Starting...")
    logger.info("=" * 50)
    logger.info("CORS enabled for localhost:3000")
    logger.info("Routes registered: /api/diagnose, /api/prices")
    logger.info("Initializing ML models...")
    
    # Initialize the MobileNetV2 model for car part classification
    if init_model():
        logger.info("✓ ML models initialized successfully")
    else:
        logger.warning("⚠ ML models failed to initialize - predictions may be unavailable")
    
    logger.info("=" * 50)


@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down backend...")


if __name__ == "__main__":
    import uvicorn

    print("\n" + "=" * 60)
    print("Starting Car Maintenance AI Backend")
    print("=" * 60)
    print("Server: http://0.0.0.0:5000")
    print("Docs:   http://localhost:5000/docs")
    print("=" * 60 + "\n")

    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True, log_level="info")
