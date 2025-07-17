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

# Marketplace categories - what we accept (expanded for better recognition)
MARKETPLACE_CATEGORIES = {
    'fabric': ['jersey', 'velvet', 'wool', 'denim', 'scarf', 'sweater', 't_shirt', 'shirt', 'jeans', 'dress', 'coat', 'jacket', 'textile', 'cloth', 'fabric', 'cotton', 'silk', 'polyester', 'linen'],
    'wood': ['wooden_spoon', 'cutting_board', 'timber', 'plywood', 'lumber', 'wood', 'wooden', 'furniture', 'table', 'chair', 'shelf', 'board', 'log', 'stick', 'beam', 'oak', 'pine', 'maple', 'bamboo'],
    'metal': ['hammer', 'wrench', 'nail', 'screw', 'tin_can', 'aluminum', 'steel', 'metal', 'iron', 'copper', 'brass', 'can', 'tool', 'knife', 'fork', 'spoon', 'pan', 'pot', 'utensil'],
    'plastic': ['bottle', 'container', 'bucket', 'cup', 'plastic_bag', 'bottle_cap', 'plastic', 'tupperware', 'storage', 'toy', 'box', 'tray', 'lid', 'bowl', 'plate', 'utensil', 'crate', 'bin', 'pet'],
    'glass': ['wine_bottle', 'beer_bottle', 'jar', 'drinking_glass', 'vase', 'glass', 'bottle', 'container', 'bowl', 'dish', 'mirror', 'window'],
    'paper': ['cardboard', 'carton', 'box', 'packaging', 'newspaper', 'paper', 'book', 'magazine', 'envelope', 'wrapper', 'bag'],
    'electronics': ['computer', 'laptop', 'phone', 'remote_control', 'battery', 'electronic', 'device', 'monitor', 'keyboard', 'mouse', 'cable', 'charger', 'tablet', 'speaker'],
    'rubber': ['tire', 'boot', 'mat', 'eraser', 'glove', 'rubber', 'shoe', 'sole', 'gasket', 'seal'],
    'leather': ['handbag', 'wallet', 'boot', 'shoe', 'belt', 'jacket', 'leather', 'purse', 'bag', 'glove', 'coat']
}

# Additional recyclable terms that should generally be approved
RECYCLABLE_TERMS = [
    'recyclable', 'reusable', 'material', 'scrap', 'waste', 'item', 'object',
    'container', 'holder', 'storage', 'piece', 'component', 'part'
]

# What we definitely DON'T want - these will be immediately rejected
REJECTED_CATEGORIES = {
    'humans': ['person', 'face', 'people', 'portrait', 'selfie', 'human', 'man', 'woman', 'child', 'baby', 'boy', 'girl', 'head', 'body', 'student', 'graduate', 'employee', 'worker'],
    'animals': ['dog', 'cat', 'bird', 'fish', 'horse', 'cow', 'pig', 'chicken', 'animal', 'pet', 'wildlife', 'insect', 'snake', 'rabbit', 'mouse'],
    'documents': ['document', 'certificate', 'passport', 'id_card', 'license', 'paper_document', 'text', 'receipt', 'invoice', 'contract', 'diploma', 'degree', 'achievement', 'award', 'transcript', 'form', 'application', 'letter', 'memo', 'report', 'card', 'identification'],
    'weapons': ['weapon', 'gun', 'rifle', 'pistol', 'knife', 'blade', 'sword', 'dagger', 'ammunition', 'bullet'],
    'drugs': ['drug', 'medicine', 'pill', 'syringe', 'medication', 'pharmaceutical', 'tablet', 'capsule'],
    'food': ['food', 'fruit', 'vegetable', 'meat', 'bread', 'cake', 'pizza', 'burger', 'sandwich', 'apple', 'banana'],
    'living_things': ['plant', 'flower', 'tree', 'grass', 'leaf', 'seed', 'garden', 'flora'],
    'inappropriate': ['landscape', 'building', 'house', 'car', 'vehicle', 'sky', 'cloud', 'nature_scene', 'outdoor'],
    'currency': ['money', 'coin', 'bill', 'cash', 'currency', 'dollar', 'credit_card']
}

