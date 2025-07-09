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

# Marketplace-relevant categories mapping
MARKETPLACE_CATEGORIES = {
    'fabric': ['jersey', 'velvet', 'wool', 'denim'],
    'cloth': ['jersey', 'velvet', 'wool', 'denim', 'bow_tie', 'apron'],
    'wood': ['park_bench', 'picket_fence', 'wooden_spoon', 'cutting_board'],
    'metal': ['chain_saw', 'hammer', 'wrench', 'nail', 'screw', 'can_opener'],
    'plastic': ['plastic_bag', 'bottle_cap', 'container'],
    'glass': ['wine_bottle', 'beer_bottle', 'drinking_glass'],
    'paper': ['envelope', 'book_jacket', 'notebook', 'menu'],
    'electronics': ['desktop_computer', 'laptop', 'cellular_telephone', 'remote_control'],
    'furniture': ['chair', 'table', 'desk', 'bookshelf', 'wardrobe'],
    'tools': ['hammer', 'screwdriver', 'wrench', 'saw', 'drill']
}

# Document-related categories and keywords that should be flagged (not recyclable materials)
DOCUMENT_KEYWORDS = [
    'document', 'text', 'certificate', 'diploma', 'license', 'identification',
    'passport', 'card', 'id_card', 'book', 'notebook', 'sheet', 'paper', 'letter',
    'envelope', 'form', 'manuscript', 'contract', 'receipt', 'prescription', 'ballot'
]

# Enhanced category mapping for recyclable vs non-recyclable items
RECYCLABLE_CATEGORIES = set(['fabric', 'cloth', 'wood', 'metal', 'plastic', 'glass', 'paper', 'electronics'])

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
        height, width = gray.shape
        image_area = height * width
        
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            
            # Typical text characteristics:
            # - Small relative to image
            # - More rectangular than square
            area = w * h
            aspect_ratio = float(w) / h if h > 0 else 0
            
            if (area < image_area * 0.02 and  # Small enough to be text
                area > 20 and                 # Not noise
                (aspect_ratio > 1.5 or aspect_ratio < 0.7) and  # Rectangular
                w < width / 3):               # Not too wide (likely not a full line)
                small_rectangular_contours += 1
                
        # Many small rectangular contours suggest text
        has_text_pattern = small_rectangular_contours > 25
        
        # Calculate density and organization of contours (text is organized)
        total_contour_area = sum(cv2.contourArea(c) for c in contours)
        density = float(total_contour_area) / image_area if image_area > 0 else 0
        
        # Organized text pattern indicates document
        is_organized = False
        if len(contours) > 20:
            y_positions = [cv2.boundingRect(c)[1] for c in contours if cv2.contourArea(c) > 10]
            y_positions.sort()
            
            # Check if y-positions cluster in lines (as text would)
            if len(y_positions) > 10:
                line_clusters = 0
                prev_y = y_positions[0]
                
                for y in y_positions[1:]:
                    if abs(y - prev_y) > 5:  # New line
                        line_clusters += 1
                        prev_y = y
                
                is_organized = line_clusters >= 3
        
        # Determine confidence based on features
        confidence = 0
        if has_text_pattern:
            confidence += 40
        if density > 0.05 and density < 0.5:  # Typical text density
            confidence += 30
        if is_organized:
            confidence += 30
            
        return {
            'has_text_pattern': has_text_pattern,
            'confidence': min(confidence, 100),
            'organized_text': is_organized,
            'text_contours': small_rectangular_contours,
            'text_density': density
        }
        
    except Exception as e:
        logger.error(f"Error in text detection: {e}")
        return {
            'has_text_pattern': False,
            'confidence': 0,
            'error': str(e)
        }

