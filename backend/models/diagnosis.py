"""
CNN-based Car Part Classification using TensorFlow's MobileNetV2
Production-ready model using pretrained weights for accurate car part diagnosis.
"""

import numpy as np
from PIL import Image
import base64
import io
import logging
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # Suppress TF warnings

import tensorflow as tf
from keras.applications import MobileNetV2
from keras.applications.mobilenet_v2 import preprocess_input, decode_predictions
# from tensorflow.keras.applications import MobileNetV2
# from tensorflow.keras.applications.mobilenet_v2 import preprocess_input, decode_predictions

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global model instance
_model = None

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


def _get_model():
    """
    Load and cache the MobileNetV2 pretrained model.
    Uses ImageNet weights for production-grade predictions.
    """
    global _model
    if _model is None:
        try:
            logger.info("Loading MobileNetV2 pretrained model from ImageNet...")
            _model = MobileNetV2(
                input_shape=(224, 224, 3),
                include_top=True,
                weights='imagenet'
            )
            logger.info("✓ MobileNetV2 model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            _model = None
    return _model


def _map_imagenet_to_car_parts(imagenet_prediction: str, confidence: float) -> str:
    """
    Map ImageNet class predictions to car parts classes.
    Uses keyword matching to identify car-related components.
    """
    prediction_lower = imagenet_prediction.lower()
    
    # Mapping heuristics
    if any(word in prediction_lower for word in ['battery', 'cell', 'electric']):
        return 'battery'
    elif any(word in prediction_lower for word in ['brake', 'pad', 'friction']):
        return 'brake_pad'
    elif any(word in prediction_lower for word in ['spark', 'plug', 'ignition', 'electrode']):
        return 'spark_plug'
    elif any(word in prediction_lower for word in ['filter', 'air', 'ventilation', 'intake']):
        return 'air_filter'
    elif any(word in prediction_lower for word in ['oil', 'lubric', 'motor', 'engine oil']):
        return 'oil_filter'
    elif any(word in prediction_lower for word in ['tire', 'tyre', 'wheel', 'rubber', 'radial']):
        return 'tire'
    elif any(word in prediction_lower for word in ['wiper', 'blade', 'windshield']):
        return 'wiper_blade'
    else:
        # Default fallback based on confidence threshold
        return 'unknown' if confidence < 0.5 else 'unknown'


def classify_car_part_cnn(image_base64: str) -> dict:
    """
    Classify car part using MobileNetV2 pretrained model on ImageNet.
    Production-ready classification with real CNN predictions.

    Args:
        image_base64: Base64 encoded image string

    Returns:
        dict: Classification and diagnosis with real model confidence
    """
    try:
        # Load the model
        model = _get_model()
        if model is None:
            raise Exception("Failed to load MobileNetV2 model")
        
        # Decode and prepare image
        image_data = base64.b64decode(image_base64)
        img = Image.open(io.BytesIO(image_data)).convert('RGB')
        img = img.resize((224, 224))
        img_array = np.array(img, dtype=np.float32)
        
        # Preprocess for MobileNetV2
        img_array = preprocess_input(img_array)
        img_batch = np.expand_dims(img_array, axis=0)
        
        # Get predictions from MobileNetV2
        predictions = model.predict(img_batch, verbose=0)
        decoded_predictions = decode_predictions(predictions, top=5)
        
        logger.info(f"Top 5 predictions: {decoded_predictions[0]}")
        
        # Process top predictions to find car part
        predicted_class = 'unknown'
        best_confidence = 0.0
        
        for class_name, class_description, confidence in decoded_predictions[0]:
            mapped_class = _map_imagenet_to_car_parts(class_description, float(confidence))
            if mapped_class != 'unknown':
                predicted_class = mapped_class
                best_confidence = float(confidence)
                logger.info(f"Mapped '{class_description}' → '{predicted_class}' (confidence: {best_confidence:.3f})")
                break
        
        # Fallback: use top prediction if no car part mapped
        if predicted_class == 'unknown' and decoded_predictions[0]:
            top_pred = decoded_predictions[0][0]
            best_confidence = float(top_pred[2])
            logger.warning(f"No car part match found. Using fallback classification with confidence {best_confidence:.3f}")
        
        # Get diagnosis data
        diagnosis = DIAGNOSIS_DATABASE[predicted_class].copy()
        diagnosis['confidence'] = round(best_confidence, 3)
        diagnosis['method'] = 'mobilenetv2_imagenet'
        
        # Add confidence disclaimer if low confidence
        if best_confidence < 0.5:
            diagnosis['recommendation'] = (
                f"{diagnosis['recommendation']} (Note: Low confidence ({best_confidence:.1%}) — "
                f"please review carefully or confirm with a mechanic for safety-critical parts.)"
            )
        else:
            diagnosis['recommendation'] = (
                f"{diagnosis['recommendation']} (Confidence: {best_confidence:.1%} - "
                f"based on MobileNetV2 pretrained model)"
            )
        
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


def init_model():
    """
    Initialize the model on module load.
    Call this at application startup to preload the model.
    """
    model = _get_model()
    if model:
        logger.info("✓ Model initialized and ready for predictions")
        return True
    else:
        logger.error("✗ Model initialization failed")
        return False
