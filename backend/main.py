"""
Car Maintenance AI - Backend API
FastAPI application for car part diagnosis and pricing.

Main application entry point with route registration and middleware setup.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import routers
from routes.diagnose import router as diagnose_router
from routes.prices import router as prices_router
from utils.helpers import success_response, format_timestamp

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================================================
# APPLICATION INITIALIZATION
# ============================================================================

app = FastAPI(
    title="Car Maintenance AI API",
    description="AI-powered car part diagnosis and price comparison service",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

logger.info("Initializing Car Maintenance AI Backend...")

# ============================================================================
# MIDDLEWARE SETUP
# ============================================================================

# CORS Middleware - Allow frontend to access API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",      # Local React dev server
        "http://localhost:5173",       # Local Vite dev server
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "*"                            # Allow all origins (change in production)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info("CORS middleware configured")


# ============================================================================
# EXCEPTION HANDLERS
# ============================================================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Handle HTTP exceptions with custom response format."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.detail,
            "timestamp": format_timestamp()
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Handle unexpected exceptions."""
    logger.error(f"Unexpected error: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error",
            "details": str(exc),
            "timestamp": format_timestamp()
        }
    )


# ============================================================================
# ROOT ENDPOINTS
# ============================================================================

@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": "Car Maintenance AI API",
        "version": "1.0.0",
        "description": "AI-powered car part diagnosis and price comparison service",
        "endpoints": {
            "documentation": "/api/docs",
            "diagnose": "/api/diagnose",
            "prices": "/api/prices"
        },
        "status": "running",
        "timestamp": format_timestamp()
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return success_response(
        data={
            "service": "car-maintenance-ai",
            "status": "healthy",
            "version": "1.0.0"
        },
        message="API is running"
    )


@app.get("/api/info")
async def api_info():
    """Get comprehensive API information."""
    return success_response(
        data={
            "name": "Car Maintenance AI Backend",
            "version": "1.0.0",
            "description": "Diagnoses car parts using AI and provides price comparisons",
            "services": {
                "diagnosis": {
                    "description": "Detect and diagnose car parts from images",
                    "base_url": "/api/diagnose",
                    "methods": [
                        {
                            "name": "Upload Image",
                            "endpoint": "/api/diagnose/image",
                            "method": "POST",
                            "description": "Upload image file for diagnosis"
                        },
                        {
                            "name": "Diagnose Base64",
                            "endpoint": "/api/diagnose/base64",
                            "method": "POST",
                            "description": "Diagnose from base64 encoded image"
                        },
                        {
                            "name": "Diagnosis Info",
                            "endpoint": "/api/diagnose/info",
                            "method": "GET",
                            "description": "Get supported car parts and severity levels"
                        }
                    ]
                },
                "pricing": {
                    "description": "Get car part prices and compare retailers",
                    "base_url": "/api/prices",
                    "methods": [
                        {
                            "name": "Get Part Prices",
                            "endpoint": "/api/prices/part/{part_type}",
                            "method": "GET",
                            "description": "Get prices for a specific car part"
                        },
                        {
                            "name": "Get All Prices",
                            "endpoint": "/api/prices/all",
                            "method": "GET",
                            "description": "Get prices for all car parts"
                        },
                        {
                            "name": "Get Retailers",
                            "endpoint": "/api/prices/retailers",
                            "method": "GET",
                            "description": "Get all retailers"
                        },
                        {
                            "name": "Calculate Total",
                            "endpoint": "/api/prices/calculate",
                            "method": "POST",
                            "description": "Calculate total price for multiple parts"
                        },
                        {
                            "name": "Search Parts",
                            "endpoint": "/api/prices/search",
                            "method": "GET",
                            "description": "Search for parts by keyword"
                        }
                    ]
                }
            },
            "supported_car_parts": [
                "battery",
                "brake_pad",
                "spark_plug",
                "air_filter",
                "oil_filter",
                "tire",
                "wiper_blade"
            ],
            "severity_levels": ["low", "medium", "high"],
            "documentation": "/api/docs"
        }
    )


# ============================================================================
# ROUTE REGISTRATION
# ============================================================================

# Include diagnosis routes
app.include_router(diagnose_router)
logger.info("Diagnosis routes registered at /api/diagnose")

# Include pricing routes
app.include_router(prices_router)
logger.info("Pricing routes registered at /api/prices")


# ============================================================================
# STARTUP & SHUTDOWN EVENTS
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Run on application startup."""
    logger.info("=" * 60)
    logger.info("Car Maintenance AI Backend Starting Up")
    logger.info("=" * 60)
    logger.info(f"API Documentation: http://localhost:8000/api/docs")
    logger.info(f"Alternative Docs: http://localhost:8000/api/redoc")
    logger.info(f"Health Check: http://localhost:8000/api/health")
    logger.info("=" * 60)


# @app.on_event("shutdown")
# async def shutdown_event():
    # """Run on application shutdown."""
    # logger.info("Car Maintenance AI Backend Shutting Down")


# ============================================================================
# 404 HANDLER
# ============================================================================

@app.get("/{path_name:path}")
async def not_found(path_name: str):
    """Handle 404 Not Found."""
    return JSONResponse(
        status_code=404,
        content={
            "success": False,
            "error": "Endpoint not found",
            "path": f"/{path_name}",
            "hint": "Check /api/docs for available endpoints",
            "timestamp": format_timestamp()
        }
    )


# ============================================================================
# APPLICATION ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    
    # Run the application
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
        reload=True  # Enable auto-reload for development
    )