def detect_document_visual_patterns(image):
    """Look for visual patterns that are common in documents (straight lines, rectangular shapes, etc)"""
    try:
        # Convert PIL image to OpenCV format
        opencv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        gray = cv2.cvtColor(opencv_image, cv2.COLOR_BGR2GRAY)
        
        # Document pattern scores
        pattern_score = 0
        evidence = []
        
        # 1. Look for straight lines (common in documents)
        edges = cv2.Canny(gray, 50, 150, apertureSize=3)
        lines = cv2.HoughLines(edges, 1, np.pi/180, threshold=100)
        
        horizontal_lines = 0
        vertical_lines = 0
        
        if lines is not None:
            for line in lines:
                rho, theta = line[0]
                # Horizontal lines (theta close to 0 or pi)
                if (theta < 0.1 or abs(theta - np.pi) < 0.1):
                    horizontal_lines += 1
                # Vertical lines (theta close to pi/2)
                elif abs(theta - np.pi/2) < 0.1:
                    vertical_lines += 1
        
        # Documents often have many straight lines
        if horizontal_lines > 5:
            pattern_score += 20
            evidence.append(f"Horizontal lines: {horizontal_lines}")
        if vertical_lines > 5:
            pattern_score += 20
            evidence.append(f"Vertical lines: {vertical_lines}")
        
        # 2. Check for rectangular shapes (common in forms, certificates)
        # Use contour detection with approximation
        _, binary = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY_INV)
        contours, _ = cv2.findContours(binary, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        
        rectangles = 0
        for contour in contours:
            # Approximate contour to simplify shape
            epsilon = 0.04 * cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, epsilon, True)
            
            # Check if it's rectangular (4 corners)
            if len(approx) == 4:
                area = cv2.contourArea(contour)
                # Ignore very small rectangles (noise)
                if area > 500:
                    rectangles += 1
        
        if rectangles > 3:
            pattern_score += 20
            evidence.append(f"Rectangular shapes: {rectangles}")
        
        # 3. Check for uniform spacing (like text lines in a document)
        if 'organized_text' in locals() and 'line_clusters' in locals():
            if line_clusters > 4:
                pattern_score += 20
                evidence.append(f"Text line clusters: {line_clusters}")
        
        # 4. Look for patterns of uniformity in intensity histograms
        hist = cv2.calcHist([gray], [0], None, [256], [0, 256])
        peaks = np.where((hist[1:-1] > hist[:-2]) & (hist[1:-1] > hist[2:]))[0] + 1
        
        # Documents often have very specific peaks in their histograms
        if len(peaks) >= 2 and len(peaks) <= 5:
            pattern_score += 10
            evidence.append(f"Document-like intensity histogram")
        
        return {
            'document_pattern_score': pattern_score,
            'evidence': evidence,
            'has_document_patterns': pattern_score > 30
        }
    
    except Exception as e:
        logger.error(f"Error in document pattern detection: {e}")
        return {
            'document_pattern_score': 0,
            'evidence': [f"Error: {str(e)}"],
            'has_document_patterns': False
        }

def detect_document_content(classification_result, image=None):
    """Specifically detect if the image contains document/certificate content"""
    try:
        # Check if the raw label is a document-related item
        raw_label = classification_result.get('raw_label', '').lower()
        all_predictions = classification_result.get('all_predictions', [])
        
        # Initialize detection results
        doc_results = {
            'is_document': False,
            'document_type': None,
            'confidence': 0,
            'detection_method': None,
            'detected_text': False
        }
        
        # PHASE 1: Direct keyword matching (highest confidence)
        for keyword in DOCUMENT_KEYWORDS:
            if keyword in raw_label:
                doc_results = {
                    'is_document': True,
                    'document_type': keyword,
                    'confidence': classification_result.get('confidence', 0),
                    'detection_method': 'keyword_primary',
                    'detected_text': True
                }
                return doc_results
        
        # PHASE 2: Check across top predictions for document keywords
        document_matches = 0
        potential_document_types = []
        
        for prediction in all_predictions:
            pred_label = prediction.get('label', '').lower()
            pred_confidence = prediction.get('confidence', 0)
            
            for keyword in DOCUMENT_KEYWORDS:
                if keyword in pred_label:
                    document_matches += 1
                    potential_document_types.append({
                        'type': keyword,
                        'confidence': pred_confidence
                    })
        
        # If multiple document-related labels are in top predictions, likely a document
        if document_matches >= 2:
            doc_results = {
                'is_document': True,
                'document_type': 'multiple_indicators',
                'potential_types': potential_document_types,
                'confidence': classification_result.get('confidence', 0),
                'detection_method': 'multiple_keywords',
                'detected_text': True
            }
            return doc_results
            
        # PHASE 3: Use image analysis for text and pattern detection if we have the image
        if image:
            text_analysis = detect_text_in_image(image)
            visual_patterns = detect_document_visual_patterns(image)
            
            # Combine text and visual pattern evidence
            combined_confidence = text_analysis.get('confidence', 0)
            if visual_patterns.get('has_document_patterns', False):
                combined_confidence = max(combined_confidence, visual_patterns.get('document_pattern_score', 0))
                
                # Add pattern evidence to text analysis
                if 'evidence' in visual_patterns and len(visual_patterns['evidence']) > 0:
                    text_analysis['document_pattern_evidence'] = visual_patterns['evidence']
            
            # If strong text pattern detected, likely a document
            if combined_confidence > 70:
                doc_results = {
                    'is_document': True,
                    'document_type': 'text_heavy',
                    'confidence': combined_confidence,
                    'detection_method': 'combined_pattern_text',
                    'detected_text': True,
                    'text_analysis': text_analysis,
                    'visual_patterns': visual_patterns
                }
                return doc_results
            
            # If paper with moderate text detection, consider it a document
            if classification_result.get('label') == 'paper' and combined_confidence > 50:
                doc_results = {
                    'is_document': True,
                    'document_type': 'paper_with_text',
                    'confidence': combined_confidence,
                    'detection_method': 'paper_text_combined',
                    'detected_text': True,
                    'text_analysis': text_analysis,
                    'visual_patterns': visual_patterns
                }
                return doc_results
            
            # If strong visual document patterns detected
            if visual_patterns.get('document_pattern_score', 0) > 50:
                doc_results = {
                    'is_document': True,
                    'document_type': 'document_pattern',
                    'confidence': visual_patterns.get('document_pattern_score', 0),
                    'detection_method': 'visual_pattern',
                    'detected_text': text_analysis.get('has_text_pattern', False),
                    'text_analysis': text_analysis,
                    'visual_patterns': visual_patterns
                }
                return doc_results
            
        # PHASE 4: Check if the category is 'paper' but looks like a document from label
        if classification_result.get('label') == 'paper':
            # Paper items with text are likely documents
            if any(keyword in raw_label for keyword in ['text', 'letter', 'document']):
                doc_results = {
                    'is_document': True,
                    'document_type': 'paper_document',
                    'confidence': classification_result.get('confidence', 0),
                    'detection_method': 'paper_keyword',
                    'detected_text': True
                }
                return doc_results
        
        # No document detected
        return doc_results
        
    except Exception as e:
        logger.error(f"Error in document detection: {e}")
        return {
            'is_document': False,
            'document_type': None,
            'confidence': 0,
            'detected_text': False,
            'error': str(e)
        }

