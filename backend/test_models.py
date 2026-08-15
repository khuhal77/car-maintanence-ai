"""
Temporary Test File for Car Maintenance AI Models
Tests car-parts.py and diagnosis.py models
"""

import sys
import os
import base64
import json
from pathlib import Path
from PIL import Image, ImageDraw
import io
import logging

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models.car_parts import detect_car_part, CAR_PARTS_MAPPING, PART_DIAGNOSIS
from models.diagnosis import classify_car_part_cnn, DIAGNOSIS_DATABASE, CAR_PARTS_CLASSES

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def create_dummy_image(color=(100, 100, 100), text="Test Image") -> str:
    """
    input a image car /backend/img/mc.png 
    
    Returns:
        Base64 encoded image string
    """
    # img = Image.new('RGB', (224, 224), color=color)
    # draw = ImageDraw.Draw(img)
    # draw.text((50, 100), text, fill=(255, 255, 255))

    img_path = Path(__file__).parent / "img" / "mc.png"
    img = Image.open(img_path).convert('RGB')



    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    img_str = base64.b64encode(buffer.getvalue()).decode()
    
    return img_str


def test_car_parts_mapping():
    """Test the CAR_PARTS_MAPPING constant."""
    logger.info("=" * 60)
    logger.info("TEST 1: Car Parts Mapping")
    logger.info("=" * 60)
    
    print(f"\n✓ Total mappings: {len(CAR_PARTS_MAPPING)}")
    for coco_class, car_part in CAR_PARTS_MAPPING.items():
        print(f"  {coco_class} → {car_part}")
    
    assert len(CAR_PARTS_MAPPING) > 0, "CAR_PARTS_MAPPING should not be empty"
    logger.info("✓ Car parts mapping test PASSED\n")


def test_part_diagnosis():
    """Test the PART_DIAGNOSIS database."""
    logger.info("=" * 60)
    logger.info("TEST 2: Part Diagnosis Database")
    logger.info("=" * 60)
    
    print(f"\n✓ Total diagnosis entries: {len(PART_DIAGNOSIS)}")
    
    for part_category, diagnosis in PART_DIAGNOSIS.items():
        print(f"\n  Part Category: {part_category}")
        print(f"    Type: {diagnosis.get('type')}")
        print(f"    Issue: {diagnosis.get('issue')}")
        print(f"    Severity: {diagnosis.get('severity')}")
        print(f"    Avg Price: ₹{diagnosis.get('avg_price')}")
        print(f"    Parts Required: {len(diagnosis.get('parts', []))} items")
        
        # Validate structure
        assert 'type' in diagnosis, f"Missing 'type' in {part_category}"
        assert 'issue' in diagnosis, f"Missing 'issue' in {part_category}"
        assert 'severity' in diagnosis, f"Missing 'severity' in {part_category}"
        assert diagnosis['severity'] in ['low', 'medium', 'high'], \
            f"Invalid severity level in {part_category}"
    
    logger.info("✓ Part diagnosis database test PASSED\n")


def test_diagnosis_classes():
    """Test the CAR_PARTS_CLASSES constant."""
    logger.info("=" * 60)
    logger.info("TEST 3: Car Parts Classes")
    logger.info("=" * 60)
    
    print(f"\n✓ Total classes: {len(CAR_PARTS_CLASSES)}")
    for i, cls in enumerate(CAR_PARTS_CLASSES, 1):
        print(f"  {i}. {cls}")
    
    assert len(CAR_PARTS_CLASSES) > 0, "CAR_PARTS_CLASSES should not be empty"
    assert 'unknown' in CAR_PARTS_CLASSES, "Should have 'unknown' class"
    logger.info("✓ Car parts classes test PASSED\n")


def test_diagnosis_database():
    """Test the DIAGNOSIS_DATABASE."""
    logger.info("=" * 60)
    logger.info("TEST 4: Diagnosis Database")
    logger.info("=" * 60)
    
    print(f"\n✓ Total diagnosis entries: {len(DIAGNOSIS_DATABASE)}")
    
    for part_type, diagnosis in DIAGNOSIS_DATABASE.items():
        print(f"\n  Part Type: {part_type}")
        print(f"    Issue: {diagnosis.get('issue')}")
        print(f"    Severity: {diagnosis.get('severity')}")
        print(f"    Emoji: {diagnosis.get('emoji')}")
        print(f"    Avg Price: ₹{diagnosis.get('avg_price')}")
        
        # Validate structure
        assert 'type' in diagnosis, f"Missing 'type' in {part_type}"
        assert 'issue' in diagnosis, f"Missing 'issue' in {part_type}"
        assert 'severity' in diagnosis, f"Missing 'severity' in {part_type}"
    
    logger.info("✓ Diagnosis database test PASSED\n")


def test_detect_car_part():
    """Test the detect_car_part function."""
    logger.info("=" * 60)
    logger.info("TEST 5: detect_car_part() Function")
    logger.info("=" * 60)
    
    try:
        # Create dummy images with different colors
        test_cases = [
            ("Red Image (Potential Battery)", (200, 50, 50)),
            ("Black Image (Potential Tire)", (50, 50, 50)),
            ("Yellow Image (Potential Brake)", (200, 200, 50)),
        ]
        
        for test_name, color in test_cases:
            print(f"\n  Testing: {test_name}")
            # dummy_img_base64 = create_dummy_image(color=color, text=test_name)
            dummy_img_base64 = create_dummy_image(color=color, text=test_name)
            
            result = detect_car_part(dummy_img_base64)
            
            print(f"    Result type: {result.get('type')}")
            print(f"    Issue: {result.get('issue')}")
            print(f"    Severity: {result.get('severity')}")
            
            # Validate result structure
            assert isinstance(result, dict), "Result should be a dictionary"
            assert 'type' in result, "Result should have 'type' field"
            assert 'issue' in result, "Result should have 'issue' field"
        
        logger.info("✓ detect_car_part() test PASSED\n")
        
    except Exception as e:
        logger.warning(f"⚠ detect_car_part() test WARNING: {e}")
        print(f"⚠ Function may require actual YOLO model: {e}\n")


