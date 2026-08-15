"""
Utility Helper Functions
Provides common utilities for image processing, price calculations, data validation,
and API response formatting.
"""

import base64
import logging
from typing import Dict, List, Tuple, Optional, Any
from PIL import Image
import io
import json
import os
from datetime import datetime

logger = logging.getLogger(__name__)


# ============================================================================
# IMAGE UTILITIES
# ============================================================================

def validate_image_base64(image_base64: str) -> Tuple[bool, str]:
    """
    Validate if a string is a valid base64 encoded image.
    
    Args:
        image_base64: Base64 encoded image string
    
    Returns:
        Tuple[bool, str]: (is_valid, error_message)
    """
    try:
        if not image_base64 or len(image_base64.strip()) == 0:
            return False, "Image data cannot be empty"
        
        # Try to decode
        image_data = base64.b64decode(image_base64)
        
        # Try to open as image
        image = Image.open(io.BytesIO(image_data))
        image.verify()
        
        return True, ""
    except Exception as e:
        return False, f"Invalid image: {str(e)}"


def get_image_dimensions(image_base64: str) -> Optional[Tuple[int, int]]:
    """
    Get dimensions (width, height) of a base64 encoded image.
    
    Args:
        image_base64: Base64 encoded image string
    
    Returns:
        Tuple[int, int]: (width, height) or None if invalid
    """
    try:
        image_data = base64.b64decode(image_base64)
        image = Image.open(io.BytesIO(image_data))
        return image.size
    except Exception as e:
        logger.error(f"Error getting image dimensions: {str(e)}")
        return None


def get_image_size_kb(image_base64: str) -> float:
    """
    Get size of a base64 encoded image in kilobytes.
    
    Args:
        image_base64: Base64 encoded image string
    
    Returns:
        float: Size in KB
    """
    try:
        return len(image_base64) / 1024
    except Exception:
        return 0.0


def is_valid_image_size(image_base64: str, max_size_mb: float = 10) -> Tuple[bool, str]:
    """
    Check if image size is within acceptable limits.
    
    Args:
        image_base64: Base64 encoded image string
        max_size_mb: Maximum allowed size in MB
    
    Returns:
        Tuple[bool, str]: (is_valid, message)
    """
    size_kb = get_image_size_kb(image_base64)
    size_mb = size_kb / 1024
    
    if size_mb > max_size_mb:
        return False, f"Image too large ({size_mb:.2f}MB > {max_size_mb}MB)"
    
    return True, f"Image size OK ({size_mb:.2f}MB)"


def resize_image_base64(image_base64: str, width: int = 640, height: int = 640) -> Optional[str]:
    """
    Resize a base64 encoded image to specified dimensions.
    
    Args:
        image_base64: Base64 encoded image string
        width: Target width
        height: Target height
    
    Returns:
        str: Resized base64 encoded image or None if error
    """
    try:
        image_data = base64.b64decode(image_base64)
        image = Image.open(io.BytesIO(image_data))
        
        # Resize maintaining aspect ratio
        image.thumbnail((width, height), Image.Resampling.LANCZOS)
        
        # Save to bytes
        buffered = io.BytesIO()
        image.save(buffered, format="JPEG")
        
        return base64.b64encode(buffered.getvalue()).decode()
    except Exception as e:
        logger.error(f"Error resizing image: {str(e)}")
        return None


# ============================================================================
# PRICE UTILITIES
# ============================================================================

def calculate_price_with_markup(base_price: float, markup_multiplier: float) -> int:
    """
    Calculate final price with markup.
    
    Args:
        base_price: Base price
        markup_multiplier: Markup multiplier (e.g., 1.1 for 10% markup)
    
    Returns:
        int: Final price (rounded)
    """
    return int(base_price * markup_multiplier)


def calculate_discount_price(original_price: float, discount_percent: float) -> float:
    """
    Calculate price after discount.
    
    Args:
        original_price: Original price
        discount_percent: Discount percentage (0-100)
    
    Returns:
        float: Price after discount
    """
    return original_price * (1 - (discount_percent / 100))


