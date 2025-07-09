from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import cv2
import numpy as np
from PIL import Image
import tensorflow as tf
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input, decode_predictions
import io
import logging
import os
import time
from urllib.parse import urlparse

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Load pre-trained MobileNetV2 model
logger.info("Loading MobileNetV2 model...")
model = MobileNetV2(weights='imagenet')
logger.info("Model loaded successfully!")

# OCR might not be available in all environments, but we can use other methods for document detection
HAS_OCR = False
logger.info("Using heuristic-based document detection")

# Marketplace-relevant categories mapping - enhanced with more detailed categories
MARKETPLACE_CATEGORIES = {
    'fabric': ['jersey', 'velvet', 'wool', 'denim', 'kimono', 'diaper', 'quilt', 'scarf', 'stole', 'gown', 'abaya', 'bathrobe', 'cloak'],
    'cloth': ['jersey', 'velvet', 'wool', 'denim', 'bow_tie', 'apron', 'sock', 'pajama', 'raincoat', 'T-shirt', 'gown', 'sweater', 'cardigan', 'hoodie'],
    'wood': ['park_bench', 'picket_fence', 'wooden_spoon', 'cutting_board', 'timber', 'plywood', 'crate', 'pallet', 'lumber', 'driftwood', 'branch', 'sawdust'],
    'metal': ['chain_saw', 'hammer', 'wrench', 'nail', 'screw', 'can_opener', 'tin_can', 'aluminum', 'iron', 'steel', 'wire', 'utensil', 'spoon', 'fork', 'knife'],
    'plastic': ['plastic_bag', 'bottle_cap', 'container', 'bucket', 'cup', 'straw', 'polymer', 'bottle', 'toy', 'tub', 'tupperware', 'PET', 'HDPE', 'PVC'],
    'glass': ['wine_bottle', 'beer_bottle', 'drinking_glass', 'jar', 'window', 'vase', 'mirror', 'goblet', 'tumbler', 'jug', 'container', 'lens'],
    'paper': ['envelope', 'book_jacket', 'notebook', 'menu', 'cardboard', 'carton', 'box', 'packaging', 'newspaper', 'magazine', 'parchment'],
    'electronics': ['desktop_computer', 'laptop', 'cellular_telephone', 'remote_control', 'circuit', 'board', 'battery', 'cable', 'charger', 'keyboard', 'mouse'],
    'furniture': ['chair', 'table', 'desk', 'bookshelf', 'wardrobe', 'sofa', 'couch', 'cupboard', 'cabinet', 'nightstand', 'stool', 'ottoman', 'bench'],
    'tools': ['hammer', 'screwdriver', 'wrench', 'saw', 'drill', 'pliers', 'scissors', 'cutter', 'tape_measure', 'level', 'clamp', 'vise', 'chisel'],
    'rubber': ['tire', 'boot', 'mat', 'band', 'shoe_sole', 'gasket', 'eraser', 'glove', 'wader', 'hose'],
    'leather': ['saddle', 'suitcase', 'handbag', 'wallet', 'boot', 'shoe', 'belt', 'jacket', 'briefcase', 'purse'],
    'yarn': ['ball', 'skein', 'thread', 'wool', 'cotton', 'acrylic', 'knitting', 'crochet', 'embroidery', 'spun', 'string'],
    'natural': ['bamboo', 'shell', 'cork', 'plant_fiber', 'rattan', 'jute', 'wicker', 'straw', 'coconut', 'seed', 'pod', 'leaf', 'flower']
}

# Document-related categories and keywords that should be flagged (not recyclable materials)
DOCUMENT_KEYWORDS = [
    'document', 'text', 'certificate', 'diploma', 'license', 'identification',
    'passport', 'card', 'id_card', 'book', 'notebook', 'sheet', 'paper', 'letter',
    'envelope', 'form', 'manuscript', 'contract', 'receipt', 'prescription', 'ballot'
]

# Enhanced category mapping for recyclable vs non-recyclable items
RECYCLABLE_CATEGORIES = set(['fabric', 'cloth', 'wood', 'metal', 'plastic', 'glass', 'paper', 'electronics', 'rubber', 'leather', 'yarn', 'natural'])

# Sustainable DIY project categories
DIY_PROJECT_CATEGORIES = {
    'upcycled_furniture': ['sofa', 'chair', 'table', 'desk', 'cabinet', 'shelf', 'bench', 'stool'],
    'garden_projects': ['planter', 'pot', 'trellis', 'composter', 'birdhouse', 'greenhouse', 'garden'],
    'home_decor': ['lamp', 'decoration', 'ornament', 'candle', 'holder', 'frame', 'mirror', 'clock'],
    'fashion_accessories': ['jewelry', 'necklace', 'bracelet', 'earring', 'bag', 'purse', 'belt', 'wallet']
}

# Categories for non-marketplace images (for post/profile detection)
NON_MARKETPLACE_CATEGORIES = {
    'person': ['person', 'people', 'face', 'woman', 'man', 'child', 'portrait', 'selfie', 'human'],
    'landscape': ['mountain', 'field', 'forest', 'beach', 'sky', 'sea', 'ocean', 'lake', 'river', 'waterfall'],
    'urban': ['street', 'building', 'city', 'skyline', 'bridge', 'road', 'highway', 'architecture'],
    'event': ['celebration', 'party', 'wedding', 'conference', 'ceremony', 'festival', 'concert'],
    'food': ['food', 'fruit', 'vegetable', 'meal', 'dish', 'cuisine', 'dinner', 'breakfast', 'lunch'],
    'animal': ['dog', 'cat', 'bird', 'fish', 'pet', 'animal', 'wildlife'],
    'plant': ['plant', 'flower', 'tree', 'grass', 'garden', 'forest', 'jungle', 'bush', 'herb']
}

def download_image_from_url(url):
    """Download image from URL and return PIL Image object"""
    try:
        # Validate URL
        parsed_url = urlparse(url)
        if not all([parsed_url.scheme, parsed_url.netloc]):
            raise ValueError("Invalid URL format")
        
        # Download image
        response = requests.get(url, timeout=30, stream=True)
        response.raise_for_status()
        
        # Check content type
        content_type = response.headers.get('content-type', '')
        if not content_type.startswith('image/'):
            raise ValueError(f"URL does not point to an image. Content-Type: {content_type}")
        
        # Convert to PIL Image
        image = Image.open(io.BytesIO(response.content))
        
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
            
        return image
    
    except requests.exceptions.RequestException as e:
        logger.error(f"Error downloading image: {e}")
        raise Exception(f"Failed to download image: {str(e)}")
    except Exception as e:
        logger.error(f"Error processing image: {e}")
        raise Exception(f"Failed to process image: {str(e)}")