# Flatten for easier checking
REJECTED_ITEMS = []
REJECTION_REASONS = {}
for category, items in REJECTED_CATEGORIES.items():
    for item in items:
        REJECTED_ITEMS.append(item)
        REJECTION_REASONS[item] = category

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
    """Basic image quality check with detailed feedback"""
    try:
        # Convert to OpenCV format
        opencv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        height, width = opencv_image.shape[:2]
        
        # Check size
        if height < 100 or width < 100:
            return {'status': 'rejected', 'reason': f'Image too small ({width}x{height}px). Please upload an image at least 100x100 pixels.'}
        
        # Check if blurry (very lenient for recyclable materials)
        gray = cv2.cvtColor(opencv_image, cv2.COLOR_BGR2GRAY)
        blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        if blur_score < 15:  # Very lenient threshold for recyclable materials
            return {'status': 'rejected', 'reason': f'Image too blurry (score: {blur_score:.1f}). Please take a clearer photo.'}
        
        # Check brightness (more lenient)
        brightness = np.mean(gray)
        if brightness < 8:  # Very lenient
            return {'status': 'rejected', 'reason': f'Image too dark (brightness: {brightness:.1f}). Please take the photo in better lighting.'}
        elif brightness > 247:  # Very lenient
            return {'status': 'rejected', 'reason': f'Image too bright/overexposed (brightness: {brightness:.1f}). Please reduce lighting or exposure.'}
        
        return {'status': 'good', 'blur_score': blur_score, 'brightness': brightness}
        
    except Exception as e:
        logger.error(f"Error checking quality: {e}")
        return {'status': 'rejected', 'reason': 'Quality check failed - please try uploading again.'}

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

