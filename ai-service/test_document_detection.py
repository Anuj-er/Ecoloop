import requests
import json
import sys
from urllib.parse import urljoin
import os
import base64

# Get the image path from command line arguments
if len(sys.argv) < 2:
    print("Usage: python test_document_detection.py <path_to_image>")
    sys.exit(1)

image_path = sys.argv[1]
base_url = "http://localhost:5000"  # Matching the running AI service port

if not os.path.exists(image_path):
    print(f"Error: File {image_path} does not exist.")
    sys.exit(1)

# Function to convert image to base64
def image_to_base64(image_path):
    with open(image_path, "rb") as img_file:
        return base64.b64encode(img_file.read()).decode('utf-8')

# Prepare the payload
image_b64 = image_to_base64(image_path)
payload = {
    "image": image_b64,
    "image_url": f"file://{image_path}",  # Use local file path as URL
    "context": "marketplace"  # Test in marketplace context where document detection is most important
}

# Send the request to the predict endpoint
try:
    print(f"Testing image: {image_path}")
    print("Sending request to AI service...")
    
    response = requests.post(
        urljoin(base_url, "/predict"),
        json=payload,
        headers={"Content-Type": "application/json"}
    )
    
    # Check if request was successful
    if response.status_code == 200:
        result = response.json()
        
        # Print formatted result focusing on document detection
        print("\n=== DOCUMENT DETECTION RESULTS ===")
        
        # Get document analysis details
        doc_analysis = result.get("document_analysis", {})
        is_document = doc_analysis.get("is_document", False)
        doc_confidence = doc_analysis.get("confidence", 0)
        doc_type = doc_analysis.get("document_type")
        detection_method = doc_analysis.get("detection_method")
        
        print(f"Is document: {is_document}")
        print(f"Document confidence: {doc_confidence:.1f}%")
        print(f"Document type: {doc_type}")
        print(f"Detection method: {detection_method}")
        
        # Print text analysis if available
        if "text_analysis" in doc_analysis:
            text_analysis = doc_analysis["text_analysis"]
            print("\n--- Text Analysis ---")
            print(f"Has text pattern: {text_analysis.get('has_text_pattern', False)}")
            print(f"Text confidence: {text_analysis.get('confidence', 0):.1f}%")
            print(f"Text contours: {text_analysis.get('text_contours', 0)}")
            print(f"Text-like contours: {text_analysis.get('text_like_contours', 0)}")
            print(f"Line clusters: {text_analysis.get('line_clusters', 0)}")
            
            # Print physical object evidence if available
            if "physical_object_evidence" in text_analysis:
                print("\n--- Physical Object Evidence ---")
                evidence = text_analysis.get("physical_object_evidence", [])
                for item in evidence:
                    print(f"- {item}")
        
        # Print visual patterns if available
        if "visual_patterns" in doc_analysis:
            patterns = doc_analysis["visual_patterns"]
            print("\n--- Visual Patterns ---")
            print(f"Document pattern score: {patterns.get('document_pattern_score', 0)}")
            print(f"Has document patterns: {patterns.get('has_document_patterns', False)}")
            
            if "evidence" in patterns and patterns["evidence"]:
                print("\nDocument Evidence:")
                for item in patterns["evidence"]:
                    print(f"- {item}")
            
            if "recyclable_evidence" in patterns and patterns["recyclable_evidence"]:
                print("\nRecyclable Evidence:")
                for item in patterns["recyclable_evidence"]:
                    print(f"- {item}")
        
        # Print overall analysis result
        print("\n=== OVERALL ANALYSIS RESULT ===")
        print(f"Material: {result.get('label')} ({result.get('raw_label')})")
        print(f"Confidence: {result.get('confidence', 0):.1f}%")
        print(f"Status: {result.get('status')}")
        print(f"Admin status: {result.get('admin_status')}")
        print(f"Review required: {result.get('admin_review_required', False)}")
        
        if result.get("rejection_reason"):
            print(f"Rejection reason: {result.get('rejection_reason')}")
        
        if result.get("specific_issue"):
            print(f"Specific issue: {result.get('specific_issue')}")
        
        # Print recommendations
        if "recommendations" in result and result["recommendations"]:
            print("\n=== RECOMMENDATIONS ===")
            for rec in result["recommendations"]:
                print(f"- {rec}")
        
    else:
        print(f"Error: Request failed with status code {response.status_code}")
        print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