def check_image_quality(image):
    """Check image quality using OpenCV"""
    try:
        # Convert PIL image to OpenCV format
        opencv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        # Check image dimensions
        height, width = opencv_image.shape[:2]
        min_size = 100
        
        if height < min_size or width < min_size:
            return {
                'quality_score': 20,
                'status': 'low_quality',
                'issues': ['Image too small']
            }
        
        # Check for blurriness using Laplacian variance
        gray = cv2.cvtColor(opencv_image, cv2.COLOR_BGR2GRAY)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        # Check brightness
        brightness = np.mean(gray)
        
        # Determine quality scores
        blur_threshold = 100
        brightness_min, brightness_max = 50, 200
        
        issues = []
        quality_score = 100
        
        # Blur check
        if laplacian_var < blur_threshold:
            issues.append('Image appears blurry')
            quality_score -= 40
        
        # Brightness check
        if brightness < brightness_min:
            issues.append('Image too dark')
            quality_score -= 20
        elif brightness > brightness_max:
            issues.append('Image too bright')
            quality_score -= 20
        
        # Overall quality assessment
        if quality_score < 50:
            status = 'low_quality'
        elif quality_score < 70:
            status = 'blurry'
        else:
            status = 'usable'
        
        return {
            'quality_score': max(quality_score, 0),
            'status': status,
            'issues': issues,
            'metrics': {
                'blur_score': laplacian_var,
                'brightness': brightness,
                'dimensions': f"{width}x{height}"
            }
        }
        
    except Exception as e:
        logger.error(f"Error in quality check: {e}")
        return {
            'quality_score': 50,
            'status': 'usable',
            'issues': ['Quality check failed'],
            'error': str(e)
        }

def classify_image_with_mobilenet(image):
    """Classify image using MobileNetV2"""
    try:
        # Resize image to 224x224 (MobileNetV2 input size)
        img_resized = image.resize((224, 224))
        
        # Convert to numpy array and preprocess
        img_array = np.array(img_resized)
        img_array = np.expand_dims(img_array, axis=0)
        img_array = preprocess_input(img_array)
        
        # Make prediction
        predictions = model.predict(img_array, verbose=0)
        decoded_predictions = decode_predictions(predictions, top=5)[0]
        
        # Get top prediction
        top_prediction = decoded_predictions[0]
        label = top_prediction[1]
        confidence = float(top_prediction[2]) * 100
        
        # Map to marketplace categories
        detected_category = 'other'
        for category, keywords in MARKETPLACE_CATEGORIES.items():
            if any(keyword in label.lower() for keyword in keywords):
                detected_category = category
                break
        
        return {
            'label': detected_category,
            'raw_label': label,
            'confidence': round(confidence, 2),
            'all_predictions': [
                {
                    'label': pred[1],
                    'confidence': round(float(pred[2]) * 100, 2)
                } for pred in decoded_predictions
            ]
        }
        
    except Exception as e:
        logger.error(f"Error in image classification: {e}")
        return {
            'label': 'unknown',
            'raw_label': 'unknown',
            'confidence': 0,
            'error': str(e)
        }

def detect_text_in_image(image):
    """Detect if image contains significant text (suggesting a document)"""
    try:
        # Convert PIL image to OpenCV format
        opencv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        # Convert to grayscale
        gray = cv2.cvtColor(opencv_image, cv2.COLOR_BGR2GRAY)
        
        # Apply threshold to get binary image
        _, binary = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY_INV)
        
        # Find contours which could be text
        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Analyze contours for text-like patterns
        small_rectangular_contours = 0
        text_like_contours = 0
        height, width = gray.shape
        image_area = height * width
        
        # Check for large objects like bottles or tools
        largest_contour_area = 0
        has_central_object = False
        if contours:
            largest_contour = max(contours, key=cv2.contourArea)
            largest_contour_area = cv2.contourArea(largest_contour)
            largest_area_ratio = largest_contour_area / image_area
            
            # Get bounding rect of largest contour
            x, y, w, h = cv2.boundingRect(largest_contour)
            aspect_ratio = float(w) / h if h > 0 else 0
            
            # Check if it's a container/bottle shape (tall rectangle in center)
            center_x = x + w/2
            is_centered = width * 0.3 < center_x < width * 0.7
            
            if largest_area_ratio > 0.25 and is_centered:  # Large central object
                if 0.3 < aspect_ratio < 0.8 or 1.2 < aspect_ratio < 3.0:  # Common ratios for bottles/containers/tools
                    has_central_object = True
                    logger.info(f"Large central object detected (likely bottle/container/tool). Ratio: {largest_area_ratio:.2f}, Aspect ratio: {aspect_ratio:.2f}")
        
        # Count text-like contours
        for contour in contours:
            # Skip the large central object's contours
            if has_central_object and cv2.contourArea(contour) > largest_contour_area * 0.8:
                continue
                
            x, y, w, h = cv2.boundingRect(contour)
            area = w * h
            aspect_ratio = float(w) / h if h > 0 else 0
            
            # Text characteristics now require more strict criteria
            if (area < image_area * 0.015 and  # Smaller than before
                area > 30 and                  # Not noise
                area < 400 and                 # Not too large for text
                (aspect_ratio > 2.5 or aspect_ratio < 0.4) and  # More extreme rectangular
                w < width / 5):                # Narrower
                text_like_contours += 1
                
                # Additional check for organized text patterns
                if (area < image_area * 0.01 and  # Even smaller
                    area > 50 and              # Still not noise
                    (aspect_ratio > 3.0 or aspect_ratio < 0.33)):  # Very rectangular
                    small_rectangular_contours += 1
        
        # Higher thresholds for text detection
        has_text_pattern = small_rectangular_contours > 35 and text_like_contours > 20
        
        # Calculate text organization
        is_organized = False
        line_clusters = 0
        text_rows = {}
        
        if len(contours) > 30:  # Require more contours
            y_positions = [cv2.boundingRect(c)[1] for c in contours if cv2.contourArea(c) > 20]
            y_positions.sort()
            
            # Group y-positions into rows
            current_row = []
            prev_y = y_positions[0] if y_positions else 0
            
            for y in y_positions:
                if abs(y - prev_y) <= 5:  # Same row
                    current_row.append(y)
                else:  # New row
                    if len(current_row) >= 4:  # Require more elements per row
                        text_rows[prev_y] = len(current_row)
                        line_clusters += 1
                    current_row = [y]
                prev_y = y
            
            # Add last row if valid
            if len(current_row) >= 4:
                text_rows[prev_y] = len(current_row)
                line_clusters += 1
            
            # Check row organization
            is_organized = line_clusters >= 5  # Require more rows
            
            # Check row spacing consistency
            if len(text_rows) >= 3:
                row_positions = sorted(text_rows.keys())
                spacings = [row_positions[i+1] - row_positions[i] for i in range(len(row_positions)-1)]
                avg_spacing = sum(spacings) / len(spacings)
                spacing_variance = sum((s - avg_spacing) ** 2 for s in spacings) / len(spacings)
                
                # Documents typically have very consistent row spacing
                is_organized = is_organized and spacing_variance < 25
        
        # Calculate confidence with stronger weight on organization and presence of central objects
        confidence = 0
        
        if has_text_pattern:
            confidence += 30  # Reduced base confidence
        
        if is_organized and line_clusters >= 5:
            confidence += 35  # More weight on organization
            
        # Additional confidence for very text-heavy images
        if text_like_contours > 30 and small_rectangular_contours > 40:
            confidence += 20
            
        # Significant reduction for recyclable-like objects
        if has_central_object:
            confidence = max(0, confidence - 50)  # Stronger penalty
        
        # Normalize confidence
        confidence = min(confidence, 100)
        
        return {
            'has_text_pattern': has_text_pattern,
            'confidence': confidence,
            'organized_text': is_organized,
            'text_contours': small_rectangular_contours,
            'text_like_contours': text_like_contours,
            'line_clusters': line_clusters,
            'has_central_object': has_central_object,
            'text_rows': len(text_rows) if text_rows else 0
        }
        
    except Exception as e:
        logger.error(f"Error in text detection: {e}")
        return {
            'has_text_pattern': False,
            'confidence': 0,
            'error': str(e)
        }