def format_price_inr(price: float) -> str:
    """
    Format price as Indian Rupee (INR).
    
    Args:
        price: Price amount
    
    Returns:
        str: Formatted price string (e.g., "₹ 1,200")
    """
    return f"₹ {int(price):,}"


def get_price_range(prices: List[float]) -> Dict[str, float]:
    """
    Get min, max, and average price from a list.
    
    Args:
        prices: List of prices
    
    Returns:
        dict: {min, max, average}
    """
    if not prices:
        return {"min": 0, "max": 0, "average": 0}
    
    return {
        "min": min(prices),
        "max": max(prices),
        "average": sum(prices) / len(prices)
    }


def sort_retailers_by_price(retailers: List[Dict], ascending: bool = True) -> List[Dict]:
    """
    Sort retailers by price.
    
    Args:
        retailers: List of retailer dictionaries with 'price' key
        ascending: Sort in ascending order if True
    
    Returns:
        list: Sorted retailers
    """
    return sorted(retailers, key=lambda x: x.get("price", 0), reverse=not ascending)


# ============================================================================
# DATA VALIDATION & FORMATTING
# ============================================================================

def validate_part_type(part_type: str, valid_parts: List[str]) -> Tuple[bool, str]:
    """
    Validate if part type is in the valid list.
    
    Args:
        part_type: Part type to validate
        valid_parts: List of valid part types
    
    Returns:
        Tuple[bool, str]: (is_valid, message)
    """
    if not part_type:
        return False, "Part type cannot be empty"
    
    if part_type.lower() not in [p.lower() for p in valid_parts]:
        return False, f"Invalid part type. Valid types: {', '.join(valid_parts)}"
    
    return True, "Valid part type"


def validate_severity(severity: str) -> Tuple[bool, str]:
    """
    Validate severity level.
    
    Args:
        severity: Severity level
    
    Returns:
        Tuple[bool, str]: (is_valid, message)
    """
    valid_severities = ["low", "medium", "high"]
    
    if severity.lower() not in valid_severities:
        return False, f"Invalid severity. Valid values: {', '.join(valid_severities)}"
    
    return True, "Valid severity"


def format_timestamp() -> str:
    """
    Get current timestamp in ISO format.
    
    Returns:
        str: ISO formatted timestamp
    """
    return datetime.now().isoformat()


def sanitize_string(text: str) -> str:
    """
    Sanitize a string by removing special characters.
    
    Args:
        text: Text to sanitize
    
    Returns:
        str: Sanitized text
    """
    return text.strip().replace("\n", " ").replace("\r", "")


def truncate_string(text: str, max_length: int = 100) -> str:
    """
    Truncate string to maximum length.
    
    Args:
        text: Text to truncate
        max_length: Maximum length
    
    Returns:
        str: Truncated text with ellipsis if needed
    """
    if len(text) > max_length:
        return text[:max_length - 3] + "..."
    return text


# ============================================================================
# FILE OPERATIONS
# ============================================================================

def load_json_file(filepath: str) -> Optional[Dict]:
    """
    Load JSON file safely.
    
    Args:
        filepath: Path to JSON file
    
    Returns:
        dict: Parsed JSON or None if error
    """
    try:
        if not os.path.exists(filepath):
            logger.warning(f"File not found: {filepath}")
            return None
        
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading JSON file {filepath}: {str(e)}")
        return None


