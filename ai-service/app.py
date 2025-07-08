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
        
        # Check for suspicious content
        suspicious_result = analyze_for_suspicious_content(image, classification_result)
        
        # Determine final status
        final_status = 'usable'
        
        if quality_result['status'] in ['blurry', 'low_quality']:
            final_status = quality_result['status']
        elif suspicious_result['is_suspicious']:
            final_status = 'suspicious'
        elif classification_result['confidence'] < 30:
            final_status = 'low_confidence'
        
        # Prepare response
        response = {
            'label': classification_result['label'],
            'raw_label': classification_result['raw_label'],
            'confidence': classification_result['confidence'],
            'status': final_status,
            'quality_analysis': quality_result,
            'classification': classification_result,
            'suspicious_analysis': suspicious_result,
            'recommendations': []
        }
        
        # Add recommendations based on analysis
        if final_status == 'blurry':
            response['recommendations'].append('Please upload a clearer, less blurry image')
        elif final_status == 'low_quality':
            response['recommendations'].append('Please upload a higher quality image with better lighting')
        elif final_status == 'suspicious':
            response['recommendations'].append('Image flagged for manual review')
        elif final_status == 'low_confidence':
            response['recommendations'].append('Image classification confidence is low, consider uploading a clearer image')
        else:
            response['recommendations'].append('Image quality is good')
        
        logger.info(f"Analysis complete: {final_status} (confidence: {classification_result['confidence']}%)")
        
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
                # Create a mini request for each image
                single_result = predict()
                results.append({
                    'index': i,
                    'url': url,
                    'result': single_result.get_json() if hasattr(single_result, 'get_json') else single_result
                })
            except Exception as e:
                results.append({
                    'index': i,
                    'url': url,
                    'error': str(e)
                })
        
        return jsonify({
            'batch_results': results,
            'total_processed': len(results),
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