def detect_document_visual_patterns(image):
    """Look for visual patterns common in documents while avoiding false positives for recyclables"""
    try:
        # Convert PIL image to OpenCV format
        opencv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        gray = cv2.cvtColor(opencv_image, cv2.COLOR_BGR2GRAY)
        
        # Document pattern scores
        pattern_score = 0
        evidence = []
        recyclable_evidence = []
        
        height, width = gray.shape
        image_area = height * width
        
        # Enhanced binary thresholding for better object detection
        _, binary_large = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY_INV)
        contours_large, _ = cv2.findContours(binary_large, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Analyze largest objects
        has_large_central_object = False
        has_recyclable_shape = False
        large_central_area_ratio = 0
        
        if contours_large:
            largest_contour = max(contours_large, key=cv2.contourArea)
            largest_area = cv2.contourArea(largest_contour)
            large_central_area_ratio = largest_area / image_area
            
            # Get bounding rect and analyze shape
            x, y, w, h = cv2.boundingRect(largest_contour)
            aspect_ratio = float(w) / h if h > 0 else 0
            center_x = x + w/2
            center_y = y + h/2
            
            # Check if object is centrally positioned
            is_centered = (width * 0.2 < center_x < width * 0.8 and
                         height * 0.2 < center_y < height * 0.8)
            
            # Detect common recyclable shapes
            if large_central_area_ratio > 0.2 and is_centered:
                if 0.2 < aspect_ratio < 0.8:  # Tall objects (bottles, containers)
                    has_recyclable_shape = True
                    recyclable_evidence.append("Detected tall container/bottle shape")
                elif 0.8 < aspect_ratio < 1.2:  # Square-ish objects (tools, small items)
                    has_recyclable_shape = True
                    recyclable_evidence.append("Detected square/compact object shape")
                elif 1.2 < aspect_ratio < 3.0:  # Wide objects (boards, materials)
                    has_recyclable_shape = True
                    recyclable_evidence.append("Detected wide object/material shape")
                
                has_large_central_object = True
                logger.info(f"Large central object: area_ratio={large_central_area_ratio:.2f}, aspect_ratio={aspect_ratio:.2f}")
        
        # 1. Line detection with better filtering
        edges = cv2.Canny(gray, 50, 150, apertureSize=3)
        lines = cv2.HoughLines(edges, 1, np.pi/180, threshold=130)
        
        horizontal_lines = 0
        vertical_lines = 0
        diagonal_lines = 0
        
        if lines is not None:
            for line in lines:
                rho, theta = line[0]
                # Tighter angle thresholds
                if theta < 0.05 or abs(theta - np.pi) < 0.05:
                    horizontal_lines += 1
                elif abs(theta - np.pi/2) < 0.05:
                    vertical_lines += 1
                else:
                    diagonal_lines += 1
        
        # Documents typically have more horizontal/vertical lines than diagonal
        if horizontal_lines > 8 and vertical_lines > 8:
            if diagonal_lines < (horizontal_lines + vertical_lines) / 2:
                pattern_score += 25
                evidence.append(f"Strong grid pattern: {horizontal_lines}h, {vertical_lines}v")
        
        # 2. Rectangle detection with better classification
        _, binary = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY_INV)
        contours, _ = cv2.findContours(binary, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        
        form_field_rectangles = 0  # Small, uniform rectangles like form fields
        header_rectangles = 0      # Wide rectangles like headers
        content_rectangles = 0     # Medium rectangles like content blocks
        
        for contour in contours:
            epsilon = 0.04 * cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, epsilon, True)
            
            if len(approx) == 4:  # Rectangular shape
                area = cv2.contourArea(contour)
                x, y, w, h = cv2.boundingRect(contour)
                aspect_ratio = float(w) / h if h > 0 else 0
                
                # Skip the main large object if it's been identified as recyclable
                if has_recyclable_shape and area > image_area * 0.2:
                    continue
                
                # Classify rectangles by their characteristics
                if 200 < area < 2000 and 2.5 < aspect_ratio < 8.0:
                    header_rectangles += 1  # Likely document headers
                elif 500 < area < 5000 and 1.5 < aspect_ratio < 3.0:
                    content_rectangles += 1  # Content blocks
                elif 100 < area < 1000 and 0.8 < aspect_ratio < 1.2:
                    form_field_rectangles += 1  # Form fields/checkboxes
        
        # Weight different types of rectangles
        if header_rectangles > 2:
            pattern_score += 20
            evidence.append(f"Header-like rectangles: {header_rectangles}")
        if form_field_rectangles > 5:
            pattern_score += 15
            evidence.append(f"Form field-like rectangles: {form_field_rectangles}")
        if content_rectangles > 3:
            pattern_score += 15
            evidence.append(f"Content block rectangles: {content_rectangles}")
        
        # 3. Enhanced histogram analysis
        hist = cv2.calcHist([gray], [0], None, [256], [0, 256])
        peaks = np.where((hist[1:-1] > hist[:-2]) & (hist[1:-1] > hist[2:]))[0] + 1
        
        # Analyze intensity distribution
        bright_peaks = [p for p in peaks if p > 200]  # Background
        dark_peaks = [p for p in peaks if p < 50]    # Text
        mid_peaks = [p for p in peaks if 50 <= p <= 200]  # Content
        
        # Documents often have clear peaks for background and text
        if len(bright_peaks) >= 1 and len(dark_peaks) >= 1 and len(mid_peaks) <= 2:
            pattern_score += 15
            evidence.append("Document-like intensity distribution")
        
        # Strong penalty for recyclable characteristics
        if has_recyclable_shape:
            pattern_score = max(0, pattern_score - 40)
            evidence.append("Applied recyclable shape penalty")
        
        return {
            'is_document_pattern': pattern_score > 60,
            'confidence': min(pattern_score, 100),
            'evidence': evidence,
            'recyclable_evidence': recyclable_evidence,
            'has_recyclable_shape': has_recyclable_shape,
            'grid_score': horizontal_lines + vertical_lines,
            'rectangle_score': header_rectangles + form_field_rectangles + content_rectangles
        }
    
    except Exception as e:
        logger.error(f"Error in visual pattern detection: {e}")
        return {
            'is_document_pattern': False,
            'confidence': 0,
            'error': str(e)
        }

