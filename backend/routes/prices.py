"""
Car Parts Pricing Routes
Endpoints for fetching car part prices, retailer information, and price comparisons.
"""

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
import json
import logging
from typing import Optional, List

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/prices", tags=["pricing"])

# Load price data
PRICES_FILE = "data/prices.json"
PARTS_DB_FILE = "data/parts-db.json"

def load_prices():
    """Load price data from JSON file."""
    try:
        with open(PRICES_FILE, 'r') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading prices.json: {str(e)}")
        return {"retailers": []}

def load_parts_db():
    """Load parts database from JSON file."""
    try:
        with open(PARTS_DB_FILE, 'r') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading parts-db.json: {str(e)}")
        return {}

def calculate_retailer_price(base_price: float, markup: float) -> int:
    """Calculate price with retailer markup."""
    return int(base_price * markup)


@router.get("/part/{part_type}")
async def get_part_prices(part_type: str):
    """
    Get pricing information for a specific car part across all retailers.
    
    Args:
        part_type: Type of car part (e.g., 'battery', 'brake_pad', 'spark_plug')
    
    Returns:
        dict: Part information with prices from each retailer
    
    Example:
        GET /api/prices/part/battery
    """
    try:
        parts_db = load_parts_db()
        prices_data = load_prices()
        
        # Check if part exists
        if part_type.lower() not in parts_db:
            raise HTTPException(
                status_code=404,
                detail=f"Part type '{part_type}' not found in database."
            )
        
        part_info = parts_db[part_type.lower()]
        base_price = part_info.get("avg_price", 0)
        
        # Calculate prices for each retailer
        retailer_prices = []
        for retailer in prices_data.get("retailers", []):
            retailer_price = calculate_retailer_price(base_price, retailer["markup"])
            retailer_prices.append({
                "name": retailer["name"],
                "logo": retailer["logo"],
                "price": retailer_price,
                "markup": f"{int((retailer['markup'] - 1) * 100)}%",
                "delivery": retailer["delivery"],
                "link": retailer["link_template"].format(part=part_info["parts"][0])
            })
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "part": {
                    "type": part_info["type"],
                    "issue": part_info["issue"],
                    "severity": part_info["severity"],
                    "parts": part_info["parts"],
                    "base_price": base_price
                },
                "retailers": retailer_prices,
                "cheapest": min(retailer_prices, key=lambda x: x["price"]) if retailer_prices else None
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching prices for {part_type}: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "Failed to fetch prices",
                "details": str(e)
            }
        )


@router.get("/all")
async def get_all_prices():
    """
    Get pricing information for all available car parts.
    
    Returns:
        dict: Dictionary of all parts with prices and retailers
    
    Example:
        GET /api/prices/all
    """
    try:
        parts_db = load_parts_db()
        prices_data = load_prices()
        
        all_prices = {}
        
        for part_type, part_info in parts_db.items():
            base_price = part_info.get("avg_price", 0)
            
            retailer_prices = []
            for retailer in prices_data.get("retailers", []):
                retailer_price = calculate_retailer_price(base_price, retailer["markup"])
                retailer_prices.append({
                    "name": retailer["name"],
                    "logo": retailer["logo"],
                    "price": retailer_price,
                    "delivery": retailer["delivery"]
                })
            
            all_prices[part_type] = {
                "type": part_info["type"],
                "issue": part_info["issue"],
                "severity": part_info["severity"],
                "parts": part_info["parts"],
                "base_price": base_price,
                "retailers": retailer_prices
            }
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "total_parts": len(all_prices),
                "data": all_prices
            }
        )
    
    except Exception as e:
        logger.error(f"Error fetching all prices: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "Failed to fetch prices",
                "details": str(e)
            }
        )


@router.get("/retailers")
async def get_retailers():
    """
    Get information about all available retailers.
    
    Returns:
        dict: List of retailers with their details
    
    Example:
        GET /api/prices/retailers
    """
    try:
        prices_data = load_prices()
        
        retailers_info = []
        for retailer in prices_data.get("retailers", []):
            retailers_info.append({
                "name": retailer["name"],
                "logo": retailer["logo"],
                "markup": f"{int((retailer['markup'] - 1) * 100)}%",
                "delivery": retailer["delivery"],
                "website": retailer.get("link_template", "N/A").split('?')[0]
            })
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "total_retailers": len(retailers_info),
                "retailers": retailers_info
            }
        )
    
    except Exception as e:
        logger.error(f"Error fetching retailers: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "Failed to fetch retailers",
                "details": str(e)
            }
        )