def analyze_for_suspicious_content(image, classification_result):
    """Additional checks for suspicious content"""
    try:
        # Simple heuristics for suspicious content
        suspicious_indicators = []
        
        # Check if confidence is very low
        if classification_result['confidence'] < 20:
            suspicious_indicators.append('Very low classification confidence')
        
        # Check for potentially inappropriate content based on labels
        inappropriate_keywords = ['weapon', 'drug', 'adult', 'violence']
        raw_label = classification_result.get('raw_label', '').lower()
        
        for keyword in inappropriate_keywords:
            if keyword in raw_label:
                suspicious_indicators.append(f'Potentially inappropriate content: {keyword}')
        
        # Determine if content is suspicious
        is_suspicious = len(suspicious_indicators) > 0
        
        return {
            'is_suspicious': is_suspicious,
            'indicators': suspicious_indicators,
            'risk_level': 'high' if is_suspicious else 'low'
        }
        
    except Exception as e:
        logger.error(f"Error in suspicious content analysis: {e}")
        return {
            'is_suspicious': False,
            'indicators': [],
            'risk_level': 'low',
            'error': str(e)
        }

def process_analysis_results(image_url, image, quality_result, classification_result, document_result, suspicious_result):
    """Process all analysis results and generate a consistent response format"""
    
    # Determine final status
    final_status = 'usable'
    specific_issue = None
    
    # Extract filename from URL for more specific messaging
    try:
        filename = image_url.split('/')[-1].split('?')[0]
    except:
        filename = "uploaded image"
        
    # Prioritize issues - document detection is highest priority
    if document_result['is_document']:
        final_status = 'inappropriate_content'
        specific_issue = 'document'
    elif quality_result['status'] == 'low_quality':
        final_status = 'low_quality'
        # Get more specific low quality issue
        if 'issues' in quality_result and quality_result['issues']:
            for issue in quality_result['issues']:
                if 'dark' in issue.lower():
                    specific_issue = 'too_dark'
                elif 'bright' in issue.lower():
                    specific_issue = 'too_bright'
                elif 'small' in issue.lower():
                    specific_issue = 'too_small'
    elif quality_result['status'] == 'blurry':
        final_status = 'blurry'
    elif suspicious_result['is_suspicious']:
        final_status = 'suspicious'
    elif classification_result['confidence'] < 30:
        final_status = 'low_confidence'
    elif classification_result.get('label') not in RECYCLABLE_CATEGORIES:
        final_status = 'non_recyclable'
        
    # Prepare response with detailed info
    response = {
        'label': classification_result['label'],
        'raw_label': classification_result['raw_label'],
        'confidence': classification_result['confidence'],
        'status': final_status,
        'specific_issue': specific_issue,
        'quality_analysis': quality_result,
        'classification': classification_result,
        'suspicious_analysis': suspicious_result,
        'document_analysis': document_result,
        'file_name': filename,
        'recommendations': [],
        'confidence_metrics': {}
    }
    
    # Extract confidence metrics for better UI feedback
    if 'metrics' in quality_result:
        response['confidence_metrics']['blur_score'] = quality_result.get('metrics', {}).get('blur_score', 0)
        response['confidence_metrics']['brightness'] = quality_result.get('metrics', {}).get('brightness', 0)
        response['confidence_metrics']['dimensions'] = quality_result.get('metrics', {}).get('dimensions', '0x0')
    
    if document_result.get('confidence'):
        response['confidence_metrics']['document_confidence'] = document_result.get('confidence', 0)
    
    if document_result.get('text_analysis', {}).get('confidence'):
        response['confidence_metrics']['text_confidence'] = document_result.get('text_analysis', {}).get('confidence', 0)
    
    # Add tailored, specific recommendations based on detailed analysis
    if final_status == 'inappropriate_content' and specific_issue == 'document':
        doc_type = document_result.get('document_type', 'document')
        detection_method = document_result.get('detection_method', '')
        doc_confidence = document_result.get('confidence', 0)
        
        # More specific document feedback
        if doc_type == 'text_heavy':
            response['recommendations'].append(f'This image contains too much text and appears to be a document rather than a recyclable item')
        elif doc_type == 'paper_with_text':
            response['recommendations'].append(f'This image shows a paper document with text rather than recyclable material')
        else:
            response['recommendations'].append(f'This appears to be a {doc_type} rather than a recyclable material')
            
        response['recommendations'].append('Please upload photos of recyclable materials only (fabric, wood, metal, etc.)')
        response['recommendations'].append('Documents, certificates and papers with text are not accepted')
        
        # Add specific recommendation for document type
        if detection_method == 'text_pattern' and doc_confidence > 80:
            response['recommendations'].append('Try taking a photo of the actual recyclable material instead of any printed information')
        elif detection_method == 'keyword_primary':
            response['recommendations'].append('This item was clearly identified as a document and cannot be listed')
        
        if detection_method:
            response['document_detection_method'] = detection_method
        if doc_confidence:
            response['document_confidence'] = doc_confidence
        
    elif final_status == 'blurry':
        blur_score = quality_result.get('metrics', {}).get('blur_score', 0)
        response['recommendations'].append(f'Image "{filename}" is too blurry (clarity score: {blur_score:.1f}/100)')
        response['recommendations'].append('Hold your camera steady when taking photos')
        response['recommendations'].append('Ensure good lighting to help your camera focus')
        response['recommendations'].append('Tap on the item to focus before taking the photo')
        
        # Add more specific advice based on blur score
        if blur_score < 50:
            response['recommendations'].append('Try using a tripod or resting your arms on a stable surface')
            response['recommendations'].append('This image is severely blurry and needs to be retaken')
        
    elif final_status == 'low_quality':
        if specific_issue == 'too_dark':
            brightness = quality_result.get('metrics', {}).get('brightness', 0)
            response['recommendations'].append(f'Image "{filename}" is too dark (brightness: {brightness:.1f}/255)')
            response['recommendations'].append('Take photos in a well-lit area')
            response['recommendations'].append('Turn on additional lights if indoors')
            response['recommendations'].append('Avoid backlighting that makes the item appear dark')
            
            # Add more specific advice based on darkness level
            if brightness < 30:
                response['recommendations'].append('This image is extremely dark. Try using your phone flash or moving to a brighter location')
            
        elif specific_issue == 'too_bright':
            brightness = quality_result.get('metrics', {}).get('brightness', 0)
            response['recommendations'].append(f'Image "{filename}" is too bright or washed out (brightness: {brightness:.1f}/255)')
            response['recommendations'].append('Avoid direct sunlight or flash on the item')
            response['recommendations'].append('Move to a more evenly lit area')
            response['recommendations'].append('Adjust your camera exposure if possible')
            
            # Add more specific advice based on brightness level
            if brightness > 220:
                response['recommendations'].append('This image is overexposed. Try turning off flash and reducing exposure in your camera settings')
            
        elif specific_issue == 'too_small':
            dimensions = quality_result.get('metrics', {}).get('dimensions', '0x0')
            response['recommendations'].append(f'Image "{filename}" resolution is too low ({dimensions})')
            response['recommendations'].append('Take a closer photo of the item')
            response['recommendations'].append('Use your main camera instead of front-facing camera')
            response['recommendations'].append('Check your camera settings for higher resolution')
            
            # Extract dimensions for more specific advice
            try:
                width, height = dimensions.split('x')
                if int(width) < 300 or int(height) < 300:
                    response['recommendations'].append('This image is extremely small. We recommend at least 800x600 pixels for good visibility')
            except:
                pass
            
        else:
            response['recommendations'].append(f'Image "{filename}" has poor quality')
            response['recommendations'].append('Use better lighting (natural light works best)')
            response['recommendations'].append('Make sure your camera lens is clean')
            response['recommendations'].append('Hold your camera steady when taking the photo')
        
    elif final_status == 'suspicious':
        indicators = suspicious_result.get('indicators', [])
        response['recommendations'].append(f'Image "{filename}" was flagged for content review')
        response['recommendations'].append('Ensure you are uploading recyclable materials only')
        
        # More specific feedback on suspicious content
        if indicators:
            # Provide specific recommendations based on the indicators
            for indicator in indicators:
                if 'inappropriate' in indicator.lower():
                    response['recommendations'].append('This image appears to contain inappropriate content that violates our community guidelines')
                elif 'confidence' in indicator.lower():
                    response['recommendations'].append('We cannot clearly identify what this image contains. Please upload a clearer photo of your recyclable item')
                else:
                    response['recommendations'].append(f'Issue detected: {indicator}')
        
    elif final_status == 'low_confidence':
        response['recommendations'].append(f'Image "{filename}" couldn\'t be clearly identified ({classification_result["confidence"]:.1f}% confidence)')
        response['recommendations'].append('Make sure the item fills most of the frame')
        response['recommendations'].append('Use a plain background if possible')
        response['recommendations'].append('Ensure good lighting to make the item clearly visible')
        
        # Add advice based on confidence level
        if classification_result["confidence"] < 15:
            response['recommendations'].append('This image is particularly difficult to identify. Try a completely different angle or lighting setup')
        
    elif final_status == 'non_recyclable':
        response['recommendations'].append(f'Image "{filename}" doesn\'t appear to be a recyclable material')
        response['recommendations'].append('Please upload only fabric, wood, metal, plastic or other recyclable materials')
        response['recommendations'].append('This marketplace is for recycled/upcycled materials only')
        
        # Add more specific information about what was detected
        response['recommendations'].append(f'Detected as: {classification_result["raw_label"]} (not a recyclable material category)')
        
    else:
        response['recommendations'].append(f'Image "{filename}" quality is good')
        response['recommendations'].append('Your item was successfully identified as ' + classification_result['label'])
        
        # Add a positive reinforcement
        response['recommendations'].append('Great job! This image meets our quality standards')
    
    return response

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'EcoLoop AI Image Analysis',
        'model': 'MobileNetV2',
        'version': '1.0.0'
    })

@app.route('/predict', methods=['POST'])
def predict():
    """Main prediction endpoint"""
    try:
        # Get image URL from request
        data = request.get_json()
        
        if not data or 'image_url' not in data:
            return jsonify({
                'error': 'Missing image_url in request body',
                'status': 'error'
            }), 400
        
        image_url = data['image_url']
        logger.info(f"Analyzing image: {image_url}")
        
        # Download and load image
        image = download_image_from_url(image_url)
        
        # Check image quality
        quality_result = check_image_quality(image)
        
        # Classify image
        classification_result = classify_image_with_mobilenet(image)
        
        # Check for document content with image analysis
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
        
        logger.info(f"Analysis complete: {response['status']} (confidence: {classification_result['confidence']}%)")
        
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
            'errors': 0
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
                    
        return jsonify({
            'batch_results': results,
            'total_processed': len(results),
            'issues_summary': issues_summary,
            'status': 'completed'
        })
        
    except Exception as e:
        logger.error(f"Error in batch analysis: {e}")
        return jsonify({
            'error': f'Batch analysis failed: {str(e)}',
            'status': 'error'
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') == 'development'
    
    logger.info(f"Starting EcoLoop AI Image Analysis Service on port {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)