def detect_document_content(image, raw_label, filename=''):
    """Analyze image content for document-specific features with improved recyclable detection"""
    try:
        # First, check if this is a high-confidence recyclable material
        is_high_confidence_recyclable = False
        recyclable_evidence = []
        
        # Check filename
        recyclable_keywords = ['bottle', 'container', 'tool', 'material', 'plastic', 'metal', 'wood', 'glass', 'screw', 'driver']
        if any(keyword in filename.lower() for keyword in recyclable_keywords):
            recyclable_evidence.append(f"Filename indicates recyclable: {filename}")
        
        # Check raw label with confidence scoring
        recyclable_labels = {
            'bottle': 100,
            'container': 90,
            'plastic_bag': 90,
            'water_bottle': 100,
            'tool': 100,
            'screwdriver': 100,
            'measuring_cup': 90,
            'lumbermill': 90,
            'Petri_dish': 80,
            'packet': 70,
            'saltshaker': 90,
            'utensil': 90
        }
        
        raw_label_lower = raw_label.lower() if raw_label else ''
        label_confidence = recyclable_labels.get(raw_label_lower, 0)
        
        if label_confidence >= 90:
            is_high_confidence_recyclable = True
            recyclable_evidence.append(f"High confidence recyclable label: {raw_label} ({label_confidence})")
        elif label_confidence > 0:
            recyclable_evidence.append(f"Recyclable label: {raw_label} ({label_confidence})")
        
        # If we have a high-confidence recyclable, return early
        if is_high_confidence_recyclable:
            return {
                'is_document': False,
                'confidence': 0,
                'evidence': recyclable_evidence,
                'has_recyclable_indicators': True,
                'recyclable_confidence': label_confidence,
                'high_confidence_recyclable': True
            }
        
        # Otherwise proceed with normal document detection
        text_results = detect_text_in_image(image)
        pattern_results = detect_document_visual_patterns(image)
        
        # Initialize detection metrics
        is_document = False
        confidence = 0
        evidence = []
        has_recyclable_indicators = bool(recyclable_evidence)
        recyclable_confidence = label_confidence
        
        # 1. Check text detection results
        if text_results['has_text_pattern']:
            text_confidence = text_results['confidence']
            
            if text_confidence > 75:
                confidence += text_confidence * 0.35
                evidence.append(f"Strong text patterns detected ({text_confidence}% confidence)")
                
            if text_results['organized_text'] and text_results['line_clusters'] >= 6:
                confidence += 15
                evidence.append(f"Well-organized text structure ({text_results['line_clusters']} line clusters)")
        
        # 2. Check visual patterns
        if pattern_results['is_document_pattern']:
            pattern_confidence = pattern_results['confidence']
            if pattern_confidence > 65:
                confidence += pattern_confidence * 0.25
                evidence.extend(pattern_results['evidence'])
        
        # 3. Consider recyclable indicators
        if pattern_results['has_recyclable_shape']:
            has_recyclable_indicators = True
            recyclable_confidence += 35
            evidence.extend(pattern_results['recyclable_evidence'])
        
        if text_results.get('has_central_object', False):
            has_recyclable_indicators = True
            recyclable_confidence += 25
            evidence.append("Central object detected in image")
        
        # Apply recyclable penalty
        if has_recyclable_indicators:
            confidence_reduction = min(70, recyclable_confidence)
            confidence = max(0, confidence - confidence_reduction)
            evidence.append(f"Applied recyclable material penalty: -{confidence_reduction}")
        
        # 4. Final decision making
        is_document = confidence > 65 and not has_recyclable_indicators
        
        # Special handling for known document filenames
        document_keywords = ['doc', 'card', 'id', 'certificate', 'mail', 'form']
        if any(keyword in filename.lower() for keyword in document_keywords):
            if not has_recyclable_indicators or recyclable_confidence < 30:
                is_document = True
                confidence = max(confidence, 75)
                evidence.append(f"Filename indicates document type: {filename}")
        
        # Override for strong recyclable indicators
        if recyclable_confidence >= 60 or label_confidence >= 70:
            is_document = False
            confidence = 0
            evidence.append(f"Override: Strong recyclable indicators present (confidence: {recyclable_confidence})")
        
        # Final confidence normalization
        confidence = min(round(confidence, 1), 100)
        
        return {
            'is_document': is_document,
            'confidence': confidence,
            'evidence': evidence,
            'has_recyclable_indicators': has_recyclable_indicators,
            'recyclable_confidence': recyclable_confidence,
            'text_results': text_results,
            'pattern_results': pattern_results,
            'high_confidence_recyclable': is_high_confidence_recyclable
        }
        
    except Exception as e:
        logger.error(f"Error in document content detection: {e}")
        return {
            'is_document': False,
            'confidence': 0,
            'error': str(e)
        }

