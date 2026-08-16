"""
Shared utility/helper functions
"""

import base64
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def clean_base64(image_base64: str) -> str:
    """
    Strip data URI prefix (e.g. "data:image/jpeg;base64,") if present,
    returning just the raw base64 payload.
    """
    if ',' in image_base64:
        return image_base64.split(',')[1]
    return image_base64


def is_valid_base64_image(image_base64: str) -> bool:
    """Quick validation that a string is decodable base64 image data."""
    try:
        data = clean_base64(image_base64)
        decoded = base64.b64decode(data, validate=True)
        # Basic magic-byte checks for common image formats
        signatures = [
            b'\xff\xd8\xff',        # JPEG
            b'\x89PNG\r\n\x1a\n',   # PNG
            b'GIF87a',              # GIF
            b'GIF89a',              # GIF
            b'RIFF',                # WEBP (starts with RIFF....WEBP)
        ]
        return any(decoded.startswith(sig) for sig in signatures)
    except Exception as e:
        logger.warning(f"Invalid base64 image: {e}")
        return False


def format_price_inr(amount: float) -> str:
    """Format a number as an Indian Rupee string, e.g. 3500 -> '₹3,500'."""
    try:
        return f"₹{amount:,.0f}"
    except Exception:
        return f"₹{amount}"


def severity_rank(severity: str) -> int:
    """Numeric rank for sorting/comparing severities (higher = more urgent)."""
    ranks = {'low': 1, 'medium': 2, 'high': 3}
    return ranks.get(severity, 0)


def safe_get(d: dict, key: str, default=None):
    """Dict.get with logging on missing keys (helps debugging responses)."""
    if key not in d:
        logger.debug(f"Key '{key}' not found in dict, using default: {default}")
    return d.get(key, default)
