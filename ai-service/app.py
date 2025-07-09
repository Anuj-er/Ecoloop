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

# Marketplace categories - what we accept
MARKETPLACE_CATEGORIES = {
    'fabric': ['jersey', 'velvet', 'wool', 'denim', 'scarf', 'sweater', 'T-shirt'],
    'wood': ['wooden_spoon', 'cutting_board', 'timber', 'plywood', 'lumber'],
    'metal': ['hammer', 'wrench', 'nail', 'screw', 'tin_can', 'aluminum', 'steel'],
    'plastic': ['bottle', 'container', 'bucket', 'cup', 'plastic_bag', 'bottle_cap'],
    'glass': ['wine_bottle', 'beer_bottle', 'jar', 'drinking_glass', 'vase'],
    'paper': ['cardboard', 'carton', 'box', 'packaging', 'newspaper'],
    'electronics': ['computer', 'laptop', 'phone', 'remote_control', 'battery'],
    'rubber': ['tire', 'boot', 'mat', 'eraser', 'glove'],
    'leather': ['handbag', 'wallet', 'boot', 'shoe', 'belt', 'jacket']
}

# What we definitely DON'T want
REJECTED_CATEGORIES = [
    'person', 'face', 'people', 'portrait', 'selfie', 'human',
    'document', 'certificate', 'passport', 'id_card', 'license',
    'weapon', 'gun', 'knife', 'blade', 'drug', 'medicine',
    'food', 'animal', 'plant', 'flower', 'landscape', 'building'
]

def download_image_from_url(url):
    """Download image from URL"""
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        image = Image.open(io.BytesIO(response.content))
        if image.mode != 'RGB':
            image = image.convert('RGB')
        return image
    except Exception as e:
        logger.error(f"Error downloading image: {e}")
        raise Exception(f"Failed to download image: {str(e)}")

def check_image_quality(image):
    """Basic image quality check"""
    try:
        # Convert to OpenCV format
        opencv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        height, width = opencv_image.shape[:2]
        
        # Check size
        if height < 100 or width < 100:
            return {'status': 'rejected', 'reason': 'Image too small'}
        
        # Check if blurry (more lenient)
        gray = cv2.cvtColor(opencv_image, cv2.COLOR_BGR2GRAY)
        blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        if blur_score < 30:
            return {'status': 'rejected', 'reason': 'Image too blurry'}
        
        # Check brightness (more lenient)
        brightness = np.mean(gray)
        if brightness < 15:
            return {'status': 'rejected', 'reason': 'Image too dark'}
        elif brightness > 240:
            return {'status': 'rejected', 'reason': 'Image too bright'}
        
        return {'status': 'good'}
        
    except Exception as e:
        logger.error(f"Error checking quality: {e}")
        return {'status': 'rejected', 'reason': 'Quality check failed'}

def classify_image(image):
    """Classify image using MobileNetV2"""
    try:
        # Resize and preprocess
        img_resized = image.resize((224, 224))
        img_array = np.array(img_resized)
        img_array = np.expand_dims(img_array, axis=0)
        img_array = preprocess_input(img_array)
        
        # Predict
        predictions = model.predict(img_array, verbose=0)
        decoded_predictions = decode_predictions(predictions, top=5)[0]
        
        # Get top prediction
        top_prediction = decoded_predictions[0]
        label = top_prediction[1]
        confidence = float(top_prediction[2]) * 100
        
        return {
            'label': label,
            'confidence': confidence,
            'all_predictions': decoded_predictions
        }
        
    except Exception as e:
        logger.error(f"Error classifying image: {e}")
        return {'label': 'unknown', 'confidence': 0}

def analyze_marketplace_image(image_url):
    """Main function to analyze marketplace image"""
    try:
        # Download image
        image = download_image_from_url(image_url)
        
        # Check quality first
        quality_result = check_image_quality(image)
        if quality_result['status'] == 'rejected':
            return {
                'status': 'rejected',
                'reason': quality_result['reason'],
                'message': f"Image rejected: {quality_result['reason']}. Please upload a clear, well-lit photo.",
                'confidence': 0
            }
        
        # Classify image
        classification = classify_image(image)
        label = classification['label'].lower()
        confidence = classification['confidence']
        
        # Check if it's something we definitely don't want
        for rejected_item in REJECTED_CATEGORIES:
            if rejected_item in label:
                return {
                    'status': 'rejected',
                    'reason': f'{rejected_item} detected',
                    'message': f"Image rejected: {rejected_item} detected in the image. Please upload images of recyclable materials only.",
                    'confidence': confidence,
                    'detected_item': rejected_item
                }
        
        # Check if it's a marketplace category
        detected_category = None
        for category, keywords in MARKETPLACE_CATEGORIES.items():
            if any(keyword in label for keyword in keywords):
                detected_category = category
                break
        
        # Decision making based on confidence and category
        if detected_category:
            if confidence > 50:  # Lowered from 70
                return {
                    'status': 'approved',
                    'category': detected_category,
                    'message': f"Image accepted! Material identified as {detected_category}. Thank you for contributing to EcoLoop!",
                    'confidence': confidence,
                    'detected_item': label
                }
            elif confidence > 20:  # Lowered from 30
                return {
                    'status': 'review',
                    'category': detected_category,
                    'message': f"Image sent for admin review. Material appears to be {detected_category} but needs verification.",
                    'confidence': confidence,
                    'detected_item': label,
                    'review_reason': 'Low confidence in material classification'
                }
            else:
                return {
                    'status': 'review',
                    'category': 'unknown',
                    'message': "Image sent for admin review. Unable to clearly identify the material.",
                    'confidence': confidence,
                    'detected_item': label,
                    'review_reason': 'Very low confidence in classification'
                }
        else:
            # Not a clear marketplace category
            if confidence > 30:  # Lowered from 50
                return {
                    'status': 'review',
                    'category': 'other',
                    'message': f"Image sent for admin review. Detected '{label}' which may or may not be suitable for marketplace.",
                    'confidence': confidence,
                    'detected_item': label,
                    'review_reason': 'Item not in standard marketplace categories'
                }
            else:
                return {
                    'status': 'rejected',
                    'reason': 'unidentifiable material',
                    'message': "Image rejected: Unable to identify as recyclable material. Please upload clear images of materials like fabric, wood, metal, plastic, etc.",
                    'confidence': confidence,
                    'detected_item': label
                }
        
    except Exception as e:
        logger.error(f"Error analyzing image: {e}")
        return {
            'status': 'error',
            'message': f"Error processing image: {str(e)}",
            'confidence': 0
        }

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'service': 'EcoLoop Marketplace Image Analysis',
        'model': 'MobileNetV2'
    })

@app.route('/analyze-marketplace', methods=['POST'])
def analyze_marketplace():
    """Analyze marketplace image endpoint"""
    try:
        data = request.get_json()
        
        if not data or 'image_url' not in data:
            return jsonify({
                'status': 'error',
                'message': 'Missing image_url in request'
            }), 400
        
        image_url = data['image_url']
        logger.info(f"Analyzing marketplace image: {image_url}")
        
        # Analyze the image
        result = analyze_marketplace_image(image_url)
        
        # Log result
        logger.info(f"Analysis result: {result['status']} - {result.get('detected_item', 'unknown')}")
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in analyze_marketplace: {e}")
        return jsonify({
            'status': 'error',
            'message': f'Analysis failed: {str(e)}'
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    logger.info(f"Starting EcoLoop Marketplace Image Analysis Service on port {port}")
    app.run(host='0.0.0.0', port=port, debug=True)
