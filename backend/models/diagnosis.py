"""
CNN-based Car Part Classification
Lightweight alternative to YOLO for quick prototyping.
Uses simple image heuristics for demo purposes; swap in a trained
TensorFlow/Keras model for production accuracy.
"""

import numpy as np
from PIL import Image
import base64
import io
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Car parts classes
CAR_PARTS_CLASSES = [
    'battery',
    'brake_pad',
    'spark_plug',
    'air_filter',
    'oil_filter',
    'tire',
    'wiper_blade',
    'unknown'
]

# Diagnosis data for each part
DIAGNOSIS_DATABASE = {
    'battery': {
        'type': 'battery',
        'issue': 'Car battery degraded or failing',
        'severity': 'medium',
        'recommendation': 'Check battery voltage (should be 12.6V). Replace if below 11V.',
        'parts': ['12V Car Battery 60Ah', 'Battery Terminals', 'Battery Cable'],
        'avg_price': 3500,
        'emoji': '🔋'
    },
    'brake_pad': {
        'type': 'brake_pad',
        'issue': 'Brake pads worn out - SAFETY RISK',
        'severity': 'high',
        'recommendation': 'Replace brake pads immediately. Check rotor condition.',
        'parts': ['Brake Pads Front Set', 'Brake Fluid DOT 3', 'Brake Rotor'],
        'avg_price': 1200,
        'emoji': '🛑'
    },
    'spark_plug': {
        'type': 'spark_plug',
        'issue': 'Spark plugs degraded',
        'severity': 'medium',
        'recommendation': 'Replace all spark plugs for better engine performance.',
        'parts': ['Spark Plugs Set (4)', 'Ignition Coil', 'Spark Plug Wire'],
        'avg_price': 800,
        'emoji': '✨'
    },
    'air_filter': {
        'type': 'air_filter',
        'issue': 'Air filter clogged',
        'severity': 'low',
        'recommendation': 'Replace air filter for better fuel efficiency.',
        'parts': ['Air Filter', 'Cabin Filter', 'Filter Gasket'],
        'avg_price': 400,
        'emoji': '💨'
    },
    'oil_filter': {
        'type': 'oil_filter',
        'issue': 'Oil filter needs replacement',
        'severity': 'low',
        'recommendation': 'Change oil filter during regular oil change (every 5000 km).',
        'parts': ['Oil Filter', 'Drain Plug', 'Engine Oil'],
        'avg_price': 300,
        'emoji': '🛢️'
    },
    'tire': {
        'type': 'tire',
        'issue': 'Tire wear detected',
        'severity': 'medium',
        'recommendation': 'Check tire tread depth (minimum 1.6mm). Rotate tires regularly.',
        'parts': ['Tire (Size dependent)', 'Tire Repair Kit', 'Wheel Balance'],
        'avg_price': 2000,
        'emoji': '🛞'
    },
    'wiper_blade': {
        'type': 'wiper_blade',
        'issue': 'Wiper blade worn out',
        'severity': 'low',
        'recommendation': 'Replace wiper blades for better visibility.',
        'parts': ['Front Wiper Blade', 'Rear Wiper Blade', 'Wiper Fluid'],
        'avg_price': 200,
        'emoji': '🧹'
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


def classify_car_part_cnn(image_base64: str) -> dict:
    """
    Classify car part using simple image heuristics (brightness/contrast).
    Swap this out for a trained CNN/MobileNetV2 model for real accuracy.

    Args:
        image_base64: Base64 encoded image string

    Returns:
        dict: Classification and diagnosis
    """
    try:
        image_data = base64.b64decode(image_base64)
        img = Image.open(io.BytesIO(image_data)).convert('RGB')

        img = img.resize((224, 224))
        img_array = np.array(img)

        if img_array.max() > 1:
            img_array = img_array / 255.0

        brightness = float(np.mean(img_array))
        saturation = float(np.std(img_array))

        logger.info(f"Brightness: {brightness:.2f}, Saturation: {saturation:.2f}")

        # Simple heuristic classification (placeholder logic for demo)
        if brightness > 0.7:
            predicted_class = 'battery'
        elif brightness > 0.6:
            predicted_class = 'air_filter'
        elif brightness > 0.5:
            predicted_class = 'spark_plug'
        elif saturation > 0.2:
            predicted_class = 'brake_pad'
        elif saturation > 0.1:
            predicted_class = 'tire'
        else:
            predicted_class = 'oil_filter'

        confidence = min(0.95, 0.5 + brightness * 0.3 + saturation * 0.2)

        diagnosis = DIAGNOSIS_DATABASE[predicted_class].copy()
        diagnosis['confidence'] = round(confidence, 3)
        diagnosis['method'] = 'cnn_heuristic'

        return diagnosis

    except Exception as e:
        logger.error(f"Error in CNN classification: {str(e)}")
        return {
            'type': 'error',
            'issue': 'Failed to process image',
            'severity': 'low',
            'recommendation': 'Try uploading another image.',
            'parts': [],
            'avg_price': 0,
            'error': str(e),
            'emoji': '❌'
        }


def load_trained_model():
    """
    Optional: load a pretrained TensorFlow Hub model (e.g. MobileNetV2)
    for feature extraction / transfer learning. Not required for the
    heuristic demo above.
    """
    try:
        import tensorflow_hub as hub
        model = hub.load(
            "https://tfhub.dev/google/imagenet/mobilenet_v2_100_224/feature_vector/5"
        )
        logger.info("Loaded TensorFlow Hub model")
        return model
    except Exception as e:
        logger.warning(f"Could not load TF Hub model: {e}")
        return None