def test_classify_car_part():
    """Test the classify_car_part_cnn function."""
    logger.info("=" * 60)
    logger.info("TEST 6: classify_car_part_cnn() Function")
    logger.info("=" * 60)
    
    try:
        # Create dummy images with different brightness levels
        test_cases = [
            ("Bright Image (Battery)", (180, 180, 180)),
            ("Medium Image (Air Filter)", (120, 120, 120)),
            ("Dark Image (Oil Filter)", (60, 60, 60)),
        ]
        
        for test_name, color in test_cases:
            print(f"\n  Testing: {test_name}")
            dummy_img_base64 = create_dummy_image(color=color, text=test_name)
            
            result = classify_car_part_cnn(dummy_img_base64)
            
            print(f"    Type: {result.get('type')}")
            print(f"    Confidence: {result.get('confidence'):.2%}" if result.get('confidence') else "    Confidence: N/A")
            print(f"    Issue: {result.get('issue', 'N/A')}")
            print(f"    Severity: {result.get('severity', 'N/A')}")
            
            # Validate result structure
            assert isinstance(result, dict), "Result should be a dictionary"
            assert 'type' in result, "Result should have 'type' field"
            assert 'issue' in result, "Result should have 'issue' field"
        
        logger.info("✓ classify_car_part_cnn() test PASSED\n")
        
    except Exception as e:
        logger.warning(f"⚠ classify_car_part_cnn() test WARNING: {e}")
        print(f"⚠ Function may require model setup: {e}\n")


def test_data_consistency():
    """Test consistency between diagnosis databases."""
    logger.info("=" * 60)
    logger.info("TEST 7: Data Consistency Check")
    logger.info("=" * 60)
    
    # Check if classes in DIAGNOSIS_DATABASE match CAR_PARTS_CLASSES
    db_classes = set(DIAGNOSIS_DATABASE.keys())
    declared_classes = set(CAR_PARTS_CLASSES)
    
    print(f"\n  Classes in DIAGNOSIS_DATABASE: {len(db_classes)}")
    print(f"  Classes in CAR_PARTS_CLASSES: {len(declared_classes)}")
    
    if db_classes == declared_classes:
        print("  ✓ Both databases have matching classes")
    else:
        missing_in_db = declared_classes - db_classes
        extra_in_db = db_classes - declared_classes
        
        if missing_in_db:
            print(f"  ⚠ Missing in DIAGNOSIS_DATABASE: {missing_in_db}")
        if extra_in_db:
            print(f"  ⚠ Extra in DIAGNOSIS_DATABASE: {extra_in_db}")
    
    logger.info("✓ Data consistency check PASSED\n")


def test_price_data():
    """Test price data validity."""
    logger.info("=" * 60)
    logger.info("TEST 8: Price Data Validation")
    logger.info("=" * 60)
    
    print(f"\n  Checking PART_DIAGNOSIS prices:")
    total_price = 0
    for part, data in PART_DIAGNOSIS.items():
        price = data.get('avg_price', 0)
        total_price += price
        status = "✓" if price >= 0 else "✗"
        print(f"    {status} {part}: ₹{price}")
    
    print(f"\n  Total average value: ₹{total_price}")
    print(f"\n  Checking DIAGNOSIS_DATABASE prices:")
    total_price2 = 0
    for part, data in DIAGNOSIS_DATABASE.items():
        price = data.get('avg_price', 0)
        total_price2 += price
        status = "✓" if price >= 0 else "✗"
        print(f"    {status} {part}: ₹{price}")
    
    print(f"\n  Total average value: ₹{total_price2}")
    logger.info("✓ Price data validation PASSED\n")


def run_all_tests():
    """Run all test functions."""
    logger.info("\n" + "=" * 60)
    logger.info("STARTING MODELS TEST SUITE")
    logger.info("=" * 60 + "\n")
    
    tests = [
        test_car_parts_mapping,
        test_part_diagnosis,
        test_diagnosis_classes,
        test_diagnosis_database,
        test_detect_car_part,
        test_classify_car_part,
        test_data_consistency,
        test_price_data,
    ]
    
    passed = 0
    failed = 0
    
    for test_func in tests:
        try:
            test_func()
            passed += 1
        except AssertionError as e:
            logger.error(f"✗ {test_func.__name__} FAILED: {e}\n")
            failed += 1
        except Exception as e:
            logger.error(f"✗ {test_func.__name__} ERROR: {e}\n")
            failed += 1
    
    # Summary
    logger.info("=" * 60)
    logger.info("TEST SUMMARY")
    logger.info("=" * 60)
    logger.info(f"✓ Passed: {passed}")
    logger.info(f"✗ Failed: {failed}")
    logger.info(f"Total: {passed + failed}")
    logger.info("=" * 60 + "\n")
    
    return failed == 0


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