def get_detailed_review_message(detected_category, label, confidence, quality_score=None):
    """Generate detailed review message based on detection results"""
    messages = []
    
    if detected_category:
        if confidence < 30:
            messages.append(f"Detected possible {detected_category} material ('{label}') but with low confidence ({confidence:.1f}%)")
        else:
            messages.append(f"Detected {detected_category} material ('{label}') with moderate confidence ({confidence:.1f}%)")
    else:
        messages.append(f"Detected '{label}' with {confidence:.1f}% confidence")
    
    # Add specific guidance based on category
    if detected_category == 'wood':
        messages.append("If this is wooden furniture, lumber, or wooden items, it should be approved")
    elif detected_category == 'plastic':
        messages.append("If this is plastic containers, bottles, or plastic items, it should be approved")
    elif detected_category == 'metal':
        messages.append("If this is metal tools, cans, or metal items, it should be approved")
    elif detected_category == 'fabric':
        messages.append("If this is clothing, textiles, or fabric items, it should be approved")
    elif detected_category == 'glass':
        messages.append("If this is glass bottles, jars, or glassware, it should be approved")
    elif not detected_category:
        messages.append("Please verify if this item is recyclable or suitable for the marketplace")
    
    return ". ".join(messages) + "."

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
                'message': f"Image rejected: {quality_result['reason']}. Please upload a clear, well-lit photo of your recyclable item.",
                'confidence': 0
            }
        
        # Classify image
        classification = classify_image(image)
        label = classification['label'].lower()
        confidence = classification['confidence']
        all_predictions = classification.get('all_predictions', [])
        
        # Check if it's something we definitely don't want - immediate rejection
        rejected_item = None
        rejection_category = None
        
        # Check main prediction
        for rejected in REJECTED_ITEMS:
            if rejected in label:
                # Special case: "pet" could be PET plastic, check context
                if rejected == 'pet':
                    # Look for plastic-related context in other predictions
                    plastic_context = False
                    for pred in all_predictions[:5]:
                        pred_label = pred[1].lower()
                        plastic_indicators = ['bottle', 'container', 'plastic', 'cup', 'jar', 'bowl', 'tray']
                        if any(indicator in pred_label for indicator in plastic_indicators):
                            plastic_context = True
                            break
                    
                    # If we found plastic context, treat "pet" as PET plastic, not animal
                    if plastic_context:
                        # Skip rejection, will be handled as plastic later
                        continue
                
                rejected_item = rejected
                rejection_category = REJECTION_REASONS[rejected]
                break
        
        # Also check secondary predictions to catch edge cases
        if not rejected_item and len(all_predictions) > 1:
            for pred in all_predictions[:3]:  # Check top 3 predictions
                pred_label = pred[1].lower()
                pred_confidence = float(pred[2]) * 100
                
                # If any prediction with decent confidence shows rejected content
                if pred_confidence > 3:  # Very low threshold for rejection
                    for rejected in REJECTED_ITEMS:
                        if rejected in pred_label:
                            # Special case: "pet" could be PET plastic, check context
                            if rejected == 'pet':
                                # Look for plastic-related context in all predictions
                                plastic_context = False
                                for p in all_predictions[:5]:
                                    p_label = p[1].lower()
                                    plastic_indicators = ['bottle', 'container', 'plastic', 'cup', 'jar', 'bowl', 'tray']
                                    if any(indicator in p_label for indicator in plastic_indicators):
                                        plastic_context = True
                                        break
                                
                                # If we found plastic context, treat "pet" as PET plastic, not animal
                                if plastic_context:
                                    continue
                            
                            rejected_item = rejected
                            rejection_category = REJECTION_REASONS[rejected]
                            label = pred_label  # Use the rejected prediction for reporting
                            confidence = pred_confidence
                            break
                    if rejected_item:
                        break
        
        # Additional specific checks for documents and certificates - be more aggressive
        if not rejected_item:
            # Check for document-like indicators in the label - comprehensive check
            doc_indicators = [
                'certificate', 'diploma', 'degree', 'award', 'transcript', 'document', 
                'card', 'id', 'license', 'achievement', 'graduation', 'academic',
                'credential', 'identification', 'passport', 'visa', 'permit',
                'license_plate', 'business_card', 'name_tag', 'badge',
                'form', 'application', 'contract', 'agreement', 'paper',
                'letter', 'memo', 'report', 'invoice', 'receipt'
            ]
            
            # Check main label
            for indicator in doc_indicators:
                if indicator in label:
                    rejected_item = indicator
                    rejection_category = 'documents'
                    break
            
            # Also check if label contains common text-related terms
            text_indicators = ['text', 'writing', 'printed', 'official', 'formal']
            if not rejected_item:
                for indicator in text_indicators:
                    if indicator in label:
                        rejected_item = indicator
                        rejection_category = 'documents'
                        break
        
        # Immediate rejection for inappropriate content
        if rejected_item:
            rejection_messages = {
                'humans': "This image contains people/humans. Only photos of recyclable materials are allowed.",
                'animals': "This image contains animals/pets. Only photos of recyclable materials are allowed.",
                'documents': "This image contains documents/papers with text. Only photos of recyclable materials are allowed.",
                'weapons': "This image contains weapons or dangerous items. These cannot be listed on our marketplace.",
                'drugs': "This image contains medicines/drugs. These cannot be listed on our marketplace.",
                'food': "This image contains food items. Only recyclable materials can be listed on our marketplace.",
                'living_things': "This image contains plants/living things. Only recyclable materials are allowed.",
                'inappropriate': "This image contains landscapes/buildings. Please upload photos of recyclable materials only.",
                'currency': "This image contains money/currency. These cannot be listed on our marketplace."
            }
            
            rejection_message = rejection_messages.get(rejection_category, "This type of content is not allowed on our marketplace.")
            
            return {
                'status': 'rejected',
                'reason': f'{rejection_category}: {rejected_item} detected',
                'message': f"❌ Image rejected: {rejection_message}",
                'confidence': confidence,
                'detected_item': rejected_item,
                'rejection_category': rejection_category,
                'detailed_reason': f"Detected '{rejected_item}' which falls under '{rejection_category}' - not allowed on EcoLoop marketplace"
            }
        
        # Check if it's a marketplace category or generally recyclable
        detected_category = None
        category_confidence = 0
        matched_keyword = None
        
        # Check for direct category matches with better tracking
        for category, keywords in MARKETPLACE_CATEGORIES.items():
            for keyword in keywords:
                if keyword in label:
                    detected_category = category
                    category_confidence = confidence
                    matched_keyword = keyword
                    break
            if detected_category:
                break
        
        # Also check secondary predictions for better accuracy
        if not detected_category and len(all_predictions) > 1:
            for pred in all_predictions[1:3]:  # Check top 3 predictions
                pred_label = pred[1].lower()
                pred_confidence = float(pred[2]) * 100
                
                for category, keywords in MARKETPLACE_CATEGORIES.items():
                    for keyword in keywords:
                        if keyword in pred_label and pred_confidence > 10:
                            detected_category = category
                            category_confidence = pred_confidence
                            matched_keyword = keyword
                            label = pred_label  # Use the better match
                            confidence = pred_confidence
                            break
                    if detected_category:
                        break
                if detected_category:
                    break
        
        # Check for general recyclable terms if no specific category found
        if not detected_category:
            for term in RECYCLABLE_TERMS:
                if term in label:
                    detected_category = 'recyclable'
                    category_confidence = confidence * 0.8
                    matched_keyword = term
                    break
        
        # Enhanced decision making with auto-approval for clear recyclables
        if detected_category:
            # Auto-approve obvious recyclable materials with any reasonable confidence
            if detected_category in ['wood', 'plastic', 'metal', 'glass'] and confidence > 12:
                return {
                    'status': 'approved',
                    'category': detected_category,
                    'message': f"✅ Image approved! {detected_category.title()} material detected. Perfect for EcoLoop marketplace!",
                    'confidence': confidence,
                    'detected_item': label,
                    'matched_keyword': matched_keyword
                }
            # For fabric and other materials, be slightly more conservative but still permissive
            elif detected_category in ['fabric', 'paper', 'electronics', 'rubber', 'leather'] and confidence > 25:
                return {
                    'status': 'approved',
                    'category': detected_category,
                    'message': f"✅ Image approved! {detected_category.title()} material detected. Great addition to EcoLoop!",
                    'confidence': confidence,
                    'detected_item': label,
                    'matched_keyword': matched_keyword
                }
            # Send for review with detailed message
            else:
                detailed_message = get_detailed_review_message(detected_category, label, confidence)
                return {
                    'status': 'review',
                    'category': detected_category,
                    'message': f"⚠️ Image sent for admin review. {detailed_message}",
                    'confidence': confidence,
                    'detected_item': label,
                    'review_reason': detailed_message,
                    'matched_keyword': matched_keyword
                }
        else:
            # Not a clear marketplace category - check if it might still be recyclable
            # Look for any material-related terms in the label
            material_indicators = ['container', 'box', 'bottle', 'item', 'object', 'piece', 'material', 'product']
            might_be_recyclable = any(indicator in label for indicator in material_indicators)
            
            if might_be_recyclable and confidence > 20:
                detailed_message = f"Detected '{label}' ({confidence:.1f}% confidence). This might be a recyclable item but needs verification. Common recyclable materials include wood, plastic, metal, fabric, glass, paper, and electronics."
                return {
                    'status': 'review',
                    'category': 'other',
                    'message': f"⚠️ Image sent for admin review. {detailed_message}",
                    'confidence': confidence,
                    'detected_item': label,
                    'review_reason': detailed_message
                }
            else:
                # Still send for review rather than reject, with helpful message
                detailed_message = f"Unable to clearly identify material type. Detected '{label}' with {confidence:.1f}% confidence. Please verify if this is a recyclable item suitable for the marketplace."
                return {
                    'status': 'review',
                    'category': 'unknown',
                    'message': f"⚠️ Image sent for admin review. {detailed_message}",
                    'confidence': confidence,
                    'detected_item': label,
                    'review_reason': detailed_message
                }
        
    except Exception as e:
        logger.error(f"Error analyzing image: {e}")
        return {
            'status': 'error',
            'message': f"❌ Error processing image: {str(e)}. Please try uploading the image again.",
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