def save_json_file(filepath: str, data: Dict) -> bool:
    """
    Save dictionary as JSON file.
    
    Args:
        filepath: Path to save JSON file
        data: Dictionary to save
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        logger.error(f"Error saving JSON file {filepath}: {str(e)}")
        return False


def file_exists(filepath: str) -> bool:
    """
    Check if file exists.
    
    Args:
        filepath: Path to file
    
    Returns:
        bool: True if file exists
    """
    return os.path.exists(filepath)


# ============================================================================
# API RESPONSE FORMATTING
# ============================================================================

def success_response(data: Any = None, message: str = "Success") -> Dict:
    """
    Create a standardized success response.
    
    Args:
        data: Response data
        message: Response message
    
    Returns:
        dict: Formatted response
    """
    return {
        "success": True,
        "message": message,
        "data": data,
        "timestamp": format_timestamp()
    }


def error_response(error: str, details: str = "", code: int = 500) -> Dict:
    """
    Create a standardized error response.
    
    Args:
        error: Error message
        details: Additional details
        code: Error code
    
    Returns:
        dict: Formatted error response
    """
    return {
        "success": False,
        "error": error,
        "details": details,
        "code": code,
        "timestamp": format_timestamp()
    }


def paginate_list(items: List, page: int = 1, page_size: int = 10) -> Dict:
    """
    Paginate a list of items.
    
    Args:
        items: List to paginate
        page: Page number (1-indexed)
        page_size: Items per page
    
    Returns:
        dict: Paginated result with metadata
    """
    total = len(items)
    start = (page - 1) * page_size
    end = start + page_size
    
    paginated_items = items[start:end]
    total_pages = (total + page_size - 1) // page_size
    
    return {
        "items": paginated_items,
        "pagination": {
            "current_page": page,
            "page_size": page_size,
            "total_items": total,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_previous": page > 1
        }
    }


# ============================================================================
# LOGGING UTILITIES
# ============================================================================

def log_request(method: str, path: str, status_code: int) -> None:
    """
    Log API request details.
    
    Args:
        method: HTTP method
        path: Request path
        status_code: Response status code
    """
    logger.info(f"{method} {path} - {status_code}")


def log_error(operation: str, error: str) -> None:
    """
    Log error with operation context.
    
    Args:
        operation: Operation that failed
        error: Error message
    """
    logger.error(f"[{operation}] {error}")


def log_diagnosis(part_type: str, confidence: float) -> None:
    """
    Log diagnosis details.
    
    Args:
        part_type: Detected part type
        confidence: Detection confidence
    """
    logger.info(f"Diagnosis: {part_type} (confidence: {confidence:.2%})")


# ============================================================================
# STATISTICS & ANALYTICS
# ============================================================================

def calculate_cost_savings(original_price: float, retailer_price: float) -> Dict:
    """
    Calculate cost savings between prices.
    
    Args:
        original_price: Original/base price
        retailer_price: Retailer price
    
    Returns:
        dict: Savings amount and percentage
    """
    savings = original_price - retailer_price
    savings_percent = (savings / original_price * 100) if original_price > 0 else 0
    
    return {
        "savings_amount": savings,
        "savings_percent": savings_percent,
        "is_cheaper": savings > 0
    }


def get_severity_priority(severity: str) -> int:
    """
    Get priority value for severity level (higher = more urgent).
    
    Args:
        severity: Severity level
    
    Returns:
        int: Priority value
    """
    priority_map = {
        "low": 1,
        "medium": 2,
        "high": 3
    }
    return priority_map.get(severity.lower(), 0)


def group_by_severity(diagnoses: List[Dict]) -> Dict[str, List]:
    """
    Group diagnoses by severity level.
    
    Args:
        diagnoses: List of diagnosis dictionaries
    
    Returns:
        dict: Grouped by severity
    """
    grouped = {"low": [], "medium": [], "high": []}
    
    for diagnosis in diagnoses:
        severity = diagnosis.get("severity", "low").lower()
        if severity in grouped:
            grouped[severity].append(diagnosis)
    
    return grouped


def get_high_priority_items(diagnoses: List[Dict]) -> List[Dict]:
    """
    Filter high and medium severity diagnoses.
    
    Args:
        diagnoses: List of diagnosis dictionaries
    
    Returns:
        list: High priority items
    """
    return [d for d in diagnoses if d.get("severity", "").lower() in ["high", "medium"]]