@app.route('/health')
def health_check():
    """Health check endpoint"""
    try:
        return jsonify({
            'status': 'ok',
            'description': 'MobileNetV2 model loaded and functional',
            'capabilities': [
                'document_detection',
                'fraud_detection',
                'image_quality_analysis',
                'material_classification',
                'content_moderation',
                'recyclable_material_detection',
                'admin_review_flagging'
            ],
            'endpoints': [
                {'path': '/health', 'method': 'GET', 'description': 'Health check'},
                {'path': '/predict', 'method': 'POST', 'description': 'Image analysis'}
            ]
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500

@app.route('/predict', methods=['POST'])
def predict():
    """Main prediction endpoint for analyzing marketplace images"""
    try:
        # Get image URL and optional context from request
        data = request.get_json()
        
        if not data or 'image_url' not in data:
            return jsonify({
                'error': 'Missing image_url in request body',
                'status': 'error'
            }), 400
        
        image_url = data['image_url']
        
        # Optional hint about the intended usage context
        # This allows the client to specify if they're uploading for marketplace, profile, or post
        intended_context = data.get('context', 'marketplace')  # Default to marketplace
        
        # Option to return admin-level details
        admin_mode = data.get('admin_mode', False)
        
        logger.info(f"Analyzing image: {image_url} (intended context: {intended_context}, admin_mode: {admin_mode})")
        
        # Download and load image
        image = download_image_from_url(image_url)
        
        # Check image quality
        quality_result = check_image_quality(image)
        
        # Classify image
        classification_result = classify_image_with_mobilenet(image)
        
        # Check for document content with enhanced detection
        document_result = detect_document_content(image, classification_result)
        
        # Check for suspicious content with advanced detection
        suspicious_result = analyze_for_suspicious_content(image, classification_result)
        
        # Process all results and generate comprehensive response
        response = process_analysis_results(
            image_url=image_url,
            image=image,
            quality_result=quality_result,
            classification_result=classification_result,
            document_result=document_result,
            suspicious_result=suspicious_result
        )
        
        # If client provided an intended context, add it to the response and adjust status if needed
        if intended_context:
            response['intended_context'] = intended_context
            
            # Check if our detected context matches the intended context
            detected_context = response.get('context_analysis', {}).get('primary_context', 'unknown')
            context_match = intended_context == detected_context
            context_confidence = response.get('context_analysis', {}).get('context_scores', {}).get(intended_context, 0)
            
            response['context_match'] = context_match
            
            # Flag for review if there's a significant context mismatch and not already rejected
            if not context_match and context_confidence < 20 and response['status'] != 'rejected':
                if response['status'] != 'pending_review':  # Don't override existing flagged status
                    response['status'] = 'pending_review'
                    response['admin_review_required'] = True
                    response['admin_status'] = 'flagged'
                    response['specific_issue'] = 'severe_context_mismatch'
                    
                    # Add to admin notes
                    if 'admin_notes' not in response:
                        response['admin_notes'] = []
                    response['admin_notes'].append(f"Context mismatch: Intended {intended_context}, detected {detected_context}")
                    response['admin_notes'].append(f"Context confidence score for {intended_context}: {context_confidence}/100")
            
            # Add specific guidance if contexts don't match
            if not context_match and 'recommendations' in response:
                if intended_context == 'marketplace' and detected_context in ['profile', 'post']:
                    response['recommendations'].append("This image appears to be more suitable for a profile or post rather than a marketplace item.")
                    response['recommendations'].append("For marketplace listings, please upload images focusing on the recyclable material itself.")
                
                elif intended_context == 'profile' and detected_context == 'marketplace':
                    response['recommendations'].append("This image appears to show an object rather than a person, which may not be ideal for a profile picture.")
                
                elif intended_context == 'post' and detected_context == 'marketplace':
                    response['recommendations'].append("This image appears to focus on a single material/object. For posts, you might want to show the full project or impact.")
        
        # Remove admin details for non-admin requests unless specifically requested
        if not admin_mode:
            # Keep the user-facing status but remove admin-specific fields
            admin_fields = ['admin_status', 'admin_notes', 'admin_review_required', 
                          'document_analysis', 'suspicious_analysis', 'confidence_metrics']
            
            for field in admin_fields:
                if field in response:
                    response.pop(field)
                    
            # Simplify other results to essentials
            if 'quality_analysis' in response:
                quality_essentials = {
                    'status': response['quality_analysis'].get('status'),
                    'quality_score': response['quality_analysis'].get('quality_score')
                }
                response['quality_analysis'] = quality_essentials
                
            if 'classification' in response:
                classification_essentials = {
                    'label': response['classification'].get('label'),
                    'confidence': response['classification'].get('confidence')
                }
                response['classification'] = classification_essentials
        
        # Log the analysis results with more details for debugging
        logger.info(f"Analysis complete: {response['status']} (confidence: {classification_result['confidence']:.1f}%, context: {detected_context}, intended: {intended_context})")
        if response['status'] != 'usable' and response.get('specific_issue'):
            logger.info(f"Issue detected: {response.get('specific_issue')}, admin_review: {response.get('admin_review_required', False)}")
        
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error in prediction: {e}")
        return jsonify({
            'error': f'Image analysis failed: {str(e)}',
            'status': 'error',
            'label': 'unknown',
            'confidence': 0
        }), 500

@app.route('/analyze-batch', methods=['POST'])
def analyze_batch():
    """Analyze multiple images in batch"""
    try:
        data = request.get_json()
        
        if not data or 'image_urls' not in data:
            return jsonify({
                'error': 'Missing image_urls array in request body',
                'status': 'error'
            }), 400
        
        image_urls = data['image_urls']
        
        if len(image_urls) > 10:  # Limit batch size
            return jsonify({
                'error': 'Maximum 10 images allowed per batch',
                'status': 'error'
            }), 400
        
        results = []
        
        for i, url in enumerate(image_urls):
            try:
                # Process this URL directly
                # Download and load image
                image = download_image_from_url(url)
                
                # Check image quality
                quality_result = check_image_quality(image)
                
                # Classify image
                classification_result = classify_image_with_mobilenet(image)
                
                # Check for document content
                document_result = detect_document_content(classification_result, image)
                
                # Check for suspicious content
                suspicious_result = analyze_for_suspicious_content(image, classification_result)
                
                # Process all results and generate response
                single_result = process_analysis_results(
                    image_url=url,
                    image=image,
                    quality_result=quality_result,
                    classification_result=classification_result,
                    document_result=document_result,
                    suspicious_result=suspicious_result
                )
                
                results.append({
                    'index': i,
                    'url': url,
                    'result': single_result
                })
                
            except Exception as e:
                logger.error(f"Error processing image {i} ({url}): {e}")
                results.append({
                    'index': i,
                    'url': url,
                    'error': str(e)
                })
        
        # Summarize issues found
        issues_summary = {
            'total': len(results),
            'usable': 0,
            'blurry': 0,
            'low_quality': 0,
            'documents': 0,
            'suspicious': 0,
            'low_confidence': 0,
            'errors': 0,
            'non_recyclable': 0
        }
        
        # Context summary
        context_summary = {
            'marketplace': 0,
            'profile': 0,
            'post': 0,
            'diy_project': 0,
            'unknown': 0
        }
        
        for result in results:
            if 'error' in result:
                issues_summary['errors'] += 1
            elif 'result' in result and isinstance(result['result'], dict):
                status = result['result'].get('status', '')
                if status == 'usable':
                    issues_summary['usable'] += 1
                elif status == 'blurry':
                    issues_summary['blurry'] += 1
                elif status == 'low_quality':
                    issues_summary['low_quality'] += 1
                elif status == 'inappropriate_content':
                    issues_summary['documents'] += 1
                elif status == 'suspicious':
                    issues_summary['suspicious'] += 1
                elif status == 'low_confidence':
                    issues_summary['low_confidence'] += 1
                elif status == 'non_recyclable':
                    issues_summary['non_recyclable'] += 1
                
                # Track contexts
                context = result['result'].get('context_analysis', {}).get('primary_context', 'unknown')
                if context in context_summary:
                    context_summary[context] += 1
                else:
                    context_summary['unknown'] += 1
                    
        # Add overall batch recommendations
        batch_recommendations = []
        
        # Analyze the batch for patterns
        if issues_summary['documents'] > 0:
            batch_recommendations.append(f"{issues_summary['documents']} images appear to be documents or text-heavy content.")
            batch_recommendations.append("Please ensure you're uploading images of actual recyclable materials, not documentation or receipts.")
        
        if issues_summary['low_quality'] + issues_summary['blurry'] > 0:
            batch_recommendations.append(f"{issues_summary['low_quality'] + issues_summary['blurry']} images have quality issues (blurry, too dark/bright, or too small).")
            batch_recommendations.append("Try to take photos in good lighting with your camera steady and focused on the items.")
        
        if issues_summary['suspicious'] > 0:
            batch_recommendations.append(f"{issues_summary['suspicious']} images were flagged for potentially inappropriate content.")
            batch_recommendations.append("Please review our community guidelines regarding acceptable content.")
            
        if context_summary['marketplace'] < len(results) * 0.5 and 'context' in data and data['context'] == 'marketplace':
            batch_recommendations.append(f"Many of your images ({len(results) - context_summary['marketplace']}) don't appear to be focused on recyclable materials.")
            batch_recommendations.append("For marketplace listings, please focus on clearly showing the recyclable materials you're offering.")
        
        return jsonify({
            'batch_results': results,
            'total_processed': len(results),
            'issues_summary': issues_summary,
            'context_summary': context_summary,
            'batch_recommendations': batch_recommendations,
            'status': 'completed'
        })
        
    except Exception as e:
        logger.error(f"Error in batch analysis: {e}")
        return jsonify({
            'error': f'Batch analysis failed: {str(e)}',
            'status': 'error'
        }), 500

@app.route('/analyze-profile', methods=['POST'])
def analyze_profile():
    """Specialized endpoint for analyzing profile images"""
    try:
        data = request.get_json()
        
        if not data or 'image_url' not in data:
            return jsonify({
                'error': 'Missing image_url in request body',
                'status': 'error'
            }), 400
        
        image_url = data['image_url']
        admin_mode = data.get('admin_mode', False)
        
        logger.info(f"Analyzing profile image: {image_url}")
        
        # Download and load image
        image = download_image_from_url(image_url)
        
        # Check image quality
        quality_result = check_image_quality(image)
        
        # Classify image
        classification_result = classify_image_with_mobilenet(image)
        
        # Check for document content (we don't want IDs as profile pictures)
        document_result = detect_document_content(classification_result, image)
        
        # Check for suspicious content with stricter rules for profile images
        suspicious_result = analyze_for_suspicious_content(image, classification_result)
        
        # Process results with context override for profile
        # Force context to be profile for consistent processing
        response = process_analysis_results(
            image_url=image_url,
            image=image,
            quality_result=quality_result,
            classification_result=classification_result,
            document_result=document_result,
            suspicious_result=suspicious_result
        )
        
        # Override some settings specific to profile images
        detected_context = response.get('context_analysis', {}).get('primary_context', 'unknown')
        profile_confidence = response.get('context_analysis', {}).get('context_scores', {}).get('profile', 0)
        
        # Additional profile-specific checks
        if profile_confidence < 30 and response['status'] != 'rejected':
            # If it's not rejected but doesn't look like a profile image, flag for review
            response['status'] = 'pending_review'
            response['admin_status'] = 'flagged'
            response['admin_review_required'] = True
            response['specific_issue'] = 'not_profile_picture'
            
            if 'admin_notes' not in response:
                response['admin_notes'] = []
            response['admin_notes'].append(f"Low profile confidence: {profile_confidence}/100")
            response['admin_notes'].append(f"Detected as: {detected_context} context")
            
            # Add user-friendly recommendations
            if 'recommendations' not in response:
                response['recommendations'] = []
            response['recommendations'].append("This image may not be ideal for a profile picture.")
            response['recommendations'].append("Profile pictures usually show a person's face or appropriate representation.")
        
        # Add special considerations for profile images
        if response.get('specific_issue') == 'document' or response.get('specific_issue') == 'sensitive_document':
            if 'recommendations' not in response:
                response['recommendations'] = []
            response['recommendations'].append("Using identification documents or cards as profile pictures is not permitted.")
            response['recommendations'].append("Please upload an appropriate profile photo instead.")
            
        # Filter response for non-admin mode
        if not admin_mode:
            admin_fields = ['admin_status', 'admin_notes', 'admin_review_required', 
                          'document_analysis', 'suspicious_analysis', 'confidence_metrics']
            
            for field in admin_fields:
                if field in response:
                    response.pop(field)
                    
            # Simplify results to essentials
            if 'quality_analysis' in response:
                quality_essentials = {
                    'status': response['quality_analysis'].get('status'),
                    'quality_score': response['quality_analysis'].get('quality_score')
                }
                response['quality_analysis'] = quality_essentials
        
        logger.info(f"Profile analysis complete: {response['status']}")
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error in profile analysis: {e}")
        return jsonify({
            'error': f'Profile image analysis failed: {str(e)}',
            'status': 'error',
            'label': 'unknown',
            'confidence': 0
        }), 500

@app.route('/analyze-post', methods=['POST'])
def analyze_post():
    """Specialized endpoint for analyzing post images"""
    try:
        data = request.get_json()
        
        if not data or 'image_url' not in data:
            return jsonify({
                'error': 'Missing image_url in request body',
                'status': 'error'
            }), 400
        
        image_url = data['image_url']
        post_type = data.get('post_type', 'general')  # Can be 'general', 'diy', 'impact', etc.
        admin_mode = data.get('admin_mode', False)
        
        logger.info(f"Analyzing post image: {image_url}, type: {post_type}")
        
        # Download and load image
        image = download_image_from_url(image_url)
        
        # Check image quality (with more lenient standards for posts)
        quality_result = check_image_quality(image)
        
        # Classify image
        classification_result = classify_image_with_mobilenet(image)
        
        # Check for document content
        document_result = detect_document_content(classification_result, image)
        
        # Check for suspicious content
        suspicious_result = analyze_for_suspicious_content(image, classification_result)
        
        # Process all results and generate response
        response = process_analysis_results(
            image_url=image_url,
            image=image,
            quality_result=quality_result,
            classification_result=classification_result,
            document_result=document_result,
            suspicious_result=suspicious_result
        )
        
        # For DIY post types, check specifically if it shows a DIY project
        if post_type == 'diy':
            diy_confidence = response.get('context_analysis', {}).get('context_scores', {}).get('diy_project', 0)
            
            # If it doesn't look like a DIY project but not rejected, flag for review
            if diy_confidence < 20 and response['status'] != 'rejected':
                response['status'] = 'pending_review'
                response['admin_status'] = 'flagged'
                response['admin_review_required'] = True
                response['specific_issue'] = 'may_not_be_diy'
                
                if 'admin_notes' not in response:
                    response['admin_notes'] = []
                response['admin_notes'].append(f"Low DIY project confidence: {diy_confidence}/100")
                
                # Add user-friendly recommendations
                if 'recommendations' not in response:
                    response['recommendations'] = []
                response['recommendations'].append("This image may not clearly show a DIY project.")
                response['recommendations'].append("For DIY posts, please show the actual project or before/after photos.")
        
        # Be more lenient with image quality for posts
        if response.get('specific_issue') in ['too_dark', 'too_bright', 'too_blurry'] and quality_result.get('quality_score', 0) > 30:
            # Override to accept lower quality posts as long as they're not terrible
            if response['status'] == 'pending_review':
                response['status'] = 'usable'
                response['admin_status'] = 'usable'
                response['admin_review_required'] = False
                
                # Update recommendations
                response['recommendations'] = [rec for rec in response.get('recommendations', []) if "submitted for review" not in rec]
                response['recommendations'].append(f"Image quality could be improved but is acceptable for posting.")
                
        # Filter response for non-admin mode
        if not admin_mode:
            admin_fields = ['admin_status', 'admin_notes', 'admin_review_required', 
                          'document_analysis', 'suspicious_analysis', 'confidence_metrics']
            
            for field in admin_fields:
                if field in response:
                    response.pop(field)
                    
            # Simplify results to essentials
            if 'quality_analysis' in response:
                quality_essentials = {
                    'status': response['quality_analysis'].get('status'),
                    'quality_score': response['quality_analysis'].get('quality_score')
                }
                response['quality_analysis'] = quality_essentials
        
        logger.info(f"Post analysis complete: {response['status']}")
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error in post analysis: {e}")
        return jsonify({
            'error': f'Post image analysis failed: {str(e)}',
            'status': 'error',
            'label': 'unknown',
            'confidence': 0
        }), 500

@app.route('/test', methods=['GET', 'POST'])
def test_service():
    """Test endpoint to validate service functionality"""
    response = {
        'service': 'EcoLoop AI Image Analysis',
        'status': 'operational',
        'timestamp': time.time(),
        'tests_run': [],
        'tests_passed': 0,
        'tests_failed': 0,
        'test_image_url': None
    }
    
    # Optional test image URL from request
    if request.method == 'POST':
        data = request.get_json()
        test_image_url = data.get('test_image_url') if data else None
        response['test_image_url'] = test_image_url
    else:
        test_image_url = request.args.get('test_image_url')
        response['test_image_url'] = test_image_url
        
    # Run model validation
    try {
        # Test 1: MobileNetV2 Model loaded correctly
        dummy_input = np.zeros((1, 224, 224, 3), dtype=np.float32)
        model_result = model.predict(dummy_input, verbose=0)
        
        response['tests_run'].append({
            'name': 'model_loaded',
            'description': 'MobileNetV2 model loaded and functional',
            'passed': model_result.shape == (1, 1000),
            'details': f'Output shape: {model_result.shape}'
        })
        
        if model_result.shape == (1, 1000):
            response['tests_passed'] += 1
        else:
            response['tests_failed'] += 1
            
        # Test 2: Test category mapping
        test_categories = []
        for category, keywords in MARKETPLACE_CATEGORIES.items():
            if keywords:  # Make sure category has keywords
                test_categories.append({
                    'category': category,
                    'sample_keyword': keywords[0]
                })
                
        response['tests_run'].append({
            'name': 'category_mapping',
            'description': 'Marketplace categories properly configured',
            'passed': len(test_categories) > 0,
            'details': f'Found {len(test_categories)} categories with {sum(len(kw) for _, kw in MARKETPLACE_CATEGORIES.items())} keywords'
        })
        
        if len(test_categories) > 0:
            response['tests_passed'] += 1
        else:
            response['tests_failed'] += 1
            
        # Test 3: OpenCV functionality
        try:
            test_img = np.zeros((100, 100, 3), dtype=np.uint8)
            gray = cv2.cvtColor(test_img, cv2.COLOR_BGR2GRAY)
            
            response['tests_run'].append({
                'name': 'opencv_functional',
                'description': 'OpenCV image processing is functional',
                'passed': gray.shape == (100, 100),
                'details': f'Converted test image to grayscale: {gray.shape}'
            })
            
            if gray.shape == (100, 100):
                response['tests_passed'] += 1
            else:
                response['tests_failed'] += 1
        except Exception as cv_ex:
            response['tests_run'].append({
                'name': 'opencv_functional',
                'description': 'OpenCV image processing is functional',
                'passed': False,
                'details': f'Error: {str(cv_ex)}'
            })
            response['tests_failed'] += 1
            
        # Test 4: Image analysis pipeline with test image
        if test_image_url:
            try:
                # Download and analyze the image
                test_image = download_image_from_url(test_image_url)
                
                # Run the full analysis pipeline
                quality_result = check_image_quality(test_image)
                classification_result = classify_image_with_mobilenet(test_image)
                document_result = detect_document_content(classification_result, test_image)
                suspicious_result = analyze_for_suspicious_content(test_image, classification_result)
                
                # Process all results
                full_analysis = process_analysis_results(
                    image_url=test_image_url,
                    image=test_image,
                    quality_result=quality_result,
                    classification_result=classification_result,
                    document_result=document_result,
                    suspicious_result=suspicious_result
                )
                
                response['tests_run'].append({
                    'name': 'full_analysis_pipeline',
                    'description': 'Complete image analysis pipeline',
                    'passed': True,
                    'details': {
                        'image_url': test_image_url,
                        'label': classification_result.get('label'),
                        'confidence': classification_result.get('confidence'),
                        'status': full_analysis.get('status'),
                        'quality_score': quality_result.get('quality_score'),
                        'is_document': document_result.get('is_document'),
                        'is_suspicious': suspicious_result.get('is_suspicious')
                    }
                })
                response['tests_passed'] += 1
                
            except Exception as img_ex:
                response['tests_run'].append({
                    'name': 'full_analysis_pipeline',
                    'description': 'Complete image analysis pipeline',
                    'passed': False,
                    'details': f'Error: {str(img_ex)}'
                })
                response['tests_failed'] += 1
        else:
            response['tests_run'].append({
                'name': 'full_analysis_pipeline',
                'description': 'Complete image analysis pipeline',
                'passed': None,
                'details': 'No test image URL provided. Add ?test_image_url=<url> or POST with {"test_image_url": "<url>"}'
            })
    
    except Exception as e:
        logger.error(f"Error in test service: {e}")
        response['status'] = 'error'
        response['error'] = str(e)
    
    # Set overall service status
    if response['tests_failed'] > 0:
        response['status'] = 'warning'
        response['message'] = f'{response["tests_passed"]} of {response["tests_passed"] + response["tests_failed"]} tests passed'
    
    return jsonify(response)

def analyze_for_suspicious_content(image, classification_result):
    """Analyze image content for suspicious or inappropriate material"""
    try:
        # Initialize scoring
        suspicious_score = 0
        specific_issue = None
        evidence = []
        
        # 1. Check classification confidence
        confidence = classification_result['confidence']
        if confidence < 20:
            suspicious_score += 30
            specific_issue = 'low_confidence'
            evidence.append(f"Very low classification confidence: {confidence:.1f}%")
        
        # 2. Check for document detection
        raw_label = classification_result['raw_label'].lower()
        doc_check = detect_document_content(image, raw_label)
        
        # If it's a high-confidence recyclable, skip document detection
        if not doc_check.get('high_confidence_recyclable', False):
            if doc_check['is_document']:
                suspicious_score += 50
                specific_issue = 'document'
                evidence.extend(doc_check['evidence'])
        
        # 3. Check for inappropriate categories
        if not doc_check.get('high_confidence_recyclable', False):
            # Personal/portrait images
            if any(word in raw_label for word in ['person', 'face', 'people', 'portrait', 'selfie']):
                suspicious_score += 40
                specific_issue = 'personal_image'
                evidence.append(f"Personal/portrait image detected: {raw_label}")
            
            # Screenshots/digital content
            elif any(word in raw_label for word in ['screenshot', 'web_site', 'display', 'monitor']):
                suspicious_score += 35
                specific_issue = 'digital_content'
                evidence.append(f"Digital content detected: {raw_label}")
            
            # Non-material images
            elif any(word in raw_label for word in ['landscape', 'scenery', 'building', 'food', 'animal']):
                suspicious_score += 30
                specific_issue = 'non_material'
                evidence.append(f"Non-material content detected: {raw_label}")
        
        return {
            'is_suspicious': suspicious_score > 40,
            'suspicious_score': suspicious_score,
            'specific_issue': specific_issue,
            'evidence': evidence,
            'high_confidence_recyclable': doc_check.get('high_confidence_recyclable', False)
        }
        
    except Exception as e:
        logger.error(f"Error in suspicious content analysis: {e}")
        return {
            'is_suspicious': False,
            'suspicious_score': 0,
            'error': str(e)
        }

def process_analysis_results(classification_result, quality_result=None, suspicious_result=None, document_check=None):
    """Process all analysis results and determine final status"""
    try:
        # Initialize response
        status = 'usable'
        review_required = False
        rejection_reason = None
        specific_issue = None
        recommendations = []
        
        # Default quality result if not provided
        if quality_result is None:
            quality_result = {'status': 'usable', 'issues': []}
        
        # Check for high-confidence recyclable first
        is_high_confidence = (suspicious_result and suspicious_result.get('high_confidence_recyclable', False)) or \
                           (document_check and document_check.get('high_confidence_recyclable', False))
        
        if is_high_confidence:
            status = 'usable'
            recommendations.extend([
                'Your image has been accepted',
                f"Material identified: {classification_result['label']}",
                'The image meets our marketplace quality standards',
                'Thank you for contributing to the EcoLoop community!'
            ])
            return {
                'status': status,
                'material': classification_result['label'],
                'confidence': classification_result['confidence'],
                'raw_label': classification_result.get('raw_label', ''),
                'is_document': False,
                'admin': {
                    'review_required': review_required,
                    'rejection_reason': rejection_reason,
                    'specific_issue': specific_issue
                },
                'recommendations': recommendations
            }
        
        # 1. Handle document detection
        if document_check and document_check['is_document']:
            status = 'rejected'
            rejection_reason = 'document_detected'
            specific_issue = 'document'
            recommendations.extend([
                'This image cannot be used in the marketplace',
                'This image contains too much text and appears to be a document rather than a recyclable item',
                'Please upload photos of actual recyclable materials (fabric, wood, metal, etc.)',
                'Documents, receipts, and papers with text are not accepted',
                'Take a clear photo of just the material itself without any documents or text'
            ])
        
        # 2. Handle suspicious content
        elif suspicious_result and suspicious_result['is_suspicious']:
            if suspicious_result['suspicious_score'] > 70:
                status = 'rejected'
                rejection_reason = 'suspicious_content'
            else:
                status = 'pending_review'
                review_required = True
            specific_issue = suspicious_result['specific_issue']
            
            if status == 'rejected':
                recommendations.extend([
                    'This image cannot be used in the marketplace',
                    f"This appears to be a {specific_issue} rather than a recyclable material",
                    'Please upload photos of actual recyclable materials (fabric, wood, metal, etc.)',
                    'Non-material images are not accepted',
                    'Take a clear photo of just the material itself'
                ])
            else:
                recommendations.extend([
                    'Your image has been submitted for review',
                    'It will need to be approved by an admin before becoming visible',
                    'Please ensure your post content follows our community guidelines',
                    'For marketplace listings, please upload images focusing on the recyclable material itself'
                ])
        
        # 3. Handle quality issues
        elif quality_result['status'] == 'low_quality':
            status = 'rejected'
            rejection_reason = 'low_quality'
            specific_issue = 'quality'
            recommendations.extend([
                'This image cannot be used due to quality issues:',
                *quality_result['issues'],
                'Please upload a clear, well-lit photo of the material'
            ])
        
        # 4. Handle usable images
        else:
            recommendations.extend([
                'Your image has been accepted',
                f"Material identified: {classification_result['label']}",
                'The image meets our marketplace quality standards',
                'Thank you for contributing to the EcoLoop community!'
            ])
            
            # Suggest improvements for low confidence items
            if classification_result['confidence'] < 50:
                status = 'pending_review'
                review_required = True
                specific_issue = 'potential_suspicious'
                recommendations.extend([
                    'Your image has been submitted for review',
                    'It will need to be approved by an admin before becoming visible',
                    'Please ensure your uploads show only recyclable materials',
                    'Items should be clearly visible and follow marketplace guidelines'
                ])
        
        return {
            'status': status,
            'material': classification_result['label'],
            'confidence': classification_result['confidence'],
            'raw_label': classification_result.get('raw_label', ''),
            'is_document': document_check['is_document'] if document_check else False,
            'admin': {
                'review_required': review_required,
                'rejection_reason': rejection_reason,
                'specific_issue': specific_issue
            },
            'recommendations': recommendations
        }
        
    except Exception as e:
        logger.error(f"Error processing analysis results: {e}")
        return {
            'status': 'error',
            'error': str(e)
        }

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))  # Changed to port 5001 to avoid conflict
    debug = os.environ.get('FLASK_ENV') == 'development'
    
    logger.info(f"Starting EcoLoop AI Image Analysis Service on port {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)
