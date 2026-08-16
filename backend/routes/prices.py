"""
FastAPI Routes for Price Comparison
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import json
import random
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/prices", tags=["prices"])


class PriceRequest(BaseModel):
    part_type: str
    base_price: float


class PriceItem(BaseModel):
    retailer: str
    logo: str
    price: int
    rating: float
    delivery: str
    link: str


# Load mock prices data
PRICES_DB = {}
try:
    prices_file = Path(__file__).parent.parent / "data" / "prices.json"
    with open(prices_file) as f:
        PRICES_DB = json.load(f)
    logger.info(f"Loaded prices database from {prices_file}")
except Exception as e:
    logger.warning(f"Could not load prices.json: {e}")
    PRICES_DB = {
        "retailers": [
            {
                "name": "Amazon",
                "logo": "🛒",
                "markup": 1.1,
                "delivery": "2-3 days",
                "link_template": "https://amazon.in/s?k=car+{part}"
            },
            {
                "name": "Flipkart",
                "logo": "🛍️",
                "markup": 1.05,
                "delivery": "2 days",
                "link_template": "https://flipkart.com/search?q=car+{part}"
            },
            {
                "name": "Local Auto Parts",
                "logo": "🏪",
                "markup": 1.15,
                "delivery": "Same day",
                "link_template": "https://example.com/search?q={part}"
            }
        ]
    }


@router.post("", response_model=list[PriceItem])
async def get_prices(request: PriceRequest):
    """
    Get price comparison across mock retailers.

    Request:
        { "part_type": "battery", "base_price": 3500 }
    """
    try:
        if not request.part_type or request.base_price <= 0:
            raise HTTPException(status_code=400, detail="Invalid part_type or base_price")

        retailers = PRICES_DB.get('retailers', [])
        if not retailers:
            raise HTTPException(status_code=500, detail="No retailers available")

        prices = []
        for retailer in retailers:
            price = int(request.base_price * retailer['markup'])
            variation = random.uniform(0.95, 1.05)
            price = int(price * variation)
            rating = round(random.uniform(3.5, 5.0), 1)

            prices.append(PriceItem(
                retailer=retailer['name'],
                logo=retailer['logo'],
                price=price,
                rating=rating,
                delivery=retailer['delivery'],
                link=retailer['link_template'].format(part=request.part_type)
            ))

        prices_sorted = sorted(prices, key=lambda x: x.price)
        logger.info(f"Price comparison for {request.part_type}: {len(prices_sorted)} results")

        return prices_sorted

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Price error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/retailers")
async def get_retailers():
    """Get list of available retailers."""
    try:
        retailers = PRICES_DB.get('retailers', [])
        return {
            "count": len(retailers),
            "retailers": [
                {"name": r['name'], "logo": r['logo'], "delivery": r['delivery']}
                for r in retailers
            ]
        }
    except Exception as e:
        logger.error(f"Error getting retailers: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
