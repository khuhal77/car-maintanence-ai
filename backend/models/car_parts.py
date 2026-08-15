"""
Car Parts Detection using YOLOv8
Detects car parts and diagnoses issues
"""

import numpy as np
from PIL import Image
import io
import base64
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load YOLOv8 Nano model (lightweight, free)
try:
    from ultralytics import YOLO
    model = YOLO('yolov8n.pt')
    logger.info("YOLOv8 model loaded successfully")
except Exception as e:
    logger.warning(f"Could not load YOLOv8 model: {e}")
    model = None

# Mapping from detected COCO objects to car part categories
# (YOLOv8 default weights are trained on COCO, not car parts specifically,
# so this mapping is a placeholder until you fine-tune on a car-parts dataset)
CAR_PARTS_MAPPING = {
    'car': 'vehicle_body',
    'truck': 'vehicle_body',
    'motorcycle': 'motorcycle_part',
    'bicycle': 'wheel_part',
    'bottle': 'fluid_container',
    'person': 'unknown',
}

# Diagnosis database for each part category
PART_DIAGNOSIS = {
    'vehicle_body': {
        'type': 'battery',
        'issue': 'Car battery degraded or failing',
        'severity': 'medium',
        'recommendation': 'Check battery voltage (should be 12.6V). Replace if below 11V.',
        'parts': ['12V Car Battery 60Ah', 'Battery Terminals', 'Battery Cable'],
        'avg_price': 3500,
        'emoji': '🔋'
    },
    'wheel_part': {
        'type': 'brake_pad',
        'issue': 'Brake pads worn out - SAFETY RISK',
        'severity': 'high',
        'recommendation': 'Replace brake pads immediately. Check rotor condition.',
        'parts': ['Brake Pads Front Set', 'Brake Fluid DOT 3', 'Brake Rotor'],
        'avg_price': 1200,
        'emoji': '🛑'
    },
    'motorcycle_part': {
        'type': 'spark_plug',
        'issue': 'Spark plugs degraded',
        'severity': 'medium',
        'recommendation': 'Replace all spark plugs for better engine performance.',
        'parts': ['Spark Plugs Set (4)', 'Ignition Coil', 'Spark Plug Wire'],
        'avg_price': 800,
        'emoji': '✨'
    },
    'fluid_container': {
        'type': 'oil_filter',
        'issue': 'Oil filter needs replacement',
        'severity': 'low',
        'recommendation': 'Change oil filter during regular oil change (every 5000 km).',
        'parts': ['Oil Filter', 'Drain Plug', 'Engine Oil'],
        'avg_price': 300,
        'emoji': '🛢️'
    },
    'unknown': {
        'type': 'unknown',
        'issue': 'Could not identify part clearly',
        'severity': 'low',
        'recommendation': 'Please upload a clear, close-up image of the car part.',
        'parts': [],
        'avg_price': 0,
        'emoji': '❓'
    }
}


def detect_car_part(image_base64: str) -> dict:
    """
    Detect car part from base64 encoded image.

    Args:
        image_base64: Base64 encoded image string
                       (without the "data:image/...;base64," prefix)

    Returns:
        dict: Diagnosis information (type, issue, severity, parts, etc.)
    """
    try:
        # Decode base64 to image
        image_data = base64.b64decode(image_base64)
        image = Image.open(io.BytesIO(image_data)).convert('RGB')
        img_array = np.array(image)

        logger.info(f"Image shape: {img_array.shape}")

        if model is None:
            logger.warning("Model not loaded, using fallback diagnosis")
            return get_fallback_diagnosis()

        # YOLOv8 inference
        results = model(img_array, conf=0.3, verbose=False)

        # Extract detected objects
        detected_objects = []
        for result in results:
            for box in result.boxes:
                class_id = int(box.cls)
                class_name = model.names[class_id]
                confidence = float(box.conf)
                detected_objects.append({
                    'class': class_name,
                    'confidence': confidence,
                    'class_id': class_id
                })

        logger.info(f"Detected objects: {detected_objects}")

        if not detected_objects:
            return get_fallback_diagnosis()

        # Use highest confidence detection
        top_detection = max(detected_objects, key=lambda d: d['confidence'])
        detected_class = top_detection['class'].lower()
        confidence = top_detection['confidence']

        part_category = CAR_PARTS_MAPPING.get(detected_class, 'unknown')
        diagnosis = PART_DIAGNOSIS.get(part_category, PART_DIAGNOSIS['unknown']).copy()

        diagnosis['confidence'] = round(confidence, 3)
        diagnosis['detected_object'] = detected_class
        diagnosis['detection_valid'] = confidence > 0.5

        return diagnosis

    except Exception as e:
        logger.error(f"Error in detect_car_part: {str(e)}")
        return get_error_diagnosis(str(e))


def get_fallback_diagnosis() -> dict:
    """Fallback diagnosis when detection fails or finds nothing."""
    return {
        'type': 'unknown',
        'issue': 'Could not identify car part clearly',
        'severity': 'low',
        'recommendation': 'Please upload a clear, close-up image of the car part.',
        'parts': [],
        'avg_price': 0,
        'confidence': 0.0,
        'detected_object': 'none',
        'detection_valid': False,
        'emoji': '❓'
    }


def get_error_diagnosis(error_msg: str) -> dict:
    """Diagnosis payload used when an exception occurs."""
    return {
        'type': 'error',
        'issue': 'Failed to process image',
        'severity': 'low',
        'recommendation': "Try uploading another image. Ensure it's a valid JPG or PNG.",
        'parts': [],
        'avg_price': 0,
        'error': error_msg,
        'emoji': '❌'
    }


def get_part_price_range(part_type: str) -> int:
    """Get average price (INR) for a given part type."""
    price_ranges = {
        'battery': 3500,
        'brake_pad': 1200,
        'spark_plug': 800,
        'air_filter': 400,
        'oil_filter': 300,
        'engine_oil': 500,
        'coolant': 400,
        'wiper_blade': 200,
        'unknown': 500
    }
    return price_ranges.get(part_type, 500)