@router.post("/calculate")
async def calculate_total_price(
    parts: List[str] = Query(..., description="List of part types to calculate total price")
):
    """
    Calculate total price for multiple car parts.
    
    Args:
        parts: List of part types (e.g., ['battery', 'brake_pad'])
    
    Returns:
        dict: Total price breakdown by part and retailer
    
    Example:
        POST /api/prices/calculate?parts=battery&parts=brake_pad
    """
    try:
        if not parts or len(parts) == 0:
            raise HTTPException(
                status_code=400,
                detail="At least one part must be specified."
            )
        
        parts_db = load_parts_db()
        prices_data = load_prices()
        
        # Validate all parts exist
        invalid_parts = [p for p in parts if p.lower() not in parts_db]
        if invalid_parts:
            raise HTTPException(
                status_code=404,
                detail=f"Parts not found: {', '.join(invalid_parts)}"
            )
        
        # Calculate totals for each retailer
        retailer_totals = {r["name"]: 0 for r in prices_data.get("retailers", [])}
        
        parts_breakdown = []
        for part_type in parts:
            part_info = parts_db[part_type.lower()]
            base_price = part_info.get("avg_price", 0)
            
            part_prices = {
                "type": part_type,
                "base_price": base_price,
                "retailers": {}
            }
            
            for retailer in prices_data.get("retailers", []):
                retailer_price = calculate_retailer_price(base_price, retailer["markup"])
                part_prices["retailers"][retailer["name"]] = retailer_price
                retailer_totals[retailer["name"]] += retailer_price
            
            parts_breakdown.append(part_prices)
        
        # Format retailer totals with additional info
        retailer_summary = []
        for retailer in prices_data.get("retailers", []):
            retailer_summary.append({
                "name": retailer["name"],
                "logo": retailer["logo"],
                "total_price": retailer_totals[retailer["name"]],
                "delivery": retailer["delivery"]
            })
        
        # Sort by price
        retailer_summary.sort(key=lambda x: x["total_price"])
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "parts_count": len(parts),
                "parts": parts_breakdown,
                "retailer_totals": retailer_summary,
                "cheapest": retailer_summary[0] if retailer_summary else None,
                "most_expensive": retailer_summary[-1] if retailer_summary else None
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating total price: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "Failed to calculate price",
                "details": str(e)
            }
        )


@router.get("/search")
async def search_parts(
    query: str = Query(..., description="Search query for car parts")
):
    """
    Search for car parts by name or keyword.
    
    Args:
        query: Search keyword
    
    Returns:
        dict: Matching parts with pricing information
    
    Example:
        GET /api/prices/search?query=battery
    """
    try:
        if not query or len(query.strip()) == 0:
            raise HTTPException(
                status_code=400,
                detail="Search query cannot be empty."
            )
        
        parts_db = load_parts_db()
        query_lower = query.lower()
        
        # Search in part types and part lists
        matching_parts = []
        for part_type, part_info in parts_db.items():
            if query_lower in part_type:
                matching_parts.append(part_type)
            else:
                for part in part_info.get("parts", []):
                    if query_lower in part.lower():
                        matching_parts.append(part_type)
                        break
        
        if not matching_parts:
            return JSONResponse(
                status_code=200,
                content={
                    "success": True,
                    "query": query,
                    "results_count": 0,
                    "results": []
                }
            )
        
        # Remove duplicates
        matching_parts = list(set(matching_parts))
        
        # Get full info for matched parts
        results = []
        prices_data = load_prices()
        
        for part_type in matching_parts:
            part_info = parts_db[part_type]
            base_price = part_info.get("avg_price", 0)
            
            results.append({
                "type": part_type,
                "issue": part_info["issue"],
                "severity": part_info["severity"],
                "parts": part_info["parts"],
                "base_price": base_price,
                "cheapest_retailer": min(
                    [{"name": r["name"], "price": calculate_retailer_price(base_price, r["markup"])}
                     for r in prices_data.get("retailers", [])],
                    key=lambda x: x["price"]
                ) if prices_data.get("retailers") else None
            })
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "query": query,
                "results_count": len(results),
                "results": results
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching parts: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "Failed to search parts",
                "details": str(e)
            }
        )


@router.get("/health")
async def prices_health():
    """
    Health check endpoint for pricing service.
    
    Returns:
        dict: Service status
    """
    return JSONResponse(
        status_code=200,
        content={
            "success": True,
            "service": "pricing",
            "status": "healthy"
        }
    )
